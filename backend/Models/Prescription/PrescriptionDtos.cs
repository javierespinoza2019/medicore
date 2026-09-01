using System.Text.Json;
using System.Text.Json.Serialization;
using MediCore.Models.Notes;

namespace MediCore.Models.Prescription;

/// <summary>DTOs de receta y catálogo (M8 / WS-I). Estupefacientes impedidos.</summary>

public static class SaleClassifications
{
    public const string I = "I";
    public const string II = "II";
    public const string III = "III";
    public const string IV = "IV";
    public const string V = "V";
    public const string VI = "VI";

    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        I, II, III, IV, V, VI
    };
}

public static class FrequencyKinds
{
    public const string EveryNHours = "every_n_hours";
    public const string NTimesPerDay = "n_times_per_day";

    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        EveryNHours, NTimesPerDay
    };
}

public static class PrescriptionSealStates
{
    public const string Pendiente = "pendiente";
    public const string Sellado = "sellado";
}

public sealed class MedicationDto
{
    public Guid MedicationId { get; init; }
    public Guid TenantId { get; init; }
    public string GenericName { get; init; } = string.Empty;
    public string? BrandName { get; init; }
    public string? Presentation { get; init; }
    public string? Concentration { get; init; }
    public string? DefaultRoute { get; init; }
    public string SaleClassification { get; init; } = SaleClassifications.IV;
    public bool IsControlledSubstance { get; init; }
    public bool IsActive { get; init; } = true;
}

public sealed class DoseDto
{
    /// <summary>Valor numérico cuando estado = medido.</summary>
    public decimal? Valor { get; set; }
    public string Unidad { get; set; } = string.Empty;
    /// <summary>medido | no_medido | no_valorable</summary>
    public string Estado { get; set; } = "medido";
    /// <summary>medido | estimado | declarado</summary>
    public string Origen { get; set; } = "medido";
    public string? RazonNoMedido { get; set; }
}

public sealed class FrequencyDto
{
    /// <summary>every_n_hours | n_times_per_day</summary>
    public string Kind { get; set; } = FrequencyKinds.EveryNHours;
    public int N { get; set; }
}

public sealed class PrescriptionItemDto
{
    public Guid PrescriptionItemId { get; init; }
    public Guid PrescriptionId { get; init; }
    public int LineNumber { get; init; }
    public Guid MedicationId { get; init; }
    public string GenericNameSnapshot { get; init; } = string.Empty;
    public string? BrandNameSnapshot { get; init; }
    public DoseDto Dose { get; set; } = new();
    public string Route { get; init; } = string.Empty;
    public FrequencyDto Frequency { get; set; } = new();
    public int? DurationDays { get; init; }
    public decimal? Quantity { get; init; }
    public int RefillsAllowed { get; init; }
    public string? Instructions { get; init; }
}

public sealed class PrescriptionDto
{
    public Guid PrescriptionId { get; init; }
    public Guid TenantId { get; init; }
    public Guid BranchId { get; init; }
    public Guid EncounterId { get; init; }
    public Guid SubjectId { get; init; }
    public Guid? ProfessionalId { get; init; }
    public Guid AuthorUserId { get; init; }
    public string AuthorDisplayName { get; init; } = string.Empty;
    public string? AuthorLicenseSnapshot { get; init; }
    public string? FacilitySnapshotJson { get; init; }
    public DateTimeOffset? IssuedAtUtc { get; init; }
    public DateTimeOffset? ValidUntilUtc { get; init; }
    public string AllergyStatusAtIssue { get; init; } = string.Empty;
    public Guid? AllergyStatusCaptureEventId { get; init; }
    public string? AllergyOverrideJustification { get; init; }
    public string? ContentHash { get; init; }
    public DateTimeOffset? SignedAtUtc { get; init; }
    public DateTimeOffset? SealedAtUtc { get; init; }
    public string SealState { get; init; } = PrescriptionSealStates.Pendiente;
    public DateTimeOffset? CancelledAtUtc { get; init; }
    public string? CancelReason { get; init; }
    public string? GeneralInstructions { get; init; }
    public DateTimeOffset OccurredAtUtc { get; init; }
    public DateTimeOffset RecordedAtUtc { get; init; }
    public IReadOnlyList<PrescriptionItemDto> Items { get; set; } = [];

    public string FirmaDescripcionLegible =>
        CancelledAtUtc is not null
            ? "Receta cancelada (reverso)."
            : SignedAtUtc is null
                ? "Borrador sin firma."
                : SealState == PrescriptionSealStates.Sellado
                    ? "Firma electrónica del sistema (integridad + sello). Alcance piloto: sin e.firma SAT; no se afirma cumplimiento NOM-004 5.10."
                    : "Firma electrónica del sistema (integridad); sello pendiente de sync. Alcance piloto: sin e.firma SAT; no se afirma cumplimiento NOM-004 5.10.";
}

public sealed class CreatePrescriptionItemRequest
{
    public Guid MedicationId { get; set; }
    public DoseDto Dose { get; set; } = new();
    public string Route { get; set; } = string.Empty;
    public FrequencyDto Frequency { get; set; } = new();
    public int? DurationDays { get; set; }
    public decimal? Quantity { get; set; }
    public int RefillsAllowed { get; set; }
    public string? Instructions { get; set; }
    public string? BrandNameSnapshot { get; set; }
}

public sealed class CreatePrescriptionRequest
{
    public List<CreatePrescriptionItemRequest> Items { get; set; } = [];
    public string? GeneralInstructions { get; set; }
    /// <summary>Justificación SC-02 si se prescribe sustancia con alergia conocida.</summary>
    public string? AllergyOverrideJustification { get; set; }
    /// <summary>Evento de captura explícita del estado alérgico (tras Set).</summary>
    public Guid? AllergyStatusCaptureEventId { get; set; }
    public DateTimeOffset? OccurredAtUtc { get; set; }
}

public sealed class SignPrescriptionRequest
{
    public string? ContentHash { get; set; }
}

public sealed class CancelPrescriptionRequest
{
    public string Reason { get; set; } = string.Empty;
}

public sealed class UpsertMedicationRequest
{
    public string GenericName { get; set; } = string.Empty;
    public string? BrandName { get; set; }
    public string? Presentation { get; set; }
    public string? Concentration { get; set; }
    public string? DefaultRoute { get; set; }
    public string SaleClassification { get; set; } = SaleClassifications.IV;
    public bool IsControlledSubstance { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>409: falta captura explícita del estado alérgico.</summary>
public sealed class PrescriptionAllergyCaptureRequiredException : InvalidOperationException
{
    public PrescriptionAllergyCaptureRequiredException()
        : base("Falta captura explícita del estado alérgico antes de prescritir. Registre el estado (puede ser no_interrogado o paciente_no_puede_responder) con rastro; no se bloquea hasta conocer las alergias.") { }

    public PrescriptionAllergyCaptureRequiredException(string message) : base(message) { }
}

/// <summary>422: medicamento controlado impedido.</summary>
public sealed class PrescriptionControlledSubstanceException : InvalidOperationException
{
    public const string DefaultMessage =
        "Medicamento controlado (estupefaciente/psicotrópico) impedido: fuera del alcance comercial (Fases 1–4). Su suministro requiere recetario especial con código de barras asignado por la autoridad (LGS arts. 240–241). No se implementan recetarios de controlados; reabrir solo con decisión escrita y Reglamento de Insumos verificado.";

    public PrescriptionControlledSubstanceException() : base(DefaultMessage) { }

    public PrescriptionControlledSubstanceException(string message) : base(message) { }
}

/// <summary>409: alergia conocida sin justificación (SC-02).</summary>
public sealed class PrescriptionAllergyOverrideRequiredException : InvalidOperationException
{
    public PrescriptionAllergyOverrideRequiredException()
        : base("Prescribir un medicamento al que el paciente refiere alergia exige justificación explícita registrada (SC-02).") { }

    public PrescriptionAllergyOverrideRequiredException(string message) : base(message) { }
}

public static class PrescriptionJson
{
    public static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = false
    };
}

/// <summary>Reuso de snapshots de Notes (cédula / establecimiento).</summary>
public static class PrescriptionSnapshots
{
    public static AuthorLicenseSnapshot FromProfessional(
        Guid professionalId, string fullName, string license, Guid? specialtyId, string? specialtyName) =>
        new()
        {
            ProfessionalId = professionalId,
            FullName = fullName,
            ProfessionalLicense = license,
            SpecialtyId = specialtyId,
            SpecialtyName = specialtyName
        };
}
