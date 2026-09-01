using System.Data;
using Dapper;
using MediCore.Models.Encounter;
using Microsoft.Data.SqlClient;

namespace MediCore.DataAccess.Encounter;

public interface IEncounterRepository
{
    Task<EncounterDto?> OpenAsync(
        Guid tenantId, Guid encounterId, Guid actorUserId, Guid? actorProfessionalId,
        DateTimeOffset occurredAtUtc, OpenEncounterRequest request, CancellationToken ct);

    Task<EncounterDto?> GetByIdAsync(Guid tenantId, Guid encounterId, CancellationToken ct);

    Task<IReadOnlyList<EncounterDto>> ListQueueAsync(
        Guid tenantId, Guid branchId, bool includeClosed, CancellationToken ct);

    Task<IReadOnlyList<EncounterDto>> ListBySubjectAsync(
        Guid tenantId, Guid subjectId, CancellationToken ct);

    Task<EncounterDto?> UpdateAdmissionAsync(
        Guid tenantId, Guid encounterId, Guid actorUserId, Guid? actorProfessionalId,
        DateTimeOffset occurredAtUtc, UpdateAdmissionRequest request, CancellationToken ct);

    Task<EncounterDto?> TransitionStateAsync(
        Guid tenantId, Guid encounterId, Guid eventId, Guid actorUserId, Guid? actorProfessionalId,
        DateTimeOffset occurredAtUtc, TransitionStateRequest request, CancellationToken ct);

    /// <summary>SC-04: recetas sin firmar del encuentro (defensa en profundidad antes del SP de cierre).</summary>
    Task<int> CountUnsignedPrescriptionsByEncounterAsync(
        Guid tenantId, Guid encounterId, CancellationToken ct);

    Task<EncounterDto?> AssignProfessionalAsync(
        Guid tenantId, Guid encounterId, Guid professionalId, Guid actorUserId,
        Guid? actorProfessionalId, DateTimeOffset occurredAtUtc, CancellationToken ct);

    Task<MpNoticeDto?> CreateMpNoticeAsync(
        Guid tenantId, Guid encounterId, Guid noticeId, Guid actorUserId,
        DateTimeOffset occurredAtUtc, CreateMpNoticeRequest request, CancellationToken ct);

    Task<CareWithoutConsentDto?> CreateCareWithoutConsentAsync(
        Guid tenantId, Guid encounterId, Guid recordId, Guid actorUserId,
        DateTimeOffset occurredAtUtc, CreateCareWithoutConsentRequest request, CancellationToken ct);
}

public sealed class EncounterRepository(ISqlConnectionFactory connectionFactory) : IEncounterRepository
{
    public async Task<EncounterDto?> OpenAsync(
        Guid tenantId, Guid encounterId, Guid actorUserId, Guid? actorProfessionalId,
        DateTimeOffset occurredAtUtc, OpenEncounterRequest request, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_Encounter_Open",
                new
                {
                    EncounterId = encounterId,
                    TenantId = tenantId,
                    request.BranchId,
                    request.SubjectId,
                    request.EncounterType,
                    ArrivalAtUtc = (request.ArrivalAtUtc ?? occurredAtUtc).UtcDateTime,
                    request.AccessRoute,
                    request.AdmissionCircumstance,
                    request.AdmissionCircumstanceText,
                    ActorUserId = actorUserId,
                    ActorProfessionalId = actorProfessionalId,
                    OccurredAtUtc = occurredAtUtc.UtcDateTime
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            await conn.ExecuteAsync(cmd);
            return await GetByIdAsync(tenantId, encounterId, ct);
        }
        catch (SqlException ex) when (ex.Number is 50102 or 50103 or 50108)
        {
            throw new ArgumentException(ex.Message, ex);
        }
    }

    public async Task<EncounterDto?> GetByIdAsync(Guid tenantId, Guid encounterId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Encounter_GetById",
            new { TenantId = tenantId, EncounterId = encounterId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        var row = await conn.QuerySingleOrDefaultAsync(cmd);
        return row is null ? null : MapEncounter(row);
    }

    public async Task<IReadOnlyList<EncounterDto>> ListQueueAsync(
        Guid tenantId, Guid branchId, bool includeClosed, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_Encounter_ListQueue",
                new { TenantId = tenantId, BranchId = branchId, IncludeClosed = includeClosed },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            var rows = await conn.QueryAsync(cmd);
            return rows.Select(MapEncounter).ToList();
        }
        catch (SqlException ex) when (ex.Number == 50103)
        {
            throw new ArgumentException(ex.Message, ex);
        }
    }

    public async Task<IReadOnlyList<EncounterDto>> ListBySubjectAsync(
        Guid tenantId, Guid subjectId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Encounter_ListBySubject",
            new { TenantId = tenantId, SubjectId = subjectId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        var rows = await conn.QueryAsync(cmd);
        return rows.Select(MapEncounter).ToList();
    }

    public async Task<EncounterDto?> UpdateAdmissionAsync(
        Guid tenantId, Guid encounterId, Guid actorUserId, Guid? actorProfessionalId,
        DateTimeOffset occurredAtUtc, UpdateAdmissionRequest request, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var setMp = request.MinisterioPublicoNotified.HasValue && !request.ClearMpNotified;
            var cmd = new CommandDefinition(
                "sp_Encounter_UpdateAdmissionData",
                new
                {
                    TenantId = tenantId,
                    EncounterId = encounterId,
                    request.AccessRoute,
                    request.AdmissionCircumstance,
                    request.AdmissionCircumstanceText,
                    MinisterioPublicoNotified = request.MinisterioPublicoNotified,
                    ClearMpNotified = request.ClearMpNotified,
                    SetMpNotified = setMp,
                    ActorUserId = actorUserId,
                    ActorProfessionalId = actorProfessionalId,
                    OccurredAtUtc = occurredAtUtc.UtcDateTime
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            await conn.ExecuteAsync(cmd);
            return await GetByIdAsync(tenantId, encounterId, ct);
        }
        catch (SqlException ex) when (ex.Number == 50107)
        {
            return null;
        }
    }

    public async Task<EncounterDto?> TransitionStateAsync(
        Guid tenantId, Guid encounterId, Guid eventId, Guid actorUserId, Guid? actorProfessionalId,
        DateTimeOffset occurredAtUtc, TransitionStateRequest request, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_Encounter_TransitionState",
                new
                {
                    TenantId = tenantId,
                    EncounterId = encounterId,
                    EventId = eventId,
                    request.ToState,
                    request.Disposition,
                    request.Justification,
                    request.PendingPrescriptionsOverrideReason,
                    ActorUserId = actorUserId,
                    ActorProfessionalId = actorProfessionalId,
                    OccurredAtUtc = occurredAtUtc.UtcDateTime
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            await conn.ExecuteAsync(cmd);
            return await GetByIdAsync(tenantId, encounterId, ct);
        }
        catch (SqlException ex) when (ex.Number == 50101)
        {
            throw new InvalidOperationException("CLOSE_WITHOUT_TRIAGE:" + ex.Message, ex);
        }
        catch (SqlException ex) when (ex.Number == 50106)
        {
            throw new InvalidOperationException("CLOSE_WITHOUT_JUSTIFICATION:" + ex.Message, ex);
        }
        catch (SqlException ex) when (ex.Number == 50109)
        {
            throw new InvalidOperationException("CLOSE_WITH_PENDING_RX:" + ex.Message, ex);
        }
        catch (SqlException ex) when (ex.Number == 50107)
        {
            return null;
        }
        catch (SqlException ex) when (ex.Number is 50104 or 50108)
        {
            throw new InvalidOperationException(ex.Message, ex);
        }
    }

    public async Task<int> CountUnsignedPrescriptionsByEncounterAsync(
        Guid tenantId, Guid encounterId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Prescription_CountUnsignedByEncounter",
            new { TenantId = tenantId, EncounterId = encounterId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        return await conn.ExecuteScalarAsync<int>(cmd);
    }

    public async Task<EncounterDto?> AssignProfessionalAsync(
        Guid tenantId, Guid encounterId, Guid professionalId, Guid actorUserId,
        Guid? actorProfessionalId, DateTimeOffset occurredAtUtc, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_Encounter_AssignProfessional",
                new
                {
                    TenantId = tenantId,
                    EncounterId = encounterId,
                    ProfessionalId = professionalId,
                    ActorUserId = actorUserId,
                    ActorProfessionalId = actorProfessionalId,
                    OccurredAtUtc = occurredAtUtc.UtcDateTime
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            await conn.ExecuteAsync(cmd);
            return await GetByIdAsync(tenantId, encounterId, ct);
        }
        catch (SqlException ex) when (ex.Number == 50107)
        {
            return null;
        }
        catch (SqlException ex) when (ex.Number == 50108)
        {
            throw new ArgumentException(ex.Message, ex);
        }
    }

    public async Task<MpNoticeDto?> CreateMpNoticeAsync(
        Guid tenantId, Guid encounterId, Guid noticeId, Guid actorUserId,
        DateTimeOffset occurredAtUtc, CreateMpNoticeRequest request, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_MinisterioPublicoNotice_Create",
                new
                {
                    NoticeId = noticeId,
                    TenantId = tenantId,
                    EncounterId = encounterId,
                    request.EstablishmentNameSnapshot,
                    ElaboratedAtUtc = (request.ElaboratedAtUtc ?? occurredAtUtc).UtcDateTime,
                    request.PatientIdentificationText,
                    request.NotifiedAct,
                    request.InjuryReportText,
                    request.MpAgencyName,
                    request.NotifyingProfessionalId,
                    request.NotifyingProfessionalName,
                    ActorUserId = actorUserId,
                    OccurredAtUtc = occurredAtUtc.UtcDateTime
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            // sp_Audit_Append anidado emite un result set; el SELECT final es la hoja.
            using var multi = await conn.QueryMultipleAsync(cmd);
            MpNoticeDto? notice = null;
            while (!multi.IsConsumed)
            {
                var grid = (await multi.ReadAsync()).ToList();
                if (grid.Count == 0) continue;
                var row = grid[0];
                if (!HasProp(row, "NoticeId")) continue;
                notice = MapMpNotice(row);
            }
            return notice;
        }
        catch (SqlException ex) when (ex.Number == 50107)
        {
            return null;
        }
        catch (SqlException ex) when (ex.Number == 50108)
        {
            throw new ArgumentException(ex.Message, ex);
        }
    }

    public async Task<CareWithoutConsentDto?> CreateCareWithoutConsentAsync(
        Guid tenantId, Guid encounterId, Guid recordId, Guid actorUserId,
        DateTimeOffset occurredAtUtc, CreateCareWithoutConsentRequest request, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_EncounterCareWithoutConsent_Create",
                new
                {
                    RecordId = recordId,
                    TenantId = tenantId,
                    EncounterId = encounterId,
                    request.ClinicalAssessment,
                    request.UrgencyRationale,
                    request.NoRelativeOrRepresentative,
                    request.ProfessionalId1,
                    request.ProfessionalId2,
                    ActorUserId = actorUserId,
                    OccurredAtUtc = occurredAtUtc.UtcDateTime
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            using var multi = await conn.QueryMultipleAsync(cmd);
            CareWithoutConsentDto? record = null;
            while (!multi.IsConsumed)
            {
                var grid = (await multi.ReadAsync()).ToList();
                if (grid.Count == 0) continue;
                var row = grid[0];
                if (!HasProp(row, "RecordId")) continue;
                record = MapCareWoc(row);
            }
            return record;
        }
        catch (SqlException ex) when (ex.Number == 50105)
        {
            throw new InvalidOperationException(ex.Message, ex);
        }
        catch (SqlException ex) when (ex.Number == 50107)
        {
            return null;
        }
        catch (SqlException ex) when (ex.Number == 50108)
        {
            throw new ArgumentException(ex.Message, ex);
        }
    }

    private static bool HasProp(dynamic row, string name)
    {
        if (row is IDictionary<string, object> dict)
            return dict.ContainsKey(name);
        try
        {
            var v = ((IDictionary<string, object>)row)[name];
            return true;
        }
        catch
        {
            return ((IDictionary<string, object>)row).Keys.Any(k =>
                string.Equals(k, name, StringComparison.OrdinalIgnoreCase));
        }
    }

    private static MpNoticeDto MapMpNotice(dynamic r) => new()
    {
        NoticeId = r.NoticeId,
        TenantId = r.TenantId,
        EncounterId = r.EncounterId,
        BranchId = r.BranchId,
        EstablishmentNameSnapshot = r.EstablishmentNameSnapshot,
        ElaboratedAtUtc = ToDto(r.ElaboratedAtUtc) ?? DateTimeOffset.UtcNow,
        PatientIdentificationText = r.PatientIdentificationText,
        NotifiedAct = r.NotifiedAct,
        InjuryReportText = r.InjuryReportText,
        MpAgencyName = r.MpAgencyName,
        NotifyingProfessionalId = r.NotifyingProfessionalId,
        NotifyingProfessionalName = r.NotifyingProfessionalName,
        ActorUserId = r.ActorUserId,
        OccurredAtUtc = ToDto(r.OccurredAtUtc) ?? DateTimeOffset.UtcNow,
        RecordedAtUtc = ToDto(r.RecordedAtUtc) ?? DateTimeOffset.UtcNow
    };

    private static CareWithoutConsentDto MapCareWoc(dynamic r) => new()
    {
        RecordId = r.RecordId,
        TenantId = r.TenantId,
        EncounterId = r.EncounterId,
        ClinicalAssessment = r.ClinicalAssessment,
        UrgencyRationale = r.UrgencyRationale,
        NoRelativeOrRepresentative = r.NoRelativeOrRepresentative,
        ProfessionalId1 = r.ProfessionalId1,
        ProfessionalId2 = r.ProfessionalId2,
        ActorUserId = r.ActorUserId,
        OccurredAtUtc = ToDto(r.OccurredAtUtc) ?? DateTimeOffset.UtcNow,
        RecordedAtUtc = ToDto(r.RecordedAtUtc) ?? DateTimeOffset.UtcNow
    };

    private static EncounterDto MapEncounter(dynamic r)
    {
        var circumstance = (string?)r.AdmissionCircumstance;
        return new EncounterDto
        {
            EncounterId = r.EncounterId,
            TenantId = r.TenantId,
            BranchId = r.BranchId,
            SubjectId = r.SubjectId,
            EncounterType = r.EncounterType,
            State = r.State,
            Disposition = r.Disposition,
            ArrivalAtUtc = ToDto(r.ArrivalAtUtc) ?? DateTimeOffset.UtcNow,
            AccessRoute = r.AccessRoute,
            AdmissionCircumstance = circumstance,
            AdmissionCircumstanceText = r.AdmissionCircumstanceText,
            MinisterioPublicoNotified = (bool?)r.MinisterioPublicoNotified,
            AttendingProfessionalId = (Guid?)r.AttendingProfessionalId,
            TurnNumber = (int)r.TurnNumber,
            ClosedAtUtc = ToDto(r.ClosedAtUtc),
            CreatedByUserId = r.CreatedByUserId,
            CreatedByProfessionalId = (Guid?)r.CreatedByProfessionalId,
            CreatedAtUtc = ToDto(r.CreatedAtUtc) ?? DateTimeOffset.UtcNow,
            UpdatedAtUtc = ToDto(r.UpdatedAtUtc) ?? DateTimeOffset.UtcNow,
            TriageLevel = r.TriageLevel,
            TriageScaleCode = r.TriageScaleCode,
            TriagePriority = TryInt(r, "TriagePriority"),
            GivenName = r.GivenName,
            FirstSurname = r.FirstSurname,
            SecondSurname = r.SecondSurname,
            PreferredName = r.PreferredName,
            IdentificationState = r.IdentificationState,
            OperationalLabel = r.OperationalLabel,
            InternalCode = r.InternalCode,
            SuggestMpNoticeEvaluation = !string.IsNullOrWhiteSpace(circumstance)
                && AdmissionCircumstances.SuggestMpNotice.Contains(circumstance.Trim())
        };
    }

    private static DateTimeOffset? ToDto(object? value)
    {
        if (value is null or DBNull) return null;
        if (value is DateTimeOffset dto) return dto;
        if (value is DateTime dt)
            return new DateTimeOffset(DateTime.SpecifyKind(dt, DateTimeKind.Utc));
        return null;
    }

    private static int? TryInt(dynamic row, string key)
    {
        try
        {
            var dict = (IDictionary<string, object>)row;
            if (!dict.TryGetValue(key, out var value) || value is null or DBNull)
                return null;
            return Convert.ToInt32(value);
        }
        catch
        {
            return null;
        }
    }
}
