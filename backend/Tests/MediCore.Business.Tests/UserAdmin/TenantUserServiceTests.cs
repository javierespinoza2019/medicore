using MediCore.Business.UserAdmin;
using MediCore.DataAccess.Auth;
using MediCore.DataAccess.UserAdmin;
using MediCore.Models.Auth;
using MediCore.Models.UserAdmin;

namespace MediCore.Business.Tests.UserAdmin;

public sealed class TenantUserServiceTests
{
    [Fact]
    public async Task Create_rechaza_rol_SuperAdmin()
    {
        var svc = new TenantUserService(new FakeRepo(), new FakeAuth());
        await Assert.ThrowsAsync<ArgumentException>(() =>
            svc.CreateAsync(
                Guid.NewGuid(),
                Guid.NewGuid(),
                new CreateTenantUserRequest
                {
                    UserName = "nuevo.user",
                    DisplayName = "Nuevo",
                    Password = "Clave123!",
                    RoleCodes = ["SuperAdmin"],
                    BranchIds = []
                },
                default));
    }

    [Fact]
    public async Task Create_exige_al_menos_un_rol()
    {
        var svc = new TenantUserService(new FakeRepo(), new FakeAuth());
        await Assert.ThrowsAsync<ArgumentException>(() =>
            svc.CreateAsync(
                Guid.NewGuid(),
                Guid.NewGuid(),
                new CreateTenantUserRequest
                {
                    UserName = "nuevo.user",
                    DisplayName = "Nuevo",
                    Password = "Clave123!",
                    RoleCodes = [],
                    BranchIds = []
                },
                default));
    }

    [Fact]
    public async Task SoftDelete_revoca_sesiones()
    {
        var auth = new FakeAuth();
        var svc = new TenantUserService(new FakeRepo(), auth);
        var tenant = Guid.NewGuid();
        var user = Guid.NewGuid();
        await svc.SoftDeleteAsync(tenant, user, Guid.NewGuid(), default);
        Assert.Contains((tenant, user), auth.Revoked);
    }

    private sealed class FakeRepo : ITenantUserRepository
    {
        public Task<IReadOnlyList<TenantUserRow>> ListAsync(
            Guid tenantId, bool onlyActive, string? search, CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<TenantUserRow>>([]);

        public Task<TenantUserRow?> GetByIdAsync(Guid tenantId, Guid userId, CancellationToken ct) =>
            Task.FromResult<TenantUserRow?>(null);

        public Task<TenantUserRow> CreateAsync(
            Guid tenantId, Guid userId, string userName, string displayName, string passwordHash,
            bool isActive, string? roleCodesCsv, string? branchIdsCsv, Guid? actorUserId,
            CancellationToken ct) =>
            throw new NotImplementedException();

        public Task<TenantUserRow> UpdateAsync(
            Guid tenantId, Guid userId, string displayName, bool isActive,
            string? roleCodesCsv, string? branchIdsCsv, Guid? actorUserId, CancellationToken ct) =>
            throw new NotImplementedException();

        public Task SoftDeleteAsync(Guid tenantId, Guid userId, Guid? actorUserId, CancellationToken ct) =>
            Task.CompletedTask;

        public Task SetPasswordAsync(
            Guid tenantId, Guid userId, string passwordHash, Guid? actorUserId, CancellationToken ct) =>
            Task.CompletedTask;
    }

    private sealed class FakeAuth : IAuthRepository
    {
        public List<(Guid Tenant, Guid User)> Revoked { get; } = [];

        public Task<UserAuthRow?> GetUserForLoginAsync(string tenantCode, string userName, CancellationToken ct) =>
            Task.FromResult<UserAuthRow?>(null);

        public Task<UserAuthRow?> GetUserByIdAsync(Guid tenantId, Guid userId, CancellationToken ct) =>
            Task.FromResult<UserAuthRow?>(null);

        public Task UpdateLoginFailureAsync(
            Guid tenantId, Guid userId, int failedCount, DateTimeOffset? lockoutUntilUtc, CancellationToken ct) =>
            Task.CompletedTask;

        public Task ResetLoginFailureAsync(Guid tenantId, Guid userId, CancellationToken ct) =>
            Task.CompletedTask;

        public Task SaveRefreshTokenAsync(
            Guid tenantId, Guid userId, string tokenHash, DateTimeOffset expiresAtUtc, CancellationToken ct) =>
            Task.CompletedTask;

        public Task<RefreshTokenRow?> GetRefreshTokenAsync(string tokenHash, CancellationToken ct) =>
            Task.FromResult<RefreshTokenRow?>(null);

        public Task<bool> RevokeRefreshTokenAsync(Guid refreshTokenId, Guid tenantId, Guid userId, CancellationToken ct) =>
            Task.FromResult(true);

        public Task RevokeAllRefreshTokensForUserAsync(Guid tenantId, Guid userId, CancellationToken ct)
        {
            Revoked.Add((tenantId, userId));
            return Task.CompletedTask;
        }

        public Task<bool> UserExistsInTenantAsync(Guid tenantId, Guid userId, CancellationToken ct) =>
            Task.FromResult(false);

        public Task<bool> ChangePasswordAsync(Guid tenantId, Guid userId, string passwordHash, CancellationToken ct) =>
            Task.FromResult(false);
    }
}
