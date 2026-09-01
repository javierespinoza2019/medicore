using MediCore.DataAccess.Encounter;
using MediCore.Models.Encounter;

namespace MediCore.Business.Encounter;

public interface IEncounterService
{
    Task<EncounterDto> OpenAsync(
        Guid tenantId, Guid actorUserId, Guid? actorProfessionalId,
        OpenEncounterRequest request, CancellationToken ct);

    Task<EncounterDto?> GetByIdAsync(Guid tenantId, Guid encounterId, CancellationToken ct);

    Task<EncounterQueueDto> ListQueueAsync(
        Guid tenantId, Guid branchId, bool includeClosed, CancellationToken ct);

    Task<IReadOnlyList<EncounterDto>> ListBySubjectAsync(
        Guid tenantId, Guid subjectId, CancellationToken ct);

    Task<EncounterDto?> UpdateAdmissionAsync(
        Guid tenantId, Guid encounterId, Guid actorUserId, Guid? actorProfessionalId,
        UpdateAdmissionRequest request, CancellationToken ct);

    Task<EncounterDto?> TransitionStateAsync(
        Guid tenantId, Guid encounterId, Guid actorUserId, Guid? actorProfessionalId,
        TransitionStateRequest request, CancellationToken ct);

    Task<EncounterDto?> AssignProfessionalAsync(
        Guid tenantId, Guid encounterId, Guid actorUserId, Guid? actorProfessionalId,
        AssignProfessionalRequest request, CancellationToken ct);

    Task<MpNoticeDto?> CreateMpNoticeAsync(
        Guid tenantId, Guid encounterId, Guid actorUserId,
        CreateMpNoticeRequest request, CancellationToken ct);

    Task<CareWithoutConsentDto?> CreateCareWithoutConsentAsync(
        Guid tenantId, Guid encounterId, Guid actorUserId,
        CreateCareWithoutConsentRequest request, CancellationToken ct);
}

public sealed class EncounterService(IEncounterRepository repository) : IEncounterService
{
    public async Task<EncounterDto> OpenAsync(
        Guid tenantId, Guid actorUserId, Guid? actorProfessionalId,
        OpenEncounterRequest request, CancellationToken ct)
    {
        if (request.BranchId == Guid.Empty)
            throw new ArgumentException("branchId es obligatorio para abrir el episodio.");
        if (request.SubjectId == Guid.Empty)
            throw new ArgumentException("subjectId es obligatorio para abrir el episodio.");

        var type = Norm(request.EncounterType)?.ToLowerInvariant() ?? EncounterTypes.Urgencias;
        if (!EncounterTypes.All.Contains(type))
            throw new ArgumentException("EncounterType inválido (urgencias|consulta_externa).");

        var circumstance = Norm(request.AdmissionCircumstance)?.ToLowerInvariant();

        var created = await repository.OpenAsync(
            tenantId,
            Guid.NewGuid(),
            actorUserId,
            actorProfessionalId,
            DateTimeOffset.UtcNow,
            new OpenEncounterRequest
            {
                BranchId = request.BranchId,
                SubjectId = request.SubjectId,
                EncounterType = type,
                ArrivalAtUtc = request.ArrivalAtUtc,
                AccessRoute = Norm(request.AccessRoute),
                AdmissionCircumstance = circumstance,
                AdmissionCircumstanceText = Norm(request.AdmissionCircumstanceText)
            },
            ct) ?? throw new InvalidOperationException("No se pudo abrir el episodio.");

        // Garantía: MP notificado inicia no valorado.
        if (created.MinisterioPublicoNotified is not null)
            throw new InvalidOperationException(
                "Invariante roto: MinisterioPublicoNotified debe iniciar en no valorado (null).");

        return AnnotateRequired(created);
    }

    public async Task<EncounterDto?> GetByIdAsync(Guid tenantId, Guid encounterId, CancellationToken ct)
    {
        var dto = await repository.GetByIdAsync(tenantId, encounterId, ct);
        return Annotate(dto);
    }

    public async Task<EncounterQueueDto> ListQueueAsync(
        Guid tenantId, Guid branchId, bool includeClosed, CancellationToken ct)
    {
        if (branchId == Guid.Empty)
            throw new ArgumentException("branchId es obligatorio.");

        var items = await repository.ListQueueAsync(tenantId, branchId, includeClosed, ct);
        var annotated = items.Select(AnnotateRequired).ToList();
        var sorted = EncounterQueueOrdering.Sort(annotated);
        return new EncounterQueueDto
        {
            BranchId = branchId,
            Items = sorted,
            Total = sorted.Count,
            AllUnclassified = sorted.All(e => string.IsNullOrWhiteSpace(e.TriageLevel))
        };
    }

    public async Task<IReadOnlyList<EncounterDto>> ListBySubjectAsync(
        Guid tenantId, Guid subjectId, CancellationToken ct)
    {
        var list = await repository.ListBySubjectAsync(tenantId, subjectId, ct);
        return list.Select(AnnotateRequired).ToList();
    }

    public async Task<EncounterDto?> UpdateAdmissionAsync(
        Guid tenantId, Guid encounterId, Guid actorUserId, Guid? actorProfessionalId,
        UpdateAdmissionRequest request, CancellationToken ct)
    {
        return Annotate(await repository.UpdateAdmissionAsync(
            tenantId, encounterId, actorUserId, actorProfessionalId, DateTimeOffset.UtcNow,
            new UpdateAdmissionRequest
            {
                AccessRoute = Norm(request.AccessRoute),
                AdmissionCircumstance = Norm(request.AdmissionCircumstance)?.ToLowerInvariant(),
                AdmissionCircumstanceText = Norm(request.AdmissionCircumstanceText),
                MinisterioPublicoNotified = request.MinisterioPublicoNotified,
                ClearMpNotified = request.ClearMpNotified
            },
            ct));
    }

    public async Task<EncounterDto?> TransitionStateAsync(
        Guid tenantId, Guid encounterId, Guid actorUserId, Guid? actorProfessionalId,
        TransitionStateRequest request, CancellationToken ct)
    {
        var to = Norm(request.ToState)?.ToLowerInvariant()
            ?? throw new ArgumentException("toState es obligatorio.");

        if (!EncounterStates.All.Contains(to))
            throw new ArgumentException("Estado inválido (abierto|en_observacion|cerrado).");

        string? disposition = null;
        string? pendingOverride = null;
        if (to == EncounterStates.Cerrado)
        {
            disposition = Norm(request.Disposition)?.ToLowerInvariant();
            if (disposition is null)
                throw new ArgumentException(
                    "El cierre exige Disposition (sin default a alta_domicilio).");
            if (!EncounterDispositions.All.Contains(disposition))
                throw new ArgumentException("Disposition inválida.");
            if (string.IsNullOrWhiteSpace(request.Justification))
                throw new EncounterCloseWithoutJustificationException();
            pendingOverride = Norm(request.PendingPrescriptionsOverrideReason);
        }

        var current = await repository.GetByIdAsync(tenantId, encounterId, ct)
            ?? throw new KeyNotFoundException("Episodio no encontrado.");

        EncounterStateMachine.EnsureAllowed(current.State, to);

        if (to == EncounterStates.Cerrado)
        {
            var pending = await repository.CountUnsignedPrescriptionsByEncounterAsync(
                tenantId, encounterId, ct);
            PendingPrescriptionCloseRules.EnsureAllowed(pending, pendingOverride);
        }

        try
        {
            return Annotate(await repository.TransitionStateAsync(
                tenantId, encounterId, Guid.NewGuid(), actorUserId, actorProfessionalId,
                DateTimeOffset.UtcNow,
                new TransitionStateRequest
                {
                    ToState = to,
                    Disposition = disposition,
                    Justification = Norm(request.Justification),
                    PendingPrescriptionsOverrideReason = pendingOverride
                },
                ct));
        }
        catch (InvalidOperationException ex) when (ex.Message.StartsWith("CLOSE_WITHOUT_TRIAGE:", StringComparison.Ordinal))
        {
            throw new EncounterCloseWithoutTriageException(
                ex.Message["CLOSE_WITHOUT_TRIAGE:".Length..]);
        }
        catch (InvalidOperationException ex) when (ex.Message.StartsWith("CLOSE_WITHOUT_JUSTIFICATION:", StringComparison.Ordinal))
        {
            throw new EncounterCloseWithoutJustificationException();
        }
        catch (InvalidOperationException ex) when (ex.Message.StartsWith("CLOSE_WITH_PENDING_RX:", StringComparison.Ordinal))
        {
            throw PendingPrescriptionCloseRules.FromRepositoryMessage(ex.Message);
        }
    }

    public async Task<EncounterDto?> AssignProfessionalAsync(
        Guid tenantId, Guid encounterId, Guid actorUserId, Guid? actorProfessionalId,
        AssignProfessionalRequest request, CancellationToken ct)
    {
        if (request.ProfessionalId == Guid.Empty)
            throw new ArgumentException("professionalId es obligatorio.");

        return Annotate(await repository.AssignProfessionalAsync(
            tenantId, encounterId, request.ProfessionalId, actorUserId, actorProfessionalId,
            DateTimeOffset.UtcNow, ct));
    }

    public async Task<MpNoticeDto?> CreateMpNoticeAsync(
        Guid tenantId, Guid encounterId, Guid actorUserId,
        CreateMpNoticeRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.EstablishmentNameSnapshot))
            throw new ArgumentException("establishmentNameSnapshot es obligatorio (NOM-004 10.3.1).");
        if (string.IsNullOrWhiteSpace(request.PatientIdentificationText))
            throw new ArgumentException(
                "patientIdentificationText es obligatorio; se admite identidad provisional (SC-24).");
        if (string.IsNullOrWhiteSpace(request.NotifiedAct))
            throw new ArgumentException("notifiedAct es obligatorio (NOM-004 10.3.4).");
        if (string.IsNullOrWhiteSpace(request.MpAgencyName))
            throw new ArgumentException("mpAgencyName es obligatorio (NOM-004 10.3.6).");
        if (request.NotifyingProfessionalId == Guid.Empty)
            throw new ArgumentException("notifyingProfessionalId es obligatorio (NOM-004 10.3.7).");
        if (string.IsNullOrWhiteSpace(request.NotifyingProfessionalName))
            throw new ArgumentException("notifyingProfessionalName es obligatorio.");

        return await repository.CreateMpNoticeAsync(
            tenantId, encounterId, Guid.NewGuid(), actorUserId, DateTimeOffset.UtcNow,
            new CreateMpNoticeRequest
            {
                EstablishmentNameSnapshot = request.EstablishmentNameSnapshot.Trim(),
                ElaboratedAtUtc = request.ElaboratedAtUtc,
                PatientIdentificationText = request.PatientIdentificationText.Trim(),
                NotifiedAct = request.NotifiedAct.Trim(),
                InjuryReportText = Norm(request.InjuryReportText),
                MpAgencyName = request.MpAgencyName.Trim(),
                NotifyingProfessionalId = request.NotifyingProfessionalId,
                NotifyingProfessionalName = request.NotifyingProfessionalName.Trim()
            },
            ct);
    }

    public async Task<CareWithoutConsentDto?> CreateCareWithoutConsentAsync(
        Guid tenantId, Guid encounterId, Guid actorUserId,
        CreateCareWithoutConsentRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.ClinicalAssessment))
            throw new ArgumentException("clinicalAssessment es obligatorio.");
        if (string.IsNullOrWhiteSpace(request.UrgencyRationale))
            throw new ArgumentException("urgencyRationale es obligatorio.");

        CareWithoutConsentRules.EnsureDistinctProfessionals(
            request.ProfessionalId1, request.ProfessionalId2);

        return await repository.CreateCareWithoutConsentAsync(
            tenantId, encounterId, Guid.NewGuid(), actorUserId, DateTimeOffset.UtcNow,
            new CreateCareWithoutConsentRequest
            {
                ClinicalAssessment = request.ClinicalAssessment.Trim(),
                UrgencyRationale = request.UrgencyRationale.Trim(),
                NoRelativeOrRepresentative = request.NoRelativeOrRepresentative,
                ProfessionalId1 = request.ProfessionalId1,
                ProfessionalId2 = request.ProfessionalId2
            },
            ct);
    }

    private static string? Norm(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static EncounterDto? Annotate(EncounterDto? dto) =>
        dto is null ? null : AnnotateRequired(dto);

    private static EncounterDto AnnotateRequired(EncounterDto dto)
    {
        dto.SuggestMpNoticeEvaluation =
            MpNoticeSuggestion.ShouldSuggestEvaluation(dto.AdmissionCircumstance);
        return dto;
    }
}
