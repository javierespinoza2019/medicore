using System.Text.Json;
using MediCore.DataAccess.Sync;
using MediCore.Models.Encounter;
using MediCore.Models.Sync;

namespace MediCore.Business.Sync.Handlers;

/// <summary>Despacha encounter.open → sp_Encounter_Open (MVP estable).</summary>
public sealed class EncounterOpenSyncCommandHandler : ISyncCommandHandler
{
    public IReadOnlyCollection<string> CommandTypes { get; } = ["encounter.open"];

    public SyncCommandSupport Support => SyncCommandSupport.Full;

    public Task<SyncCommandPlan> PlanAsync(SyncCommandContext context, CancellationToken ct)
    {
        var request = DeserializePayload(context.Request.PayloadJson);
        if (request.BranchId == Guid.Empty)
            throw new ArgumentException("payload.branchId es obligatorio para encounter.open.");
        if (request.SubjectId == Guid.Empty)
            throw new ArgumentException("payload.subjectId es obligatorio para encounter.open.");

        var type = Norm(request.EncounterType)?.ToLowerInvariant() ?? EncounterTypes.Urgencias;
        if (!EncounterTypes.All.Contains(type))
            throw new ArgumentException("EncounterType inválido (urgencias|consulta_externa).");

        var circumstance = Norm(request.AdmissionCircumstance)?.ToLowerInvariant();
        var now = context.Request.OccurredAtUtc == default
            ? DateTimeOffset.UtcNow
            : context.Request.OccurredAtUtc.ToUniversalTime();
        var encounterId = request.ClientEncounterId is { } clientId && clientId != Guid.Empty
            ? clientId
            : Guid.NewGuid();

        var plan = new SyncCommandPlan
        {
            ServerEntityId = encounterId.ToString("D"),
            ClinicalProcedures =
            [
                new SyncProcedureCall
                {
                    ProcedureName = "sp_Encounter_Open",
                    Parameters = new
                    {
                        EncounterId = encounterId,
                        TenantId = context.TenantId,
                        request.BranchId,
                        request.SubjectId,
                        EncounterType = type,
                        ArrivalAtUtc = (request.ArrivalAtUtc ?? now).UtcDateTime,
                        AccessRoute = Norm(request.AccessRoute),
                        AdmissionCircumstance = circumstance,
                        AdmissionCircumstanceText = Norm(request.AdmissionCircumstanceText),
                        ActorUserId = context.UserId,
                        ActorProfessionalId = context.ActorProfessionalId,
                        OccurredAtUtc = now.UtcDateTime
                    }
                }
            ]
        };

        return Task.FromResult(plan);
    }

    private static OpenEncounterRequest DeserializePayload(string? payloadJson)
    {
        if (string.IsNullOrWhiteSpace(payloadJson))
            throw new ArgumentException("PayloadJson es obligatorio para encounter.open.");

        try
        {
            var dto = JsonSerializer.Deserialize<OpenEncounterRequest>(payloadJson, SyncJson.Options);
            return dto ?? throw new ArgumentException("PayloadJson de encounter.open no es válido.");
        }
        catch (JsonException ex)
        {
            throw new ArgumentException("PayloadJson de encounter.open no es JSON válido.", ex);
        }
    }

    private static string? Norm(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
