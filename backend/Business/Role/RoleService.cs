using System.Text.Json;
using MediCore.DataAccess.Role;
using MediCore.Models.Role;

namespace MediCore.Business.Role;

public interface IRoleService
{
    Task<RolePermissionMatrixDto> GetPermissionMatrixAsync(Guid tenantId, CancellationToken ct);
    Task<RolePermissionMatrixDto> SaveRolePermissionsAsync(
        Guid tenantId,
        string roleCode,
        Guid actorUserId,
        SaveRolePermissionsRequest request,
        CancellationToken ct);
    Task<IReadOnlyDictionary<string, bool>> GetEffectivePermissionsAsync(
        Guid tenantId,
        bool isSuperAdmin,
        IReadOnlyList<string> roleCodes,
        CancellationToken ct);
}

public sealed class RoleService(IRoleRepository repository) : IRoleService
{
    public async Task<RolePermissionMatrixDto> GetPermissionMatrixAsync(Guid tenantId, CancellationToken ct)
    {
        var templates = await repository.ListTemplatesAsync(tenantId, ct);
        var permissionsByRole = new Dictionary<string, IReadOnlyDictionary<string, bool>>(StringComparer.OrdinalIgnoreCase);
        var overrides = new List<string>();

        foreach (var template in templates)
        {
            var config = await repository.GetPermissionConfigAsync(tenantId, template.RoleCode, ct);
            if (config is null)
            {
                permissionsByRole[template.RoleCode] = RolePermissionDefaults.ForRole(template.RoleCode);
            }
            else
            {
                var granted = RoleRepository.ParseGrantedList(config.GrantedPermissionsJson);
                permissionsByRole[template.RoleCode] = RolePermissionDefaults.FromGrantedList(granted);
                overrides.Add(template.RoleCode);
            }
        }

        return new RolePermissionMatrixDto
        {
            Templates = templates,
            Catalog = RolePermissionCatalog.Items
                .Select(i => new PermissionCatalogItemDto { Code = i.Code, Label = i.Label, Module = i.Module })
                .ToList(),
            PermissionsByRole = permissionsByRole,
            RolesWithTenantOverrides = overrides
        };
    }

    public async Task<RolePermissionMatrixDto> SaveRolePermissionsAsync(
        Guid tenantId,
        string roleCode,
        Guid actorUserId,
        SaveRolePermissionsRequest request,
        CancellationToken ct)
    {
        if (!RolePermissionDefaults.TemplateRoleCodes.Contains(roleCode, StringComparer.OrdinalIgnoreCase))
            throw new ArgumentException("Plantilla de rol no válida.", nameof(roleCode));

        var normalized = NormalizePermissions(request.Permissions);
        var grantedJson = JsonSerializer.Serialize(RolePermissionDefaults.ToGrantedList(normalized));

        await repository.UpsertPermissionConfigAsync(tenantId, roleCode, grantedJson, actorUserId, ct);
        return await GetPermissionMatrixAsync(tenantId, ct);
    }

    private static IReadOnlyDictionary<string, bool> NormalizePermissions(IReadOnlyDictionary<string, bool> incoming)
    {
        var result = new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase);
        foreach (var key in RolePermissionDefaults.AllKeys)
            result[key] = incoming.TryGetValue(key, out var granted) && granted;
        return result;
    }

    public async Task<IReadOnlyDictionary<string, bool>> GetEffectivePermissionsAsync(
        Guid tenantId,
        bool isSuperAdmin,
        IReadOnlyList<string> roleCodes,
        CancellationToken ct)
    {
        if (isSuperAdmin)
            return RolePermissionDefaults.AllKeys.ToDictionary(k => k, _ => true);

        var merged = RolePermissionDefaults.AllKeys.ToDictionary(k => k, _ => false);

        foreach (var role in roleCodes)
        {
            if (string.Equals(role, RoleAccess.SuperAdminRole, StringComparison.OrdinalIgnoreCase))
            {
                foreach (var key in RolePermissionDefaults.AllKeys)
                    merged[key] = true;
                continue;
            }

            if (!RolePermissionDefaults.TemplateRoleCodes.Contains(role, StringComparer.OrdinalIgnoreCase))
                continue;

            var config = await repository.GetPermissionConfigAsync(tenantId, role, ct);
            var map = config is null
                ? RolePermissionDefaults.ForRole(role)
                : RolePermissionDefaults.FromGrantedList(RoleRepository.ParseGrantedList(config.GrantedPermissionsJson));

            foreach (var key in RolePermissionDefaults.AllKeys)
            {
                if (map.TryGetValue(key, out var granted) && granted)
                    merged[key] = true;
            }
        }

        return merged;
    }
}
