using System.IdentityModel.Tokens.Jwt;
using MediCore.Business.Auth;
using MediCore.Common;
using MediCore.DataAccess.Auth;
using MediCore.Models.Auth;
using Microsoft.Extensions.Options;

namespace MediCore.Business.Tests.Auth;

/// <summary>
/// La sesión se alimenta del servidor: si el usuario tiene profesional sanitario asociado,
/// el login lo trae; si no lo tiene, el campo viaja explícitamente nulo y el claim no se
/// emite. Es lo que permite que el filtro «un médico ve sólo a sus pacientes» falle cerrado
/// en vez de dejar pasar todo, que es lo que ocurría cuando la sesión no traía el dato.
///
/// Lógica pura sobre un repositorio en memoria; la integración real contra los SPs se
/// verifica en el contrato de API (`tests/e2e/specs/00-smoke/api-auth.spec.ts`).
/// </summary>
public sealed class SesionProfesionalTests
{
    private static readonly Guid Tenant = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid Usuario = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid Profesional = Guid.Parse("66666666-6666-6666-6666-666666660001");
    private const string Password = "Admin123!";

    [Fact]
    public async Task Login_de_usuario_con_profesional_expone_el_profesional_en_la_sesion()
    {
        var repo = new RepositorioEnMemoria(Fila(Profesional, "CED-09876543", "Medicina General"));

        var sesion = await Servicio(repo).LoginAsync(Credenciales(), default);

        Assert.NotNull(sesion);
        var p = sesion!.Login.HealthcareProfessional;
        Assert.NotNull(p);
        Assert.Equal(Profesional, p!.HealthcareProfessionalId);
        Assert.Equal("CED-09876543", p.ProfessionalLicense);
        Assert.Equal("Medicina General", p.Specialty);
    }

    [Fact]
    public async Task Login_de_usuario_sin_profesional_lo_reporta_nulo_y_no_inventa_uno()
    {
        var repo = new RepositorioEnMemoria(Fila(null, null, null));

        var sesion = await Servicio(repo).LoginAsync(Credenciales(), default);

        Assert.NotNull(sesion);
        Assert.Null(sesion!.Login.HealthcareProfessional);
        // El identificador del usuario nunca se usa como sustituto del profesional.
        Assert.NotEqual(Usuario.ToString(), sesion.Login.HealthcareProfessional?.HealthcareProfessionalId.ToString());
    }

    [Fact]
    public async Task El_access_token_porta_el_claim_del_profesional_cuando_existe()
    {
        var repo = new RepositorioEnMemoria(Fila(Profesional, "CED-09876543", "Medicina General"));

        var sesion = await Servicio(repo).LoginAsync(Credenciales(), default);

        var claim = Claim(sesion!.Login.AccessToken, MediCoreClaims.HealthcareProfessionalId);
        Assert.Equal(Profesional.ToString(), claim);
    }

    [Fact]
    public async Task El_access_token_no_emite_el_claim_cuando_no_hay_profesional()
    {
        var repo = new RepositorioEnMemoria(Fila(null, null, null));

        var sesion = await Servicio(repo).LoginAsync(Credenciales(), default);

        Assert.Null(Claim(sesion!.Login.AccessToken, MediCoreClaims.HealthcareProfessionalId));
    }

    /// <summary>
    /// Cédula y especialidad admiten «no capturado». El profesional existe y se expone,
    /// pero los campos ausentes viajan nulos: no se rellenan con guiones ni con texto.
    /// </summary>
    [Fact]
    public async Task Profesional_sin_cedula_ni_especialidad_capturadas_viaja_con_nulos()
    {
        var repo = new RepositorioEnMemoria(Fila(Profesional, null, null));

        var sesion = await Servicio(repo).LoginAsync(Credenciales(), default);

        var p = sesion!.Login.HealthcareProfessional;
        Assert.NotNull(p);
        Assert.Equal(Profesional, p!.HealthcareProfessionalId);
        Assert.Null(p.ProfessionalLicense);
        Assert.Null(p.Specialty);
    }

    [Fact]
    public async Task Cedula_en_blanco_se_reporta_como_no_capturada()
    {
        var repo = new RepositorioEnMemoria(Fila(Profesional, "   ", "   "));

        var sesion = await Servicio(repo).LoginAsync(Credenciales(), default);

        var p = sesion!.Login.HealthcareProfessional;
        Assert.Null(p!.ProfessionalLicense);
        Assert.Null(p.Specialty);
    }

    [Fact]
    public async Task Refresh_conserva_el_profesional_en_la_sesion_nueva()
    {
        var repo = new RepositorioEnMemoria(Fila(Profesional, "CED-08765432", "Pediatría"));
        var servicio = Servicio(repo);
        var inicial = await servicio.LoginAsync(Credenciales(), default);

        var renovada = await servicio.RefreshAsync(inicial!.RefreshTokenPlain, default);

        Assert.NotNull(renovada);
        Assert.Equal(Profesional, renovada!.Login.HealthcareProfessional?.HealthcareProfessionalId);
        Assert.Equal("CED-08765432", renovada.Login.HealthcareProfessional?.ProfessionalLicense);
    }

    private static LoginRequest Credenciales() =>
        new() { TenantCode = "demo", UserName = "alejandro.garcia@medicore.mx", Password = Password };

    private static UserAuthRow Fila(Guid? profesionalId, string? cedula, string? especialidad) =>
        new()
        {
            UserId = Usuario,
            TenantId = Tenant,
            UserName = "alejandro.garcia@medicore.mx",
            DisplayName = "Alejandro García Mendoza",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Password),
            IsActive = true,
            RoleCodesCsv = "medico",
            HealthcareProfessionalId = profesionalId,
            ProfessionalLicense = cedula,
            SpecialtyName = especialidad
        };

    private static string? Claim(string accessToken, string tipo) =>
        new JwtSecurityTokenHandler().ReadJwtToken(accessToken).Claims
            .FirstOrDefault(c => c.Type == tipo)?.Value;

    private static AuthService Servicio(IAuthRepository repo) => AuthServiceTestFactory.Create(repo);

    /// <summary>Repositorio mínimo: un usuario y los refresh tokens que emita el servicio.</summary>
    private sealed class RepositorioEnMemoria(UserAuthRow usuario) : IAuthRepository
    {
        private readonly List<RefreshTokenRow> _tokens = [];

        public Task<UserAuthRow?> GetUserForLoginAsync(string tenantCode, string userName, CancellationToken ct) =>
            Task.FromResult<UserAuthRow?>(usuario);

        public Task<UserAuthRow?> GetUserByIdAsync(Guid tenantId, Guid userId, CancellationToken ct) =>
            Task.FromResult<UserAuthRow?>(
                tenantId == usuario.TenantId && userId == usuario.UserId ? usuario : null);

        public Task SaveRefreshTokenAsync(Guid tenantId, Guid userId, string tokenHash, DateTimeOffset expiresAtUtc, CancellationToken ct)
        {
            _tokens.Add(new RefreshTokenRow
            {
                RefreshTokenId = Guid.NewGuid(),
                TenantId = tenantId,
                UserId = userId,
                TokenHash = tokenHash,
                ExpiresAtUtc = expiresAtUtc
            });
            return Task.CompletedTask;
        }

        public Task<RefreshTokenRow?> GetRefreshTokenAsync(string tokenHash, CancellationToken ct) =>
            Task.FromResult(_tokens.SingleOrDefault(t => t.TokenHash == tokenHash));

        public Task<bool> RevokeRefreshTokenAsync(Guid refreshTokenId, Guid tenantId, Guid userId, CancellationToken ct)
        {
            var fila = _tokens.SingleOrDefault(t =>
                t.RefreshTokenId == refreshTokenId &&
                t.TenantId == tenantId &&
                t.UserId == userId &&
                t.RevokedAtUtc is null);
            if (fila is null) return Task.FromResult(false);

            fila.RevokedAtUtc = DateTimeOffset.UtcNow;
            return Task.FromResult(true);
        }

        public Task ResetLoginFailureAsync(Guid tenantId, Guid userId, CancellationToken ct) =>
            Task.CompletedTask;

        public Task UpdateLoginFailureAsync(Guid tenantId, Guid userId, int failedCount, DateTimeOffset? lockoutUntilUtc, CancellationToken ct) =>
            Task.CompletedTask;

        public Task RevokeAllRefreshTokensForUserAsync(Guid tenantId, Guid userId, CancellationToken ct) =>
            throw new NotSupportedException("El cierre global no participa en el alta de sesión (decisión 73).");

        public Task<bool> UserExistsInTenantAsync(Guid tenantId, Guid userId, CancellationToken ct) =>
            Task.FromResult(false);

        public Task<bool> ChangePasswordAsync(Guid tenantId, Guid userId, string passwordHash, CancellationToken ct) =>
            Task.FromResult(false);
    }
}
