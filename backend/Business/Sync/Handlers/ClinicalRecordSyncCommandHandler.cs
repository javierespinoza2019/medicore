using MediCore.Business.ClinicalRecord;
using MediCore.DataAccess.Professional;
using MediCore.Models.ClinicalRecord;
using MediCore.Models.Sync;

namespace MediCore.Business.Sync.Handlers;

/// <summary>Despacha history.save|amend y allergyStatus.set|allergy.add.</summary>
public sealed class ClinicalRecordSyncCommandHandler(
    IHealthcareProfessionalRepository professionalRepository) : ISyncCommandHandler
{
    public IReadOnlyCollection<string> CommandTypes { get; } =
    [
        "history.save",
        "history.amend",
        "allergyStatus.set",
        "allergy.add"
    ];

    public SyncCommandSupport Support => SyncCommandSupport.Full;

    public async Task<SyncCommandPlan> PlanAsync(SyncCommandContext context, CancellationToken ct)
    {
        var type = context.Request.CommandType.Trim().ToLowerInvariant();
        return type switch
        {
            "history.save" => await PlanHistorySaveAsync(context, ct),
            "history.amend" => await PlanHistoryAmendAsync(context, ct),
            "allergystatus.set" => await PlanAllergyStatusAsync(context, ct),
            "allergy.add" => await PlanAllergyAddAsync(context, ct),
            _ => throw new ArgumentException($"commandType '{type}' no soportado por ClinicalRecordSyncCommandHandler.")
        };
    }

    private async Task<SyncCommandPlan> PlanHistorySaveAsync(SyncCommandContext context, CancellationToken ct)
    {
        var payload = SyncHandlerSupport.DeserializePayload<SyncHistorySavePayload>(
            context.Request.PayloadJson, "history.save");
        if (payload.SubjectId == Guid.Empty)
            throw new ArgumentException("payload.subjectId es obligatorio.");

        var body = ResolveBody(payload);
        ClinicalRecordDomain.EnsureInterrogatorioCampos(body);

        var origin = string.IsNullOrWhiteSpace(payload.Origin)
            ? HistoryOrigins.Capturado
            : payload.Origin.Trim().ToLowerInvariant();
        if (origin is not (HistoryOrigins.Capturado or HistoryOrigins.PrellenadoPorSistema))
            throw new ArgumentException("Origin inválido (capturado|prellenado_por_sistema).");

        var display = await SyncHandlerSupport.SoftDisplayNameAsync(
            professionalRepository, context.TenantId, context.ActorProfessionalId, ct);
        var historyId = Guid.NewGuid();
        var now = SyncHandlerSupport.OccurredAt(context);

        return new SyncCommandPlan
        {
            ServerEntityId = historyId.ToString("D"),
            ClinicalProcedures =
            [
                new SyncProcedureCall
                {
                    ProcedureName = "sp_MedicalHistory_Save",
                    Parameters = new
                    {
                        HistoryId = historyId,
                        TenantId = context.TenantId,
                        SubjectId = payload.SubjectId,
                        BodyJson = body.ToJson(),
                        Origin = origin,
                        ActorUserId = context.UserId,
                        ActorProfessionalId = context.ActorProfessionalId,
                        ActorDisplayName = display,
                        OccurredAtUtc = now.UtcDateTime
                    }
                }
            ]
        };
    }

    private async Task<SyncCommandPlan> PlanHistoryAmendAsync(SyncCommandContext context, CancellationToken ct)
    {
        var payload = SyncHandlerSupport.DeserializePayload<SyncHistoryAmendPayload>(
            context.Request.PayloadJson, "history.amend");
        if (payload.SubjectId == Guid.Empty)
            throw new ArgumentException("payload.subjectId es obligatorio.");
        if (string.IsNullOrWhiteSpace(payload.ReasonText))
            throw new ArgumentException("reasonText del addendum es obligatorio.");

        var display = await SyncHandlerSupport.SoftDisplayNameAsync(
            professionalRepository, context.TenantId, context.ActorProfessionalId, ct);
        var amendmentId = Guid.NewGuid();
        var now = SyncHandlerSupport.OccurredAt(context);

        return new SyncCommandPlan
        {
            ServerEntityId = amendmentId.ToString("D"),
            ClinicalProcedures =
            [
                new SyncProcedureCall
                {
                    ProcedureName = "sp_MedicalHistory_AddAmendment",
                    Parameters = new
                    {
                        AmendmentId = amendmentId,
                        TenantId = context.TenantId,
                        SubjectId = payload.SubjectId,
                        HistoryId = payload.HistoryId,
                        ReasonText = payload.ReasonText.Trim(),
                        BodyJson = payload.BodyJson,
                        ActorUserId = context.UserId,
                        ActorProfessionalId = context.ActorProfessionalId,
                        ActorDisplayName = display,
                        OccurredAtUtc = now.UtcDateTime
                    }
                }
            ]
        };
    }

    private async Task<SyncCommandPlan> PlanAllergyStatusAsync(SyncCommandContext context, CancellationToken ct)
    {
        var payload = SyncHandlerSupport.DeserializePayload<SyncAllergyStatusPayload>(
            context.Request.PayloadJson, "allergyStatus.set");
        if (payload.SubjectId == Guid.Empty)
            throw new ArgumentException("payload.subjectId es obligatorio.");

        var status = (payload.Status ?? string.Empty).Trim().ToLowerInvariant();
        if (!AllergyStatusCodes.All.Contains(status))
            throw new ArgumentException(
                "Status inválido (no_interrogado|niega|refiere|se_desconoce|paciente_no_puede_responder).");

        var display = await SyncHandlerSupport.SoftDisplayNameAsync(
            professionalRepository, context.TenantId, context.ActorProfessionalId, ct);
        var statusEventId = Guid.NewGuid();
        var now = SyncHandlerSupport.OccurredAt(context);

        return new SyncCommandPlan
        {
            ServerEntityId = statusEventId.ToString("D"),
            ClinicalProcedures =
            [
                new SyncProcedureCall
                {
                    ProcedureName = "sp_AllergyStatus_Set",
                    Parameters = new
                    {
                        StatusEventId = statusEventId,
                        TenantId = context.TenantId,
                        SubjectId = payload.SubjectId,
                        Status = status,
                        ActorUserId = context.UserId,
                        ActorProfessionalId = context.ActorProfessionalId,
                        ActorDisplayName = display,
                        OccurredAtUtc = now.UtcDateTime
                    }
                }
            ]
        };
    }

    private async Task<SyncCommandPlan> PlanAllergyAddAsync(SyncCommandContext context, CancellationToken ct)
    {
        var payload = SyncHandlerSupport.DeserializePayload<SyncAllergyAddPayload>(
            context.Request.PayloadJson, "allergy.add");
        if (payload.SubjectId == Guid.Empty)
            throw new ArgumentException("payload.subjectId es obligatorio.");
        if (string.IsNullOrWhiteSpace(payload.Substance))
            throw new ArgumentException("substance es obligatoria.");

        var reaction = SyncHandlerSupport.Norm(payload.ReactionType)?.ToLowerInvariant()
            ?? AllergyReactionTypes.Alergia;
        if (!AllergyReactionTypes.All.Contains(reaction))
            throw new ArgumentException("reactionType inválido (alergia|intolerancia|efecto_adverso_conocido).");

        var display = await SyncHandlerSupport.SoftDisplayNameAsync(
            professionalRepository, context.TenantId, context.ActorProfessionalId, ct);
        var allergyId = Guid.NewGuid();
        var now = SyncHandlerSupport.OccurredAt(context);

        return new SyncCommandPlan
        {
            ServerEntityId = allergyId.ToString("D"),
            ClinicalProcedures =
            [
                new SyncProcedureCall
                {
                    ProcedureName = "sp_Allergy_Add",
                    Parameters = new
                    {
                        AllergyId = allergyId,
                        TenantId = context.TenantId,
                        SubjectId = payload.SubjectId,
                        Substance = payload.Substance.Trim(),
                        ReactionType = reaction,
                        Category = SyncHandlerSupport.Norm(payload.Category),
                        Manifestation = SyncHandlerSupport.Norm(payload.Manifestation),
                        Severity = SyncHandlerSupport.Norm(payload.Severity),
                        Certainty = SyncHandlerSupport.Norm(payload.Certainty),
                        DataOrigin = SyncHandlerSupport.Norm(payload.DataOrigin),
                        ActorUserId = context.UserId,
                        ActorProfessionalId = context.ActorProfessionalId,
                        ActorDisplayName = display,
                        OccurredAtUtc = now.UtcDateTime
                    }
                }
            ]
        };
    }

    private static MedicalHistoryBody ResolveBody(SyncHistorySavePayload request)
    {
        if (request.Body is not null)
            return request.Body;
        if (!string.IsNullOrWhiteSpace(request.BodyJson))
            return MedicalHistoryBody.FromJson(request.BodyJson);
        throw new ArgumentException("body o bodyJson es obligatorio.");
    }
}
