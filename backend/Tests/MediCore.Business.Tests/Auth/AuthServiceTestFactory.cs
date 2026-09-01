using MediCore.Business.Auth;
using MediCore.Business.Role;
using MediCore.DataAccess.Auth;
using MediCore.Models.Auth;
using MediCore.Models.Role;
using Microsoft.Extensions.Options;

namespace MediCore.Business.Tests.Auth;

internal static class AuthServiceTestFactory
{
    public static AuthService Create(IAuthRepository repository) =>
        new(
            repository,
            new EffectivePermissionService(new RoleServiceStub(), new BreakGlassRepositoryStub()),
            Options.Create(new JwtOptions
            {
                SigningKey = new string('k', 48)
            }));

    private sealed class RoleServiceStub : IRoleService
    {
        public Task<RolePermissionMatrixDto> GetPermissionMatrixAsync(Guid tenantId, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<RolePermissionMatrixDto> SaveRolePermissionsAsync(
            Guid tenantId, string roleCode, Guid actorUserId, SaveRolePermissionsRequest request, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<IReadOnlyDictionary<string, bool>> GetEffectivePermissionsAsync(
            Guid tenantId, bool isSuperAdmin, IReadOnlyList<string> roleCodes, CancellationToken ct) =>
            Task.FromResult<IReadOnlyDictionary<string, bool>>(
                isSuperAdmin || roleCodes.Contains("admin")
                    ? RolePermissionDefaults.AllKeys.ToDictionary(k => k, _ => true)
                    : RolePermissionDefaults.ForRole(roleCodes.FirstOrDefault() ?? "recepcion"));
    }

    private sealed class BreakGlassRepositoryStub : IBreakGlassRepository
    {
        public Task<BreakGlassGrantRow> StartGrantAsync(
            Guid tenantId, Guid userId, string justification, string grantedPermissionsJson, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<IReadOnlyList<BreakGlassGrantRow>> ListActiveForUserAsync(
            Guid tenantId, Guid userId, CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<BreakGlassGrantRow>>([]);
    }
}
