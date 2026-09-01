using System.Text.Json;

namespace MediCore.Models.Triage;

/// <summary>
/// Códigos canónicos de signos vitales (M5). Ninguno es obligatorio para guardar.
/// «No tomado» = estado no_medido con razón explícita. Prohibido fabricar 0.
/// </summary>
public static class VitalSignCodes
{
    public const string Temperatura = "temperatura";
    public const string TensionSistolica = "tension_sistolica";
    public const string TensionDiastolica = "tension_diastolica";
    public const string FrecuenciaCardiaca = "frecuencia_cardiaca";
    public const string FrecuenciaRespiratoria = "frecuencia_respiratoria";
    public const string Saturacion = "saturacion";
    public const string Glucosa = "glucosa";
    public const string Peso = "peso";
    public const string Talla = "talla";

    public static readonly IReadOnlyList<string> Canonical =
    [
        Temperatura, TensionSistolica, TensionDiastolica, FrecuenciaCardiaca,
        FrecuenciaRespiratoria, Saturacion, Glucosa, Peso, Talla
    ];

    public static string DefaultUnit(string signCode) => signCode.ToLowerInvariant() switch
    {
        Temperatura => "C",
        TensionSistolica or TensionDiastolica => "mmHg",
        FrecuenciaCardiaca => "lpm",
        FrecuenciaRespiratoria => "rpm",
        Saturacion => "%",
        Glucosa => "mg/dL",
        Peso => "kg",
        Talla => "m",
        _ => "u"
    };
}

public static class VitalMeasurementStates
{
    public const string Medido = "medido";
    public const string NoMedido = "no_medido";
    public const string NoValorable = "no_valorable";

    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        Medido, NoMedido, NoValorable
    };
}

public static class VitalMeasurementSources
{
    public const string Medido = "medido";
    public const string Estimado = "estimado";
    public const string Declarado = "declarado";

    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        Medido, Estimado, Declarado
    };
}

public static class PainAssessableCodes
{
    public const string Valorable = "valorable";
    public const string NoValorable = "no_valorable";
}

public static class VitalSourceContexts
{
    public const string Triage = "triage";
    public const string Evolucion = "evolucion";
    public const string Otro = "otro";
}

/// <summary>Nivel de la escala configurada (no enum fijo de producto).</summary>
public sealed class TriageScaleLevelDto
{
    public string Code { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int Priority { get; set; }
    public string? Icon { get; set; }
    public string? SortHint { get; set; }
}

public sealed class TriageScaleLevelsDocument
{
    public List<TriageScaleLevelDto> Levels { get; set; } = [];
    public string? Note { get; set; }
}

public sealed class TriageScaleConfigDto
{
    public Guid ConfigId { get; set; }
    public Guid TenantId { get; set; }
    public Guid? BranchId { get; set; }
    public string ScaleCode { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string LevelsJson { get; set; } = string.Empty;
    public IReadOnlyList<TriageScaleLevelDto> Levels { get; set; } = [];
    public bool IsActive { get; set; }
    public string ResolvedFrom { get; set; } = "tenant"; // tenant | branch
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
}

public sealed class UpsertTriageScaleRequest
{
    public string ScaleCode { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public List<TriageScaleLevelDto> Levels { get; set; } = [];
    public string? Note { get; set; }
}

public sealed class VitalMeasurementDto
{
    public Guid? MeasurementId { get; set; }
    public Guid? VitalSetId { get; set; }
    public string SignCode { get; set; } = string.Empty;
    public decimal? Value { get; set; }
    public string Unit { get; set; } = string.Empty;
    public string State { get; set; } = VitalMeasurementStates.NoMedido;
    public string Source { get; set; } = VitalMeasurementSources.Medido;
    public string? NotMeasuredReason { get; set; }
}

public sealed class VitalSetDto
{
    public Guid VitalSetId { get; set; }
    public Guid EncounterId { get; set; }
    public Guid? TriageId { get; set; }
    public string SourceContext { get; set; } = VitalSourceContexts.Triage;
    public DateTimeOffset OccurredAtUtc { get; set; }
    public DateTimeOffset RecordedAtUtc { get; set; }
    public IReadOnlyList<VitalMeasurementDto> Measurements { get; set; } = [];
}

public sealed class TriageDto
{
    public Guid TriageId { get; set; }
    public Guid EncounterId { get; set; }
    public string? Level { get; set; }
    public string ScaleCode { get; set; } = string.Empty;
    public Guid? ScaleConfigId { get; set; }
    public int? LevelPriority { get; set; }
    public string? ChiefComplaint { get; set; }
    public int? PainScore { get; set; }
    public string PainAssessable { get; set; } = PainAssessableCodes.Valorable;
    public Guid? ClassifiedByProfessionalId { get; set; }
    public Guid ActorUserId { get; set; }
    public Guid? ActorProfessionalId { get; set; }
    public string ActorDisplayName { get; set; } = string.Empty;
    public DateTimeOffset OccurredAtUtc { get; set; }
    public DateTimeOffset RecordedAtUtc { get; set; }
    public Guid? VitalSetId { get; set; }
    public IReadOnlyList<VitalMeasurementDto> Vitals { get; set; } = [];
}

public sealed class SaveTriageRequest
{
    /// <summary>null = sin_clasificar (SC-03: no hay nivel por omisión).</summary>
    public string? Level { get; set; }
    public string? ChiefComplaint { get; set; }
    public int? PainScore { get; set; }
    public string? PainAssessable { get; set; }
    /// <summary>
    /// Mediciones enviadas. Las faltantes del set canónico se completan como
    /// no_medido con razón «no tomado» (nunca se inventa magnitud).
    /// </summary>
    public List<VitalMeasurementDto>? Vitals { get; set; }
    public DateTimeOffset? OccurredAtUtc { get; set; }
}

public sealed class ReclassifyTriageRequest
{
    public string Level { get; set; } = string.Empty;
    public string? ChiefComplaint { get; set; }
    public int? PainScore { get; set; }
    public string? PainAssessable { get; set; }
    public List<VitalMeasurementDto>? Vitals { get; set; }
    public DateTimeOffset? OccurredAtUtc { get; set; }
}

public sealed class AppendVitalsRequest
{
    public List<VitalMeasurementDto> Vitals { get; set; } = [];
    public string? SourceContext { get; set; }
    public DateTimeOffset? OccurredAtUtc { get; set; }
}

public static class TriageScaleJson
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public static IReadOnlyList<TriageScaleLevelDto> ParseLevels(string levelsJson)
    {
        if (string.IsNullOrWhiteSpace(levelsJson))
            return [];

        var doc = JsonSerializer.Deserialize<TriageScaleLevelsDocument>(levelsJson, Options);
        return doc?.Levels?
            .Where(l => !string.IsNullOrWhiteSpace(l.Code))
            .OrderBy(l => l.Priority)
            .ToList() ?? [];
    }

    public static string SerializeLevels(IEnumerable<TriageScaleLevelDto> levels, string? note = null)
    {
        var doc = new TriageScaleLevelsDocument
        {
            Levels = levels.ToList(),
            Note = note
        };
        return JsonSerializer.Serialize(doc, Options);
    }

    public static string SerializeVitals(IEnumerable<VitalMeasurementDto> vitals) =>
        JsonSerializer.Serialize(vitals.Select(v => new
        {
            signCode = v.SignCode,
            value = v.Value,
            unit = v.Unit,
            state = v.State,
            source = v.Source,
            notMeasuredReason = v.NotMeasuredReason
        }), Options);
}
