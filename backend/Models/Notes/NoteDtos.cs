using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;

namespace MediCore.Models.Notes;

/// <summary>DTOs de notas clínicas (M6 / WS-H). Firma local + sello sin afirmar validez jurídica (pregunta G).</summary>

public static class NoteTypes
{
    public const string UrgenciasInicial = "urgencias_inicial";
    public const string Evolucion = "evolucion";
    public const string Interconsulta = "interconsulta";
    public const string ReferenciaTraslado = "referencia_traslado";
    public const string Egreso = "egreso";
    public const string Enfermeria = "enfermeria";
    public const string Certificado = "certificado";

    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        UrgenciasInicial, Evolucion, Interconsulta, ReferenciaTraslado, Egreso, Enfermeria, Certificado
    };
}

public static class SealStates
{
    public const string Pendiente = "pendiente";
    public const string Sellado = "sellado";
}

public sealed class ClinicalNoteDto
{
    public Guid NoteId { get; init; }
    public Guid TenantId { get; init; }
    public Guid EncounterId { get; init; }
    public Guid SubjectId { get; init; }
    public string NoteType { get; init; } = string.Empty;
    public JsonElement Body { get; set; }
    public string? Prognosis { get; init; }
    public Guid? AuthorProfessionalId { get; init; }
    public Guid AuthorUserId { get; init; }
    public string AuthorDisplayName { get; init; } = string.Empty;
    public string? AuthorLicenseSnapshot { get; init; }
    public string? FacilitySnapshotJson { get; init; }
    public string? ContentHash { get; init; }
    public DateTimeOffset? SignedAtUtc { get; init; }
    public DateTimeOffset? SealedAtUtc { get; init; }
    public string SealState { get; init; } = SealStates.Pendiente;
    public DateTimeOffset OccurredAtUtc { get; init; }
    public DateTimeOffset RecordedAtUtc { get; init; }
    public IReadOnlyList<NoteAddendumDto> Addenda { get; set; } = [];
    public IReadOnlyList<NoteCoAuthorDto> CoAuthors { get; set; } = [];

    /// <summary>
    /// Texto legible de integridad. No afirma validez jurídica plena ni e.firma SAT (pregunta G / #69).
    /// </summary>
    public string FirmaDescripcionLegible =>
        SignedAtUtc is null
            ? "Borrador sin firma."
            : SealState == SealStates.Sellado
                ? "Firma electrónica del sistema (integridad + sello). Alcance piloto: sin e.firma SAT; no se afirma cumplimiento NOM-004 5.10."
                : "Firma electrónica del sistema (integridad); sello pendiente de sync. Alcance piloto: sin e.firma SAT; no se afirma cumplimiento NOM-004 5.10.";
}

public sealed class NoteAddendumDto
{
    public Guid AddendumId { get; init; }
    public Guid TenantId { get; init; }
    public Guid NoteId { get; init; }
    public string ReasonText { get; init; } = string.Empty;
    public string? BodyJson { get; init; }
    public Guid ActorUserId { get; init; }
    public Guid? ActorProfessionalId { get; init; }
    public string ActorDisplayName { get; init; } = string.Empty;
    public DateTimeOffset OccurredAtUtc { get; init; }
    public DateTimeOffset RecordedAtUtc { get; init; }
}

public sealed class NoteCoAuthorDto
{
    public Guid CoAuthorId { get; init; }
    public Guid TenantId { get; init; }
    public Guid NoteId { get; init; }
    public Guid ProfessionalId { get; init; }
    public string? ProfessionalLicenseSnapshot { get; init; }
    public string FullNameSnapshot { get; init; } = string.Empty;
    public Guid AddedByUserId { get; init; }
    public DateTimeOffset AddedAtUtc { get; init; }
}

public sealed class PendingEvolutionDto
{
    public Guid EncounterId { get; init; }
    public Guid SubjectId { get; init; }
    public Guid BranchId { get; init; }
    public int TurnNumber { get; init; }
    public string EncounterState { get; init; } = string.Empty;
    public DateTimeOffset LastEvolUtc { get; init; }
    public DateTimeOffset DueAtUtc { get; init; }
    public int HoursThreshold { get; init; }
}

public sealed class CreateNoteRequest
{
    public string NoteType { get; set; } = string.Empty;
    public JsonElement Body { get; set; }
    public string? Prognosis { get; set; }
    public DateTimeOffset? OccurredAtUtc { get; set; }
}

public sealed class SignNoteRequest
{
    /// <summary>Opcional: el servidor recalcula el hash canónico; si llega, debe coincidir.</summary>
    public string? ContentHash { get; set; }
}

public sealed class AddNoteAddendumRequest
{
    public string ReasonText { get; set; } = string.Empty;
    public string? BodyJson { get; set; }
}

public sealed class AddCoAuthorRequest
{
    public Guid ProfessionalId { get; set; }
}

/// <summary>Snapshot de cédula/especialidad al firmar (LGS art. 83). Sin inventar certificado de especialidad.</summary>
public sealed class AuthorLicenseSnapshot
{
    [JsonPropertyName("professionalId")]
    public Guid ProfessionalId { get; init; }

    [JsonPropertyName("fullName")]
    public string FullName { get; init; } = string.Empty;

    [JsonPropertyName("professionalLicense")]
    public string ProfessionalLicense { get; init; } = string.Empty;

    [JsonPropertyName("specialtyId")]
    public Guid? SpecialtyId { get; init; }

    [JsonPropertyName("specialtyName")]
    public string? SpecialtyName { get; init; }
}

/// <summary>Snapshot establecimiento (NOM-004 5.2–5.2.4). Campos no capturados = null.</summary>
public sealed class FacilitySnapshot
{
    [JsonPropertyName("branchId")]
    public Guid BranchId { get; init; }

    [JsonPropertyName("facilityType")]
    public string? FacilityType { get; init; }

    [JsonPropertyName("legalName")]
    public string? LegalName { get; init; }

    [JsonPropertyName("addressStreet")]
    public string? AddressStreet { get; init; }

    [JsonPropertyName("addressNumber")]
    public string? AddressNumber { get; init; }

    [JsonPropertyName("addressNeighborhood")]
    public string? AddressNeighborhood { get; init; }

    [JsonPropertyName("addressMunicipality")]
    public string? AddressMunicipality { get; init; }

    [JsonPropertyName("addressState")]
    public string? AddressState { get; init; }

    [JsonPropertyName("addressPostalCode")]
    public string? AddressPostalCode { get; init; }

    [JsonPropertyName("phoneNumber")]
    public string? PhoneNumber { get; init; }

    [JsonPropertyName("healthLicense")]
    public string? HealthLicense { get; init; }
}

public static class NoteJson
{
    public static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.Never,
        WriteIndented = false
    };
}
