using MediCore.Business.Triage;
using MediCore.DataAccess.Professional;
using MediCore.DataAccess.Triage;
using MediCore.Models.Sync;
using MediCore.Models.Triage;

namespace MediCore.Business.Sync.Handlers;

/// <summary>Despacha triage.save|reclassify y vitals.append.</summary>
public sealed class TriageSyncCommandHandler(
    ITriageRepository triageRepository,
    IHealthcareProfessionalRepository professionalRepository) : ISyncCommandHandler
{
    public IReadOnlyCollection<string> CommandTypes { get; } =
    [
        "triage.save",
        "triage.reclassify",
        "vitals.append"
    ];

    public SyncCommandSupport Support => SyncCommandSupport.Full;

    public async Task<SyncCommandPlan> PlanAsync(SyncCommandContext context, CancellationToken ct)
    {
        var type = context.Request.CommandType.Trim().ToLowerInvariant();
        return type switch
        {
            "triage.save" => await PlanSaveAsync(context, ct),
            "triage.reclassify" => await PlanReclassifyAsync(context, ct),
            "vitals.append" => PlanAppend(context),
            _ => throw new ArgumentException($"commandType '{type}' no soportado por TriageSyncCommandHandler.")
        };
    }

    private async Task<SyncCommandPlan> PlanSaveAsync(SyncCommandContext context, CancellationToken ct)
    {
        var payload = SyncHandlerSupport.DeserializePayload<SyncTriageSavePayload>(
            context.Request.PayloadJson, "triage.save");
        if (payload.EncounterId == Guid.Empty)
            throw new ArgumentException("payload.encounterId es obligatorio para triage.save.");

        var display = await SyncHandlerSupport.RequireDisplayNameAsync(
            professionalRepository, context.TenantId, context.ActorProfessionalId, ct);

        var branchId = await triageRepository.GetEncounterBranchIdAsync(
            context.TenantId, payload.EncounterId, ct)
            ?? throw new KeyNotFoundException("Episodio no encontrado.");

        var scale = await triageRepository.GetEffectiveScaleAsync(context.TenantId, branchId, ct)
            ?? throw new InvalidOperationException(
                "No hay escala de triage configurada (tenant ni sucursal). Configure antes de valorar.");

        var level = SyncHandlerSupport.Norm(payload.Level);
        var priority = TriageScaleRules.ResolvePriority(scale, level);
        var painAssessable = SyncHandlerSupport.Norm(payload.PainAssessable) ?? PainAssessableCodes.Valorable;
        ValidatePain(painAssessable, payload.PainScore);

        var vitals = TriageVitalsNormalizer.NormalizeForPersist(payload.Vitals);
        var vitalsJson = TriageScaleJson.SerializeVitals(vitals);
        var occurred = payload.OccurredAtUtc ?? SyncHandlerSupport.OccurredAt(context);
        var triageId = Guid.NewGuid();

        return new SyncCommandPlan
        {
            ServerEntityId = triageId.ToString("D"),
            ClinicalProcedures =
            [
                new SyncProcedureCall
                {
                    ProcedureName = "sp_Triage_Save",
                    Parameters = new
                    {
                        TriageId = triageId,
                        TenantId = context.TenantId,
                        EncounterId = payload.EncounterId,
                        Level = level,
                        ScaleCode = scale.ScaleCode,
                        ScaleConfigId = scale.ConfigId,
                        LevelPriority = priority,
                        ChiefComplaint = SyncHandlerSupport.Norm(payload.ChiefComplaint),
                        PainScore = payload.PainScore,
                        PainAssessable = painAssessable,
                        VitalsJson = vitalsJson,
                        ActorUserId = context.UserId,
                        ActorProfessionalId = context.ActorProfessionalId,
                        ActorDisplayName = display,
                        OccurredAtUtc = occurred.UtcDateTime
                    }
                }
            ]
        };
    }

    private async Task<SyncCommandPlan> PlanReclassifyAsync(SyncCommandContext context, CancellationToken ct)
    {
        var payload = SyncHandlerSupport.DeserializePayload<SyncTriageReclassifyPayload>(
            context.Request.PayloadJson, "triage.reclassify");
        if (payload.EncounterId == Guid.Empty)
            throw new ArgumentException("payload.encounterId es obligatorio.");
        if (string.IsNullOrWhiteSpace(payload.Level))
            throw new ArgumentException("Reclasificar exige Level.");
        if (context.ActorProfessionalId is null || context.ActorProfessionalId == Guid.Empty)
            throw new UnauthorizedAccessException(
                "La reclasificación de triage es acto médico: exige ProfessionalId en sesión.");

        var display = await SyncHandlerSupport.RequireDisplayNameAsync(
            professionalRepository, context.TenantId, context.ActorProfessionalId, ct);

        var existing = await triageRepository.GetByEncounterAsync(context.TenantId, payload.EncounterId, ct)
            ?? throw new KeyNotFoundException("No hay triage previo para reclasificar.");

        var branchId = await triageRepository.GetEncounterBranchIdAsync(
            context.TenantId, payload.EncounterId, ct)
            ?? throw new KeyNotFoundException("Episodio no encontrado.");

        var scale = await triageRepository.GetEffectiveScaleAsync(context.TenantId, branchId, ct)
            ?? throw new InvalidOperationException("No hay escala de triage configurada.");

        var level = payload.Level.Trim();
        var priority = TriageScaleRules.ResolvePriority(scale, level);
        var painAssessable = SyncHandlerSupport.Norm(payload.PainAssessable) ?? existing.PainAssessable;
        ValidatePain(painAssessable, payload.PainScore);

        var vitals = TriageVitalsNormalizer.NormalizeForPersist(
            payload.Vitals ?? existing.Vitals.ToList());
        var vitalsJson = TriageScaleJson.SerializeVitals(vitals);
        var occurred = payload.OccurredAtUtc ?? SyncHandlerSupport.OccurredAt(context);
        var triageId = Guid.NewGuid();

        return new SyncCommandPlan
        {
            ServerEntityId = triageId.ToString("D"),
            ClinicalProcedures =
            [
                new SyncProcedureCall
                {
                    ProcedureName = "sp_Triage_Reclassify",
                    Parameters = new
                    {
                        TriageId = triageId,
                        TenantId = context.TenantId,
                        EncounterId = payload.EncounterId,
                        Level = level,
                        ScaleCode = scale.ScaleCode,
                        ScaleConfigId = scale.ConfigId,
                        LevelPriority = priority,
                        ChiefComplaint = SyncHandlerSupport.Norm(payload.ChiefComplaint)
                            ?? existing.ChiefComplaint,
                        PainScore = payload.PainScore ?? existing.PainScore,
                        PainAssessable = painAssessable,
                        VitalsJson = vitalsJson,
                        ActorUserId = context.UserId,
                        ActorProfessionalId = context.ActorProfessionalId,
                        ActorDisplayName = display,
                        OccurredAtUtc = occurred.UtcDateTime
                    }
                }
            ]
        };
    }

    private SyncCommandPlan PlanAppend(SyncCommandContext context)
    {
        var payload = SyncHandlerSupport.DeserializePayload<SyncVitalsAppendPayload>(
            context.Request.PayloadJson, "vitals.append");
        if (payload.EncounterId == Guid.Empty)
            throw new ArgumentException("payload.encounterId es obligatorio.");
        if (payload.Vitals is null || payload.Vitals.Count == 0)
            throw new ArgumentException("Append de signos exige al menos una medición explícita.");

        var normalized = TriageVitalsNormalizer.NormalizeExplicitOnly(payload.Vitals);
        if (normalized.Count == 0)
            throw new ArgumentException("No hay mediciones válidas para append.");

        var sourceContext = SyncHandlerSupport.Norm(payload.SourceContext) ?? VitalSourceContexts.Evolucion;
        var vitalsJson = TriageScaleJson.SerializeVitals(normalized);
        var occurred = payload.OccurredAtUtc ?? SyncHandlerSupport.OccurredAt(context);
        var vitalSetId = Guid.NewGuid();

        return new SyncCommandPlan
        {
            ServerEntityId = vitalSetId.ToString("D"),
            ClinicalProcedures =
            [
                new SyncProcedureCall
                {
                    ProcedureName = "sp_VitalSigns_Append",
                    Parameters = new
                    {
                        VitalSetId = vitalSetId,
                        TenantId = context.TenantId,
                        EncounterId = payload.EncounterId,
                        VitalsJson = vitalsJson,
                        SourceContext = sourceContext,
                        ActorUserId = context.UserId,
                        ActorProfessionalId = context.ActorProfessionalId,
                        OccurredAtUtc = occurred.UtcDateTime
                    }
                }
            ]
        };
    }

    private static void ValidatePain(string painAssessable, int? painScore)
    {
        if (painAssessable is not (PainAssessableCodes.Valorable or PainAssessableCodes.NoValorable))
            throw new ArgumentException("PainAssessable inválido (valorable|no_valorable).");
        if (painAssessable == PainAssessableCodes.NoValorable && painScore is not null)
            throw new ArgumentException("Dolor no valorable no admite PainScore.");
        if (painScore is < 0 or > 10)
            throw new ArgumentException("PainScore debe estar entre 0 y 10.");
    }
}
