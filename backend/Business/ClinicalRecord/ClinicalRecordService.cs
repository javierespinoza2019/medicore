using MediCore.DataAccess.ClinicalRecord;
using MediCore.Models.ClinicalRecord;

namespace MediCore.Business.ClinicalRecord;

public interface IClinicalRecordService
{
    Task<ClinicalRecordDto> GetBySubjectAsync(
        Guid tenantId, Guid subjectId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, CancellationToken ct);

    Task<MedicalHistoryDto> SaveHistoryAsync(
        Guid tenantId, Guid subjectId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, SaveMedicalHistoryRequest request, CancellationToken ct);

    Task<AmendmentDto> AddAmendmentAsync(
        Guid tenantId, Guid subjectId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, AddAmendmentRequest request, CancellationToken ct);

    Task<AllergyStatusDto> SetAllergyStatusAsync(
        Guid tenantId, Guid subjectId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, SetAllergyStatusRequest request, CancellationToken ct);

    Task<AllergyDto> AddAllergyAsync(
        Guid tenantId, Guid subjectId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, AddAllergyRequest request, CancellationToken ct);

    Task SoftDeleteAllergyAsync(
        Guid tenantId, Guid subjectId, Guid allergyId, Guid actorUserId, CancellationToken ct);

    Task<SubjectFlagDto> SetFlagAsync(
        Guid tenantId, Guid subjectId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, SetSubjectFlagRequest request, CancellationToken ct);
}

public sealed class ClinicalRecordService(IClinicalRecordRepository repository) : IClinicalRecordService
{
    public async Task<ClinicalRecordDto> GetBySubjectAsync(
        Guid tenantId, Guid subjectId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, CancellationToken ct)
    {
        var record = await repository.GetBySubjectAsync(
            tenantId, subjectId, actorUserId, actorProfessionalId,
            Display(actorDisplayName), DateTimeOffset.UtcNow, ensureIfMissing: true, ct);

        return record ?? throw new KeyNotFoundException("Sujeto o expediente no encontrado.");
    }

    public async Task<MedicalHistoryDto> SaveHistoryAsync(
        Guid tenantId, Guid subjectId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, SaveMedicalHistoryRequest request, CancellationToken ct)
    {
        var body = ResolveBody(request);
        ClinicalRecordDomain.EnsureInterrogatorioCampos(body);

        var origin = string.IsNullOrWhiteSpace(request.Origin)
            ? HistoryOrigins.Capturado
            : request.Origin.Trim().ToLowerInvariant();
        if (origin is not (HistoryOrigins.Capturado or HistoryOrigins.PrellenadoPorSistema))
            throw new ArgumentException("Origin inválido (capturado|prellenado_por_sistema).");

        var saved = await repository.SaveHistoryAsync(
            tenantId, subjectId, Guid.NewGuid(), actorUserId, actorProfessionalId,
            Display(actorDisplayName), DateTimeOffset.UtcNow, body.ToJson(), origin, ct);

        return saved ?? throw new InvalidOperationException("No se pudo guardar la historia clínica.");
    }

    public async Task<AmendmentDto> AddAmendmentAsync(
        Guid tenantId, Guid subjectId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, AddAmendmentRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.ReasonText))
            throw new ArgumentException("reasonText del addendum es obligatorio.");

        var amendment = await repository.AddAmendmentAsync(
            tenantId, subjectId, Guid.NewGuid(), request.HistoryId, actorUserId, actorProfessionalId,
            Display(actorDisplayName), DateTimeOffset.UtcNow, request.ReasonText.Trim(), request.BodyJson, ct);

        return amendment ?? throw new KeyNotFoundException("Expediente o historia no encontrada.");
    }

    public async Task<AllergyStatusDto> SetAllergyStatusAsync(
        Guid tenantId, Guid subjectId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, SetAllergyStatusRequest request, CancellationToken ct)
    {
        var status = (request.Status ?? string.Empty).Trim().ToLowerInvariant();
        if (!AllergyStatusCodes.All.Contains(status))
            throw new ArgumentException(
                "Status inválido (no_interrogado|niega|refiere|se_desconoce|paciente_no_puede_responder).");

        var saved = await repository.SetAllergyStatusAsync(
            tenantId, subjectId, Guid.NewGuid(), actorUserId, actorProfessionalId,
            Display(actorDisplayName), DateTimeOffset.UtcNow, status, ct);

        return saved ?? throw new InvalidOperationException("No se pudo asentar el estado alérgico.");
    }

    public async Task<AllergyDto> AddAllergyAsync(
        Guid tenantId, Guid subjectId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, AddAllergyRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Substance))
            throw new ArgumentException("substance es obligatoria.");

        var reaction = (request.ReactionType ?? string.Empty).Trim().ToLowerInvariant();
        if (!AllergyReactionTypes.All.Contains(reaction))
            throw new ArgumentException("reactionType inválido (alergia|intolerancia|efecto_adverso_conocido).");

        var normalized = new AddAllergyRequest
        {
            Substance = request.Substance.Trim(),
            ReactionType = reaction,
            Category = Norm(request.Category)?.ToLowerInvariant(),
            Manifestation = Norm(request.Manifestation),
            Severity = Norm(request.Severity)?.ToLowerInvariant(),
            Certainty = Norm(request.Certainty)?.ToLowerInvariant(),
            DataOrigin = Norm(request.DataOrigin)?.ToLowerInvariant()
        };

        var allergy = await repository.AddAllergyAsync(
            tenantId, subjectId, Guid.NewGuid(), actorUserId, actorProfessionalId,
            Display(actorDisplayName), DateTimeOffset.UtcNow, normalized, ct);

        return allergy ?? throw new InvalidOperationException("No se pudo registrar la alergia.");
    }

    public Task SoftDeleteAllergyAsync(
        Guid tenantId, Guid subjectId, Guid allergyId, Guid actorUserId, CancellationToken ct) =>
        repository.SoftDeleteAllergyAsync(tenantId, subjectId, allergyId, actorUserId, DateTimeOffset.UtcNow, ct);

    public async Task<SubjectFlagDto> SetFlagAsync(
        Guid tenantId, Guid subjectId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, SetSubjectFlagRequest request, CancellationToken ct)
    {
        var flagType = (request.FlagType ?? string.Empty).Trim().ToLowerInvariant();
        if (!SubjectFlagTypes.All.Contains(flagType))
            throw new ArgumentException("flagType inválido (alergia_grave|riesgo|embarazo|otro).");

        var saved = await repository.SetFlagAsync(
            tenantId, subjectId, Guid.NewGuid(), actorUserId, actorProfessionalId,
            Display(actorDisplayName), DateTimeOffset.UtcNow,
            new SetSubjectFlagRequest
            {
                FlagType = flagType,
                PayloadJson = request.PayloadJson,
                IsActive = request.IsActive
            },
            ct);

        return saved ?? throw new InvalidOperationException("No se pudo asentar la alerta del sujeto.");
    }

    private static MedicalHistoryBody ResolveBody(SaveMedicalHistoryRequest request)
    {
        if (request.Body is not null)
            return request.Body;
        if (!string.IsNullOrWhiteSpace(request.BodyJson))
            return MedicalHistoryBody.FromJson(request.BodyJson);
        throw new ArgumentException("body o bodyJson es obligatorio.");
    }

    private static string Display(string? name) =>
        string.IsNullOrWhiteSpace(name) ? "usuario" : name.Trim();

    private static string? Norm(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
