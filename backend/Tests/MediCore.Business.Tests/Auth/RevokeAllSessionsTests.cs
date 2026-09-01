using System.Security.Cryptography;
using System.Text;
using MediCore.Business.Auth;
using MediCore.DataAccess.Auth;
using MediCore.Models.Auth;
using Microsoft.Extensions.Options;

namespace MediCore.Business.Tests.Auth;

/// <summary>
/// Política #75 (doc 06): revocación global en autogestión, baja admin y cambio de contraseña;
/// no en logout ordinario (#73) ni en lockout.
/// </summary>
public sealed class RevokeAllSessionsTests
{
    private static readonly Guid Tenant = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid Usuario = Guid.Parse("22222222-2222-2222-2222-222222222222");

    [Fact]
    public async Task RevokeAll_cierra_todas_las_sesiones_del_usuario()
    {
        var repo = new RepositorioEnMemoria();
        repo.AgregarSesion(Tenant, Usuario, "token-a");
        repo.AgregarSesion(Tenant, Usuario, "token-b");

        await Servicio(repo).RevokeAllSessionsAsync(Tenant, Usuario, default);

        Assert.Equal(2, repo.Tokens.Count(t => t.RevokedAtUtc is not null));
    }

    [Fact]
    public async Task Logout_ordinario_no_usa_revokeAll()
    {
        var repo = new RepositorioEnMemoria();
        repo.AgregarSesion(Tenant, Usuario, "token-a");
        repo.AgregarSesion(Tenant, Usuario, "token-b");

        await Servicio(repo).LogoutAsync(Tenant, Usuario, "token-a", default);

        Assert.Equal(0, repo.LlamadasCierreGlobal);
        Assert.Equal(1, repo.Tokens.Count(t => t.RevokedAtUtc is not null));
        Assert.Equal(1, repo.Tokens.Count(t => t.RevokedAtUtc is null));
    }

    private static AuthService Servicio(IAuthRepository repo) => AuthServiceTestFactory.Create(repo);

    private static string Hash(string plano) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(plano)));

    private sealed class RepositorioEnMemoria : IAuthRepository
    {
        private readonly List<RefreshTokenRow> _tokens = [];
        public int LlamadasCierreGlobal { get; private set; }
        public IReadOnlyList<RefreshTokenRow> Tokens => _tokens;

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

        public Task RevokeAllRefreshTokensForUserAsync(Guid tenantId, Guid userId, CancellationToken ct)
        {
            LlamadasCierreGlobal++;
            foreach (var t in _tokens.Where(t => t.TenantId == tenantId && t.UserId == userId && t.RevokedAtUtc is null))
                t.RevokedAtUtc = DateTimeOffset.UtcNow;
            return Task.CompletedTask;
        }

        public Task<RefreshTokenRow?> GetRefreshTokenAsync(string tokenHash, CancellationToken ct) =>
            Task.FromResult(_tokens.SingleOrDefault(t => t.TokenHash == tokenHash));

        public Task<bool> RevokeRefreshTokenAsync(Guid refreshTokenId, Guid tenantId, Guid userId, CancellationToken ct)
        {
            var fila = _tokens.SingleOrDefault(t =>
                t.RefreshTokenId == refreshTokenId && t.TenantId == tenantId && t.UserId == userId && t.RevokedAtUtc is null);
            if (fila is null) return Task.FromResult(false);
            fila.RevokedAtUtc = DateTimeOffset.UtcNow;
            return Task.FromResult(true);
        }

        public Task<UserAuthRow?> GetUserForLoginAsync(string tenantCode, string userName, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<UserAuthRow?> GetUserByIdAsync(Guid tenantId, Guid userId, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task UpdateLoginFailureAsync(Guid tenantId, Guid userId, int failedCount, DateTimeOffset? lockoutUntilUtc, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task ResetLoginFailureAsync(Guid tenantId, Guid userId, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task SaveRefreshTokenAsync(Guid tenantId, Guid userId, string tokenHash, DateTimeOffset expiresAtUtc, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<bool> UserExistsInTenantAsync(Guid tenantId, Guid userId, CancellationToken ct) =>
            Task.FromResult(tenantId == Tenant && userId == Usuario);

        public Task<bool> ChangePasswordAsync(Guid tenantId, Guid userId, string passwordHash, CancellationToken ct) =>
            Task.FromResult(false);
    }
}
