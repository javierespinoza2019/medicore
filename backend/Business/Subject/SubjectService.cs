using System.Text.Json;
using MediCore.Business.ClinicalRecord;
using MediCore.Common;
using MediCore.DataAccess.Subject;
using MediCore.Models.ClinicalRecord;
using MediCore.Models.Subject;

namespace MediCore.Business.Subject;

public interface ISubjectService
{
    Task<SubjectDto> CreateAsync(
        Guid tenantId, Guid actorUserId, Guid? actorProfessionalId, string? actorDisplayName,
        CreateSubjectRequest request, CancellationToken ct);

    Task<SubjectDto?> GetByIdAsync(
        Guid tenantId, Guid subjectId, bool includeMarks, CancellationToken ct);

    Task<IReadOnlyList<SubjectListItemDto>> SearchAsync(
        Guid tenantId, string? query, bool includeUnidentified, CancellationToken ct);

    Task<SubjectDto?> UpdateIdentityAsync(
        Guid tenantId, Guid subjectId, Guid actorUserId, UpdateIdentityRequest request, CancellationToken ct);

    Task<IdentityStateEventDto?> TransitionStateAsync(
        Guid tenantId, Guid subjectId, Guid actorUserId, Guid? actorProfessionalId,
        bool canVerifyOrRectify, TransitionIdentityStateRequest request, CancellationToken ct);

    Task<UnidentifiedLabelConfigDto?> GetEffectiveLabelConfigAsync(
        Guid tenantId, Guid branchId, CancellationToken ct);

    Task<UnidentifiedLabelConfigDto> UpsertLabelConfigAsync(
        Guid tenantId, Guid actorUserId, UpsertLabelConfigRequest request, CancellationToken ct);

    Task<SubjectDistinctiveMarkDto?> AddMarkAsync(
        Guid tenantId, Guid subjectId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, AddDistinctiveMarkRequest request, CancellationToken ct);

    Task<SubjectBelongingDto?> AddBelongingAsync(
        Guid tenantId, Guid subjectId, Guid actorUserId, AddBelongingRequest request, CancellationToken ct);

    Task<DescriptionSearchResultDto> SearchByDescriptionAsync(
        Guid tenantId, Guid actorUserId, SearchByDescriptionRequest request, CancellationToken ct);

    Task<SubjectLinkDto> LinkAsync(
        Guid tenantId, Guid actorUserId, LinkSubjectsRequest request, CancellationToken ct);

    Task<SubjectLinkDto> RevertLinkAsync(
        Guid tenantId, Guid subjectId, Guid linkId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, RevertSubjectLinkRequest request, CancellationToken ct);

    Task SoftDeleteAsync(Guid tenantId, Guid subjectId, Guid actorUserId, CancellationToken ct);
}

public sealed class SubjectService(
    ISubjectRepository repository,
    IClinicalRecordService clinicalRecord) : ISubjectService
{
    // Centinela SINBA — prohibido en Subject (doc 01 §3 / doc 08 §3).
    private static readonly DateOnly SinbaSentinelBirth = new(9999, 9, 9);

    public async Task<SubjectDto> CreateAsync(
        Guid tenantId, Guid actorUserId, Guid? actorProfessionalId, string? actorDisplayName,
        CreateSubjectRequest request, CancellationToken ct)
    {
        if (request.BranchId == Guid.Empty)
            throw new ArgumentException("branchId es obligatorio para crear el sujeto.");

        var given = Norm(request.GivenName);
        var first = Norm(request.FirstSurname);
        var second = Norm(request.SecondSurname);
        var preferred = Norm(request.PreferredName);
        var curp = CurpValidator.NormalizeOptional(request.Curp);

        if (request.BirthDate == SinbaSentinelBirth)
            throw new ArgumentException(
                "La fecha 09/09/9999 es centinela SINBA de reporte; no se almacena en Subject. Deje BirthDate vacío o use edad estimada.");

        ValidateSex(request.BiologicalSex, request.SexSource);
        ValidateGenderIdentity(request.GenderIdentity);
        var ageJson = EstimatedAgeMapper.ToJson(request.EstimatedAge);

        var hasIdentityName = given is not null || first is not null || second is not null;
        var asUnidentified = request.AsUnidentified == true
            || (!hasIdentityName && curp is null && request.AsUnidentified != false);

        var state = asUnidentified && !hasIdentityName
            ? IdentificationStates.NoIdentificado
            : hasIdentityName
                ? IdentificationStates.DeclaradaSinDocumento
                : IdentificationStates.NoIdentificado;

        // Folio no por conteo simple (BM-PAC-12): marca temporal + sufijo ULID corto.
        var branchCode = await repository.GetBranchCodeAsync(tenantId, request.BranchId, ct)
            ?? throw new ArgumentException("La sucursal no existe en el tenant.");
        var issueLabel = asUnidentified || state == IdentificationStates.NoIdentificado;

        // Reintento ante carrera de token de etiqueta (UQ_SubjectTemporaryLabel) bajo suite/paralelismo.
        const int maxAttempts = 8;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            var now = DateTimeOffset.UtcNow;
            var recordNumber =
                $"{branchCode.ToUpperInvariant()}-{now.UtcDateTime:yyMMddHHmmss}-{UlidId.New()[^8..]}";

            Guid? labelId = null;
            string? internalCode = null;
            string? operational = null;
            string? snapshot = null;

            if (issueLabel)
            {
                var config = await repository.GetEffectiveLabelConfigAsync(tenantId, request.BranchId, ct)
                    ?? throw new InvalidOperationException(
                        "No hay configuración de etiqueta de no identificado (tenant ni sucursal). Configure UnidentifiedLabelConfig.");

                var used = await repository.ListUsedLabelTokensTodayAsync(tenantId, request.BranchId, now, ct);
                var issued = TemporaryLabelIssuer.Issue(config, branchCode, now, used);
                labelId = Guid.NewGuid();
                internalCode = issued.InternalCode;
                operational = issued.OperationalLabel;
                snapshot = issued.ConfigSnapshotJson;
            }

            try
            {
                var subjectId = Guid.NewGuid();
                var created = await repository.CreateAsync(
                    tenantId,
                    subjectId,
                    actorUserId,
                    actorProfessionalId,
                    now,
                    new CreateSubjectCommand
                    {
                        BranchId = request.BranchId,
                        IdentificationState = state,
                        GivenName = given,
                        FirstSurname = first,
                        SecondSurname = second,
                        PreferredName = preferred,
                        BirthDate = request.BirthDate,
                        EstimatedAgeJson = ageJson,
                        BiologicalSex = Norm(request.BiologicalSex)?.ToLowerInvariant(),
                        SexSource = Norm(request.SexSource)?.ToLowerInvariant(),
                        GenderIdentity = Norm(request.GenderIdentity),
                        Curp = curp,
                        RecordNumber = recordNumber,
                        ApparentSex = Norm(request.ApparentSex)?.ToLowerInvariant(),
                        ApparentAgeRange = Norm(request.ApparentAgeRange),
                        ArrivalAtUtc = request.ArrivalAtUtc ?? (issueLabel ? now : null),
                        DescriptorFreeText = Norm(request.DescriptorFreeText),
                        IssueTemporaryLabel = issueLabel,
                        LabelId = labelId,
                        InternalCode = internalCode,
                        OperationalLabel = operational,
                        ConfigSnapshotJson = snapshot
                    },
                    ct) ?? throw new InvalidOperationException("No se pudo crear el sujeto.");

                if (!string.IsNullOrWhiteSpace(request.MarkRawText))
                {
                    await repository.AddMarkAsync(
                        tenantId, created.SubjectId, Guid.NewGuid(), actorUserId, actorProfessionalId,
                        string.IsNullOrWhiteSpace(actorDisplayName) ? "usuario" : actorDisplayName.Trim(),
                        now,
                        new AddDistinctiveMarkRequest { RawText = request.MarkRawText.Trim() },
                        ct);
                    return await repository.GetByIdAsync(tenantId, created.SubjectId, ct) ?? created;
                }

                return created;
            }
            catch (InvalidOperationException ex) when (
                issueLabel &&
                attempt < maxAttempts &&
                ex.Message.Contains("Conflicto de concurrencia al emitir etiqueta", StringComparison.Ordinal))
            {
                // Releer tokens usados e intentar con el siguiente.
            }
        }

        throw new InvalidOperationException(
            "No se pudo emitir etiqueta temporal tras varios reintentos por concurrencia.");
    }

    public async Task<SubjectDto?> GetByIdAsync(
        Guid tenantId, Guid subjectId, bool includeMarks, CancellationToken ct)
    {
        var subject = await repository.GetByIdAsync(tenantId, subjectId, ct);
        if (subject is null) return null;
        if (!includeMarks)
            subject.Marks = [];
        return subject;
    }

    public Task<IReadOnlyList<SubjectListItemDto>> SearchAsync(
        Guid tenantId, string? query, bool includeUnidentified, CancellationToken ct) =>
        repository.SearchAsync(tenantId, string.IsNullOrWhiteSpace(query) ? null : query.Trim(), includeUnidentified, ct);

    public async Task<SubjectDto?> UpdateIdentityAsync(
        Guid tenantId, Guid subjectId, Guid actorUserId, UpdateIdentityRequest request, CancellationToken ct)
    {
        if (request.BirthDate == SinbaSentinelBirth)
            throw new ArgumentException("Fecha centinela SINBA prohibida en Subject.");

        ValidateSex(request.BiologicalSex, request.SexSource);
        ValidateGenderIdentity(request.GenderIdentity);
        var curp = request.ClearCurp ? null : CurpValidator.NormalizeOptional(request.Curp);
        var ageJson = request.ClearEstimatedAge ? null : EstimatedAgeMapper.ToJson(request.EstimatedAge);

        var normalized = new UpdateIdentityRequest
        {
            GivenName = Norm(request.GivenName),
            FirstSurname = Norm(request.FirstSurname),
            SecondSurname = Norm(request.SecondSurname),
            PreferredName = Norm(request.PreferredName),
            BirthDate = request.BirthDate,
            ClearBirthDate = request.ClearBirthDate,
            EstimatedAge = request.EstimatedAge,
            ClearEstimatedAge = request.ClearEstimatedAge,
            BiologicalSex = Norm(request.BiologicalSex)?.ToLowerInvariant(),
            ClearBiologicalSex = request.ClearBiologicalSex,
            SexSource = Norm(request.SexSource)?.ToLowerInvariant(),
            GenderIdentity = Norm(request.GenderIdentity),
            ClearGenderIdentity = request.ClearGenderIdentity,
            Curp = curp,
            ClearCurp = request.ClearCurp
        };

        return await repository.UpdateIdentityAsync(
            tenantId, subjectId, actorUserId, DateTimeOffset.UtcNow, normalized, ageJson, ct);
    }

    public async Task<IdentityStateEventDto?> TransitionStateAsync(
        Guid tenantId, Guid subjectId, Guid actorUserId, Guid? actorProfessionalId,
        bool canVerifyOrRectify, TransitionIdentityStateRequest request, CancellationToken ct)
    {
        var to = Norm(request.ToState)?.ToLowerInvariant()
            ?? throw new ArgumentException("toState es obligatorio.");

        var current = await repository.GetByIdAsync(tenantId, subjectId, ct)
            ?? throw new KeyNotFoundException("Sujeto no encontrado.");

        IdentificationStateMachine.EnsureAllowed(current.IdentificationState, to);

        if (to is IdentificationStates.VerificadaConDocumento
            or IdentificationStates.Rectificada
            or IdentificationStates.NoRecuperable)
        {
            if (!canVerifyOrRectify)
                throw new UnauthorizedAccessException(
                    "Sin permiso para verificación/rectificación (provisional: admin/SuperAdmin; pregunta A abierta).");
        }

        return await repository.TransitionStateAsync(
            tenantId, subjectId, Guid.NewGuid(), actorUserId, actorProfessionalId,
            DateTimeOffset.UtcNow,
            new TransitionIdentityStateRequest
            {
                ToState = to,
                EvidenceType = Norm(request.EvidenceType),
                EvidenceReference = Norm(request.EvidenceReference),
                Justification = Norm(request.Justification)
            },
            ct);
    }

    public Task<UnidentifiedLabelConfigDto?> GetEffectiveLabelConfigAsync(
        Guid tenantId, Guid branchId, CancellationToken ct) =>
        repository.GetEffectiveLabelConfigAsync(tenantId, branchId, ct);

    public async Task<UnidentifiedLabelConfigDto> UpsertLabelConfigAsync(
        Guid tenantId, Guid actorUserId, UpsertLabelConfigRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.SchemeCode))
            throw new ArgumentException("schemeCode es obligatorio.");
        if (string.IsNullOrWhiteSpace(request.SchemeParamsJson))
            throw new ArgumentException("schemeParamsJson es obligatorio.");

        // Validar que el alfabeto no incluya colores antes de persistir.
        var probe = new UnidentifiedLabelConfigDto
        {
            ConfigId = Guid.NewGuid(),
            TenantId = tenantId,
            BranchId = request.BranchId,
            SchemeCode = request.SchemeCode.Trim(),
            SchemeParamsJson = request.SchemeParamsJson,
            ResolvedFrom = request.BranchId is null ? "tenant" : "sucursal"
        };
        _ = TemporaryLabelIssuer.Issue(probe, "PROBE", DateTimeOffset.UtcNow, []);

        var saved = await repository.UpsertLabelConfigAsync(
            tenantId, Guid.NewGuid(), request.BranchId,
            request.SchemeCode.Trim(), request.SchemeParamsJson, actorUserId, ct);

        return saved ?? throw new InvalidOperationException("No se pudo guardar la configuración de etiqueta.");
    }

    public async Task<SubjectDistinctiveMarkDto?> AddMarkAsync(
        Guid tenantId, Guid subjectId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, AddDistinctiveMarkRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.RawText)
            && string.IsNullOrWhiteSpace(request.MarkType)
            && string.IsNullOrWhiteSpace(request.Description))
            throw new ArgumentException("Seña particular exige texto libre o estructura.");

        if (request.Laterality is not null && !LateralityCodes.All.Contains(request.Laterality))
            throw new ArgumentException("Laterality inválida.");

        return await repository.AddMarkAsync(
            tenantId, subjectId, Guid.NewGuid(), actorUserId, actorProfessionalId,
            string.IsNullOrWhiteSpace(actorDisplayName) ? "usuario" : actorDisplayName.Trim(),
            DateTimeOffset.UtcNow,
            new AddDistinctiveMarkRequest
            {
                RawText = Norm(request.RawText),
                MarkType = Norm(request.MarkType)?.ToLowerInvariant(),
                AnatomicalRegion = Norm(request.AnatomicalRegion)?.ToLowerInvariant(),
                Laterality = Norm(request.Laterality)?.ToLowerInvariant(),
                Description = Norm(request.Description)
            },
            ct);
    }

    public async Task<SubjectBelongingDto?> AddBelongingAsync(
        Guid tenantId, Guid subjectId, Guid actorUserId, AddBelongingRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Description))
            throw new ArgumentException("La descripción de pertenencia es obligatoria.");

        return await repository.AddBelongingAsync(
            tenantId, subjectId, Guid.NewGuid(), actorUserId, DateTimeOffset.UtcNow,
            new AddBelongingRequest
            {
                Description = request.Description.Trim(),
                Category = Norm(request.Category)?.ToLowerInvariant()
            },
            ct);
    }

    public Task<DescriptionSearchResultDto> SearchByDescriptionAsync(
        Guid tenantId, Guid actorUserId, SearchByDescriptionRequest request, CancellationToken ct) =>
        repository.SearchByDescriptionAsync(tenantId, actorUserId, request, ct);

    public async Task<SubjectLinkDto> LinkAsync(
        Guid tenantId, Guid actorUserId, LinkSubjectsRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Justification))
            throw new ArgumentException("La vinculación exige justificación (sin fusión automática).");

        var link = await repository.LinkAsync(
            tenantId, Guid.NewGuid(), actorUserId, DateTimeOffset.UtcNow,
            new LinkSubjectsRequest
            {
                AbsorbedSubjectId = request.AbsorbedSubjectId,
                SurvivingSubjectId = request.SurvivingSubjectId,
                Justification = request.Justification.Trim()
            },
            ct);

        return link ?? throw new InvalidOperationException("No se pudo registrar la vinculación.");
    }

    public async Task<SubjectLinkDto> RevertLinkAsync(
        Guid tenantId, Guid subjectId, Guid linkId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, RevertSubjectLinkRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Justification))
            throw new ArgumentException("La reversión de vinculación exige justificación.");

        var justification = request.Justification.Trim();
        var revert = await repository.RevertLinkAsync(
            tenantId, Guid.NewGuid(), subjectId, linkId, actorUserId, actorProfessionalId,
            DateTimeOffset.UtcNow, justification, ct)
            ?? throw new InvalidOperationException("No se pudo registrar la reversión del vínculo.");

        // Alerta de seguridad del paciente (doc 08 §6.2 / SC-22), no sólo auditoría.
        var payload = JsonSerializer.Serialize(new
        {
            kind = "vinculacion_revertida",
            originalLinkId = linkId,
            revertLinkId = revert.LinkId,
            absorbedSubjectId = revert.AbsorbedSubjectId,
            survivingSubjectId = revert.SurvivingSubjectId,
            message =
                "Vinculación de identidad revertida; revisar decisiones clínicas tomadas mientras el vínculo estuvo vigente."
        });
        var flagRequest = new SetSubjectFlagRequest
        {
            FlagType = SubjectFlagTypes.Riesgo,
            PayloadJson = payload,
            IsActive = true
        };
        var display = string.IsNullOrWhiteSpace(actorDisplayName) ? "sistema" : actorDisplayName.Trim();
        await clinicalRecord.SetFlagAsync(
            tenantId, revert.AbsorbedSubjectId, actorUserId, actorProfessionalId, display, flagRequest, ct);
        await clinicalRecord.SetFlagAsync(
            tenantId, revert.SurvivingSubjectId, actorUserId, actorProfessionalId, display, flagRequest, ct);

        return revert;
    }

    public Task SoftDeleteAsync(Guid tenantId, Guid subjectId, Guid actorUserId, CancellationToken ct) =>
        repository.SoftDeleteAsync(tenantId, subjectId, actorUserId, ct);

    private static void ValidateSex(string? biologicalSex, string? sexSource)
    {
        if (biologicalSex is null) return;
        if (!BiologicalSexCodes.All.Contains(biologicalSex))
            throw new ArgumentException(
                "BiologicalSex inválido (masculino|femenino|no_determinado|no_especificado). Sin valor por omisión.");
        if (sexSource is not null && !SexSourceCodes.All.Contains(sexSource))
            throw new ArgumentException("SexSource inválido (documento|observado|declarado).");
    }

    private static void ValidateGenderIdentity(string? genderIdentity)
    {
        if (genderIdentity is null) return;
        if (!GenderIdentityCodes.All.Contains(genderIdentity))
            throw new ArgumentException(
                "GenderIdentity inválido (0|1|2|3|4|5|6|88 según GIIS). Null = no capturado; no fabricar ni usar en dosis.");
    }

    private static string? Norm(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
