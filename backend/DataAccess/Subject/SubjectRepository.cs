using System.Data;
using Dapper;
using MediCore.Models.Subject;
using Microsoft.Data.SqlClient;

namespace MediCore.DataAccess.Subject;

public interface ISubjectRepository
{
    Task<SubjectDto?> CreateAsync(
        Guid tenantId,
        Guid subjectId,
        Guid actorUserId,
        Guid? actorProfessionalId,
        DateTimeOffset occurredAtUtc,
        CreateSubjectCommand command,
        CancellationToken ct);

    Task<SubjectDto?> GetByIdAsync(Guid tenantId, Guid subjectId, CancellationToken ct);
    Task<IReadOnlyList<SubjectListItemDto>> SearchAsync(
        Guid tenantId, string? query, bool includeUnidentified, CancellationToken ct);

    Task<SubjectDto?> UpdateIdentityAsync(
        Guid tenantId, Guid subjectId, Guid actorUserId, DateTimeOffset occurredAtUtc,
        UpdateIdentityRequest request, string? estimatedAgeJson, CancellationToken ct);

    Task<IdentityStateEventDto?> TransitionStateAsync(
        Guid tenantId, Guid subjectId, Guid eventId, Guid actorUserId, Guid? actorProfessionalId,
        DateTimeOffset occurredAtUtc, TransitionIdentityStateRequest request, CancellationToken ct);

    Task<UnidentifiedLabelConfigDto?> GetEffectiveLabelConfigAsync(
        Guid tenantId, Guid branchId, CancellationToken ct);

    Task<UnidentifiedLabelConfigDto?> UpsertLabelConfigAsync(
        Guid tenantId, Guid configId, Guid? branchId, string schemeCode, string schemeParamsJson,
        Guid actorUserId, CancellationToken ct);

    Task<IReadOnlyList<string>> ListUsedLabelTokensTodayAsync(
        Guid tenantId, Guid branchId, DateTimeOffset dayUtc, CancellationToken ct);

    Task<string?> GetBranchCodeAsync(Guid tenantId, Guid branchId, CancellationToken ct);

    Task<SubjectDistinctiveMarkDto?> AddMarkAsync(
        Guid tenantId, Guid subjectId, Guid markId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, DateTimeOffset occurredAtUtc, AddDistinctiveMarkRequest request,
        CancellationToken ct);

    Task<SubjectBelongingDto?> AddBelongingAsync(
        Guid tenantId, Guid subjectId, Guid belongingId, Guid actorUserId,
        DateTimeOffset occurredAtUtc, AddBelongingRequest request, CancellationToken ct);

    Task<DescriptionSearchResultDto> SearchByDescriptionAsync(
        Guid tenantId, Guid actorUserId, SearchByDescriptionRequest request, CancellationToken ct);

    Task<SubjectLinkDto?> LinkAsync(
        Guid tenantId, Guid linkId, Guid actorUserId, DateTimeOffset occurredAtUtc,
        LinkSubjectsRequest request, CancellationToken ct);

    Task<SubjectLinkDto?> RevertLinkAsync(
        Guid tenantId, Guid revertLinkId, Guid subjectId, Guid originalLinkId, Guid actorUserId,
        Guid? actorProfessionalId, DateTimeOffset occurredAtUtc, string justification,
        CancellationToken ct);

    Task SoftDeleteAsync(Guid tenantId, Guid subjectId, Guid actorUserId, CancellationToken ct);

    Task<SubjectDto?> SetPhotoPathAsync(
        Guid tenantId, Guid subjectId, Guid actorUserId, string? photoRelativePath, CancellationToken ct);
}

public sealed class CreateSubjectCommand
{
    public Guid BranchId { get; init; }
    public string IdentificationState { get; init; } = IdentificationStates.NoIdentificado;
    public string? GivenName { get; init; }
    public string? FirstSurname { get; init; }
    public string? SecondSurname { get; init; }
    public string? PreferredName { get; init; }
    public DateOnly? BirthDate { get; init; }
    public string? EstimatedAgeJson { get; init; }
    public string? BiologicalSex { get; init; }
    public string? SexSource { get; init; }
    public string? GenderIdentity { get; init; }
    public string? Curp { get; init; }
    public string? RecordNumber { get; init; }
    public string? ApparentSex { get; init; }
    public string? ApparentAgeRange { get; init; }
    public DateTimeOffset? ArrivalAtUtc { get; init; }
    public string? DescriptorFreeText { get; init; }
    public bool IssueTemporaryLabel { get; init; }
    public Guid? LabelId { get; init; }
    public string? InternalCode { get; init; }
    public string? OperationalLabel { get; init; }
    public string? ConfigSnapshotJson { get; init; }
    public Guid? DeviceId { get; init; }
}

public sealed class SubjectRepository(ISqlConnectionFactory connectionFactory) : ISubjectRepository
{
    public async Task<SubjectDto?> CreateAsync(
        Guid tenantId,
        Guid subjectId,
        Guid actorUserId,
        Guid? actorProfessionalId,
        DateTimeOffset occurredAtUtc,
        CreateSubjectCommand command,
        CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_Subject_Create",
                new
                {
                    SubjectId = subjectId,
                    TenantId = tenantId,
                    command.BranchId,
                    command.IdentificationState,
                    command.GivenName,
                    command.FirstSurname,
                    command.SecondSurname,
                    command.PreferredName,
                    BirthDate = command.BirthDate?.ToDateTime(TimeOnly.MinValue),
                    command.EstimatedAgeJson,
                    command.BiologicalSex,
                    command.SexSource,
                    command.GenderIdentity,
                    command.Curp,
                    BloodTypeJson = (string?)null,
                    command.RecordNumber,
                    command.ApparentSex,
                    command.ApparentAgeRange,
                    ArrivalAtUtc = command.ArrivalAtUtc?.UtcDateTime,
                    command.DescriptorFreeText,
                    command.IssueTemporaryLabel,
                    command.LabelId,
                    command.InternalCode,
                    command.OperationalLabel,
                    command.ConfigSnapshotJson,
                    command.DeviceId,
                    ActorUserId = actorUserId,
                    ActorProfessionalId = actorProfessionalId,
                    OccurredAtUtc = occurredAtUtc.UtcDateTime
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            // ExecuteAsync ignora result sets intermedios de sp_Audit_Append anidado.
            await conn.ExecuteAsync(cmd);
            return await GetByIdAsync(tenantId, subjectId, ct);
        }
        catch (SqlException ex) when (ex.Number == 50021 || ex.Number == 50022 || ex.Number == 50024)
        {
            throw new ArgumentException(ex.Message, ex);
        }
        catch (SqlException ex) when (ex.Number == 50023)
        {
            throw new InvalidOperationException(ex.Message, ex);
        }
        catch (SqlException ex) when (
            (ex.Number == 2601 || ex.Number == 2627) &&
            ex.Message.Contains("SubjectTemporaryLabel", StringComparison.OrdinalIgnoreCase))
        {
            // Carrera bajo carga paralela: dos creates eligen el mismo token antes del INSERT.
            throw new InvalidOperationException(
                "Conflicto de concurrencia al emitir etiqueta temporal.", ex);
        }
    }

    public async Task<SubjectDto?> GetByIdAsync(Guid tenantId, Guid subjectId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Subject_GetById",
            new { TenantId = tenantId, SubjectId = subjectId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        using var multi = await conn.QueryMultipleAsync(cmd);
        return await ReadSubjectBundleAsync(multi);
    }

    public async Task<IReadOnlyList<SubjectListItemDto>> SearchAsync(
        Guid tenantId, string? query, bool includeUnidentified, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Subject_Search",
            new { TenantId = tenantId, Query = query, IncludeUnidentified = includeUnidentified },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        var rows = await conn.QueryAsync(cmd);
        return rows.Select(r => new SubjectListItemDto
        {
            SubjectId = r.SubjectId,
            TenantId = r.TenantId,
            OriginBranchId = r.OriginBranchId,
            RecordNumber = r.RecordNumber,
            IdentificationState = r.IdentificationState,
            GivenName = r.GivenName,
            FirstSurname = r.FirstSurname,
            SecondSurname = r.SecondSurname,
            PreferredName = r.PreferredName,
            BirthDate = ToDateOnly(r.BirthDate),
            BiologicalSex = r.BiologicalSex,
            GenderIdentity = r.GenderIdentity,
            Curp = r.Curp,
            OperationalLabel = r.OperationalLabel,
            InternalCode = r.InternalCode,
            ApparentSex = r.ApparentSex,
            ApparentAgeRange = r.ApparentAgeRange,
            ArrivalAtUtc = ToDto(r.ArrivalAtUtc),
            DescriptorFreeText = r.DescriptorFreeText,
            CreatedAtUtc = ToDto(r.CreatedAtUtc) ?? DateTimeOffset.UtcNow,
            UpdatedAtUtc = ToDto(r.UpdatedAtUtc) ?? DateTimeOffset.UtcNow
        }).ToList();
    }

    public async Task<SubjectDto?> UpdateIdentityAsync(
        Guid tenantId, Guid subjectId, Guid actorUserId, DateTimeOffset occurredAtUtc,
        UpdateIdentityRequest request, string? estimatedAgeJson, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_Subject_UpdateIdentity",
                new
                {
                    TenantId = tenantId,
                    SubjectId = subjectId,
                    request.GivenName,
                    request.FirstSurname,
                    request.SecondSurname,
                    request.PreferredName,
                    BirthDate = request.BirthDate?.ToDateTime(TimeOnly.MinValue),
                    request.ClearBirthDate,
                    EstimatedAgeJson = estimatedAgeJson,
                    request.ClearEstimatedAge,
                    request.BiologicalSex,
                    request.ClearBiologicalSex,
                    request.SexSource,
                    request.GenderIdentity,
                    request.ClearGenderIdentity,
                    request.Curp,
                    request.ClearCurp,
                    BloodTypeJson = (string?)null,
                    ActorUserId = actorUserId,
                    OccurredAtUtc = occurredAtUtc.UtcDateTime
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            await conn.ExecuteAsync(cmd);
            return await GetByIdAsync(tenantId, subjectId, ct);
        }
        catch (SqlException ex) when (ex.Number is 50022 or 50023)
        {
            throw new InvalidOperationException(ex.Message, ex);
        }
    }

    public async Task<IdentityStateEventDto?> TransitionStateAsync(
        Guid tenantId, Guid subjectId, Guid eventId, Guid actorUserId, Guid? actorProfessionalId,
        DateTimeOffset occurredAtUtc, TransitionIdentityStateRequest request, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_Subject_TransitionIdentityState",
                new
                {
                    EventId = eventId,
                    TenantId = tenantId,
                    SubjectId = subjectId,
                    request.ToState,
                    request.EvidenceType,
                    request.EvidenceReference,
                    request.Justification,
                    ActorUserId = actorUserId,
                    ActorProfessionalId = actorProfessionalId,
                    OccurredAtUtc = occurredAtUtc.UtcDateTime
                },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        using var multi = await conn.QueryMultipleAsync(cmd);
        _ = await multi.ReadAsync(); // sp_Audit_Append
        return (await multi.ReadAsync<IdentityStateEventDto>()).FirstOrDefault();
        }
        catch (SqlException ex) when (ex.Number is >= 50025 and <= 50028)
        {
            throw new InvalidOperationException(ex.Message, ex);
        }
    }

    public async Task<UnidentifiedLabelConfigDto?> GetEffectiveLabelConfigAsync(
        Guid tenantId, Guid branchId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_UnidentifiedLabelConfig_GetEffective",
            new { TenantId = tenantId, BranchId = branchId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        return await conn.QuerySingleOrDefaultAsync<UnidentifiedLabelConfigDto>(cmd);
    }

    public async Task<UnidentifiedLabelConfigDto?> UpsertLabelConfigAsync(
        Guid tenantId, Guid configId, Guid? branchId, string schemeCode, string schemeParamsJson,
        Guid actorUserId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_UnidentifiedLabelConfig_Upsert",
            new
            {
                ConfigId = configId,
                TenantId = tenantId,
                BranchId = branchId,
                SchemeCode = schemeCode,
                SchemeParamsJson = schemeParamsJson,
                ActorUserId = actorUserId
            },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        using var multi = await conn.QueryMultipleAsync(cmd);
        _ = await multi.ReadAsync(); // sp_Audit_Append
        return (await multi.ReadAsync<UnidentifiedLabelConfigDto>()).FirstOrDefault();
    }

    public async Task<IReadOnlyList<string>> ListUsedLabelTokensTodayAsync(
        Guid tenantId, Guid branchId, DateTimeOffset dayUtc, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var start = dayUtc.UtcDateTime.Date;
        var end = start.AddDays(1);
        // Lectura auxiliar (no es SP de negocio mutante). Filtra por tenant.
        const string sql = """
            SELECT InternalCode
            FROM dbo.SubjectTemporaryLabel
            WHERE TenantId = @TenantId
              AND BranchId = @BranchId
              AND IssuedAtUtc >= @Start
              AND IssuedAtUtc < @End
            """;
        var codes = await conn.QueryAsync<string>(new CommandDefinition(
            sql, new { TenantId = tenantId, BranchId = branchId, Start = start, End = end },
            cancellationToken: ct));
        return codes.Select(ExtractToken).Where(t => t is not null).Cast<string>().ToList();
    }

    public async Task<string?> GetBranchCodeAsync(Guid tenantId, Guid branchId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Branch_GetById",
            new { TenantId = tenantId, BranchId = branchId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        var row = await conn.QuerySingleOrDefaultAsync(cmd);
        return row?.Code as string;
    }

    public async Task<SubjectDistinctiveMarkDto?> AddMarkAsync(
        Guid tenantId, Guid subjectId, Guid markId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, DateTimeOffset occurredAtUtc, AddDistinctiveMarkRequest request,
        CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Subject_AddDistinctiveMark",
            new
            {
                MarkId = markId,
                TenantId = tenantId,
                SubjectId = subjectId,
                request.RawText,
                request.MarkType,
                request.AnatomicalRegion,
                request.Laterality,
                request.Description,
                ActorUserId = actorUserId,
                ActorProfessionalId = actorProfessionalId,
                ActorDisplayName = actorDisplayName,
                OccurredAtUtc = occurredAtUtc.UtcDateTime
            },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        using var multi = await conn.QueryMultipleAsync(cmd);
        _ = await multi.ReadAsync(); // sp_Audit_Append
        return (await multi.ReadAsync<SubjectDistinctiveMarkDto>()).FirstOrDefault();
    }

    public async Task<SubjectBelongingDto?> AddBelongingAsync(
        Guid tenantId, Guid subjectId, Guid belongingId, Guid actorUserId,
        DateTimeOffset occurredAtUtc, AddBelongingRequest request, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Subject_AddBelonging",
            new
            {
                BelongingId = belongingId,
                TenantId = tenantId,
                SubjectId = subjectId,
                request.Description,
                request.Category,
                ActorUserId = actorUserId,
                OccurredAtUtc = occurredAtUtc.UtcDateTime
            },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        using var multi = await conn.QueryMultipleAsync(cmd);
        _ = await multi.ReadAsync(); // sp_Audit_Append
        return (await multi.ReadAsync<SubjectBelongingDto>()).FirstOrDefault();
    }

    public async Task<DescriptionSearchResultDto> SearchByDescriptionAsync(
        Guid tenantId, Guid actorUserId, SearchByDescriptionRequest request, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Subject_SearchByDescription",
            new
            {
                TenantId = tenantId,
                request.BranchId,
                request.ApparentSex,
                request.AgeMin,
                request.AgeMax,
                request.MarkType,
                request.AnatomicalRegion,
                request.Laterality,
                ArrivalFromUtc = request.ArrivalFromUtc?.UtcDateTime,
                ArrivalToUtc = request.ArrivalToUtc?.UtcDateTime,
                ActorUserId = actorUserId
            },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);

        using var multi = await conn.QueryMultipleAsync(cmd);
        // Primer result set: sp_Audit_Append (Appended); luego MatchCount y matches.
        _ = await multi.ReadAsync();
        var countRow = await multi.ReadSingleAsync();
        int matchCount = (int)countRow.MatchCount;
        var matches = (await multi.ReadAsync<DescriptionMatchDto>()).ToList();
        return new DescriptionSearchResultDto { MatchCount = matchCount, Matches = matches };
    }

    public async Task<SubjectLinkDto?> LinkAsync(
        Guid tenantId, Guid linkId, Guid actorUserId, DateTimeOffset occurredAtUtc,
        LinkSubjectsRequest request, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_Subject_Link",
                new
                {
                    LinkId = linkId,
                    TenantId = tenantId,
                    request.AbsorbedSubjectId,
                    request.SurvivingSubjectId,
                    request.Justification,
                    ActorUserId = actorUserId,
                    OccurredAtUtc = occurredAtUtc.UtcDateTime
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            using var multi = await conn.QueryMultipleAsync(cmd);
            _ = await multi.ReadAsync(); // sp_Audit_Append
            return (await multi.ReadAsync<SubjectLinkDto>()).FirstOrDefault();
        }
        catch (SqlException ex) when (ex.Number is 50029 or 50030)
        {
            throw new ArgumentException(ex.Message, ex);
        }
    }

    public async Task<SubjectLinkDto?> RevertLinkAsync(
        Guid tenantId, Guid revertLinkId, Guid subjectId, Guid originalLinkId, Guid actorUserId,
        Guid? actorProfessionalId, DateTimeOffset occurredAtUtc, string justification,
        CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_Subject_RevertLink",
                new
                {
                    RevertLinkId = revertLinkId,
                    TenantId = tenantId,
                    SubjectId = subjectId,
                    OriginalLinkId = originalLinkId,
                    Justification = justification,
                    ActorUserId = actorUserId,
                    ActorProfessionalId = actorProfessionalId,
                    OccurredAtUtc = occurredAtUtc.UtcDateTime
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            using var multi = await conn.QueryMultipleAsync(cmd);
            _ = await multi.ReadAsync(); // sp_Audit_Append
            return (await multi.ReadAsync<SubjectLinkDto>()).FirstOrDefault();
        }
        catch (SqlException ex) when (ex.Number is >= 50031 and <= 50036)
        {
            throw new ArgumentException(ex.Message, ex);
        }
    }

    public async Task SoftDeleteAsync(Guid tenantId, Guid subjectId, Guid actorUserId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Subject_SoftDelete",
            new { TenantId = tenantId, SubjectId = subjectId, ActorUserId = actorUserId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        await conn.ExecuteAsync(cmd);
    }

    public async Task<SubjectDto?> SetPhotoPathAsync(
        Guid tenantId, Guid subjectId, Guid actorUserId, string? photoRelativePath, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Subject_SetPhotoPath",
            new
            {
                TenantId = tenantId,
                SubjectId = subjectId,
                PhotoRelativePath = photoRelativePath,
                ActorUserId = actorUserId
            },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        await conn.ExecuteAsync(cmd);
        return await GetByIdAsync(tenantId, subjectId, ct);
    }

    private static async Task<SubjectDto?> ReadSubjectBundleAsync(SqlMapper.GridReader multi)
    {
        var row = await multi.ReadSingleOrDefaultAsync<SubjectRow>();
        if (row is null) return null;

        var label = (await multi.ReadAsync<SubjectTemporaryLabelDto>()).FirstOrDefault();
        var descriptor = (await multi.ReadAsync<SubjectDescriptorDto>()).FirstOrDefault();
        var marks = (await multi.ReadAsync<SubjectDistinctiveMarkDto>()).ToList();
        var belongings = (await multi.ReadAsync<SubjectBelongingDto>()).ToList();

        return new SubjectDto
        {
            SubjectId = row.SubjectId,
            TenantId = row.TenantId,
            OriginBranchId = row.OriginBranchId,
            RecordNumber = row.RecordNumber,
            IdentificationState = row.IdentificationState,
            GivenName = row.GivenName,
            FirstSurname = row.FirstSurname,
            SecondSurname = row.SecondSurname,
            PreferredName = row.PreferredName,
            BirthDate = row.BirthDate is null ? null : DateOnly.FromDateTime(row.BirthDate.Value),
            EstimatedAge = EstimatedAgeJson.TryParse(row.EstimatedAgeJson),
            BiologicalSex = row.BiologicalSex,
            SexSource = row.SexSource,
            GenderIdentity = row.GenderIdentity,
            Curp = row.Curp,
            CurpValidatedAtUtc = ToDto(row.CurpValidatedAtUtc),
            DeceasedAtUtc = ToDto(row.DeceasedAtUtc),
            PhotoRelativePath = row.PhotoRelativePath,
            CreatedAtUtc = ToDto(row.CreatedAtUtc) ?? DateTimeOffset.UtcNow,
            UpdatedAtUtc = ToDto(row.UpdatedAtUtc) ?? DateTimeOffset.UtcNow,
            RequestedSubjectId = row.RequestedSubjectId,
            ResolvedSubjectId = row.ResolvedSubjectId == Guid.Empty ? row.SubjectId : row.ResolvedSubjectId,
            ActiveLabel = label,
            Descriptor = descriptor,
            Marks = marks,
            Belongings = belongings
        };
    }

    private static DateOnly? ToDateOnly(object? value)
    {
        if (value is null or DBNull) return null;
        if (value is DateTime dt) return DateOnly.FromDateTime(dt);
        if (value is DateOnly d) return d;
        return null;
    }

    private static DateTimeOffset? ToDto(object? value)
    {
        if (value is null or DBNull) return null;
        if (value is DateTime dt)
            return new DateTimeOffset(DateTime.SpecifyKind(dt, DateTimeKind.Utc));
        if (value is DateTimeOffset dto) return dto;
        return null;
    }

    private static DateTimeOffset? ToDto(DateTime? value) =>
        value is null ? null : new DateTimeOffset(DateTime.SpecifyKind(value.Value, DateTimeKind.Utc));

    private static DateTimeOffset? ToDto(DateTime value) =>
        new(DateTime.SpecifyKind(value, DateTimeKind.Utc));

    private static string? ExtractToken(string? internalCode)
    {
        if (string.IsNullOrWhiteSpace(internalCode)) return null;
        var parts = internalCode.Split('-', StringSplitOptions.RemoveEmptyEntries);
        // NN-BRANCH-yyMMdd-TOKEN… → token es el resto desde el índice 3
        if (parts.Length < 4) return parts[^1];
        return string.Join('-', parts.Skip(3));
    }
}
