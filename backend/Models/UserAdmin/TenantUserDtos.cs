namespace MediCore.Models.UserAdmin;

/// <summary>Estado operativo de cuenta para UI (activo / inactivo / bloqueado por lockout).</summary>
public static class TenantUserStatuses
{
    public const string Activo = "activo";
    public const string Inactivo = "inactivo";
    public const string Bloqueado = "bloqueado";
}

public sealed class TenantUserDto
{
    public Guid UserId { get; set; }
    public Guid TenantId { get; set; }
    public string UserName { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public bool IsActive { get; set; }
    public bool IsSuperAdmin { get; set; }
    public bool IsLockedOut { get; set; }
    /// <summary>activo | inactivo | bloqueado (derivado; no se inventa).</summary>
    public string Status { get; set; } = TenantUserStatuses.Inactivo;
    public IReadOnlyList<string> RoleCodes { get; set; } = [];
    public IReadOnlyList<Guid> BranchIds { get; set; } = [];
    public Guid? HealthcareProfessionalId { get; set; }
    public string? ProfessionalDisplayName { get; set; }
    public string? ProfessionalLicense { get; set; }
    public string? SpecialtyName { get; set; }
    public DateTime? LastAccessUtc { get; set; }
    public DateTime? LockoutUntilUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}

public sealed class CreateTenantUserRequest
{
    public Guid? UserId { get; set; }
    public string UserName { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string Password { get; set; } = "";
    public bool IsActive { get; set; } = true;
    public IReadOnlyList<string> RoleCodes { get; set; } = [];
    public IReadOnlyList<Guid> BranchIds { get; set; } = [];
}

public sealed class UpdateTenantUserRequest
{
    public string DisplayName { get; set; } = "";
    /// <summary>activo | inactivo | bloqueado. Si null, se usa IsActive (compat).</summary>
    public string? Status { get; set; }
    public bool IsActive { get; set; } = true;
    public IReadOnlyList<string> RoleCodes { get; set; } = [];
    public IReadOnlyList<Guid> BranchIds { get; set; } = [];
}

public sealed class SetTenantUserPasswordRequest
{
    public string NewPassword { get; set; } = "";
}

/// <summary>Fila cruda de SP (CSV de roles/sucursales).</summary>
public sealed class TenantUserRow
{
    public Guid UserId { get; set; }
    public Guid TenantId { get; set; }
    public string UserName { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public bool IsActive { get; set; }
    public bool IsSuperAdmin { get; set; }
    public bool IsLockedOut { get; set; }
    public DateTime? LockoutUntilUtc { get; set; }
    public string? RoleCodesCsv { get; set; }
    public string? BranchIdsCsv { get; set; }
    public Guid? HealthcareProfessionalId { get; set; }
    public string? ProfessionalDisplayName { get; set; }
    public string? ProfessionalLicense { get; set; }
    public string? SpecialtyName { get; set; }
    public DateTime? LastAccessUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}
