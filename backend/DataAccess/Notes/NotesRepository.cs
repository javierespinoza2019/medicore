using System.Data;
using System.Data.Common;
using System.Text.Json;
using Dapper;
using MediCore.Models.Notes;
using Microsoft.Data.SqlClient;

namespace MediCore.DataAccess.Notes;

public interface INotesRepository
{
    Task<ClinicalNoteDto?> CreateAsync(
        Guid tenantId, Guid noteId, Guid encounterId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, DateTimeOffset occurredAtUtc, string noteType, string bodyJson,
        string? prognosis, CancellationToken ct);

    Task<ClinicalNoteDto?> GetByIdAsync(Guid tenantId, Guid noteId, CancellationToken ct);

    Task<IReadOnlyList<ClinicalNoteDto>> ListByEncounterAsync(
        Guid tenantId, Guid encounterId, CancellationToken ct);

    Task<ClinicalNoteDto?> SignAsync(
        Guid tenantId, Guid noteId, Guid actorUserId, Guid authorProfessionalId,
        string contentHash, string authorLicenseSnapshot, string? facilitySnapshotJson,
        DateTimeOffset signedAtUtc, CancellationToken ct);

    Task<ClinicalNoteDto?> SealAsync(
        Guid tenantId, Guid noteId, DateTimeOffset sealedAtUtc, CancellationToken ct);

    Task<NoteAddendumDto?> AddAddendumAsync(
        Guid tenantId, Guid noteId, Guid addendumId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, DateTimeOffset occurredAtUtc, string reasonText, string? bodyJson,
        CancellationToken ct);

    Task<ClinicalNoteDto?> AddCoAuthorAsync(
        Guid tenantId, Guid noteId, Guid coAuthorId, Guid professionalId, Guid addedByUserId,
        CancellationToken ct);

    Task<IReadOnlyList<PendingEvolutionDto>> ListPendingEvolutionAsync(
        Guid tenantId, Guid branchId, int hoursThreshold, CancellationToken ct);

    /// <summary>
    /// Toca LastMedicalActAtUtc si existe expediente. Pregunta H: no afirma que el ActType cuente.
    /// </summary>
    Task TryTouchMedicalActAsync(
        Guid tenantId, Guid subjectId, DateTimeOffset actUtc, string actType, Guid? actorUserId,
        CancellationToken ct);
}

internal sealed class NoteRow
{
    public Guid NoteId { get; init; }
    public Guid TenantId { get; init; }
    public Guid EncounterId { get; init; }
    public Guid SubjectId { get; init; }
    public string NoteType { get; init; } = string.Empty;
    public string BodyJson { get; init; } = "{}";
    public string? Prognosis { get; init; }
    public Guid? AuthorProfessionalId { get; init; }
    public Guid AuthorUserId { get; init; }
    public string AuthorDisplayName { get; init; } = string.Empty;
    public string? AuthorLicenseSnapshot { get; init; }
    public string? FacilitySnapshotJson { get; init; }
    public string? ContentHash { get; init; }
    public DateTime? SignedAtUtc { get; init; }
    public DateTime? SealedAtUtc { get; init; }
    public string SealState { get; init; } = SealStates.Pendiente;
    public DateTime OccurredAtUtc { get; init; }
    public DateTime RecordedAtUtc { get; init; }
}

internal sealed class AddendumRow
{
    public Guid AddendumId { get; init; }
    public Guid TenantId { get; init; }
    public Guid NoteId { get; init; }
    public string ReasonText { get; init; } = string.Empty;
    public string? BodyJson { get; init; }
    public Guid ActorUserId { get; init; }
    public Guid? ActorProfessionalId { get; init; }
    public string ActorDisplayName { get; init; } = string.Empty;
    public DateTime OccurredAtUtc { get; init; }
    public DateTime RecordedAtUtc { get; init; }
}

internal sealed class CoAuthorRow
{
    public Guid CoAuthorId { get; init; }
    public Guid TenantId { get; init; }
    public Guid NoteId { get; init; }
    public Guid ProfessionalId { get; init; }
    public string? ProfessionalLicenseSnapshot { get; init; }
    public string FullNameSnapshot { get; init; } = string.Empty;
    public Guid AddedByUserId { get; init; }
    public DateTime AddedAtUtc { get; init; }
}

internal sealed class PendingEvolutionRow
{
    public Guid EncounterId { get; init; }
    public Guid SubjectId { get; init; }
    public Guid BranchId { get; init; }
    public int TurnNumber { get; init; }
    public string EncounterState { get; init; } = string.Empty;
    public DateTime LastEvolUtc { get; init; }
    public DateTime DueAtUtc { get; init; }
    public int HoursThreshold { get; init; }
}

public sealed class NotesRepository(ISqlConnectionFactory connectionFactory) : INotesRepository
{
    public async Task<ClinicalNoteDto?> CreateAsync(
        Guid tenantId, Guid noteId, Guid encounterId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, DateTimeOffset occurredAtUtc, string noteType, string bodyJson,
        string? prognosis, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_ClinicalNote_Create",
                new
                {
                    NoteId = noteId,
                    TenantId = tenantId,
                    EncounterId = encounterId,
                    NoteType = noteType,
                    BodyJson = bodyJson,
                    Prognosis = prognosis,
                    ActorUserId = actorUserId,
                    ActorProfessionalId = actorProfessionalId,
                    ActorDisplayName = actorDisplayName,
                    OccurredAtUtc = occurredAtUtc.UtcDateTime
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            using var multi = await conn.QueryMultipleAsync(cmd);
            return await ReadNoteBundleAsync(multi);
        }
        catch (SqlException ex) when (ex.Number == 50401)
        {
            throw new KeyNotFoundException(ex.Message, ex);
        }
        catch (SqlException ex) when (ex.Number is 50410 or 50411 or 50412)
        {
            throw new ArgumentException(ex.Message, ex);
        }
    }

    public async Task<ClinicalNoteDto?> GetByIdAsync(Guid tenantId, Guid noteId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_ClinicalNote_GetById",
                new { TenantId = tenantId, NoteId = noteId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            using var multi = await conn.QueryMultipleAsync(cmd);
            return await ReadNoteBundleAsync(multi);
        }
        catch (SqlException ex) when (ex.Number == 50402)
        {
            return null;
        }
    }

    public async Task<IReadOnlyList<ClinicalNoteDto>> ListByEncounterAsync(
        Guid tenantId, Guid encounterId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_ClinicalNote_ListByEncounter",
                new { TenantId = tenantId, EncounterId = encounterId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            var rows = (await conn.QueryAsync<NoteRow>(cmd)).ToList();
            return rows.Select(r => ToNoteDto(r, [], [])).ToList();
        }
        catch (SqlException ex) when (ex.Number == 50401)
        {
            throw new KeyNotFoundException(ex.Message, ex);
        }
    }

    public async Task<ClinicalNoteDto?> SignAsync(
        Guid tenantId, Guid noteId, Guid actorUserId, Guid authorProfessionalId,
        string contentHash, string authorLicenseSnapshot, string? facilitySnapshotJson,
        DateTimeOffset signedAtUtc, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_ClinicalNote_Sign",
                new
                {
                    TenantId = tenantId,
                    NoteId = noteId,
                    ContentHash = contentHash,
                    AuthorProfessionalId = authorProfessionalId,
                    AuthorLicenseSnapshot = authorLicenseSnapshot,
                    FacilitySnapshotJson = facilitySnapshotJson,
                    SignedAtUtc = signedAtUtc.UtcDateTime,
                    ActorUserId = actorUserId
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            using var multi = await conn.QueryMultipleAsync(cmd);
            return await ReadNoteBundleAsync(multi);
        }
        catch (SqlException ex) when (ex.Number is 50402)
        {
            throw new KeyNotFoundException(ex.Message, ex);
        }
        catch (SqlException ex) when (ex.Number is 50421 or 50422 or 50423 or 50424)
        {
            throw new UnauthorizedAccessException(ex.Message, ex);
        }
        catch (SqlException ex) when (ex.Number is 50420 or 50425)
        {
            throw new InvalidOperationException(ex.Message, ex);
        }
    }

    public async Task<ClinicalNoteDto?> SealAsync(
        Guid tenantId, Guid noteId, DateTimeOffset sealedAtUtc, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_ClinicalNote_Seal",
                new
                {
                    TenantId = tenantId,
                    NoteId = noteId,
                    SealedAtUtc = sealedAtUtc.UtcDateTime
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            using var multi = await conn.QueryMultipleAsync(cmd);
            return await ReadNoteBundleAsync(multi);
        }
        catch (SqlException ex) when (ex.Number is 50402)
        {
            throw new KeyNotFoundException(ex.Message, ex);
        }
        catch (SqlException ex) when (ex.Number is 50430)
        {
            throw new InvalidOperationException(ex.Message, ex);
        }
    }

    public async Task<NoteAddendumDto?> AddAddendumAsync(
        Guid tenantId, Guid noteId, Guid addendumId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, DateTimeOffset occurredAtUtc, string reasonText, string? bodyJson,
        CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_ClinicalNote_AddAddendum",
                new
                {
                    AddendumId = addendumId,
                    TenantId = tenantId,
                    NoteId = noteId,
                    ReasonText = reasonText,
                    BodyJson = bodyJson,
                    ActorUserId = actorUserId,
                    ActorProfessionalId = actorProfessionalId,
                    ActorDisplayName = actorDisplayName,
                    OccurredAtUtc = occurredAtUtc.UtcDateTime
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            var row = await conn.QuerySingleOrDefaultAsync<AddendumRow>(cmd);
            return row is null ? null : ToAddendumDto(row);
        }
        catch (SqlException ex) when (ex.Number is 50402)
        {
            throw new KeyNotFoundException(ex.Message, ex);
        }
        catch (SqlException ex) when (ex.Number is 50412 or 50440 or 50441)
        {
            throw new ArgumentException(ex.Message, ex);
        }
    }

    public async Task<ClinicalNoteDto?> AddCoAuthorAsync(
        Guid tenantId, Guid noteId, Guid coAuthorId, Guid professionalId, Guid addedByUserId,
        CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_ClinicalNote_AddCoAuthor",
                new
                {
                    CoAuthorId = coAuthorId,
                    TenantId = tenantId,
                    NoteId = noteId,
                    ProfessionalId = professionalId,
                    AddedByUserId = addedByUserId
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            using var multi = await conn.QueryMultipleAsync(cmd);
            return await ReadNoteBundleAsync(multi);
        }
        catch (SqlException ex) when (ex.Number is 50402)
        {
            throw new KeyNotFoundException(ex.Message, ex);
        }
        catch (SqlException ex) when (ex.Number is 50450 or 50451)
        {
            throw new UnauthorizedAccessException(ex.Message, ex);
        }
        catch (SqlException ex) when (ex.Number is 50452)
        {
            throw new InvalidOperationException(ex.Message, ex);
        }
    }

    public async Task<IReadOnlyList<PendingEvolutionDto>> ListPendingEvolutionAsync(
        Guid tenantId, Guid branchId, int hoursThreshold, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_ClinicalNote_ListPendingEvolution",
                new
                {
                    TenantId = tenantId,
                    BranchId = branchId,
                    HoursThreshold = hoursThreshold
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            var rows = await conn.QueryAsync<PendingEvolutionRow>(cmd);
            return rows.Select(r => new PendingEvolutionDto
            {
                EncounterId = r.EncounterId,
                SubjectId = r.SubjectId,
                BranchId = r.BranchId,
                TurnNumber = r.TurnNumber,
                EncounterState = r.EncounterState,
                LastEvolUtc = ToOffset(r.LastEvolUtc),
                DueAtUtc = ToOffset(r.DueAtUtc),
                HoursThreshold = r.HoursThreshold
            }).ToList();
        }
        catch (SqlException ex) when (ex.Number == 50403)
        {
            throw new KeyNotFoundException(ex.Message, ex);
        }
    }

    public async Task TryTouchMedicalActAsync(
        Guid tenantId, Guid subjectId, DateTimeOffset actUtc, string actType, Guid? actorUserId,
        CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        if (conn is DbConnection asyncConn)
            await asyncConn.OpenAsync(ct);
        else
            conn.Open();

        try
        {
            // Sólo SPs: Resolve RecordId vía GetBySubject (EnsureIfMissing=0; sin inventar expediente).
            var getCmd = new CommandDefinition(
                "sp_ClinicalRecord_GetBySubject",
                new
                {
                    TenantId = tenantId,
                    SubjectId = subjectId,
                    ActorUserId = actorUserId ?? Guid.Empty,
                    ActorProfessionalId = (Guid?)null,
                    OccurredAtUtc = actUtc.UtcDateTime,
                    EnsureIfMissing = 0,
                    ActorDisplayName = "notes-touch"
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            using var multi = await conn.QueryMultipleAsync(getCmd);
            Guid? recordId = null;
            while (!multi.IsConsumed)
            {
                var rows = (await multi.ReadAsync()).ToList();
                if (rows.Count == 0) continue;
                var first = (IDictionary<string, object>)rows[0];
                if (first.Keys.Any(k => k.Equals("RecordId", StringComparison.OrdinalIgnoreCase))
                    && first.Keys.Any(k => k.Equals("OpenedAtUtc", StringComparison.OrdinalIgnoreCase))
                    && !first.Keys.Any(k => k.Equals("Version", StringComparison.OrdinalIgnoreCase)))
                {
                    recordId = (Guid)first[first.Keys.First(k =>
                        k.Equals("RecordId", StringComparison.OrdinalIgnoreCase))];
                    break;
                }
            }

            if (recordId is null || recordId == Guid.Empty)
                return;

            await conn.ExecuteAsync(new CommandDefinition(
                "sp_ClinicalRecord_TouchMedicalAct",
                new
                {
                    TenantId = tenantId,
                    RecordId = recordId.Value,
                    ActUtc = actUtc.UtcDateTime,
                    ActType = actType,
                    ActorUserId = actorUserId
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct));
        }
        catch (SqlException)
        {
            // Fail-open del reloj: no bloquea la firma si el SP de expediente no está aplicado aún.
            // Pregunta H: qué ActType cuentan sigue pendiente (doc 06 #61).
        }
    }

    private static async Task<ClinicalNoteDto?> ReadNoteBundleAsync(SqlMapper.GridReader multi)
    {
        var note = await multi.ReadSingleOrDefaultAsync<NoteRow>();
        if (note is null) return null;
        var addenda = (await multi.ReadAsync<AddendumRow>()).ToList();
        var coAuthors = (await multi.ReadAsync<CoAuthorRow>()).ToList();
        return ToNoteDto(note, addenda, coAuthors);
    }

    private static ClinicalNoteDto ToNoteDto(
        NoteRow n, IReadOnlyList<AddendumRow> addenda, IReadOnlyList<CoAuthorRow> coAuthors)
    {
        JsonElement body;
        try
        {
            using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(n.BodyJson) ? "{}" : n.BodyJson);
            body = doc.RootElement.Clone();
        }
        catch (JsonException)
        {
            using var doc = JsonDocument.Parse("{}");
            body = doc.RootElement.Clone();
        }

        return new ClinicalNoteDto
        {
            NoteId = n.NoteId,
            TenantId = n.TenantId,
            EncounterId = n.EncounterId,
            SubjectId = n.SubjectId,
            NoteType = n.NoteType,
            Body = body,
            Prognosis = n.Prognosis,
            AuthorProfessionalId = n.AuthorProfessionalId,
            AuthorUserId = n.AuthorUserId,
            AuthorDisplayName = n.AuthorDisplayName,
            AuthorLicenseSnapshot = n.AuthorLicenseSnapshot,
            FacilitySnapshotJson = n.FacilitySnapshotJson,
            ContentHash = n.ContentHash,
            SignedAtUtc = n.SignedAtUtc is null ? null : ToOffset(n.SignedAtUtc.Value),
            SealedAtUtc = n.SealedAtUtc is null ? null : ToOffset(n.SealedAtUtc.Value),
            SealState = n.SealState,
            OccurredAtUtc = ToOffset(n.OccurredAtUtc),
            RecordedAtUtc = ToOffset(n.RecordedAtUtc),
            Addenda = addenda.Select(ToAddendumDto).ToList(),
            CoAuthors = coAuthors.Select(c => new NoteCoAuthorDto
            {
                CoAuthorId = c.CoAuthorId,
                TenantId = c.TenantId,
                NoteId = c.NoteId,
                ProfessionalId = c.ProfessionalId,
                ProfessionalLicenseSnapshot = c.ProfessionalLicenseSnapshot,
                FullNameSnapshot = c.FullNameSnapshot,
                AddedByUserId = c.AddedByUserId,
                AddedAtUtc = ToOffset(c.AddedAtUtc)
            }).ToList()
        };
    }

    private static NoteAddendumDto ToAddendumDto(AddendumRow a) => new()
    {
        AddendumId = a.AddendumId,
        TenantId = a.TenantId,
        NoteId = a.NoteId,
        ReasonText = a.ReasonText,
        BodyJson = a.BodyJson,
        ActorUserId = a.ActorUserId,
        ActorProfessionalId = a.ActorProfessionalId,
        ActorDisplayName = a.ActorDisplayName,
        OccurredAtUtc = ToOffset(a.OccurredAtUtc),
        RecordedAtUtc = ToOffset(a.RecordedAtUtc)
    };

    private static DateTimeOffset ToOffset(DateTime utc) =>
        new(DateTime.SpecifyKind(utc, DateTimeKind.Utc));
}
