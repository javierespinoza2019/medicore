using System.Text.Json;
using MediCore.Models.ClinicalRecord;
using MediCore.Models.Prescription;
using MediCore.Models.Triage;

namespace MediCore.Models.Sync;

/// <summary>
/// Payloads de cola offline: incluyen el id de entidad que en HTTP va en la ruta.
/// Campos clínicos alineados a los DTO online; no se inventan propiedades.
/// (Los request online son sealed → composición explícita, no herencia.)
/// </summary>

public sealed class SyncEncounterAdmissionPayload
{
    public Guid EncounterId { get; set; }
    public string? AccessRoute { get; set; }
    public string? AdmissionCircumstance { get; set; }
    public string? AdmissionCircumstanceText { get; set; }
    public bool? MinisterioPublicoNotified { get; set; }
    public bool ClearMpNotified { get; set; }
}

public sealed class SyncEncounterStatePayload
{
    public Guid EncounterId { get; set; }
    public string ToState { get; set; } = string.Empty;
    public string? Disposition { get; set; }
    public string? Justification { get; set; }

    /// <summary>SC-04: motivo para forzar alta con recetas sin firmar.</summary>
    public string? PendingPrescriptionsOverrideReason { get; set; }
}

public sealed class SyncEncounterAssignPayload
{
    public Guid EncounterId { get; set; }
    public Guid ProfessionalId { get; set; }
}

public sealed class SyncEncounterMpNoticePayload
{
    public Guid EncounterId { get; set; }
    public string EstablishmentNameSnapshot { get; set; } = string.Empty;
    public DateTimeOffset? ElaboratedAtUtc { get; set; }
    public string PatientIdentificationText { get; set; } = string.Empty;
    public string NotifiedAct { get; set; } = string.Empty;
    public string? InjuryReportText { get; set; }
    public string MpAgencyName { get; set; } = string.Empty;
    public Guid NotifyingProfessionalId { get; set; }
    public string NotifyingProfessionalName { get; set; } = string.Empty;
}

public sealed class SyncEncounterCareWithoutConsentPayload
{
    public Guid EncounterId { get; set; }
    public string ClinicalAssessment { get; set; } = string.Empty;
    public string UrgencyRationale { get; set; } = string.Empty;
    public bool NoRelativeOrRepresentative { get; set; }
    public Guid ProfessionalId1 { get; set; }
    public Guid ProfessionalId2 { get; set; }
}

public sealed class SyncTriageSavePayload
{
    public Guid EncounterId { get; set; }
    public string? Level { get; set; }
    public string? ChiefComplaint { get; set; }
    public int? PainScore { get; set; }
    public string? PainAssessable { get; set; }
    public List<VitalMeasurementDto>? Vitals { get; set; }
    public DateTimeOffset? OccurredAtUtc { get; set; }
}

public sealed class SyncTriageReclassifyPayload
{
    public Guid EncounterId { get; set; }
    public string Level { get; set; } = string.Empty;
    public string? ChiefComplaint { get; set; }
    public int? PainScore { get; set; }
    public string? PainAssessable { get; set; }
    public List<VitalMeasurementDto>? Vitals { get; set; }
    public DateTimeOffset? OccurredAtUtc { get; set; }
}

public sealed class SyncVitalsAppendPayload
{
    public Guid EncounterId { get; set; }
    public List<VitalMeasurementDto> Vitals { get; set; } = [];
    public string? SourceContext { get; set; }
    public DateTimeOffset? OccurredAtUtc { get; set; }
}

public sealed class SyncNoteCreatePayload
{
    public Guid EncounterId { get; set; }
    public string NoteType { get; set; } = string.Empty;
    public JsonElement Body { get; set; }
    public string? Prognosis { get; set; }
    public DateTimeOffset? OccurredAtUtc { get; set; }
}

public sealed class SyncNoteSignPayload
{
    public Guid NoteId { get; set; }
    public string? ContentHash { get; set; }
}

public sealed class SyncNoteAddendumPayload
{
    public Guid NoteId { get; set; }
    public string ReasonText { get; set; } = string.Empty;
    public string? BodyJson { get; set; }
}

public sealed class SyncHistorySavePayload
{
    public Guid SubjectId { get; set; }
    public MedicalHistoryBody? Body { get; set; }
    public string? BodyJson { get; set; }
    public string Origin { get; set; } = HistoryOrigins.Capturado;
}

public sealed class SyncHistoryAmendPayload
{
    public Guid SubjectId { get; set; }
    public Guid? HistoryId { get; set; }
    public string ReasonText { get; set; } = string.Empty;
    public string? BodyJson { get; set; }
}

public sealed class SyncAllergyStatusPayload
{
    public Guid SubjectId { get; set; }
    public string Status { get; set; } = string.Empty;
}

public sealed class SyncAllergyAddPayload
{
    public Guid SubjectId { get; set; }
    public string Substance { get; set; } = string.Empty;
    public string ReactionType { get; set; } = AllergyReactionTypes.Alergia;
    public string? Category { get; set; }
    public string? Manifestation { get; set; }
    public string? Severity { get; set; }
    public string? Certainty { get; set; }
    public string? DataOrigin { get; set; }
}

public sealed class SyncPrescriptionCreatePayload
{
    public Guid EncounterId { get; set; }
    public List<CreatePrescriptionItemRequest> Items { get; set; } = [];
    public string? GeneralInstructions { get; set; }
    public string? AllergyOverrideJustification { get; set; }
    public Guid? AllergyStatusCaptureEventId { get; set; }
    public DateTimeOffset? OccurredAtUtc { get; set; }
}

public sealed class SyncPrescriptionSignPayload
{
    public Guid PrescriptionId { get; set; }
    public string? ContentHash { get; set; }
}

public sealed class SyncAppointmentCreatePayload
{
    public Guid BranchId { get; set; }
    public Guid SubjectId { get; set; }
    public Guid ProfessionalId { get; set; }
    public Guid? RoomId { get; set; }
    public DateTimeOffset ScheduledStartUtc { get; set; }
    public DateTimeOffset ScheduledEndUtc { get; set; }
    public string? ServiceCode { get; set; }
    public string? Notes { get; set; }
}

public sealed class SyncAppointmentStatePayload
{
    public Guid AppointmentId { get; set; }
    public string ToState { get; set; } = string.Empty;
    public string? Reason { get; set; }
}
