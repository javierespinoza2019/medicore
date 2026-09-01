using System.Data;
using System.Data.Common;
using Dapper;
using MediCore.Models.ClinicalRecord;
using Microsoft.Data.SqlClient;

namespace MediCore.DataAccess.ClinicalRecord;

public interface IClinicalRecordRepository
{
    Task<ClinicalRecordDto?> EnsureForSubjectAsync(
        Guid tenantId, Guid subjectId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, DateTimeOffset occurredAtUtc, CancellationToken ct);

    Task<ClinicalRecordDto?> GetBySubjectAsync(
        Guid tenantId, Guid subjectId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, DateTimeOffset occurredAtUtc, bool ensureIfMissing, CancellationToken ct);

    Task<MedicalHistoryDto?> SaveHistoryAsync(
        Guid tenantId, Guid subjectId, Guid historyId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, DateTimeOffset occurredAtUtc, string bodyJson, string origin, CancellationToken ct);

    Task<AmendmentDto?> AddAmendmentAsync(
        Guid tenantId, Guid subjectId, Guid amendmentId, Guid? historyId, Guid actorUserId,
        Guid? actorProfessionalId, string actorDisplayName, DateTimeOffset occurredAtUtc,
        string reasonText, string? bodyJson, CancellationToken ct);

    Task<AllergyStatusDto?> SetAllergyStatusAsync(
        Guid tenantId, Guid subjectId, Guid statusEventId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, DateTimeOffset occurredAtUtc, string status, CancellationToken ct);

    Task<AllergyDto?> AddAllergyAsync(
        Guid tenantId, Guid subjectId, Guid allergyId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, DateTimeOffset occurredAtUtc, AddAllergyRequest request, CancellationToken ct);

    Task SoftDeleteAllergyAsync(
        Guid tenantId, Guid subjectId, Guid allergyId, Guid actorUserId, DateTimeOffset occurredAtUtc,
        CancellationToken ct);

    Task<SubjectFlagDto?> SetFlagAsync(
        Guid tenantId, Guid subjectId, Guid flagId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, DateTimeOffset occurredAtUtc, SetSubjectFlagRequest request, CancellationToken ct);
}

internal sealed class ClinicalRecordHeaderRow
{
    public Guid RecordId { get; init; }
    public Guid TenantId { get; init; }
    public Guid SubjectId { get; init; }
    public DateTime OpenedAtUtc { get; init; }
    public DateTime? LastMedicalActAtUtc { get; init; }
    public string? LastMedicalActType { get; init; }
    public DateTime CreatedAtUtc { get; init; }
    public DateTime UpdatedAtUtc { get; init; }
}

internal sealed class MedicalHistoryRow
{
    public Guid HistoryId { get; init; }
    public Guid TenantId { get; init; }
    public Guid RecordId { get; init; }
    public Guid SubjectId { get; init; }
    public int Version { get; init; }
    public string BodyJson { get; init; } = "{}";
    public string Origin { get; init; } = HistoryOrigins.Capturado;
    public Guid ActorUserId { get; init; }
    public Guid? ActorProfessionalId { get; init; }
    public string ActorDisplayName { get; init; } = string.Empty;
    public DateTime OccurredAtUtc { get; init; }
    public DateTime RecordedAtUtc { get; init; }
}

internal sealed class AmendmentRow
{
    public Guid AmendmentId { get; init; }
    public Guid TenantId { get; init; }
    public Guid RecordId { get; init; }
    public Guid HistoryId { get; init; }
    public string ReasonText { get; init; } = string.Empty;
    public string? BodyJson { get; init; }
    public Guid ActorUserId { get; init; }
    public Guid? ActorProfessionalId { get; init; }
    public string ActorDisplayName { get; init; } = string.Empty;
    public DateTime OccurredAtUtc { get; init; }
    public DateTime RecordedAtUtc { get; init; }
}

internal sealed class AllergyStatusRow
{
    public Guid StatusEventId { get; init; }
    public Guid TenantId { get; init; }
    public Guid RecordId { get; init; }
    public Guid SubjectId { get; init; }
    public string Status { get; init; } = AllergyStatusCodes.NoInterrogado;
    public Guid ActorUserId { get; init; }
    public Guid? ActorProfessionalId { get; init; }
    public string ActorDisplayName { get; init; } = string.Empty;
    public DateTime OccurredAtUtc { get; init; }
    public DateTime RecordedAtUtc { get; init; }
}

internal sealed class AllergyRow
{
    public Guid AllergyId { get; init; }
    public Guid TenantId { get; init; }
    public Guid RecordId { get; init; }
    public Guid SubjectId { get; init; }
    public string Substance { get; init; } = string.Empty;
    public string ReactionType { get; init; } = string.Empty;
    public string? Category { get; init; }
    public string? Manifestation { get; init; }
    public string? Severity { get; init; }
    public string? Certainty { get; init; }
    public string? DataOrigin { get; init; }
    public Guid ActorUserId { get; init; }
    public Guid? ActorProfessionalId { get; init; }
    public string ActorDisplayName { get; init; } = string.Empty;
    public DateTime OccurredAtUtc { get; init; }
    public DateTime RecordedAtUtc { get; init; }
}

internal sealed class SubjectFlagRow
{
    public Guid FlagId { get; init; }
    public Guid TenantId { get; init; }
    public Guid SubjectId { get; init; }
    public Guid RecordId { get; init; }
    public string FlagType { get; init; } = string.Empty;
    public string? PayloadJson { get; init; }
    public bool IsActive { get; init; }
    public Guid ActorUserId { get; init; }
    public Guid? ActorProfessionalId { get; init; }
    public string ActorDisplayName { get; init; } = string.Empty;
    public DateTime OccurredAtUtc { get; init; }
    public DateTime RecordedAtUtc { get; init; }
}

public sealed class ClinicalRecordRepository(ISqlConnectionFactory connectionFactory) : IClinicalRecordRepository
{
    public async Task<ClinicalRecordDto?> EnsureForSubjectAsync(
        Guid tenantId, Guid subjectId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, DateTimeOffset occurredAtUtc, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_ClinicalRecord_EnsureForSubject",
                new
                {
                    TenantId = tenantId,
                    SubjectId = subjectId,
                    ActorUserId = actorUserId,
                    ActorProfessionalId = actorProfessionalId,
                    ActorDisplayName = actorDisplayName,
                    OccurredAtUtc = occurredAtUtc.UtcDateTime,
                    ReturnRow = 1
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            // Ensure puede emitir result set de sp_Audit_Append; tomar el último set de cabecera.
            await conn.ExecuteAsync(cmd);
            return await GetBySubjectAsync(
                tenantId, subjectId, actorUserId, actorProfessionalId, actorDisplayName,
                occurredAtUtc, ensureIfMissing: false, ct);
        }
        catch (SqlException ex) when (ex.Number == 50301)
        {
            throw new ArgumentException(ex.Message, ex);
        }
    }

    public async Task<ClinicalRecordDto?> GetBySubjectAsync(
        Guid tenantId, Guid subjectId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, DateTimeOffset occurredAtUtc, bool ensureIfMissing, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        if (conn is DbConnection asyncConn)
            await asyncConn.OpenAsync(ct);
        else
            conn.Open();

        try
        {
            var cmd = new CommandDefinition(
                "sp_ClinicalRecord_GetBySubject",
                new
                {
                    TenantId = tenantId,
                    SubjectId = subjectId,
                    ActorUserId = actorUserId,
                    ActorProfessionalId = actorProfessionalId,
                    OccurredAtUtc = occurredAtUtc.UtcDateTime,
                    EnsureIfMissing = ensureIfMissing ? 1 : 0,
                    ActorDisplayName = actorDisplayName
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            using var multi = await conn.QueryMultipleAsync(cmd);

            // Puede haber result sets de sp_Audit_Append (SELECT 1 AS Appended) y Ensure.
            // Avanzamos hasta encontrar una fila con RecordId (cabecera).
            ClinicalRecordHeaderRow? header = null;
            MedicalHistoryRow? history = null;
            var amendments = new List<AmendmentRow>();
            AllergyStatusRow? allergyStatus = null;
            var allergies = new List<AllergyRow>();
            var flags = new List<SubjectFlagRow>();

            var grids = new List<IEnumerable<dynamic>>();
            while (!multi.IsConsumed)
            {
                var rows = (await multi.ReadAsync()).ToList();
                grids.Add(rows);
            }

            // Heurística: grids con columnas conocidas.
            foreach (var grid in grids)
            {
                var list = grid.ToList();
                if (list.Count == 0) continue;
                var first = (IDictionary<string, object>)list[0];
                var keys = new HashSet<string>(first.Keys, StringComparer.OrdinalIgnoreCase);

                if (keys.Contains("RecordId") && keys.Contains("OpenedAtUtc") && !keys.Contains("Version")
                    && !keys.Contains("Substance") && !keys.Contains("Status") && !keys.Contains("FlagType")
                    && !keys.Contains("ReasonText") && header is null)
                {
                    header = MapHeader(list);
                }
                else if (keys.Contains("Version") && keys.Contains("BodyJson") && history is null)
                {
                    history = MapHistory(list);
                }
                else if (keys.Contains("ReasonText") && keys.Contains("AmendmentId"))
                {
                    amendments.AddRange(MapAmendments(list));
                }
                else if (keys.Contains("Status") && keys.Contains("StatusEventId"))
                {
                    allergyStatus = MapAllergyStatus(list);
                }
                else if (keys.Contains("Substance") && keys.Contains("AllergyId"))
                {
                    allergies.AddRange(MapAllergies(list));
                }
                else if (keys.Contains("FlagType") && keys.Contains("FlagId"))
                {
                    flags.AddRange(MapFlags(list));
                }
            }

            if (header is null) return null;

            MedicalHistoryDto? histDto = null;
            if (history is not null)
            {
                histDto = ToHistoryDto(history);
                histDto.Amendments = amendments.Select(ToAmendmentDto).ToList();
            }

            return new ClinicalRecordDto
            {
                RecordId = header.RecordId,
                TenantId = header.TenantId,
                SubjectId = header.SubjectId,
                OpenedAtUtc = ToOffset(header.OpenedAtUtc),
                LastMedicalActAtUtc = header.LastMedicalActAtUtc is null
                    ? null
                    : ToOffset(header.LastMedicalActAtUtc.Value),
                LastMedicalActType = header.LastMedicalActType,
                CreatedAtUtc = ToOffset(header.CreatedAtUtc),
                UpdatedAtUtc = ToOffset(header.UpdatedAtUtc),
                CurrentHistory = histDto,
                AllergyStatus = allergyStatus is null
                    ? AllergyStatusDto.NoInterrogadoPlaceholder()
                    : ToAllergyStatusDto(allergyStatus),
                Allergies = allergies.Select(ToAllergyDto).ToList(),
                Flags = flags.Select(ToFlagDto).ToList()
            };
        }
        catch (SqlException ex) when (ex.Number is 50301 or 50302)
        {
            if (ex.Number == 50301) throw new ArgumentException(ex.Message, ex);
            return null;
        }
    }

    public async Task<MedicalHistoryDto?> SaveHistoryAsync(
        Guid tenantId, Guid subjectId, Guid historyId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, DateTimeOffset occurredAtUtc, string bodyJson, string origin, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_MedicalHistory_Save",
                new
                {
                    HistoryId = historyId,
                    TenantId = tenantId,
                    SubjectId = subjectId,
                    BodyJson = bodyJson,
                    Origin = origin,
                    ActorUserId = actorUserId,
                    ActorProfessionalId = actorProfessionalId,
                    ActorDisplayName = actorDisplayName,
                    OccurredAtUtc = occurredAtUtc.UtcDateTime
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            var row = await QueryLastAsync<MedicalHistoryRow>(conn, cmd);
            return row is null ? null : ToHistoryDto(row);
        }
        catch (SqlException ex) when (ex.Number is >= 50310 and <= 50312 or 50301)
        {
            throw new ArgumentException(ex.Message, ex);
        }
    }

    public async Task<AmendmentDto?> AddAmendmentAsync(
        Guid tenantId, Guid subjectId, Guid amendmentId, Guid? historyId, Guid actorUserId,
        Guid? actorProfessionalId, string actorDisplayName, DateTimeOffset occurredAtUtc,
        string reasonText, string? bodyJson, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_MedicalHistory_AddAmendment",
                new
                {
                    AmendmentId = amendmentId,
                    TenantId = tenantId,
                    SubjectId = subjectId,
                    HistoryId = historyId,
                    ReasonText = reasonText,
                    BodyJson = bodyJson,
                    ActorUserId = actorUserId,
                    ActorProfessionalId = actorProfessionalId,
                    ActorDisplayName = actorDisplayName,
                    OccurredAtUtc = occurredAtUtc.UtcDateTime
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            var row = await QueryLastAsync<AmendmentRow>(conn, cmd);
            return row is null ? null : ToAmendmentDto(row);
        }
        catch (SqlException ex) when (ex.Number is 50302 or 50320 or 50321)
        {
            if (ex.Number == 50302) return null;
            throw new ArgumentException(ex.Message, ex);
        }
    }

    public async Task<AllergyStatusDto?> SetAllergyStatusAsync(
        Guid tenantId, Guid subjectId, Guid statusEventId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, DateTimeOffset occurredAtUtc, string status, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_AllergyStatus_Set",
                new
                {
                    StatusEventId = statusEventId,
                    TenantId = tenantId,
                    SubjectId = subjectId,
                    Status = status,
                    ActorUserId = actorUserId,
                    ActorProfessionalId = actorProfessionalId,
                    ActorDisplayName = actorDisplayName,
                    OccurredAtUtc = occurredAtUtc.UtcDateTime
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            var row = await QueryLastAsync<AllergyStatusRow>(conn, cmd);
            return row is null ? null : ToAllergyStatusDto(row);
        }
        catch (SqlException ex) when (ex.Number is 50330 or 50301)
        {
            throw new ArgumentException(ex.Message, ex);
        }
    }

    public async Task<AllergyDto?> AddAllergyAsync(
        Guid tenantId, Guid subjectId, Guid allergyId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, DateTimeOffset occurredAtUtc, AddAllergyRequest request, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_Allergy_Add",
                new
                {
                    AllergyId = allergyId,
                    TenantId = tenantId,
                    SubjectId = subjectId,
                    request.Substance,
                    request.ReactionType,
                    request.Category,
                    request.Manifestation,
                    request.Severity,
                    request.Certainty,
                    request.DataOrigin,
                    ActorUserId = actorUserId,
                    ActorProfessionalId = actorProfessionalId,
                    ActorDisplayName = actorDisplayName,
                    OccurredAtUtc = occurredAtUtc.UtcDateTime
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            var row = await QueryLastAsync<AllergyRow>(conn, cmd);
            return row is null ? null : ToAllergyDto(row);
        }
        catch (SqlException ex) when (ex.Number is 50340 or 50341 or 50301)
        {
            throw new ArgumentException(ex.Message, ex);
        }
    }

    public async Task SoftDeleteAllergyAsync(
        Guid tenantId, Guid subjectId, Guid allergyId, Guid actorUserId, DateTimeOffset occurredAtUtc,
        CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_Allergy_SoftDelete",
                new
                {
                    TenantId = tenantId,
                    SubjectId = subjectId,
                    AllergyId = allergyId,
                    ActorUserId = actorUserId,
                    OccurredAtUtc = occurredAtUtc.UtcDateTime
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            await conn.ExecuteAsync(cmd);
        }
        catch (SqlException ex) when (ex.Number == 50302)
        {
            throw new KeyNotFoundException(ex.Message, ex);
        }
        catch (SqlException ex) when (ex.Number == 50342)
        {
            throw new KeyNotFoundException(ex.Message, ex);
        }
    }

    public async Task<SubjectFlagDto?> SetFlagAsync(
        Guid tenantId, Guid subjectId, Guid flagId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, DateTimeOffset occurredAtUtc, SetSubjectFlagRequest request, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_SubjectFlag_Set",
                new
                {
                    FlagId = flagId,
                    TenantId = tenantId,
                    SubjectId = subjectId,
                    request.FlagType,
                    request.PayloadJson,
                    request.IsActive,
                    ActorUserId = actorUserId,
                    ActorProfessionalId = actorProfessionalId,
                    ActorDisplayName = actorDisplayName,
                    OccurredAtUtc = occurredAtUtc.UtcDateTime
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            var row = await QueryLastAsync<SubjectFlagRow>(conn, cmd);
            return row is null ? null : ToFlagDto(row);
        }
        catch (SqlException ex) when (ex.Number is 50350 or 50301)
        {
            throw new ArgumentException(ex.Message, ex);
        }
    }

    /// <summary>
    /// Los SP anidados (Ensure/Audit) emiten result sets intermedios.
    /// Se lee todo y se toma el último grid tipable.
    /// </summary>
    private static async Task<T?> QueryLastAsync<T>(IDbConnection conn, CommandDefinition cmd)
    {
        using var multi = await conn.QueryMultipleAsync(cmd);
        T? last = default;
        while (!multi.IsConsumed)
        {
            var batch = (await multi.ReadAsync<T>()).ToList();
            if (batch.Count > 0)
                last = batch[^1];
        }
        return last;
    }

    private static ClinicalRecordHeaderRow MapHeader(List<dynamic> list)
    {
        var d = (IDictionary<string, object>)list[0];
        return new ClinicalRecordHeaderRow
        {
            RecordId = (Guid)d[FindKey(d, "RecordId")!],
            TenantId = (Guid)d[FindKey(d, "TenantId")!],
            SubjectId = (Guid)d[FindKey(d, "SubjectId")!],
            OpenedAtUtc = (DateTime)d[FindKey(d, "OpenedAtUtc")!],
            LastMedicalActAtUtc = AsDateTime(d, "LastMedicalActAtUtc"),
            LastMedicalActType = AsString(d, "LastMedicalActType"),
            CreatedAtUtc = (DateTime)d[FindKey(d, "CreatedAtUtc")!],
            UpdatedAtUtc = (DateTime)d[FindKey(d, "UpdatedAtUtc")!]
        };
    }

    private static DateTime? AsDateTime(IDictionary<string, object> d, string name)
    {
        var key = FindKey(d, name);
        if (key is null) return null;
        var v = d[key];
        if (v is null || v is DBNull) return null;
        return (DateTime)v;
    }

    private static string? AsString(IDictionary<string, object> d, string name)
    {
        var key = FindKey(d, name);
        if (key is null) return null;
        var v = d[key];
        if (v is null || v is DBNull) return null;
        return (string)v;
    }

    private static Guid? AsGuid(IDictionary<string, object> d, string name)
    {
        var key = FindKey(d, name);
        if (key is null) return null;
        var v = d[key];
        if (v is null || v is DBNull) return null;
        return (Guid)v;
    }

    private static MedicalHistoryRow? MapHistory(List<dynamic> list)
    {
        if (list.Count == 0) return null;
        var d = (IDictionary<string, object>)list[0];
        return new MedicalHistoryRow
        {
            HistoryId = (Guid)d[FindKey(d, "HistoryId")!],
            TenantId = (Guid)d[FindKey(d, "TenantId")!],
            RecordId = (Guid)d[FindKey(d, "RecordId")!],
            SubjectId = (Guid)d[FindKey(d, "SubjectId")!],
            Version = Convert.ToInt32(d[FindKey(d, "Version")!]),
            BodyJson = (string)d[FindKey(d, "BodyJson")!],
            Origin = (string)d[FindKey(d, "Origin")!],
            ActorUserId = (Guid)d[FindKey(d, "ActorUserId")!],
            ActorProfessionalId = AsGuid(d, "ActorProfessionalId"),
            ActorDisplayName = (string)d[FindKey(d, "ActorDisplayName")!],
            OccurredAtUtc = (DateTime)d[FindKey(d, "OccurredAtUtc")!],
            RecordedAtUtc = (DateTime)d[FindKey(d, "RecordedAtUtc")!]
        };
    }

    private static IEnumerable<AmendmentRow> MapAmendments(List<dynamic> list) =>
        list.Select(item =>
        {
            var d = (IDictionary<string, object>)item;
            return new AmendmentRow
            {
                AmendmentId = (Guid)d[FindKey(d, "AmendmentId")!],
                TenantId = (Guid)d[FindKey(d, "TenantId")!],
                RecordId = (Guid)d[FindKey(d, "RecordId")!],
                HistoryId = (Guid)d[FindKey(d, "HistoryId")!],
                ReasonText = (string)d[FindKey(d, "ReasonText")!],
                BodyJson = AsString(d, "BodyJson"),
                ActorUserId = (Guid)d[FindKey(d, "ActorUserId")!],
                ActorProfessionalId = AsGuid(d, "ActorProfessionalId"),
                ActorDisplayName = (string)d[FindKey(d, "ActorDisplayName")!],
                OccurredAtUtc = (DateTime)d[FindKey(d, "OccurredAtUtc")!],
                RecordedAtUtc = (DateTime)d[FindKey(d, "RecordedAtUtc")!]
            };
        });

    private static AllergyStatusRow? MapAllergyStatus(List<dynamic> list)
    {
        if (list.Count == 0) return null;
        var d = (IDictionary<string, object>)list[0];
        return new AllergyStatusRow
        {
            StatusEventId = (Guid)d[FindKey(d, "StatusEventId")!],
            TenantId = (Guid)d[FindKey(d, "TenantId")!],
            RecordId = (Guid)d[FindKey(d, "RecordId")!],
            SubjectId = (Guid)d[FindKey(d, "SubjectId")!],
            Status = (string)d[FindKey(d, "Status")!],
            ActorUserId = (Guid)d[FindKey(d, "ActorUserId")!],
            ActorProfessionalId = AsGuid(d, "ActorProfessionalId"),
            ActorDisplayName = (string)d[FindKey(d, "ActorDisplayName")!],
            OccurredAtUtc = (DateTime)d[FindKey(d, "OccurredAtUtc")!],
            RecordedAtUtc = (DateTime)d[FindKey(d, "RecordedAtUtc")!]
        };
    }

    private static IEnumerable<AllergyRow> MapAllergies(List<dynamic> list) =>
        list.Select(item =>
        {
            var d = (IDictionary<string, object>)item;
            return new AllergyRow
            {
                AllergyId = (Guid)d[FindKey(d, "AllergyId")!],
                TenantId = (Guid)d[FindKey(d, "TenantId")!],
                RecordId = (Guid)d[FindKey(d, "RecordId")!],
                SubjectId = (Guid)d[FindKey(d, "SubjectId")!],
                Substance = (string)d[FindKey(d, "Substance")!],
                ReactionType = (string)d[FindKey(d, "ReactionType")!],
                Category = AsString(d, "Category"),
                Manifestation = AsString(d, "Manifestation"),
                Severity = AsString(d, "Severity"),
                Certainty = AsString(d, "Certainty"),
                DataOrigin = AsString(d, "DataOrigin"),
                ActorUserId = (Guid)d[FindKey(d, "ActorUserId")!],
                ActorProfessionalId = AsGuid(d, "ActorProfessionalId"),
                ActorDisplayName = (string)d[FindKey(d, "ActorDisplayName")!],
                OccurredAtUtc = (DateTime)d[FindKey(d, "OccurredAtUtc")!],
                RecordedAtUtc = (DateTime)d[FindKey(d, "RecordedAtUtc")!]
            };
        });

    private static IEnumerable<SubjectFlagRow> MapFlags(List<dynamic> list) =>
        list.Select(item =>
        {
            var d = (IDictionary<string, object>)item;
            return new SubjectFlagRow
            {
                FlagId = (Guid)d[FindKey(d, "FlagId")!],
                TenantId = (Guid)d[FindKey(d, "TenantId")!],
                SubjectId = (Guid)d[FindKey(d, "SubjectId")!],
                RecordId = (Guid)d[FindKey(d, "RecordId")!],
                FlagType = (string)d[FindKey(d, "FlagType")!],
                PayloadJson = AsString(d, "PayloadJson"),
                IsActive = Convert.ToBoolean(d[FindKey(d, "IsActive")!]),
                ActorUserId = (Guid)d[FindKey(d, "ActorUserId")!],
                ActorProfessionalId = AsGuid(d, "ActorProfessionalId"),
                ActorDisplayName = (string)d[FindKey(d, "ActorDisplayName")!],
                OccurredAtUtc = (DateTime)d[FindKey(d, "OccurredAtUtc")!],
                RecordedAtUtc = (DateTime)d[FindKey(d, "RecordedAtUtc")!]
            };
        });

    private static string? FindKey(IDictionary<string, object> d, string name) =>
        d.Keys.FirstOrDefault(k => string.Equals(k, name, StringComparison.OrdinalIgnoreCase));

    private static DateTimeOffset ToOffset(DateTime utc) =>
        new(DateTime.SpecifyKind(utc, DateTimeKind.Utc));

    private static MedicalHistoryDto ToHistoryDto(MedicalHistoryRow row) => new()
    {
        HistoryId = row.HistoryId,
        TenantId = row.TenantId,
        RecordId = row.RecordId,
        SubjectId = row.SubjectId,
        Version = row.Version,
        Body = MedicalHistoryBody.FromJson(row.BodyJson),
        Origin = row.Origin,
        ActorUserId = row.ActorUserId,
        ActorProfessionalId = row.ActorProfessionalId,
        ActorDisplayName = row.ActorDisplayName,
        OccurredAtUtc = ToOffset(row.OccurredAtUtc),
        RecordedAtUtc = ToOffset(row.RecordedAtUtc)
    };

    private static AmendmentDto ToAmendmentDto(AmendmentRow row) => new()
    {
        AmendmentId = row.AmendmentId,
        TenantId = row.TenantId,
        RecordId = row.RecordId,
        HistoryId = row.HistoryId,
        ReasonText = row.ReasonText,
        BodyJson = row.BodyJson,
        ActorUserId = row.ActorUserId,
        ActorProfessionalId = row.ActorProfessionalId,
        ActorDisplayName = row.ActorDisplayName,
        OccurredAtUtc = ToOffset(row.OccurredAtUtc),
        RecordedAtUtc = ToOffset(row.RecordedAtUtc)
    };

    private static AllergyStatusDto ToAllergyStatusDto(AllergyStatusRow row) => new()
    {
        StatusEventId = row.StatusEventId,
        RecordId = row.RecordId,
        SubjectId = row.SubjectId,
        Status = row.Status,
        ActorUserId = row.ActorUserId,
        ActorProfessionalId = row.ActorProfessionalId,
        ActorDisplayName = row.ActorDisplayName,
        OccurredAtUtc = ToOffset(row.OccurredAtUtc),
        RecordedAtUtc = ToOffset(row.RecordedAtUtc)
    };

    private static AllergyDto ToAllergyDto(AllergyRow row) => new()
    {
        AllergyId = row.AllergyId,
        TenantId = row.TenantId,
        RecordId = row.RecordId,
        SubjectId = row.SubjectId,
        Substance = row.Substance,
        ReactionType = row.ReactionType,
        Category = row.Category,
        Manifestation = row.Manifestation,
        Severity = row.Severity,
        Certainty = row.Certainty,
        DataOrigin = row.DataOrigin,
        ActorUserId = row.ActorUserId,
        ActorProfessionalId = row.ActorProfessionalId,
        ActorDisplayName = row.ActorDisplayName,
        OccurredAtUtc = ToOffset(row.OccurredAtUtc),
        RecordedAtUtc = ToOffset(row.RecordedAtUtc)
    };

    private static SubjectFlagDto ToFlagDto(SubjectFlagRow row) => new()
    {
        FlagId = row.FlagId,
        TenantId = row.TenantId,
        SubjectId = row.SubjectId,
        RecordId = row.RecordId,
        FlagType = row.FlagType,
        PayloadJson = row.PayloadJson,
        IsActive = row.IsActive,
        ActorUserId = row.ActorUserId,
        ActorProfessionalId = row.ActorProfessionalId,
        ActorDisplayName = row.ActorDisplayName,
        OccurredAtUtc = ToOffset(row.OccurredAtUtc),
        RecordedAtUtc = ToOffset(row.RecordedAtUtc)
    };
}
