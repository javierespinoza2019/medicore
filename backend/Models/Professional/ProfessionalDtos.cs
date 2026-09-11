namespace MediCore.Models.Professional;

public sealed class ProfessionalDto
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

    /// <summary>UserName de la cuenta ligada (correo/acceso). Null si no hay liga.</summary>
    public string? LinkedUserName { get; set; }
    public string? LinkedUserDisplayName { get; set; }

    /// <summary>Primer consultorio activo (orden CreatedAtUtc). UI Readdy = un consultorio.</summary>
    public Guid? PrimaryRoomId { get; set; }
    public Guid? PrimaryBranchId { get; set; }
    public string? PrimaryBranchName { get; set; }
    public string? PrimaryRoomLabel { get; set; }

    /// <summary>Agregado de sucursales/consultorios vigentes (puede haber más de uno vía agenda).</summary>
    public string? BranchNames { get; set; }
    public string? RoomLabels { get; set; }
}

public sealed class CreateProfessionalRequest
{
    public Guid? HealthcareProfessionalId { get; set; }
    public Guid? UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? ProfessionalLicense { get; set; }
    public Guid? SpecialtyId { get; set; }
    public bool IsActive { get; set; } = true;
    /// <summary>Consultorio principal (prototipo). Opcional.</summary>
    public Guid? RoomId { get; set; }
}

public sealed class UpdateProfessionalRequest
{
    public Guid? UserId { get; set; }
    public bool ClearUserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? ProfessionalLicense { get; set; }
    public bool ClearProfessionalLicense { get; set; }
    public Guid? SpecialtyId { get; set; }
    public bool ClearSpecialtyId { get; set; }
    public bool IsActive { get; set; } = true;
    /// <summary>Si viene con valor, deja solo ese consultorio. Si null y ClearRoomAssignments, limpia.</summary>
    public Guid? RoomId { get; set; }
    public bool ClearRoomAssignments { get; set; }
}

public sealed class SpecialtyDto
{
    public Guid SpecialtyId { get; set; }
    public Guid TenantId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset? UpdatedAtUtc { get; set; }
}

public sealed class UpsertSpecialtyRequest
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}

public sealed class SoftDeleteResultDto
{
    public int RowsAffected { get; set; }
}
