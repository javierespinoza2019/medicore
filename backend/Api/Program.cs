using System.Text;
using System.Text.Json;
using MediCore.Api.Hubs;
using MediCore.Business;
using MediCore.Business.Auth;
using MediCore.Common;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Serilog.Events;

var builder = WebApplication.CreateBuilder(args);

// Ambientes soportados: Development | QA | Production (ASPNETCORE_ENVIRONMENT).
var envName = builder.Environment.EnvironmentName;
var isDevelopment = builder.Environment.IsDevelopment();

var platform = builder.Configuration.GetSection(PlatformOptions.SectionName).Get<PlatformOptions>()
    ?? throw new InvalidOperationException($"Sección '{PlatformOptions.SectionName}' requerida en appsettings.{envName}.json.");
platform.EnvironmentName = envName;
platform.Validate();

builder.Services.Configure<PlatformOptions>(builder.Configuration.GetSection(PlatformOptions.SectionName));
builder.Services.AddSingleton(platform);

builder.Host.UseSerilog((_, cfg) =>
{
    var minLevel = isDevelopment ? LogEventLevel.Information : LogEventLevel.Error;
    cfg.Enrich.FromLogContext()
        .Enrich.WithProperty("Environment", envName)
        .MinimumLevel.Is(minLevel)
        .WriteTo.Console();
});

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.AddMediCoreCore();
builder.Services.AddControllers();
builder.Services.AddSignalR().AddJsonProtocol(options =>
{
    options.PayloadSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
});
builder.Services.AddSingleton<IClinicalQueuePublisher, ClinicalQueuePublisher>();
builder.Services.AddOpenApi();

builder.Services.Configure<JsonOptions>(o =>
{
    o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
});

var jwt = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
    ?? throw new InvalidOperationException("Sección Jwt requerida.");

// Secretos: en QA/Production llegan por variables de entorno, nunca en el repositorio.
if (string.IsNullOrWhiteSpace(jwt.SigningKey) || jwt.SigningKey.Length < 32)
    throw new InvalidOperationException(
        $"Jwt:SigningKey ausente o menor a 32 caracteres en ambiente {envName}. " +
        "Configúrelo con la variable de entorno Jwt__SigningKey.");

if (!isDevelopment && jwt.SigningKey.Contains("DEV", StringComparison.OrdinalIgnoreCase))
    throw new InvalidOperationException($"Jwt:SigningKey de desarrollo no puede usarse en {envName}.");

if (string.IsNullOrWhiteSpace(builder.Configuration.GetConnectionString("MediCore")))
    throw new InvalidOperationException(
        $"ConnectionStrings:MediCore ausente en ambiente {envName}. " +
        "Configúrela con la variable de entorno ConnectionStrings__MediCore.");

var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [];
if (!isDevelopment && corsOrigins.Length == 0)
    throw new InvalidOperationException($"Cors:Origins debe declararse explícitamente en {envName}.");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = !isDevelopment;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };

        // Los 401 del middleware deben usar el mismo sobre ApiResponse que los del
        // controlador; de otro modo el cliente recibe cuerpo vacío en unos casos y
        // JSON en otros.
        // SignalR (navegador WebSocket) manda el JWT en ?access_token=; no en Authorization.
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) &&
                    path.StartsWithSegments("/hubs/clinical-queue"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            },
            OnChallenge = async context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "application/json";

                var message = string.IsNullOrWhiteSpace(context.ErrorDescription)
                    ? "No autenticado: token ausente o inválido."
                    : $"No autenticado: {context.ErrorDescription}";

                await context.Response.WriteAsJsonAsync(ApiResponse.Fail(message));
            }
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicyNames.Client, policy =>
    {
        var origins = corsOrigins.Length > 0
            ? corsOrigins
            : ["http://localhost:5173", "http://127.0.0.1:5173"];
        policy.WithOrigins(origins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// Detrás de IIS / reverse proxy (QA y Production): conservar esquema para cookies Secure.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

var app = builder.Build();

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";
        var payload = ApiResponse.Fail("Error interno del servidor.");
        await context.Response.WriteAsJsonAsync(payload);
    });
});

if (!isDevelopment)
{
    app.UseForwardedHeaders();
    app.UseHsts();
    app.UseHttpsRedirection();
}

// OpenAPI: fuera de Production.
if (!platform.IsProduction)
    app.MapOpenApi();

app.UseCors(CorsPolicyNames.Client);
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<ClinicalQueueHub>("/hubs/clinical-queue");

Log.Logger.Information(
    "MediCore API iniciada. Ambiente={Environment} Demo={IsDemo} PHI={AllowRealPatientData} DGIS={DgisDestination}",
    platform.EnvironmentName, platform.IsDemo, platform.AllowRealPatientData, platform.DgisDestination);

app.Run();

public static class CorsPolicyNames
{
    public const string Client = "MediCoreClient";
}

public partial class Program;
