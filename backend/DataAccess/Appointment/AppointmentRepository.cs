using System.Data;
using Dapper;
using MediCore.Models.Appointment;
using Microsoft.Data.SqlClient;

namespace MediCore.DataAccess.Appointment;

public interface IAppointmentRepository
{
    Task<IReadOnlyList<ConsultingRoomDto>> ListRoomsAsync(
        Guid tenantId, Guid? branchId, bool onlyActive, CancellationToken ct);

    Task<ConsultingRoomDto?> UpsertRoomAsync(
        Guid tenantId, Guid roomId, Guid actorUserId, UpsertConsultingRoomRequest request, CancellationToken ct);

    Task<AppointmentDto?> CreateAsync(
        Guid tenantId, Guid appointmentId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, DateTimeOffset occurredAtUtc, CreateAppointmentRequest request,
        CancellationToken ct);

    Task<AppointmentDto?> GetByIdAsync(Guid tenantId, Guid appointmentId, CancellationToken ct);

    Task<AppointmentDto?> RescheduleAsync(
        Guid tenantId, Guid appointmentId, Guid actorUserId, Guid? actorProfessionalId,
        DateTimeOffset occurredAtUtc, RescheduleAppointmentRequest request, CancellationToken ct);

    Task<AppointmentDto?> ChangeStateAsync(
        Guid tenantId, Guid appointmentId, Guid actorUserId, Guid? actorProfessionalId,
        DateTimeOffset occurredAtUtc, ChangeAppointmentStateRequest request, CancellationToken ct);

    Task<IReadOnlyList<AppointmentDto>> ListByRangeAsync(
        Guid tenantId, Guid branchId, DateTimeOffset fromUtc, DateTimeOffset toUtc,
        Guid? professionalId, Guid? roomId, CancellationToken ct);

    Task<IReadOnlyList<AppointmentDto>> ListBySubjectAsync(
        Guid tenantId, Guid subjectId, CancellationToken ct);
}

public sealed class AppointmentRepository(ISqlConnectionFactory connectionFactory) : IAppointmentRepository
{
    public async Task<IReadOnlyList<ConsultingRoomDto>> ListRoomsAsync(
        Guid tenantId, Guid? branchId, bool onlyActive, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_ConsultingRoom_List",
            new { TenantId = tenantId, BranchId = branchId, OnlyActive = onlyActive },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        using var multi = await conn.QueryMultipleAsync(cmd);
        var rooms = (await multi.ReadAsync()).Select(MapRoom).ToList();
        var linkRows = await multi.ReadAsync();
        var byRoom = linkRows
            .GroupBy(l => (Guid)l.RoomId)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlyList<Guid>)g.Select(x => (Guid)x.HealthcareProfessionalId).ToList());
        foreach (var room in rooms)
            room.ProfessionalIds = byRoom.TryGetValue(room.RoomId, out var ids) ? ids : [];
        return rooms;
    }

    public async Task<ConsultingRoomDto?> UpsertRoomAsync(
        Guid tenantId, Guid roomId, Guid actorUserId, UpsertConsultingRoomRequest request, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var csv = request.ProfessionalIds is { Count: > 0 }
                ? string.Join(',', request.ProfessionalIds.Distinct())
                : null;
            var cmd = new CommandDefinition(
                "sp_ConsultingRoom_Upsert",
                new
                {
                    TenantId = tenantId,
                    RoomId = roomId,
                    request.BranchId,
                    request.Code,
                    request.Name,
                    request.IsActive,
                    request.SpecialtyId,
                    ProfessionalIdsCsv = csv,
                    ActorUserId = actorUserId
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            using var multi = await conn.QueryMultipleAsync(cmd);
            var row = await multi.ReadSingleOrDefaultAsync();
            if (row is null) return null;
            var room = MapRoom(row);
            var linkRows = await multi.ReadAsync();
            room.ProfessionalIds = linkRows.Select(l => (Guid)l.HealthcareProfessionalId).ToList();
            return room;
        }
        catch (SqlException ex) when (ex.Number is 50210 or 50211 or 50212 or 50213)
        {
            throw new ArgumentException(ex.Message, ex);
        }
    }

    public async Task<AppointmentDto?> CreateAsync(
        Guid tenantId, Guid appointmentId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, DateTimeOffset occurredAtUtc, CreateAppointmentRequest request,
        CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_Appointment_Create",
                new
                {
                    AppointmentId = appointmentId,
                    TenantId = tenantId,
                    request.BranchId,
                    request.SubjectId,
                    request.ProfessionalId,
                    request.RoomId,
                    ScheduledStartUtc = request.ScheduledStartUtc.UtcDateTime,
                    ScheduledEndUtc = request.ScheduledEndUtc.UtcDateTime,
                    request.ServiceCode,
                    request.Notes,
                    ActorUserId = actorUserId,
                    ActorProfessionalId = actorProfessionalId,
                    ActorDisplayName = actorDisplayName,
                    OccurredAtUtc = occurredAtUtc.UtcDateTime
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            // sp_Audit_Append anidado produce result set intermedio.
            await conn.ExecuteAsync(cmd);
            return await GetByIdAsync(tenantId, appointmentId, ct);
        }
        catch (SqlException ex) when (ex.Number is 50201 or 50202)
        {
            throw new AppointmentOverlapException(ex.Message, ex);
        }
        catch (SqlException ex) when (ex.Number is 50210 or 50220 or 50221 or 50222 or 50223)
        {
            throw new ArgumentException(ex.Message, ex);
        }
    }

    public async Task<AppointmentDto?> GetByIdAsync(Guid tenantId, Guid appointmentId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Appointment_GetById",
            new { TenantId = tenantId, AppointmentId = appointmentId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        var row = await conn.QuerySingleOrDefaultAsync(cmd);
        return row is null ? null : MapAppointment(row);
    }

    public async Task<AppointmentDto?> RescheduleAsync(
        Guid tenantId, Guid appointmentId, Guid actorUserId, Guid? actorProfessionalId,
        DateTimeOffset occurredAtUtc, RescheduleAppointmentRequest request, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_Appointment_Reschedule",
                new
                {
                    TenantId = tenantId,
                    AppointmentId = appointmentId,
                    ScheduledStartUtc = request.ScheduledStartUtc.UtcDateTime,
                    ScheduledEndUtc = request.ScheduledEndUtc.UtcDateTime,
                    request.RoomId,
                    request.ProfessionalId,
                    request.ServiceCode,
                    request.Notes,
                    ActorUserId = actorUserId,
                    ActorProfessionalId = actorProfessionalId,
                    OccurredAtUtc = occurredAtUtc.UtcDateTime
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            await conn.ExecuteAsync(cmd);
            return await GetByIdAsync(tenantId, appointmentId, ct);
        }
        catch (SqlException ex) when (ex.Number is 50201 or 50202)
        {
            throw new AppointmentOverlapException(ex.Message, ex);
        }
        catch (SqlException ex) when (ex.Number is 50220 or 50222 or 50223 or 50224)
        {
            throw new ArgumentException(ex.Message, ex);
        }
    }

    public async Task<AppointmentDto?> ChangeStateAsync(
        Guid tenantId, Guid appointmentId, Guid actorUserId, Guid? actorProfessionalId,
        DateTimeOffset occurredAtUtc, ChangeAppointmentStateRequest request, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_Appointment_ChangeState",
                new
                {
                    TenantId = tenantId,
                    AppointmentId = appointmentId,
                    request.ToState,
                    request.Reason,
                    ActorUserId = actorUserId,
                    ActorProfessionalId = actorProfessionalId,
                    OccurredAtUtc = occurredAtUtc.UtcDateTime
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            await conn.ExecuteAsync(cmd);
            return await GetByIdAsync(tenantId, appointmentId, ct);
        }
        catch (SqlException ex) when (ex.Number is 50225 or 50226 or 50227 or 50228 or 50229)
        {
            throw new ArgumentException(ex.Message, ex);
        }
    }

    public async Task<IReadOnlyList<AppointmentDto>> ListByRangeAsync(
        Guid tenantId, Guid branchId, DateTimeOffset fromUtc, DateTimeOffset toUtc,
        Guid? professionalId, Guid? roomId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Appointment_ListByRange",
            new
            {
                TenantId = tenantId,
                BranchId = branchId,
                FromUtc = fromUtc.UtcDateTime,
                ToUtc = toUtc.UtcDateTime,
                ProfessionalId = professionalId,
                RoomId = roomId
            },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        var rows = await conn.QueryAsync(cmd);
        return rows.Select(MapAppointment).ToList();
    }

    public async Task<IReadOnlyList<AppointmentDto>> ListBySubjectAsync(
        Guid tenantId, Guid subjectId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Appointment_ListBySubject",
            new { TenantId = tenantId, SubjectId = subjectId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        var rows = await conn.QueryAsync(cmd);
        return rows.Select(MapAppointment).ToList();
    }

    private static ConsultingRoomDto MapRoom(dynamic r)
    {
        Guid? specialtyId = null;
        try
        {
            object? raw = r.SpecialtyId;
            if (raw is Guid g) specialtyId = g;
            else if (raw is not null and not DBNull) specialtyId = (Guid)raw;
        }
        catch
        {
            specialtyId = null;
        }

        return new ConsultingRoomDto
        {
            RoomId = r.RoomId,
            TenantId = r.TenantId,
            BranchId = r.BranchId,
            Code = r.Code,
            Name = r.Name,
            IsActive = r.IsActive,
            SpecialtyId = specialtyId,
            SpecialtyName = r.SpecialtyName as string,
            ProfessionalIds = [],
            CreatedAtUtc = ToDto(r.CreatedAtUtc) ?? DateTimeOffset.UtcNow,
            UpdatedAtUtc = ToDto(r.UpdatedAtUtc) ?? DateTimeOffset.UtcNow
        };
    }

    private static AppointmentDto MapAppointment(dynamic r) => new()
    {
        AppointmentId = r.AppointmentId,
        TenantId = r.TenantId,
        BranchId = r.BranchId,
        SubjectId = r.SubjectId,
        ProfessionalId = r.ProfessionalId,
        RoomId = r.RoomId,
        ScheduledStartUtc = ToDto(r.ScheduledStartUtc) ?? DateTimeOffset.UtcNow,
        ScheduledEndUtc = ToDto(r.ScheduledEndUtc) ?? DateTimeOffset.UtcNow,
        State = r.State,
        ServiceCode = r.ServiceCode,
        Notes = r.Notes,
        CreatedByUserId = r.CreatedByUserId,
        CreatedByProfessionalId = r.CreatedByProfessionalId,
        CreatedByDisplayName = r.CreatedByDisplayName ?? string.Empty,
        OccurredAtUtc = ToDto(r.OccurredAtUtc) ?? DateTimeOffset.UtcNow,
        RecordedAtUtc = ToDto(r.RecordedAtUtc) ?? DateTimeOffset.UtcNow,
        UpdatedAtUtc = ToDto(r.UpdatedAtUtc) ?? DateTimeOffset.UtcNow,
        SubjectGivenName = r.SubjectGivenName,
        SubjectFirstSurname = r.SubjectFirstSurname,
        SubjectSecondSurname = r.SubjectSecondSurname,
        SubjectPreferredName = r.SubjectPreferredName,
        SubjectIdentificationState = r.SubjectIdentificationState,
        SubjectOperationalLabel = r.SubjectOperationalLabel,
        ProfessionalFullName = r.ProfessionalFullName,
        ProfessionalLicense = r.ProfessionalLicense,
        RoomCode = r.RoomCode,
        RoomName = r.RoomName
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

/// <summary>Traslape de profesional o consultorio → API 409.</summary>
public sealed class AppointmentOverlapException(string message, Exception? inner = null)
    : Exception(message, inner);
