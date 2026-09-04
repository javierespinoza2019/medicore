namespace MediCore.Models.Tenant;

public sealed class TenantProfileDto
{
    public Guid TenantId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    /// <summary>Razón social. null = no capturada (NOM-004 5.2.2).</summary>
    public string? LegalName { get; set; }
    /// <summary>null = no capturado; se usará en Fase 2 (CFDI).</summary>
    public string? Rfc { get; set; }
    /// <summary>Token white-label. null = sin personalizar.</summary>
    public string? PrimaryColorToken { get; set; }
    /// <summary>Ruta relativa bajo files/. null = sin logo de organización.</summary>
    public string? LogoRelativePath { get; set; }
    public bool IsActive { get; set; }
}

public sealed class UpdateTenantProfileRequest
{
    public string? LegalName { get; set; }
    public string? Rfc { get; set; }
    public string? PrimaryColorToken { get; set; }
    public string? Name { get; set; }
}

public sealed class BranchDto
{
    public Guid BranchId { get; set; }
    public Guid TenantId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    /// <summary>
    /// Tipo de establecimiento. null = pendiente de la pregunta abierta L
    /// (responsable sanitario / doc 06 pregunta 10). Nunca se inventa.
    /// </summary>
    public string? FacilityType { get; set; }
    public string? LegalName { get; set; }
    public string? AddressStreet { get; set; }
    public string? AddressNumber { get; set; }
    public string? AddressNeighborhood { get; set; }
    public string? AddressMunicipality { get; set; }
    public string? AddressState { get; set; }
    public string? AddressPostalCode { get; set; }
    public string? PhoneNumber { get; set; }
    public string? HealthLicense { get; set; }
    public Guid? ResponsiblePhysicianProfessionalId { get; set; }
    public string? TimeZoneId { get; set; }
    /// <summary>
    /// null = pendiente de la pregunta abierta L. No se asume false ni true.
    /// </summary>
    public bool? HasEmergencyService { get; set; }
    /// <summary>Ruta relativa bajo files/. null = hereda logo del tenant.</summary>
    public string? LogoRelativePath { get; set; }
    public bool IsActive { get; set; }
}

public sealed class UpsertBranchRequest
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    /// <summary>Dejar null hasta respuesta del responsable sanitario (pregunta L).</summary>
    public string? FacilityType { get; set; }
    public string? LegalName { get; set; }
    public string? AddressStreet { get; set; }
    public string? AddressNumber { get; set; }
    public string? AddressNeighborhood { get; set; }
    public string? AddressMunicipality { get; set; }
    public string? AddressState { get; set; }
    public string? AddressPostalCode { get; set; }
    public string? PhoneNumber { get; set; }
    public string? HealthLicense { get; set; }
    public Guid? ResponsiblePhysicianProfessionalId { get; set; }
    public string? TimeZoneId { get; set; }
    public bool? HasEmergencyService { get; set; }
    public bool IsActive { get; set; } = true;
}
