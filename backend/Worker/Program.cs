using MediCore.Business;
using MediCore.Common;
using MediCore.DataAccess.Outbox;
using Serilog;

namespace MediCore.Worker;

/// <summary>
/// Drena outbox. DGIS/SINBA siempre registrado (ADR-023).
/// CFDI/FHIR/RENAPO solo si el mensaje llega (flags en API al encolar).
/// </summary>
public sealed class OutboxWorker(
    IServiceScopeFactory scopeFactory,
    PlatformOptions platform,
    ILogger<OutboxWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation(
            "MediCore OutboxWorker iniciado. Ambiente={Environment} DGIS destino={DgisDestination} (canal siempre disponible).",
            platform.EnvironmentName, platform.DgisDestination);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var outbox = scope.ServiceProvider.GetRequiredService<IOutboxRepository>();
                var batch = await outbox.ClaimPendingAsync(20, stoppingToken);

                foreach (var item in batch)
                {
                    try
                    {
                        await ProcessAsync(item, stoppingToken);
                        await outbox.MarkSentAsync(item.OutboxId, stoppingToken);
                    }
                    catch (Exception ex)
                    {
                        logger.LogError(ex, "Outbox {OutboxId} canal {Channel} falló", item.OutboxId, item.Channel);
                        await outbox.MarkFailedAsync(item.OutboxId, ex.Message, stoppingToken);
                    }
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Ciclo de outbox falló");
            }

            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }
    }

    private Task ProcessAsync(OutboxItem item, CancellationToken ct)
    {
        switch (item.Channel.ToLowerInvariant())
        {
            case "dgis":
            case "sinba":
                // El envío real a DGIS/SINBA llega en Fase 4; aquí no se simula un acuse.
                logger.LogInformation(
                    "DGIS/SINBA outbox {OutboxId} tenant {TenantId} destino {DgisDestination} (envío real pendiente de Fase 4)",
                    item.OutboxId, item.TenantId, platform.DgisDestination);
                break;
            case "cfdi":
            case "fhir":
            case "renapo":
                logger.LogInformation("Canal {Channel} outbox {OutboxId} (flag-gated al encolar)", item.Channel, item.OutboxId);
                break;
            case "security.alert":
                logger.LogWarning(
                    "ALERTA DE SEGURIDAD outbox {OutboxId} tenant {TenantId}: {Payload}",
                    item.OutboxId, item.TenantId, item.PayloadJson);
                break;
            default:
                logger.LogWarning("Canal outbox desconocido: {Channel}", item.Channel);
                break;
        }

        return Task.CompletedTask;
    }
}

public static class Program
{
    public static void Main(string[] args)
    {
        Log.Logger = new LoggerConfiguration()
            .MinimumLevel.Information()
            .WriteTo.Console()
            .CreateLogger();

        var builder = Host.CreateApplicationBuilder(args);

        var platform = builder.Configuration.GetSection(PlatformOptions.SectionName).Get<PlatformOptions>()
            ?? throw new InvalidOperationException($"Sección '{PlatformOptions.SectionName}' requerida.");
        platform.EnvironmentName = builder.Environment.EnvironmentName;
        platform.Validate();

        if (platform.DgisDestination == "production")
            throw new InvalidOperationException(
                "Platform:DgisDestination='production' requiere el envío real DGIS/SINBA (Fase 4). " +
                "No se arranca el worker con un destino productivo sin integración implementada.");

        if (string.IsNullOrWhiteSpace(builder.Configuration.GetConnectionString("MediCore")))
            throw new InvalidOperationException(
                $"ConnectionStrings:MediCore ausente en ambiente {builder.Environment.EnvironmentName}. " +
                "Configúrela con la variable de entorno ConnectionStrings__MediCore.");

        builder.Services.AddSingleton(platform);
        builder.Services.Configure<PlatformOptions>(builder.Configuration.GetSection(PlatformOptions.SectionName));
        builder.Services.AddSerilog();
        builder.Services.AddMediCoreCore();
        builder.Services.AddHostedService<OutboxWorker>();

        var host = builder.Build();
        host.Run();
    }
}
