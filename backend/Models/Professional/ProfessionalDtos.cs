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
}

public sealed class CreateProfessionalRequest
{
    public Guid? HealthcareProfessionalId { get; set; }
    public Guid? UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? ProfessionalLicense { get; set; }
    public Guid? SpecialtyId { get; set; }
    public bool IsActive { get; set; } = true;
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
