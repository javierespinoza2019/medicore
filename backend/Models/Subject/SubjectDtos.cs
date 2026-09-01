namespace MediCore.Models.Subject;

/// <summary>DTO serializable de edad estimada (espejo de EdadEstimada; sin inventar 0).</summary>
public sealed class EstimatedAgeDto
{
    public int Valor { get; set; }
    public string Unidad { get; set; } = string.Empty; // anios | meses | dias
    public int? RangoMin { get; set; }
    public int? RangoMax { get; set; }
    public string Origen { get; set; } = string.Empty; // calculada | estimada | declarada
}

public static class EstimatedAgeJson
{
    public static EstimatedAgeDto? TryParse(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(json);
            var r = doc.RootElement;
            return new EstimatedAgeDto
            {
                Valor = r.GetProperty("valor").GetInt32(),
                Unidad = r.GetProperty("unidad").GetString() ?? string.Empty,
                RangoMin = r.TryGetProperty("rangoMin", out var min) && min.ValueKind != System.Text.Json.JsonValueKind.Null
                    ? min.GetInt32() : null,
                RangoMax = r.TryGetProperty("rangoMax", out var max) && max.ValueKind != System.Text.Json.JsonValueKind.Null
                    ? max.GetInt32() : null,
                Origen = r.GetProperty("origen").GetString() ?? string.Empty
            };
        }
        catch
        {
            return null;
        }
    }
}

/// <summary>Estados de identificación (doc 08 §2). Sin booleano esAnonimo.</summary>
public static class IdentificationStates
{
    public const string NoIdentificado = "no_identificado";
    public const string DeclaradaSinDocumento = "declarada_sin_documento";
    public const string VerificadaConDocumento = "verificada_con_documento";
    public const string Rectificada = "rectificada";
    public const string NoRecuperable = "no_recuperable";

    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        NoIdentificado, DeclaradaSinDocumento, VerificadaConDocumento, Rectificada, NoRecuperable
    };
}

/// <summary>
/// Sexo biológico clínico. Sin valor por omisión (SC-15).
/// Identidad de género es campo aparte (<see cref="GenderIdentityCodes"/>); no mezclar (opción B 2026-08-28).
/// </summary>
public static class BiologicalSexCodes
{
    public const string Masculino = "masculino";
    public const string Femenino = "femenino";
    public const string NoDeterminado = "no_determinado";
    public const string NoEspecificado = "no_especificado";

    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        Masculino, Femenino, NoDeterminado, NoEspecificado
    };
}

public static class SexSourceCodes
{
    public const string Documento = "documento";
    public const string Observado = "observado";
    public const string Declarado = "declarado";

    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        Documento, Observado, Declarado
    };
}

/// <summary>
/// Identidad de género opcional (trato / GIIS Consulta Externa). Códigos GIIS-B015-02-09:
/// 0 no especificado · 1 masculino · 2 femenino · 3 transgénero · 4 transexual · 5 travesti · 6 intersexual · 88 otro.
/// NULL en Subject = no capturado (no fabricar). Prohibido usar en dosis, rangos, triage o reporte Urgencias SEUL.
/// </summary>
public static class GenderIdentityCodes
{
    public const string NoEspecificado = "0";
    public const string Masculino = "1";
    public const string Femenino = "2";
    public const string Transgenero = "3";
    public const string Transexual = "4";
    public const string Travesti = "5";
    public const string Intersexual = "6";
    public const string Otro = "88";

    public static readonly HashSet<string> All = new(StringComparer.Ordinal)
    {
        NoEspecificado, Masculino, Femenino, Transgenero, Transexual, Travesti, Intersexual, Otro
    };
}

public static class LateralityCodes
{
    public const string Izquierda = "izquierda";
    public const string Derecha = "derecha";
    public const string Bilateral = "bilateral";
    public const string LineaMedia = "linea_media";
    public const string NoAplica = "no_aplica";

    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        Izquierda, Derecha, Bilateral, LineaMedia, NoAplica
    };
}

public sealed class SubjectDto
{
    public Guid SubjectId { get; set; }
    public Guid TenantId { get; set; }
    public Guid OriginBranchId { get; set; }
    public string? RecordNumber { get; set; }
    public string IdentificationState { get; set; } = IdentificationStates.NoIdentificado;
    public string? GivenName { get; set; }
    public string? FirstSurname { get; set; }
    public string? SecondSurname { get; set; }
    public string? PreferredName { get; set; }
    public DateOnly? BirthDate { get; set; }
    public EstimatedAgeDto? EstimatedAge { get; set; }
    public string? BiologicalSex { get; set; }
    public string? SexSource { get; set; }
    /// <summary>Identidad de género opcional (códigos GIIS). Null = no capturado. No usar en clínica.</summary>
    public string? GenderIdentity { get; set; }
    public string? Curp { get; set; }
    public DateTimeOffset? CurpValidatedAtUtc { get; set; }
    public DateTimeOffset? DeceasedAtUtc { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
    public Guid? RequestedSubjectId { get; set; }
    public Guid ResolvedSubjectId { get; set; }
    public SubjectTemporaryLabelDto? ActiveLabel { get; set; }
    public SubjectDescriptorDto? Descriptor { get; set; }
    public IReadOnlyList<SubjectDistinctiveMarkDto> Marks { get; set; } = [];
    public IReadOnlyList<SubjectBelongingDto> Belongings { get; set; } = [];
}

public sealed class SubjectListItemDto
{
    public Guid SubjectId { get; set; }
    public Guid TenantId { get; set; }
    public Guid OriginBranchId { get; set; }
    public string? RecordNumber { get; set; }
    public string IdentificationState { get; set; } = string.Empty;
    public string? GivenName { get; set; }
    public string? FirstSurname { get; set; }
    public string? SecondSurname { get; set; }
    public string? PreferredName { get; set; }
    public DateOnly? BirthDate { get; set; }
    public string? BiologicalSex { get; set; }
    public string? GenderIdentity { get; set; }
    public string? Curp { get; set; }
    public string? OperationalLabel { get; set; }
    public string? InternalCode { get; set; }
    public string? ApparentSex { get; set; }
    public string? ApparentAgeRange { get; set; }
    public DateTimeOffset? ArrivalAtUtc { get; set; }
    public string? DescriptorFreeText { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
}

public sealed class SubjectTemporaryLabelDto
{
    public Guid LabelId { get; set; }
    public Guid TenantId { get; set; }
    public Guid SubjectId { get; set; }
    public Guid BranchId { get; set; }
    public string InternalCode { get; set; } = string.Empty;
    public string OperationalLabel { get; set; } = string.Empty;
    public string? ConfigSnapshotJson { get; set; }
    public DateTimeOffset IssuedAtUtc { get; set; }
    public Guid? DeviceId { get; set; }
    public bool IsActive { get; set; }
}

public sealed class SubjectDescriptorDto
{
    public Guid DescriptorId { get; set; }
    public Guid SubjectId { get; set; }
    public string? ApparentSex { get; set; }
    public string? ApparentAgeRange { get; set; }
    public DateTimeOffset? ArrivalAtUtc { get; set; }
    public string? FreeText { get; set; }
}

public sealed class SubjectDistinctiveMarkDto
{
    public Guid MarkId { get; set; }
    public Guid SubjectId { get; set; }
    public string? RawText { get; set; }
    public string? MarkType { get; set; }
    public string? AnatomicalRegion { get; set; }
    public string? Laterality { get; set; }
    public string? Description { get; set; }
    public DateTimeOffset? StructuredAtUtc { get; set; }
    public Guid ActorUserId { get; set; }
    public string ActorDisplayName { get; set; } = string.Empty;
    public DateTimeOffset OccurredAtUtc { get; set; }
    public DateTimeOffset RecordedAtUtc { get; set; }
}

public sealed class SubjectBelongingDto
{
    public Guid BelongingId { get; set; }
    public Guid SubjectId { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? Category { get; set; }
    public Guid ActorUserId { get; set; }
    public DateTimeOffset OccurredAtUtc { get; set; }
}

public sealed class UnidentifiedLabelConfigDto
{
    public Guid ConfigId { get; set; }
    public Guid TenantId { get; set; }
    public Guid? BranchId { get; set; }
    public string SchemeCode { get; set; } = string.Empty;
    public string SchemeParamsJson { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public string ResolvedFrom { get; set; } = string.Empty;
}

public sealed class CreateSubjectRequest
{
    /// <summary>Único campo obligatorio. Nombre/CURP/sexo/nacimiento/pago/consentimiento son opcionales.</summary>
    public Guid BranchId { get; set; }
    public string? GivenName { get; set; }
    public string? FirstSurname { get; set; }
    public string? SecondSurname { get; set; }
    public string? PreferredName { get; set; }
    public DateOnly? BirthDate { get; set; }
    public EstimatedAgeDto? EstimatedAge { get; set; }
    public string? BiologicalSex { get; set; }
    public string? SexSource { get; set; }
    /// <summary>Opcional. Null/omitido = no capturado. No bloquea ingreso ni alimenta dosis.</summary>
    public string? GenderIdentity { get; set; }
    public string? Curp { get; set; }
    public string? ApparentSex { get; set; }
    public string? ApparentAgeRange { get; set; }
    public DateTimeOffset? ArrivalAtUtc { get; set; }
    public string? DescriptorFreeText { get; set; }
    public string? MarkRawText { get; set; }
    /// <summary>Si true (o si no hay nombre), se emite etiqueta temporal según config efectiva.</summary>
    public bool? AsUnidentified { get; set; }

    /// <summary>
    /// Id generado en estación (cola offline). Si viene, el sync lo respeta; si no, el servidor asigna uno nuevo.
    /// </summary>
    public Guid? ClientSubjectId { get; set; }
}

public sealed class UpdateIdentityRequest
{
    public string? GivenName { get; set; }
    public string? FirstSurname { get; set; }
    public string? SecondSurname { get; set; }
    public string? PreferredName { get; set; }
    public DateOnly? BirthDate { get; set; }
    public bool ClearBirthDate { get; set; }
    public EstimatedAgeDto? EstimatedAge { get; set; }
    public bool ClearEstimatedAge { get; set; }
    public string? BiologicalSex { get; set; }
    public bool ClearBiologicalSex { get; set; }
    public string? SexSource { get; set; }
    public string? GenderIdentity { get; set; }
    public bool ClearGenderIdentity { get; set; }
    public string? Curp { get; set; }
    public bool ClearCurp { get; set; }
}

public sealed class TransitionIdentityStateRequest
{
    public string ToState { get; set; } = string.Empty;
    public string? EvidenceType { get; set; }
    public string? EvidenceReference { get; set; }
    public string? Justification { get; set; }
}

public sealed class IdentityStateEventDto
{
    public Guid EventId { get; set; }
    public Guid SubjectId { get; set; }
    public string? FromState { get; set; }
    public string ToState { get; set; } = string.Empty;
    public string? EvidenceType { get; set; }
    public string? EvidenceReference { get; set; }
    public string? Justification { get; set; }
    public string ProjectedState { get; set; } = string.Empty;
    public DateTimeOffset OccurredAtUtc { get; set; }
    public DateTimeOffset RecordedAtUtc { get; set; }
}

public sealed class AddDistinctiveMarkRequest
{
    public string? RawText { get; set; }
    public string? MarkType { get; set; }
    public string? AnatomicalRegion { get; set; }
    public string? Laterality { get; set; }
    public string? Description { get; set; }
}

public sealed class AddBelongingRequest
{
    public string Description { get; set; } = string.Empty;
    public string? Category { get; set; }
}

public sealed class SearchByDescriptionRequest
{
    public Guid? BranchId { get; set; }
    public string? ApparentSex { get; set; }
    public int? AgeMin { get; set; }
    public int? AgeMax { get; set; }
    public string? MarkType { get; set; }
    public string? AnatomicalRegion { get; set; }
    public string? Laterality { get; set; }
    public DateTimeOffset? ArrivalFromUtc { get; set; }
    public DateTimeOffset? ArrivalToUtc { get; set; }
}

public sealed class DescriptionMatchDto
{
    public Guid SubjectId { get; set; }
    public string? OperationalLabel { get; set; }
    public DateTimeOffset? ArrivalAtUtc { get; set; }
}

public sealed class DescriptionSearchResultDto
{
    public int MatchCount { get; set; }
    public IReadOnlyList<DescriptionMatchDto> Matches { get; set; } = [];
}

public sealed class LinkSubjectsRequest
{
    public Guid AbsorbedSubjectId { get; set; }
    public Guid SurvivingSubjectId { get; set; }
    public string Justification { get; set; } = string.Empty;
}

public sealed class RevertSubjectLinkRequest
{
    public string Justification { get; set; } = string.Empty;
}

public sealed class SubjectLinkDto
{
    public Guid LinkId { get; set; }
    public Guid AbsorbedSubjectId { get; set; }
    public Guid SurvivingSubjectId { get; set; }
    public string LinkType { get; set; } = string.Empty;
    public string Justification { get; set; } = string.Empty;
    public Guid? ActorUserId { get; set; }
    public DateTimeOffset OccurredAtUtc { get; set; }
    public Guid? RevertsLinkId { get; set; }
}

public sealed class UpsertLabelConfigRequest
{
    public Guid? BranchId { get; set; }
    public string SchemeCode { get; set; } = string.Empty;
    public string SchemeParamsJson { get; set; } = string.Empty;
}

/// <summary>Filas crudas del SP multi-result (mapeo Dapper).</summary>
public sealed class SubjectRow
{
    public Guid SubjectId { get; set; }
    public Guid TenantId { get; set; }
    public Guid OriginBranchId { get; set; }
    public string? RecordNumber { get; set; }
    public string IdentificationState { get; set; } = string.Empty;
    public string? GivenName { get; set; }
    public string? FirstSurname { get; set; }
    public string? SecondSurname { get; set; }
    public string? PreferredName { get; set; }
    public DateTime? BirthDate { get; set; }
    public string? EstimatedAgeJson { get; set; }
    public string? BiologicalSex { get; set; }
    public string? SexSource { get; set; }
    public string? GenderIdentity { get; set; }
    public string? Curp { get; set; }
    public DateTime? CurpValidatedAtUtc { get; set; }
    public DateTime? DeceasedAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
    public Guid? RequestedSubjectId { get; set; }
    public Guid ResolvedSubjectId { get; set; }
}
