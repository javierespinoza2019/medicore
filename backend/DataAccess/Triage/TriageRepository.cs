using System.Data;
using Dapper;
using MediCore.Models.Triage;
using Microsoft.Data.SqlClient;

namespace MediCore.DataAccess.Triage;

public interface ITriageRepository
{
    Task<TriageScaleConfigDto?> GetEffectiveScaleAsync(
        Guid tenantId, Guid? branchId, CancellationToken ct);

    Task<TriageScaleConfigDto?> UpsertScaleAsync(
        Guid tenantId, Guid configId, Guid? branchId, string scaleCode, string displayName,
        string levelsJson, Guid actorUserId, CancellationToken ct);

    Task<Guid?> GetEncounterBranchIdAsync(Guid tenantId, Guid encounterId, CancellationToken ct);

    Task<TriageDto?> SaveAsync(
        Guid tenantId, Guid triageId, Guid encounterId, string? level, string scaleCode,
        Guid? scaleConfigId, int? levelPriority, string? chiefComplaint, int? painScore,
        string painAssessable, string vitalsJson, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, DateTimeOffset occurredAtUtc, CancellationToken ct);

    Task<TriageDto?> GetByEncounterAsync(Guid tenantId, Guid encounterId, CancellationToken ct);

    Task<TriageDto?> ReclassifyAsync(
        Guid tenantId, Guid triageId, Guid encounterId, string level, string scaleCode,
        Guid? scaleConfigId, int? levelPriority, string? chiefComplaint, int? painScore,
        string painAssessable, string vitalsJson, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, DateTimeOffset occurredAtUtc, CancellationToken ct);

    Task<VitalSetDto?> AppendVitalsAsync(
        Guid tenantId, Guid vitalSetId, Guid encounterId, string vitalsJson, string sourceContext,
        Guid actorUserId, Guid? actorProfessionalId, DateTimeOffset occurredAtUtc,
        CancellationToken ct);

    Task<IReadOnlyList<VitalSetDto>> ListVitalsAsync(
        Guid tenantId, Guid encounterId, CancellationToken ct);
}

public sealed class TriageRepository(ISqlConnectionFactory connectionFactory) : ITriageRepository
{
    public async Task<TriageScaleConfigDto?> GetEffectiveScaleAsync(
        Guid tenantId, Guid? branchId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_TriageScaleConfig_GetEffective",
            new { TenantId = tenantId, BranchId = branchId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        var row = await conn.QuerySingleOrDefaultAsync(cmd);
        return row is null ? null : MapScale(row);
    }

    public async Task<TriageScaleConfigDto?> UpsertScaleAsync(
        Guid tenantId, Guid configId, Guid? branchId, string scaleCode, string displayName,
        string levelsJson, Guid actorUserId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_TriageScaleConfig_Upsert",
                new
                {
                    ConfigId = configId,
                    TenantId = tenantId,
                    BranchId = branchId,
                    ScaleCode = scaleCode,
                    DisplayName = displayName,
                    LevelsJson = levelsJson,
                    ActorUserId = actorUserId
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            var row = await conn.QuerySingleOrDefaultAsync(cmd);
            return row is null ? null : MapScale(row);
        }
        catch (SqlException ex) when (ex.Number is 50201 or 50203)
        {
            throw new ArgumentException(ex.Message, ex);
        }
    }

    public async Task<Guid?> GetEncounterBranchIdAsync(
        Guid tenantId, Guid encounterId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            """
            SELECT BranchId FROM dbo.Encounter
            WHERE EncounterId = @EncounterId AND TenantId = @TenantId AND IsDeleted = 0
            """,
            new { TenantId = tenantId, EncounterId = encounterId },
            cancellationToken: ct);
        return await conn.QuerySingleOrDefaultAsync<Guid?>(cmd);
    }

    public async Task<TriageDto?> SaveAsync(
        Guid tenantId, Guid triageId, Guid encounterId, string? level, string scaleCode,
        Guid? scaleConfigId, int? levelPriority, string? chiefComplaint, int? painScore,
        string painAssessable, string vitalsJson, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, DateTimeOffset occurredAtUtc, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_Triage_Save",
                new
                {
                    TriageId = triageId,
                    TenantId = tenantId,
                    EncounterId = encounterId,
                    Level = level,
                    ScaleCode = scaleCode,
                    ScaleConfigId = scaleConfigId,
                    LevelPriority = levelPriority,
                    ChiefComplaint = chiefComplaint,
                    PainScore = painScore,
                    PainAssessable = painAssessable,
                    VitalsJson = vitalsJson,
                    ActorUserId = actorUserId,
                    ActorProfessionalId = actorProfessionalId,
                    ActorDisplayName = actorDisplayName,
                    OccurredAtUtc = occurredAtUtc.UtcDateTime
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            using var multi = await conn.QueryMultipleAsync(cmd);
            // sp_Audit_Append emite un result set intermedio; leer hasta el triage.
            var triageRow = await ReadUntilTriageAsync(multi);
            if (triageRow is null) return null;
            var measurements = (await multi.ReadAsync()).Select(MapMeasurement).ToList();
            return MapTriage(triageRow, measurements);
        }
        catch (SqlException ex) when (ex.Number is 50210 or 50211)
        {
            if (ex.Number == 50211)
                throw new KeyNotFoundException(ex.Message, ex);
            throw new ArgumentException(ex.Message, ex);
        }
    }

    public async Task<TriageDto?> GetByEncounterAsync(
        Guid tenantId, Guid encounterId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Triage_GetByEncounter",
            new { TenantId = tenantId, EncounterId = encounterId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);

        using var multi = await conn.QueryMultipleAsync(cmd);
        var triageRow = await multi.ReadSingleOrDefaultAsync();
        if (triageRow is null) return null;
        var measurements = (await multi.ReadAsync()).Select(MapMeasurement).ToList();
        return MapTriage(triageRow, measurements);
    }

    public async Task<TriageDto?> ReclassifyAsync(
        Guid tenantId, Guid triageId, Guid encounterId, string level, string scaleCode,
        Guid? scaleConfigId, int? levelPriority, string? chiefComplaint, int? painScore,
        string painAssessable, string vitalsJson, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, DateTimeOffset occurredAtUtc, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_Triage_Reclassify",
                new
                {
                    TriageId = triageId,
                    TenantId = tenantId,
                    EncounterId = encounterId,
                    Level = level,
                    ScaleCode = scaleCode,
                    ScaleConfigId = scaleConfigId,
                    LevelPriority = levelPriority,
                    ChiefComplaint = chiefComplaint,
                    PainScore = painScore,
                    PainAssessable = painAssessable,
                    VitalsJson = vitalsJson,
                    ActorUserId = actorUserId,
                    ActorProfessionalId = actorProfessionalId,
                    ActorDisplayName = actorDisplayName,
                    OccurredAtUtc = occurredAtUtc.UtcDateTime
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            using var multi = await conn.QueryMultipleAsync(cmd);
            var triageRow = await ReadUntilTriageAsync(multi);
            if (triageRow is null) return null;
            var measurements = (await multi.ReadAsync()).Select(MapMeasurement).ToList();
            return MapTriage(triageRow, measurements);
        }
        catch (SqlException ex) when (ex.Number is 50210 or 50211 or 50212 or 50213)
        {
            if (ex.Number is 50211 or 50213)
                throw new KeyNotFoundException(ex.Message, ex);
            throw new ArgumentException(ex.Message, ex);
        }
    }

    public async Task<VitalSetDto?> AppendVitalsAsync(
        Guid tenantId, Guid vitalSetId, Guid encounterId, string vitalsJson, string sourceContext,
        Guid actorUserId, Guid? actorProfessionalId, DateTimeOffset occurredAtUtc,
        CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_VitalSigns_Append",
                new
                {
                    VitalSetId = vitalSetId,
                    TenantId = tenantId,
                    EncounterId = encounterId,
                    VitalsJson = vitalsJson,
                    SourceContext = sourceContext,
                    ActorUserId = actorUserId,
                    ActorProfessionalId = actorProfessionalId,
                    OccurredAtUtc = occurredAtUtc.UtcDateTime
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            using var multi = await conn.QueryMultipleAsync(cmd);
            var setRow = await ReadUntilVitalSetAsync(multi);
            if (setRow is null) return null;
            var measurements = (await multi.ReadAsync()).Select(MapMeasurement).ToList();
            return MapVitalSet(setRow, measurements);
        }
        catch (SqlException ex) when (ex.Number is 50211 or 50220)
        {
            if (ex.Number == 50211)
                throw new KeyNotFoundException(ex.Message, ex);
            throw new ArgumentException(ex.Message, ex);
        }
    }

    public async Task<IReadOnlyList<VitalSetDto>> ListVitalsAsync(
        Guid tenantId, Guid encounterId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_VitalSigns_ListByEncounter",
            new { TenantId = tenantId, EncounterId = encounterId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);

        using var multi = await conn.QueryMultipleAsync(cmd);
        var sets = (await multi.ReadAsync()).ToList();
        var measurements = (await multi.ReadAsync()).Select(MapMeasurement).ToList();
        var bySet = measurements
            .Where(m => m.VitalSetId.HasValue)
            .GroupBy(m => m.VitalSetId!.Value)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<VitalMeasurementDto>)g.ToList());

        var result = new List<VitalSetDto>(sets.Count);
        foreach (var s in sets)
        {
            Guid setId = s.VitalSetId;
            bySet.TryGetValue(setId, out var ms);
            result.Add(MapVitalSet(s, ms ?? []));
        }
        return result;
    }

    /// <summary>
    /// sp_Audit_Append (y anidados) emiten SELECT 1 AS Appended antes del resultado de negocio.
    /// </summary>
    private static async Task<dynamic?> ReadUntilTriageAsync(SqlMapper.GridReader multi)
    {
        while (!multi.IsConsumed)
        {
            var rows = (await multi.ReadAsync()).ToList();
            if (rows.Count == 0) continue;
            var first = rows[0];
            var dict = (IDictionary<string, object>)first;
            if (dict.ContainsKey("TriageId"))
                return first;
            // Appended u otro result set intermedio: continuar.
        }
        return null;
    }

    private static async Task<dynamic?> ReadUntilVitalSetAsync(SqlMapper.GridReader multi)
    {
        while (!multi.IsConsumed)
        {
            var rows = (await multi.ReadAsync()).ToList();
            if (rows.Count == 0) continue;
            var first = rows[0];
            var dict = (IDictionary<string, object>)first;
            if (dict.ContainsKey("VitalSetId") && dict.ContainsKey("SourceContext"))
                return first;
        }
        return null;
    }

    private static TriageScaleConfigDto MapScale(dynamic r)
    {
        string levelsJson = r.LevelsJson ?? "[]";
        return new TriageScaleConfigDto
        {
            ConfigId = r.ConfigId,
            TenantId = r.TenantId,
            BranchId = (Guid?)r.BranchId,
            ScaleCode = r.ScaleCode,
            DisplayName = r.DisplayName,
            LevelsJson = levelsJson,
            Levels = TriageScaleJson.ParseLevels(levelsJson),
            IsActive = r.IsActive,
            ResolvedFrom = (string?)r.ResolvedFrom ?? "tenant",
            CreatedAtUtc = ToDto(r.CreatedAtUtc) ?? DateTimeOffset.UtcNow,
            UpdatedAtUtc = ToDto(r.UpdatedAtUtc) ?? DateTimeOffset.UtcNow
        };
    }

    private static TriageDto MapTriage(dynamic r, IReadOnlyList<VitalMeasurementDto> vitals) => new()
    {
        TriageId = r.TriageId,
        EncounterId = r.EncounterId,
        Level = r.Level,
        ScaleCode = r.ScaleCode,
        ScaleConfigId = (Guid?)r.ScaleConfigId,
        LevelPriority = (int?)r.LevelPriority,
        ChiefComplaint = r.ChiefComplaint,
        PainScore = (int?)r.PainScore,
        PainAssessable = r.PainAssessable,
        ClassifiedByProfessionalId = (Guid?)r.ClassifiedByProfessionalId,
        ActorUserId = r.ActorUserId,
        ActorProfessionalId = (Guid?)r.ActorProfessionalId,
        ActorDisplayName = r.ActorDisplayName,
        OccurredAtUtc = ToDto(r.OccurredAtUtc) ?? DateTimeOffset.UtcNow,
        RecordedAtUtc = ToDto(r.RecordedAtUtc) ?? DateTimeOffset.UtcNow,
        VitalSetId = (Guid?)r.VitalSetId,
        Vitals = vitals
    };

    private static VitalSetDto MapVitalSet(dynamic r, IReadOnlyList<VitalMeasurementDto> measurements) => new()
    {
        VitalSetId = r.VitalSetId,
        EncounterId = r.EncounterId,
        TriageId = (Guid?)r.TriageId,
        SourceContext = r.SourceContext,
        OccurredAtUtc = ToDto(r.OccurredAtUtc) ?? DateTimeOffset.UtcNow,
        RecordedAtUtc = ToDto(r.RecordedAtUtc) ?? DateTimeOffset.UtcNow,
        Measurements = measurements
    };

    private static VitalMeasurementDto MapMeasurement(dynamic r) => new()
    {
        MeasurementId = (Guid?)r.MeasurementId,
        VitalSetId = (Guid?)r.VitalSetId,
        SignCode = r.SignCode,
        Value = (decimal?)r.Value,
        Unit = r.Unit,
        State = r.State,
        Source = r.Source,
        NotMeasuredReason = r.NotMeasuredReason
    };

    private static DateTimeOffset? ToDto(object? value)
    {
        if (value is null or DBNull) return null;
        if (value is DateTimeOffset dto) return dto;
        if (value is DateTime dt)
            return new DateTimeOffset(DateTime.SpecifyKind(dt, DateTimeKind.Utc));
        return null;
    }
}
