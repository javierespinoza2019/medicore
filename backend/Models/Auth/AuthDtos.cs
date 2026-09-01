namespace MediCore.Models.Auth;

public sealed class LoginRequest
{
    public string TenantCode { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public sealed class LoginResultDto
{
    public Guid UserId { get; set; }
    public Guid TenantId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string AccessToken { get; set; } = string.Empty;
    public int ExpiresInSeconds { get; set; }
    public IReadOnlyList<string> Roles { get; set; } = [];
    public IReadOnlyList<Guid> BranchIds { get; set; } = [];
    /// <summary>Códigos de sucursal (CENTRAL, NORTE, …). El cliente resuelve por código, no por GUID.</summary>
    public IReadOnlyList<string> BranchCodes { get; set; } = [];

    /// <summary>
    /// Profesional sanitario ligado a la cuenta, o <c>null</c> cuando el usuario no tiene
    /// profesional asociado. Nunca se rellena con un valor inventado: `null` significa
    /// «este usuario no es profesional sanitario», y el filtro clínico que dependa de esto
    /// debe fallar cerrado.
    /// </summary>
    public HealthcareProfessionalSessionDto? HealthcareProfessional { get; set; }

    /// <summary>Permisos efectivos del tenant para los roles del usuario (matriz §19 + defaults).</summary>
    public IReadOnlyDictionary<string, bool> Permissions { get; set; } = new Dictionary<string, bool>();

    /// <summary>Concesiones break-glass activas (#23).</summary>
    public IReadOnlyList<BreakGlassGrantDto> BreakGlassGrants { get; set; } = [];
}

public sealed class BreakGlassGrantDto
{
    public Guid GrantId { get; set; }
    public string PermissionKey { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAtUtc { get; set; }
}

public sealed class StartBreakGlassRequest
{
    public string Justification { get; set; } = string.Empty;
    public IReadOnlyList<string> PermissionKeys { get; set; } = [];
}

public sealed class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public sealed class BreakGlassGrantRow
{
    public Guid GrantId { get; set; }
    public Guid TenantId { get; set; }
    public Guid UserId { get; set; }
    public string Justification { get; set; } = string.Empty;
    public string GrantedPermissionsJson { get; set; } = "[]";
    public DateTimeOffset StartedAtUtc { get; set; }
    public DateTimeOffset ExpiresAtUtc { get; set; }
    public DateTimeOffset? RevokedAtUtc { get; set; }
}

/// <summary>
/// Lo mínimo del profesional que la sesión necesita. La cédula y la especialidad pueden
/// venir en <c>null</c> («no capturado»); no se sustituyen por texto de relleno.
/// El resto del perfil profesional (vigencias, certificación, contacto) es de Fase 1.
/// </summary>
public sealed class HealthcareProfessionalSessionDto
{
    public Guid HealthcareProfessionalId { get; set; }
    public string? ProfessionalLicense { get; set; }
    public string? Specialty { get; set; }
}

public sealed class UserAuthRow
{
    public Guid UserId { get; set; }
    public Guid TenantId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public bool IsSuperAdmin { get; set; }
    public int FailedLoginCount { get; set; }
    public DateTimeOffset? LockoutUntilUtc { get; set; }
    public string? RoleCodesCsv { get; set; }
    public string? BranchIdsCsv { get; set; }
    public string? BranchCodesCsv { get; set; }

    /// <summary>NULL cuando el usuario no tiene profesional sanitario vigente asociado.</summary>
    public Guid? HealthcareProfessionalId { get; set; }
    /// <summary>Cédula profesional. NULL = no capturada.</summary>
    public string? ProfessionalLicense { get; set; }
    /// <summary>Especialidad del catálogo del tenant. NULL = no capturada.</summary>
    public string? SpecialtyName { get; set; }
}

/// <summary>Fila de dbo.HealthcareProfessional tal como la devuelven sus SPs de consulta.</summary>
public sealed class HealthcareProfessionalRow
{
    public Guid HealthcareProfessionalId { get; set; }
    public Guid TenantId { get; set; }
    public Guid? UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? ProfessionalLicense { get; set; }
    public Guid? SpecialtyId { get; set; }
    public string? SpecialtyName { get; set; }
    public bool IsActive { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset? UpdatedAtUtc { get; set; }
}

public sealed class RefreshTokenRow
{
    public Guid RefreshTokenId { get; set; }
    public Guid UserId { get; set; }
    public Guid TenantId { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAtUtc { get; set; }
    public DateTimeOffset? RevokedAtUtc { get; set; }
}
