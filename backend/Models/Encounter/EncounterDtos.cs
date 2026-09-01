namespace MediCore.Models.Encounter;

/// <summary>Tipos de episodio (M4). Sin valores clínicos fabricados.</summary>
public static class EncounterTypes
{
    public const string Urgencias = "urgencias";
    public const string ConsultaExterna = "consulta_externa";

    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        Urgencias, ConsultaExterna
    };
}

/// <summary>Estados del episodio. Cerrar sin triage → 409 (SC-03).</summary>
public static class EncounterStates
{
    public const string Abierto = "abierto";
    public const string EnObservacion = "en_observacion";
    public const string Cerrado = "cerrado";

    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        Abierto, EnObservacion, Cerrado
    };
}

/// <summary>Desenlace. NULL hasta el cierre; sin default a alta_domicilio (BM-URG-06/07).</summary>
public static class EncounterDispositions
{
    public const string AltaDomicilio = "alta_domicilio";
    public const string Traslado = "traslado";
    public const string AltaVoluntaria = "alta_voluntaria";
    public const string Defuncion = "defuncion";
    public const string Fuga = "fuga";
    public const string Referencia = "referencia";

    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        AltaDomicilio, Traslado, AltaVoluntaria, Defuncion, Fuga, Referencia
    };
}

/// <summary>
/// Circunstancias de ingreso (catálogo abierto con códigos conocidos).
/// El sistema puede sugerir aviso al MP; nunca lo determina ni bloquea.
/// No se afirma fundamento penal del aviso (doc 01 §8).
/// </summary>
public static class AdmissionCircumstances
{
    public const string HechoTransito = "hecho_transito";
    public const string Caida = "caida";
    public const string Agresion = "agresion";
    public const string Intoxicacion = "intoxicacion";
    public const string Quemadura = "quemadura";
    public const string HalladoViaPublica = "hallado_via_publica";
    public const string CausaMedicaNoTraumatica = "causa_medica_no_traumatica";
    public const string Otro = "otro";

    /// <summary>Códigos donde la UI puede sugerir valorar aviso al MP (juicio humano).</summary>
    public static readonly HashSet<string> SuggestMpNotice = new(StringComparer.OrdinalIgnoreCase)
    {
        Agresion, HechoTransito, HalladoViaPublica, Intoxicacion
    };
}

public sealed class EncounterDto
{
    public Guid EncounterId { get; set; }
    public Guid TenantId { get; set; }
    public Guid BranchId { get; set; }
    public Guid SubjectId { get; set; }
    public string EncounterType { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string? Disposition { get; set; }
    public DateTimeOffset ArrivalAtUtc { get; set; }
    public string? AccessRoute { get; set; }
    public string? AdmissionCircumstance { get; set; }
    public string? AdmissionCircumstanceText { get; set; }
    /// <summary>null = no valorado; true/false = valorado. Nunca se serializa false por omisión al abrir.</summary>
    public bool? MinisterioPublicoNotified { get; set; }
    public Guid? AttendingProfessionalId { get; set; }
    public int TurnNumber { get; set; }
    public DateTimeOffset? ClosedAtUtc { get; set; }
    public Guid CreatedByUserId { get; set; }
    public Guid? CreatedByProfessionalId { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
    public string? TriageLevel { get; set; }
    public string? TriageScaleCode { get; set; }
    /// <summary>0 = sin clasificar (arriba). Clasificado: prioridad de la escala (1+).</summary>
    public int? TriagePriority { get; set; }
    public string? GivenName { get; set; }
    public string? FirstSurname { get; set; }
    public string? SecondSurname { get; set; }
    public string? PreferredName { get; set; }
    public string? IdentificationState { get; set; }
    public string? OperationalLabel { get; set; }
    public string? InternalCode { get; set; }
    /// <summary>Sugerencia de UI: valorar aviso al MP. Nunca determina ni bloquea.</summary>
    public bool SuggestMpNoticeEvaluation { get; set; }
}

public sealed class EncounterQueueDto
{
    public Guid BranchId { get; set; }
    public IReadOnlyList<EncounterDto> Items { get; set; } = [];
    public int Total { get; set; }
    /// <summary>true mientras no exista TriageAssessment (M5): todos sin clasificar.</summary>
    public bool AllUnclassified { get; set; } = true;
}

public sealed class OpenEncounterRequest
{
    public Guid BranchId { get; set; }
    public Guid SubjectId { get; set; }
    public string EncounterType { get; set; } = EncounterTypes.Urgencias;
    public DateTimeOffset? ArrivalAtUtc { get; set; }
    public string? AccessRoute { get; set; }
    public string? AdmissionCircumstance { get; set; }
    public string? AdmissionCircumstanceText { get; set; }

    /// <summary>Id generado en estación (cola offline). Opcional; el servidor asigna si falta.</summary>
    public Guid? ClientEncounterId { get; set; }
}

public sealed class UpdateAdmissionRequest
{
    public string? AccessRoute { get; set; }
    public string? AdmissionCircumstance { get; set; }
    public string? AdmissionCircumstanceText { get; set; }
    /// <summary>null = no cambiar; true/false = valorar; usar ClearMpNotified para volver a no valorado.</summary>
    public bool? MinisterioPublicoNotified { get; set; }
    public bool ClearMpNotified { get; set; }
}

public sealed class TransitionStateRequest
{
    public string ToState { get; set; } = string.Empty;
    public string? Disposition { get; set; }
    public string? Justification { get; set; }

    /// <summary>
    /// SC-04: motivo obligatorio para forzar el alta cuando hay recetas sin firmar.
    /// Vacío + pendientes → 409; con motivo → cierre + evento de excepción clínica.
    /// </summary>
    public string? PendingPrescriptionsOverrideReason { get; set; }
}

public sealed class AssignProfessionalRequest
{
    public Guid ProfessionalId { get; set; }
}

public sealed class CreateMpNoticeRequest
{
    public string EstablishmentNameSnapshot { get; set; } = string.Empty;
    public DateTimeOffset? ElaboratedAtUtc { get; set; }
    /// <summary>Acepta identidad provisional (SC-24).</summary>
    public string PatientIdentificationText { get; set; } = string.Empty;
    public string NotifiedAct { get; set; } = string.Empty;
    public string? InjuryReportText { get; set; }
    public string MpAgencyName { get; set; } = string.Empty;
    public Guid NotifyingProfessionalId { get; set; }
    public string NotifyingProfessionalName { get; set; } = string.Empty;
}

public sealed class MpNoticeDto
{
    public Guid NoticeId { get; set; }
    public Guid TenantId { get; set; }
    public Guid EncounterId { get; set; }
    public Guid BranchId { get; set; }
    public string EstablishmentNameSnapshot { get; set; } = string.Empty;
    public DateTimeOffset ElaboratedAtUtc { get; set; }
    public string PatientIdentificationText { get; set; } = string.Empty;
    public string NotifiedAct { get; set; } = string.Empty;
    public string? InjuryReportText { get; set; }
    public string MpAgencyName { get; set; } = string.Empty;
    public Guid NotifyingProfessionalId { get; set; }
    public string NotifyingProfessionalName { get; set; } = string.Empty;
    public Guid ActorUserId { get; set; }
    public DateTimeOffset OccurredAtUtc { get; set; }
    public DateTimeOffset RecordedAtUtc { get; set; }
}

public sealed class CreateCareWithoutConsentRequest
{
    public string ClinicalAssessment { get; set; } = string.Empty;
    public string UrgencyRationale { get; set; } = string.Empty;
    public bool NoRelativeOrRepresentative { get; set; }
    public Guid ProfessionalId1 { get; set; }
    public Guid ProfessionalId2 { get; set; }
}

public sealed class CareWithoutConsentDto
{
    public Guid RecordId { get; set; }
    public Guid TenantId { get; set; }
    public Guid EncounterId { get; set; }
    public string ClinicalAssessment { get; set; } = string.Empty;
    public string UrgencyRationale { get; set; } = string.Empty;
    public bool NoRelativeOrRepresentative { get; set; }
    public Guid ProfessionalId1 { get; set; }
    public Guid ProfessionalId2 { get; set; }
    public Guid ActorUserId { get; set; }
    public DateTimeOffset OccurredAtUtc { get; set; }
    public DateTimeOffset RecordedAtUtc { get; set; }
}

/// <summary>Cierre sin triage → HTTP 409 (SC-03). Vive en Models para que DataAccess no referencie Business.</summary>
public sealed class EncounterCloseWithoutTriageException : InvalidOperationException
{
    public EncounterCloseWithoutTriageException()
        : base("No se puede cerrar el episodio sin clasificación de triage.") { }

    public EncounterCloseWithoutTriageException(string message) : base(message) { }
}

/// <summary>Cierre sin justificación → HTTP 422.</summary>
public sealed class EncounterCloseWithoutJustificationException : InvalidOperationException
{
    public EncounterCloseWithoutJustificationException()
        : base("El cierre exige justificación (motivo).") { }
}

/// <summary>Cierre con recetas sin firmar y sin motivo de forzado → HTTP 409 (SC-04).</summary>
public sealed class EncounterCloseWithPendingPrescriptionsException : InvalidOperationException
{
    public int PendingCount { get; }

    public EncounterCloseWithPendingPrescriptionsException(int pendingCount)
        : base(
            $"El alta está bloqueada: hay {pendingCount} receta(s) sin firmar. " +
            "Para forzarla envíe pendingPrescriptionsOverrideReason (motivo obligatorio) y se registrará un evento de excepción clínica.")
    {
        PendingCount = pendingCount;
    }
}
