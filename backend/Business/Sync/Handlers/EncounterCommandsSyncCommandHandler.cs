using MediCore.Business.Encounter;
using MediCore.DataAccess.Encounter;
using MediCore.Models.Encounter;
using MediCore.Models.Sync;

namespace MediCore.Business.Sync.Handlers;

/// <summary>Despacha encounter.admission|state|assignProfessional|mpNotice|careWithoutConsent.</summary>
public sealed class EncounterCommandsSyncCommandHandler(IEncounterRepository encounterRepository)
    : ISyncCommandHandler
{
    public IReadOnlyCollection<string> CommandTypes { get; } =
    [
        "encounter.admission",
        "encounter.state",
        "encounter.assignProfessional",
        "encounter.mpNotice",
        "encounter.careWithoutConsent"
    ];

    public SyncCommandSupport Support => SyncCommandSupport.Full;

    public async Task<SyncCommandPlan> PlanAsync(SyncCommandContext context, CancellationToken ct)
    {
        var type = context.Request.CommandType.Trim();
        return type.ToLowerInvariant() switch
        {
            "encounter.admission" => PlanAdmission(context),
            "encounter.state" => await PlanStateAsync(context, ct),
            "encounter.assignprofessional" => PlanAssign(context),
            "encounter.mpnotice" => PlanMpNotice(context),
            "encounter.carewithoutconsent" => PlanCareWithoutConsent(context),
            _ => throw new ArgumentException($"commandType '{type}' no soportado por EncounterCommandsSyncCommandHandler.")
        };
    }

    private SyncCommandPlan PlanAdmission(SyncCommandContext context)
    {
        var payload = SyncHandlerSupport.DeserializePayload<SyncEncounterAdmissionPayload>(
            context.Request.PayloadJson, "encounter.admission");
        if (payload.EncounterId == Guid.Empty)
            throw new ArgumentException("payload.encounterId es obligatorio para encounter.admission.");

        var now = SyncHandlerSupport.OccurredAt(context);
        var setMp = payload.MinisterioPublicoNotified.HasValue && !payload.ClearMpNotified;

        return new SyncCommandPlan
        {
            ServerEntityId = payload.EncounterId.ToString("D"),
            ClinicalProcedures =
            [
                new SyncProcedureCall
                {
                    ProcedureName = "sp_Encounter_UpdateAdmissionData",
                    Parameters = new
                    {
                        TenantId = context.TenantId,
                        EncounterId = payload.EncounterId,
                        AccessRoute = SyncHandlerSupport.Norm(payload.AccessRoute),
                        AdmissionCircumstance = SyncHandlerSupport.Norm(payload.AdmissionCircumstance)
                            ?.ToLowerInvariant(),
                        AdmissionCircumstanceText = SyncHandlerSupport.Norm(payload.AdmissionCircumstanceText),
                        MinisterioPublicoNotified = payload.MinisterioPublicoNotified,
                        ClearMpNotified = payload.ClearMpNotified,
                        SetMpNotified = setMp,
                        ActorUserId = context.UserId,
                        ActorProfessionalId = context.ActorProfessionalId,
                        OccurredAtUtc = now.UtcDateTime
                    }
                }
            ]
        };
    }

    private async Task<SyncCommandPlan> PlanStateAsync(SyncCommandContext context, CancellationToken ct)
    {
        var payload = SyncHandlerSupport.DeserializePayload<SyncEncounterStatePayload>(
            context.Request.PayloadJson, "encounter.state");
        if (payload.EncounterId == Guid.Empty)
            throw new ArgumentException("payload.encounterId es obligatorio para encounter.state.");

        var to = SyncHandlerSupport.Norm(payload.ToState)?.ToLowerInvariant()
            ?? throw new ArgumentException("toState es obligatorio.");
        if (!EncounterStates.All.Contains(to))
            throw new ArgumentException("Estado inválido (abierto|en_observacion|cerrado).");

        string? disposition = null;
        string? pendingOverride = null;
        if (to == EncounterStates.Cerrado)
        {
            disposition = SyncHandlerSupport.Norm(payload.Disposition)?.ToLowerInvariant();
            if (disposition is null)
                throw new ArgumentException("El cierre exige Disposition (sin default a alta_domicilio).");
            if (!EncounterDispositions.All.Contains(disposition))
                throw new ArgumentException("Disposition inválida.");
            if (string.IsNullOrWhiteSpace(payload.Justification))
                throw new EncounterCloseWithoutJustificationException();
            pendingOverride = SyncHandlerSupport.Norm(payload.PendingPrescriptionsOverrideReason);
        }

        var current = await encounterRepository.GetByIdAsync(context.TenantId, payload.EncounterId, ct)
            ?? throw new KeyNotFoundException("Episodio no encontrado.");
        EncounterStateMachine.EnsureAllowed(current.State, to);

        if (to == EncounterStates.Cerrado)
        {
            var pending = await encounterRepository.CountUnsignedPrescriptionsByEncounterAsync(
                context.TenantId, payload.EncounterId, ct);
            PendingPrescriptionCloseRules.EnsureAllowed(pending, pendingOverride);
        }

        var now = SyncHandlerSupport.OccurredAt(context);
        var eventId = Guid.NewGuid();

        return new SyncCommandPlan
        {
            ServerEntityId = payload.EncounterId.ToString("D"),
            ClinicalProcedures =
            [
                new SyncProcedureCall
                {
                    ProcedureName = "sp_Encounter_TransitionState",
                    Parameters = new
                    {
                        TenantId = context.TenantId,
                        EncounterId = payload.EncounterId,
                        EventId = eventId,
                        ToState = to,
                        Disposition = disposition,
                        Justification = SyncHandlerSupport.Norm(payload.Justification),
                        PendingPrescriptionsOverrideReason = pendingOverride,
                        ActorUserId = context.UserId,
                        ActorProfessionalId = context.ActorProfessionalId,
                        OccurredAtUtc = now.UtcDateTime
                    }
                }
            ]
        };
    }

    private SyncCommandPlan PlanAssign(SyncCommandContext context)
    {
        var payload = SyncHandlerSupport.DeserializePayload<SyncEncounterAssignPayload>(
            context.Request.PayloadJson, "encounter.assignProfessional");
        if (payload.EncounterId == Guid.Empty)
            throw new ArgumentException("payload.encounterId es obligatorio.");
        if (payload.ProfessionalId == Guid.Empty)
            throw new ArgumentException("professionalId es obligatorio.");

        var now = SyncHandlerSupport.OccurredAt(context);
        return new SyncCommandPlan
        {
            ServerEntityId = payload.EncounterId.ToString("D"),
            ClinicalProcedures =
            [
                new SyncProcedureCall
                {
                    ProcedureName = "sp_Encounter_AssignProfessional",
                    Parameters = new
                    {
                        TenantId = context.TenantId,
                        EncounterId = payload.EncounterId,
                        ProfessionalId = payload.ProfessionalId,
                        ActorUserId = context.UserId,
                        ActorProfessionalId = context.ActorProfessionalId,
                        OccurredAtUtc = now.UtcDateTime
                    }
                }
            ]
        };
    }

    private SyncCommandPlan PlanMpNotice(SyncCommandContext context)
    {
        var payload = SyncHandlerSupport.DeserializePayload<SyncEncounterMpNoticePayload>(
            context.Request.PayloadJson, "encounter.mpNotice");
        if (payload.EncounterId == Guid.Empty)
            throw new ArgumentException("payload.encounterId es obligatorio.");
        if (string.IsNullOrWhiteSpace(payload.EstablishmentNameSnapshot))
            throw new ArgumentException("establishmentNameSnapshot es obligatorio.");
        if (string.IsNullOrWhiteSpace(payload.PatientIdentificationText))
            throw new ArgumentException("patientIdentificationText es obligatorio.");
        if (string.IsNullOrWhiteSpace(payload.NotifiedAct))
            throw new ArgumentException("notifiedAct es obligatorio.");
        if (string.IsNullOrWhiteSpace(payload.MpAgencyName))
            throw new ArgumentException("mpAgencyName es obligatorio.");
        if (payload.NotifyingProfessionalId == Guid.Empty)
            throw new ArgumentException("notifyingProfessionalId es obligatorio.");
        if (string.IsNullOrWhiteSpace(payload.NotifyingProfessionalName))
            throw new ArgumentException("notifyingProfessionalName es obligatorio.");

        var now = SyncHandlerSupport.OccurredAt(context);
        var noticeId = Guid.NewGuid();
        return new SyncCommandPlan
        {
            ServerEntityId = noticeId.ToString("D"),
            ClinicalProcedures =
            [
                new SyncProcedureCall
                {
                    ProcedureName = "sp_MinisterioPublicoNotice_Create",
                    Parameters = new
                    {
                        NoticeId = noticeId,
                        TenantId = context.TenantId,
                        EncounterId = payload.EncounterId,
                        EstablishmentNameSnapshot = payload.EstablishmentNameSnapshot.Trim(),
                        ElaboratedAtUtc = (payload.ElaboratedAtUtc ?? now).UtcDateTime,
                        PatientIdentificationText = payload.PatientIdentificationText.Trim(),
                        NotifiedAct = payload.NotifiedAct.Trim(),
                        InjuryReportText = SyncHandlerSupport.Norm(payload.InjuryReportText),
                        MpAgencyName = payload.MpAgencyName.Trim(),
                        NotifyingProfessionalId = payload.NotifyingProfessionalId,
                        NotifyingProfessionalName = payload.NotifyingProfessionalName.Trim(),
                        ActorUserId = context.UserId,
                        OccurredAtUtc = now.UtcDateTime
                    }
                }
            ]
        };
    }

    private SyncCommandPlan PlanCareWithoutConsent(SyncCommandContext context)
    {
        var payload = SyncHandlerSupport.DeserializePayload<SyncEncounterCareWithoutConsentPayload>(
            context.Request.PayloadJson, "encounter.careWithoutConsent");
        if (payload.EncounterId == Guid.Empty)
            throw new ArgumentException("payload.encounterId es obligatorio.");
        if (string.IsNullOrWhiteSpace(payload.ClinicalAssessment))
            throw new ArgumentException("clinicalAssessment es obligatorio.");
        if (string.IsNullOrWhiteSpace(payload.UrgencyRationale))
            throw new ArgumentException("urgencyRationale es obligatorio.");

        CareWithoutConsentRules.EnsureDistinctProfessionals(payload.ProfessionalId1, payload.ProfessionalId2);

        var now = SyncHandlerSupport.OccurredAt(context);
        var recordId = Guid.NewGuid();
        return new SyncCommandPlan
        {
            ServerEntityId = recordId.ToString("D"),
            ClinicalProcedures =
            [
                new SyncProcedureCall
                {
                    ProcedureName = "sp_EncounterCareWithoutConsent_Create",
                    Parameters = new
                    {
                        RecordId = recordId,
                        TenantId = context.TenantId,
                        EncounterId = payload.EncounterId,
                        ClinicalAssessment = payload.ClinicalAssessment.Trim(),
                        UrgencyRationale = payload.UrgencyRationale.Trim(),
                        NoRelativeOrRepresentative = payload.NoRelativeOrRepresentative,
                        ProfessionalId1 = payload.ProfessionalId1,
                        ProfessionalId2 = payload.ProfessionalId2,
                        ActorUserId = context.UserId,
                        OccurredAtUtc = now.UtcDateTime
                    }
                }
            ]
        };
    }
}
