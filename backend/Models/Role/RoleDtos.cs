namespace MediCore.Models.Role;

public sealed class RoleTemplateDto
{
    public Guid RoleId { get; set; }
    public string RoleCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int UserCount { get; set; }
}

public sealed class PermissionCatalogItemDto
{
    public string Code { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Module { get; set; } = string.Empty;
}

public sealed class RolePermissionMatrixDto
{
    public IReadOnlyList<RoleTemplateDto> Templates { get; set; } = [];
    public IReadOnlyList<PermissionCatalogItemDto> Catalog { get; set; } = [];
    public IReadOnlyDictionary<string, IReadOnlyDictionary<string, bool>> PermissionsByRole { get; set; }
        = new Dictionary<string, IReadOnlyDictionary<string, bool>>();
    public IReadOnlyList<string> RolesWithTenantOverrides { get; set; } = [];
}

public sealed class SaveRolePermissionsRequest
{
    public IReadOnlyDictionary<string, bool> Permissions { get; set; }
        = new Dictionary<string, bool>();
}

public sealed class TenantRolePermissionConfigRow
{
    public Guid TenantId { get; set; }
    public string RoleCode { get; set; } = string.Empty;
    public string GrantedPermissionsJson { get; set; } = "[]";
    public DateTimeOffset UpdatedAtUtc { get; set; }
    public Guid? UpdatedByUserId { get; set; }
}
