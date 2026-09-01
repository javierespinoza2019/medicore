using MediCore.DataAccess.Triage;
using MediCore.Models.Triage;

namespace MediCore.Business.Triage;

public interface ITriageService
{
    Task<TriageScaleConfigDto?> GetEffectiveScaleAsync(
        Guid tenantId, Guid branchId, CancellationToken ct);

    Task<TriageScaleConfigDto> UpsertTenantScaleAsync(
        Guid tenantId, Guid actorUserId, UpsertTriageScaleRequest request, CancellationToken ct);

    Task<TriageScaleConfigDto> UpsertBranchScaleAsync(
        Guid tenantId, Guid branchId, Guid actorUserId, UpsertTriageScaleRequest request,
        CancellationToken ct);

    Task<TriageDto> SaveAsync(
        Guid tenantId, Guid encounterId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, SaveTriageRequest request, CancellationToken ct);

    Task<TriageDto?> GetByEncounterAsync(Guid tenantId, Guid encounterId, CancellationToken ct);

    Task<TriageDto> ReclassifyAsync(
        Guid tenantId, Guid encounterId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, ReclassifyTriageRequest request, CancellationToken ct);

    Task<VitalSetDto> AppendVitalsAsync(
        Guid tenantId, Guid encounterId, Guid actorUserId, Guid? actorProfessionalId,
        AppendVitalsRequest request, CancellationToken ct);

    Task<IReadOnlyList<VitalSetDto>> ListVitalsAsync(
        Guid tenantId, Guid encounterId, CancellationToken ct);
}

public sealed class TriageService(ITriageRepository repository) : ITriageService
{
    public Task<TriageScaleConfigDto?> GetEffectiveScaleAsync(
        Guid tenantId, Guid branchId, CancellationToken ct)
    {
        if (branchId == Guid.Empty)
            throw new ArgumentException("branchId es obligatorio para resolver la escala efectiva.");
        return repository.GetEffectiveScaleAsync(tenantId, branchId, ct);
    }

    public async Task<TriageScaleConfigDto> UpsertTenantScaleAsync(
        Guid tenantId, Guid actorUserId, UpsertTriageScaleRequest request, CancellationToken ct)
    {
        ValidateUpsert(request);
        var levelsJson = TriageScaleJson.SerializeLevels(request.Levels, request.Note);
        return await repository.UpsertScaleAsync(
            tenantId, Guid.NewGuid(), null, request.ScaleCode.Trim(),
            request.DisplayName.Trim(), levelsJson, actorUserId, ct)
            ?? throw new InvalidOperationException("No se pudo guardar la escala de tenant.");
    }

    public async Task<TriageScaleConfigDto> UpsertBranchScaleAsync(
        Guid tenantId, Guid branchId, Guid actorUserId, UpsertTriageScaleRequest request,
        CancellationToken ct)
    {
        if (branchId == Guid.Empty)
            throw new ArgumentException("branchId es obligatorio.");
        ValidateUpsert(request);
        var levelsJson = TriageScaleJson.SerializeLevels(request.Levels, request.Note);
        return await repository.UpsertScaleAsync(
            tenantId, Guid.NewGuid(), branchId, request.ScaleCode.Trim(),
            request.DisplayName.Trim(), levelsJson, actorUserId, ct)
            ?? throw new InvalidOperationException("No se pudo guardar la escala de sucursal.");
    }

    public async Task<TriageDto> SaveAsync(
        Guid tenantId, Guid encounterId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, SaveTriageRequest request, CancellationToken ct)
    {
        if (encounterId == Guid.Empty)
            throw new ArgumentException("encounterId es obligatorio.");
        if (string.IsNullOrWhiteSpace(actorDisplayName))
            throw new ArgumentException("DisplayName de autoría es obligatorio.");

        var branchId = await repository.GetEncounterBranchIdAsync(tenantId, encounterId, ct)
            ?? throw new KeyNotFoundException("Episodio no encontrado.");

        var scale = await repository.GetEffectiveScaleAsync(tenantId, branchId, ct)
            ?? throw new InvalidOperationException(
                "No hay escala de triage configurada (tenant ni sucursal). Configure antes de valorar.");

        var level = Norm(request.Level);
        var priority = TriageScaleRules.ResolvePriority(scale, level);
        var painAssessable = Norm(request.PainAssessable) ?? PainAssessableCodes.Valorable;
        ValidatePain(painAssessable, request.PainScore);

        var vitals = TriageVitalsNormalizer.NormalizeForPersist(request.Vitals);
        var vitalsJson = TriageScaleJson.SerializeVitals(vitals);
        var occurred = request.OccurredAtUtc ?? DateTimeOffset.UtcNow;

        return await repository.SaveAsync(
            tenantId,
            Guid.NewGuid(),
            encounterId,
            level,
            scale.ScaleCode,
            scale.ConfigId,
            priority,
            Norm(request.ChiefComplaint),
            request.PainScore,
            painAssessable,
            vitalsJson,
            actorUserId,
            actorProfessionalId,
            actorDisplayName.Trim(),
            occurred,
            ct) ?? throw new InvalidOperationException("No se pudo guardar el triage.");
    }

    public Task<TriageDto?> GetByEncounterAsync(Guid tenantId, Guid encounterId, CancellationToken ct) =>
        repository.GetByEncounterAsync(tenantId, encounterId, ct);

    public async Task<TriageDto> ReclassifyAsync(
        Guid tenantId, Guid encounterId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, ReclassifyTriageRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Level))
            throw new ArgumentException("Reclasificar exige Level.");
        if (actorProfessionalId is null || actorProfessionalId == Guid.Empty)
            throw new UnauthorizedAccessException(
                "La reclasificación de triage es acto médico: exige ProfessionalId en sesión.");

        var existing = await repository.GetByEncounterAsync(tenantId, encounterId, ct)
            ?? throw new KeyNotFoundException("No hay triage previo para reclasificar.");

        var branchId = await repository.GetEncounterBranchIdAsync(tenantId, encounterId, ct)
            ?? throw new KeyNotFoundException("Episodio no encontrado.");

        var scale = await repository.GetEffectiveScaleAsync(tenantId, branchId, ct)
            ?? throw new InvalidOperationException("No hay escala de triage configurada.");

        var level = request.Level.Trim();
        var priority = TriageScaleRules.ResolvePriority(scale, level);
        var painAssessable = Norm(request.PainAssessable) ?? existing.PainAssessable;
        ValidatePain(painAssessable, request.PainScore);

        var vitals = TriageVitalsNormalizer.NormalizeForPersist(
            request.Vitals ?? existing.Vitals.ToList());
        var vitalsJson = TriageScaleJson.SerializeVitals(vitals);
        var occurred = request.OccurredAtUtc ?? DateTimeOffset.UtcNow;

        return await repository.ReclassifyAsync(
            tenantId,
            Guid.NewGuid(),
            encounterId,
            level,
            scale.ScaleCode,
            scale.ConfigId,
            priority,
            Norm(request.ChiefComplaint) ?? existing.ChiefComplaint,
            request.PainScore ?? existing.PainScore,
            painAssessable,
            vitalsJson,
            actorUserId,
            actorProfessionalId,
            actorDisplayName.Trim(),
            occurred,
            ct) ?? throw new InvalidOperationException("No se pudo reclasificar el triage.");
    }

    public async Task<VitalSetDto> AppendVitalsAsync(
        Guid tenantId, Guid encounterId, Guid actorUserId, Guid? actorProfessionalId,
        AppendVitalsRequest request, CancellationToken ct)
    {
        if (request.Vitals is null || request.Vitals.Count == 0)
            throw new ArgumentException("Append de signos exige al menos una medición explícita.");

        var normalized = TriageVitalsNormalizer.NormalizeExplicitOnly(request.Vitals);
        if (normalized.Count == 0)
            throw new ArgumentException("No hay mediciones válidas para append.");

        var context = Norm(request.SourceContext) ?? VitalSourceContexts.Evolucion;
        var vitalsJson = TriageScaleJson.SerializeVitals(normalized);
        var occurred = request.OccurredAtUtc ?? DateTimeOffset.UtcNow;

        return await repository.AppendVitalsAsync(
            tenantId, Guid.NewGuid(), encounterId, vitalsJson, context,
            actorUserId, actorProfessionalId, occurred, ct)
            ?? throw new InvalidOperationException("No se pudo registrar el set de signos.");
    }

    public Task<IReadOnlyList<VitalSetDto>> ListVitalsAsync(
        Guid tenantId, Guid encounterId, CancellationToken ct) =>
        repository.ListVitalsAsync(tenantId, encounterId, ct);

    private static void ValidateUpsert(UpsertTriageScaleRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ScaleCode))
            throw new ArgumentException("ScaleCode es obligatorio.");
        if (string.IsNullOrWhiteSpace(request.DisplayName))
            throw new ArgumentException("DisplayName es obligatorio.");
        TriageScaleRules.EnsureValidLevels(request.Levels);
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

    private static string? Norm(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
