using System.Security.Cryptography;
using System.Text;
using MediCore.Business.Auth;
using MediCore.DataAccess.Auth;
using MediCore.Models.Auth;
using Microsoft.Extensions.Options;

namespace MediCore.Business.Tests.Auth;

/// <summary>
/// Decisión 73 (2026-08-27): cerrar sesión revoca únicamente la sesión actual. El motivo es
/// clínico: en urgencias dos estaciones trabajan con la misma cuenta y cerrar en recepción no
/// debe expulsar a triage.
///
/// Estas pruebas son de lógica pura sobre un repositorio en memoria; la integración real contra
/// los SPs se verifica en el contrato de API (`tests/e2e/specs/00-smoke/api-auth.spec.ts`).
/// </summary>
public sealed class LogoutTests
{
    private static readonly Guid Tenant = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid Usuario = Guid.Parse("22222222-2222-2222-2222-222222222222");

    [Fact]
    public async Task Logout_revoca_solo_la_sesion_presentada()
    {
        var repo = new RepositorioEnMemoria();
        var recepcion = repo.AgregarSesion(Tenant, Usuario, "token-recepcion");
        var triage = repo.AgregarSesion(Tenant, Usuario, "token-triage");

        var cerrada = await Servicio(repo).LogoutAsync(Tenant, Usuario, "token-recepcion", default);

        Assert.True(cerrada);
        Assert.NotNull(recepcion.RevokedAtUtc);
        Assert.Null(triage.RevokedAtUtc);
    }

    [Fact]
    public async Task Logout_nunca_usa_el_cierre_global()
    {
        var repo = new RepositorioEnMemoria();
        repo.AgregarSesion(Tenant, Usuario, "token-recepcion");

        await Servicio(repo).LogoutAsync(Tenant, Usuario, "token-recepcion", default);

        Assert.Equal(0, repo.LlamadasCierreGlobal);
    }

    [Fact]
    public async Task Logout_sin_cookie_no_cierra_nada_y_lo_reporta()
    {
        var repo = new RepositorioEnMemoria();
        var abierta = repo.AgregarSesion(Tenant, Usuario, "token-recepcion");

        var cerrada = await Servicio(repo).LogoutAsync(Tenant, Usuario, null, default);

        Assert.False(cerrada);
        Assert.Null(abierta.RevokedAtUtc);
        Assert.Equal(0, repo.LlamadasCierreGlobal);
    }

    [Fact]
    public async Task Logout_con_cookie_vacia_no_cierra_nada()
    {
        var repo = new RepositorioEnMemoria();
        repo.AgregarSesion(Tenant, Usuario, "token-recepcion");

        Assert.False(await Servicio(repo).LogoutAsync(Tenant, Usuario, "   ", default));
    }

    [Fact]
    public async Task Logout_con_token_ya_revocado_lo_reporta_sin_error()
    {
        var repo = new RepositorioEnMemoria();
        var sesion = repo.AgregarSesion(Tenant, Usuario, "token-recepcion");
        sesion.RevokedAtUtc = DateTimeOffset.UtcNow.AddMinutes(-5);

        Assert.False(await Servicio(repo).LogoutAsync(Tenant, Usuario, "token-recepcion", default));
    }

    [Fact]
    public async Task Logout_no_revoca_una_sesion_de_otro_usuario()
    {
        var repo = new RepositorioEnMemoria();
        var otroUsuario = Guid.Parse("33333333-3333-3333-3333-333333333333");
        var ajena = repo.AgregarSesion(Tenant, otroUsuario, "token-ajeno");

        var cerrada = await Servicio(repo).LogoutAsync(Tenant, Usuario, "token-ajeno", default);

        Assert.False(cerrada);
        Assert.Null(ajena.RevokedAtUtc);
    }

    [Fact]
    public async Task Logout_no_revoca_una_sesion_de_otro_tenant()
    {
        var repo = new RepositorioEnMemoria();
        var otroTenant = Guid.Parse("44444444-4444-4444-4444-444444444444");
        var ajena = repo.AgregarSesion(otroTenant, Usuario, "token-de-otro-tenant");

        var cerrada = await Servicio(repo).LogoutAsync(Tenant, Usuario, "token-de-otro-tenant", default);

        Assert.False(cerrada);
        Assert.Null(ajena.RevokedAtUtc);
    }

    private static AuthService Servicio(IAuthRepository repo) => AuthServiceTestFactory.Create(repo);

    /// <summary>Hash igual al de AuthService: SHA-256 en hexadecimal. Nunca se guarda el token en claro.</summary>
    private static string Hash(string plano) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(plano)));

    private sealed class RepositorioEnMemoria : IAuthRepository
    {
        private readonly List<RefreshTokenRow> _tokens = [];

        public int LlamadasCierreGlobal { get; private set; }

        public RefreshTokenRow AgregarSesion(Guid tenantId, Guid userId, string tokenPlano)
        {
            var fila = new RefreshTokenRow
            {
                RefreshTokenId = Guid.NewGuid(),
                TenantId = tenantId,
                UserId = userId,
                TokenHash = Hash(tokenPlano),
                ExpiresAtUtc = DateTimeOffset.UtcNow.AddDays(14)
            };
            _tokens.Add(fila);
            return fila;
        }

        public Task<RefreshTokenRow?> GetRefreshTokenAsync(string tokenHash, CancellationToken ct) =>
            Task.FromResult(_tokens.SingleOrDefault(t => t.TokenHash == tokenHash));

        public Task<bool> RevokeRefreshTokenAsync(Guid refreshTokenId, Guid tenantId, Guid userId, CancellationToken ct)
        {
            // Mismo filtro que sp_Auth_RevokeRefreshToken: tenant + usuario + no revocado.
            var fila = _tokens.SingleOrDefault(t =>
                t.RefreshTokenId == refreshTokenId &&
                t.TenantId == tenantId &&
                t.UserId == userId &&
                t.RevokedAtUtc is null);
            if (fila is null) return Task.FromResult(false);

            fila.RevokedAtUtc = DateTimeOffset.UtcNow;
            return Task.FromResult(true);
        }

        public Task RevokeAllRefreshTokensForUserAsync(Guid tenantId, Guid userId, CancellationToken ct)
        {
            LlamadasCierreGlobal++;
            foreach (var t in _tokens.Where(t => t.TenantId == tenantId && t.UserId == userId && t.RevokedAtUtc is null))
                t.RevokedAtUtc = DateTimeOffset.UtcNow;
            return Task.CompletedTask;
        }

        public Task<UserAuthRow?> GetUserForLoginAsync(string tenantCode, string userName, CancellationToken ct) =>
            throw new NotSupportedException("Fuera del alcance de estas pruebas de logout.");

        public Task<UserAuthRow?> GetUserByIdAsync(Guid tenantId, Guid userId, CancellationToken ct) =>
            throw new NotSupportedException("Fuera del alcance de estas pruebas de logout.");

        public Task UpdateLoginFailureAsync(Guid tenantId, Guid userId, int failedCount, DateTimeOffset? lockoutUntilUtc, CancellationToken ct) =>
            throw new NotSupportedException("Fuera del alcance de estas pruebas de logout.");

        public Task ResetLoginFailureAsync(Guid tenantId, Guid userId, CancellationToken ct) =>
            throw new NotSupportedException("Fuera del alcance de estas pruebas de logout.");

        public Task SaveRefreshTokenAsync(Guid tenantId, Guid userId, string tokenHash, DateTimeOffset expiresAtUtc, CancellationToken ct) =>
            throw new NotSupportedException("Fuera del alcance de estas pruebas de logout.");

        public Task<bool> UserExistsInTenantAsync(Guid tenantId, Guid userId, CancellationToken ct) =>
            Task.FromResult(false);

        public Task<bool> ChangePasswordAsync(Guid tenantId, Guid userId, string passwordHash, CancellationToken ct) =>
            Task.FromResult(false);
    }
}
