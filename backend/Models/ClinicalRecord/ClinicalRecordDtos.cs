using System.Text.Json;
using System.Text.Json.Serialization;

namespace MediCore.Models.ClinicalRecord;

/// <summary>DTOs del expediente clínico (M7 / WS-G).</summary>

public sealed class ClinicalRecordDto
{
    public Guid RecordId { get; init; }
    public Guid TenantId { get; init; }
    public Guid SubjectId { get; init; }
    public DateTimeOffset OpenedAtUtc { get; init; }
    /// <summary>
    /// Reloj de retención (NOM-004 5.4). Nullable: pregunta H / decisión 61 abierta —
    /// qué actos cuentan aún no está ratificado.
    /// </summary>
    public DateTimeOffset? LastMedicalActAtUtc { get; init; }
    public string? LastMedicalActType { get; init; }
    public DateTimeOffset CreatedAtUtc { get; init; }
    public DateTimeOffset UpdatedAtUtc { get; init; }
    public MedicalHistoryDto? CurrentHistory { get; set; }
    public AllergyStatusDto AllergyStatus { get; set; } = AllergyStatusDto.NoInterrogadoPlaceholder();
    public IReadOnlyList<AllergyDto> Allergies { get; set; } = [];
    public IReadOnlyList<SubjectFlagDto> Flags { get; set; } = [];
}

public sealed class MedicalHistoryDto
{
    public Guid HistoryId { get; init; }
    public Guid TenantId { get; init; }
    public Guid RecordId { get; init; }
    public Guid SubjectId { get; init; }
    public int Version { get; init; }
    public MedicalHistoryBody Body { get; set; } = MedicalHistoryBody.EmptyNoInterrogado();
    public string Origin { get; init; } = HistoryOrigins.Capturado;
    public Guid ActorUserId { get; init; }
    public Guid? ActorProfessionalId { get; init; }
    public string ActorDisplayName { get; init; } = string.Empty;
    public DateTimeOffset OccurredAtUtc { get; init; }
    public DateTimeOffset RecordedAtUtc { get; init; }
    public IReadOnlyList<AmendmentDto> Amendments { get; set; } = [];
}

public sealed class AmendmentDto
{
    public Guid AmendmentId { get; init; }
    public Guid TenantId { get; init; }
    public Guid RecordId { get; init; }
    public Guid HistoryId { get; init; }
    public string ReasonText { get; init; } = string.Empty;
    public string? BodyJson { get; init; }
    public Guid ActorUserId { get; init; }
    public Guid? ActorProfessionalId { get; init; }
    public string ActorDisplayName { get; init; } = string.Empty;
    public DateTimeOffset OccurredAtUtc { get; init; }
    public DateTimeOffset RecordedAtUtc { get; init; }
}

public sealed class AllergyStatusDto
{
    public Guid? StatusEventId { get; init; }
    public Guid? RecordId { get; init; }
    public Guid? SubjectId { get; init; }
    /// <summary>no_interrogado | niega | refiere | se_desconoce | paciente_no_puede_responder</summary>
    public string Status { get; init; } = AllergyStatusCodes.NoInterrogado;
    public Guid? ActorUserId { get; init; }
    public Guid? ActorProfessionalId { get; init; }
    public string? ActorDisplayName { get; init; }
    public DateTimeOffset? OccurredAtUtc { get; init; }
    public DateTimeOffset? RecordedAtUtc { get; init; }

    public static AllergyStatusDto NoInterrogadoPlaceholder() => new()
    {
        Status = AllergyStatusCodes.NoInterrogado
    };
}

public sealed class AllergyDto
{
    public Guid AllergyId { get; init; }
    public Guid TenantId { get; init; }
    public Guid RecordId { get; init; }
    public Guid SubjectId { get; init; }
    public string Substance { get; init; } = string.Empty;
    public string ReactionType { get; init; } = string.Empty;
    public string? Category { get; init; }
    public string? Manifestation { get; init; }
    public string? Severity { get; init; }
    public string? Certainty { get; init; }
    public string? DataOrigin { get; init; }
    public Guid ActorUserId { get; init; }
    public Guid? ActorProfessionalId { get; init; }
    public string ActorDisplayName { get; init; } = string.Empty;
    public DateTimeOffset OccurredAtUtc { get; init; }
    public DateTimeOffset RecordedAtUtc { get; init; }
}

public sealed class SubjectFlagDto
{
    public Guid FlagId { get; init; }
    public Guid TenantId { get; init; }
    public Guid SubjectId { get; init; }
    public Guid RecordId { get; init; }
    public string FlagType { get; init; } = string.Empty;
    public string? PayloadJson { get; init; }
    public bool IsActive { get; init; }
    public Guid ActorUserId { get; init; }
    public Guid? ActorProfessionalId { get; init; }
    public string ActorDisplayName { get; init; } = string.Empty;
    public DateTimeOffset OccurredAtUtc { get; init; }
    public DateTimeOffset RecordedAtUtc { get; init; }
}

/// <summary>
/// Cuerpo tipado de historia. Cada sección es EstadoInterrogatorio (JSON).
/// Fábrica vacía → todo no_interrogado; nunca negado/normal.
/// </summary>
public sealed class MedicalHistoryBody
{
    public InterrogatorioCampo HeredoFamiliares { get; set; } = InterrogatorioCampo.NoInterrogado();
    public InterrogatorioCampo PersonalesPatologicos { get; set; } = InterrogatorioCampo.NoInterrogado();
    public InterrogatorioCampo PersonalesNoPatologicos { get; set; } = InterrogatorioCampo.NoInterrogado();
    public InterrogatorioCampo GinecoObstetricos { get; set; } = InterrogatorioCampo.NoInterrogado();
    public InterrogatorioCampo AparatosYSistemas { get; set; } = InterrogatorioCampo.NoInterrogado();
    public InterrogatorioCampo HabitusExterior { get; set; } = InterrogatorioCampo.NoInterrogado();
    public InterrogatorioCampo PadecimientoActual { get; set; } = InterrogatorioCampo.NoInterrogado();
    public string? Observaciones { get; set; }

    public static MedicalHistoryBody EmptyNoInterrogado() => new();

    public static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.Never,
        PropertyNameCaseInsensitive = true,
        WriteIndented = false
    };

    public string ToJson() => JsonSerializer.Serialize(this, JsonOptions);

    public static MedicalHistoryBody FromJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return EmptyNoInterrogado();
        return JsonSerializer.Deserialize<MedicalHistoryBody>(json, JsonOptions)
               ?? EmptyNoInterrogado();
    }
}

/// <summary>
/// Espejo JSON de EstadoInterrogatorio: estado + valor opcional (JsonElement).
/// Lista vacía con estado conocido ≠ no_interrogado.
/// </summary>
public sealed class InterrogatorioCampo
{
    public string Estado { get; set; } = InterrogatorioEstados.NoInterrogado;
    public JsonElement? Valor { get; set; }

    public static InterrogatorioCampo NoInterrogado() => new()
    {
        Estado = InterrogatorioEstados.NoInterrogado,
        Valor = null
    };
}

public static class InterrogatorioEstados
{
    public const string NoInterrogado = "no_interrogado";
    public const string SeDesconoce = "se_desconoce";
    public const string NoAplica = "no_aplica";
    public const string Conocido = "conocido";

    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        NoInterrogado, SeDesconoce, NoAplica, Conocido
    };
}

public static class AllergyStatusCodes
{
    public const string NoInterrogado = "no_interrogado";
    public const string Niega = "niega";
    public const string Refiere = "refiere";
    public const string SeDesconoce = "se_desconoce";
    public const string PacienteNoPuedeResponder = "paciente_no_puede_responder";

    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        NoInterrogado, Niega, Refiere, SeDesconoce, PacienteNoPuedeResponder
    };
}

public static class AllergyReactionTypes
{
    public const string Alergia = "alergia";
    public const string Intolerancia = "intolerancia";
    public const string EfectoAdverso = "efecto_adverso_conocido";

    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        Alergia, Intolerancia, EfectoAdverso
    };
}

public static class HistoryOrigins
{
    public const string Capturado = "capturado";
    public const string PrellenadoPorSistema = "prellenado_por_sistema";
}

public static class SubjectFlagTypes
{
    public const string AlergiaGrave = "alergia_grave";
    public const string Riesgo = "riesgo";
    public const string Embarazo = "embarazo";
    public const string Otro = "otro";

    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        AlergiaGrave, Riesgo, Embarazo, Otro
    };
}

public sealed class SaveMedicalHistoryRequest
{
    public MedicalHistoryBody? Body { get; set; }
    public string? BodyJson { get; set; }
    public string Origin { get; set; } = HistoryOrigins.Capturado;
}

public sealed class AddAmendmentRequest
{
    public Guid? HistoryId { get; set; }
    public string ReasonText { get; set; } = string.Empty;
    public string? BodyJson { get; set; }
}

public sealed class SetAllergyStatusRequest
{
    public string Status { get; set; } = string.Empty;
}

public sealed class AddAllergyRequest
{
    public string Substance { get; set; } = string.Empty;
    public string ReactionType { get; set; } = AllergyReactionTypes.Alergia;
    public string? Category { get; set; }
    public string? Manifestation { get; set; }
    public string? Severity { get; set; }
    public string? Certainty { get; set; }
    public string? DataOrigin { get; set; }
}

public sealed class SetSubjectFlagRequest
{
    public string FlagType { get; set; } = string.Empty;
    public string? PayloadJson { get; set; }
    public bool IsActive { get; set; } = true;
}
