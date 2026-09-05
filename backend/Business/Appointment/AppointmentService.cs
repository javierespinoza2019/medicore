using MediCore.DataAccess.Appointment;
using MediCore.Models.Appointment;

namespace MediCore.Business.Appointment;

public interface IAppointmentService
{
    Task<IReadOnlyList<ConsultingRoomDto>> ListRoomsAsync(
        Guid tenantId, Guid? branchId, bool onlyActive, CancellationToken ct);

    Task<ConsultingRoomDto> UpsertRoomAsync(
        Guid tenantId, Guid roomId, Guid actorUserId, UpsertConsultingRoomRequest request, CancellationToken ct);

    Task<AppointmentDto> CreateAsync(
        Guid tenantId, Guid actorUserId, Guid? actorProfessionalId, string? actorDisplayName,
        CreateAppointmentRequest request, CancellationToken ct);

    Task<AppointmentDto?> GetByIdAsync(Guid tenantId, Guid appointmentId, CancellationToken ct);

    Task<AppointmentDto?> RescheduleAsync(
        Guid tenantId, Guid appointmentId, Guid actorUserId, Guid? actorProfessionalId,
        RescheduleAppointmentRequest request, CancellationToken ct);

    Task<AppointmentDto?> ChangeStateAsync(
        Guid tenantId, Guid appointmentId, Guid actorUserId, Guid? actorProfessionalId,
        ChangeAppointmentStateRequest request, CancellationToken ct);

    /// <summary>
    /// Lista por rango. Si <paramref name="failClosedWithoutProfessional"/> y no hay
    /// <paramref name="sessionProfessionalId"/>, devuelve vacío (filtro «mi agenda»).
    /// </summary>
    Task<IReadOnlyList<AppointmentDto>> ListByRangeAsync(
        Guid tenantId,
        Guid branchId,
        DateTimeOffset fromUtc,
        DateTimeOffset toUtc,
        Guid? filterProfessionalId,
        Guid? roomId,
        Guid? sessionProfessionalId,
        bool mineOnly,
        CancellationToken ct);

    Task<IReadOnlyList<AppointmentDto>> ListBySubjectAsync(
        Guid tenantId, Guid subjectId, CancellationToken ct);

    Task<IReadOnlyList<ScheduleBlockDto>> ListBlocksAsync(
        Guid tenantId, Guid branchId, DateTimeOffset fromUtc, DateTimeOffset toUtc, CancellationToken ct);

    Task<ScheduleBlockDto> UpsertBlockAsync(
        Guid tenantId, Guid blockId, Guid actorUserId, UpsertScheduleBlockRequest request, CancellationToken ct);

    Task SoftDeleteBlockAsync(Guid tenantId, Guid blockId, Guid actorUserId, CancellationToken ct);
}

public sealed class AppointmentService(IAppointmentRepository repository) : IAppointmentService
{
    public Task<IReadOnlyList<ConsultingRoomDto>> ListRoomsAsync(
        Guid tenantId, Guid? branchId, bool onlyActive, CancellationToken ct) =>
        repository.ListRoomsAsync(tenantId, branchId, onlyActive, ct);

    public async Task<ConsultingRoomDto> UpsertRoomAsync(
        Guid tenantId, Guid roomId, Guid actorUserId, UpsertConsultingRoomRequest request, CancellationToken ct)
    {
        if (request.BranchId == Guid.Empty)
            throw new ArgumentException("branchId es obligatorio.");
        if (string.IsNullOrWhiteSpace(request.Code))
            throw new ArgumentException("El código de consultorio es obligatorio.");
        if (request.Code.Trim().Length > 64)
            throw new ArgumentException("El código de consultorio no puede exceder 64 caracteres.");
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new ArgumentException("El nombre de consultorio es obligatorio.");
        if (request.Name.Trim().Length > 200)
            throw new ArgumentException("El nombre de consultorio no puede exceder 200 caracteres.");

        var normalized = new UpsertConsultingRoomRequest
        {
            BranchId = request.BranchId,
            Code = request.Code.Trim(),
            Name = request.Name.Trim(),
            IsActive = request.IsActive,
            SpecialtyId = request.SpecialtyId,
            ProfessionalIds = request.ProfessionalIds?
                .Where(id => id != Guid.Empty)
                .Distinct()
                .ToList()
        };

        return await repository.UpsertRoomAsync(tenantId, roomId, actorUserId, normalized, ct)
            ?? throw new InvalidOperationException("No se pudo guardar el consultorio.");
    }

    public async Task<AppointmentDto> CreateAsync(
        Guid tenantId, Guid actorUserId, Guid? actorProfessionalId, string? actorDisplayName,
        CreateAppointmentRequest request, CancellationToken ct)
    {
        ValidateInterval(request.ScheduledStartUtc, request.ScheduledEndUtc);
        if (request.BranchId == Guid.Empty)
            throw new ArgumentException("branchId es obligatorio.");
        if (request.SubjectId == Guid.Empty)
            throw new ArgumentException("subjectId es obligatorio (puede ser sujeto sin identidad completa).");
        if (request.ProfessionalId == Guid.Empty)
            throw new ArgumentException("professionalId es obligatorio.");

        var display = string.IsNullOrWhiteSpace(actorDisplayName) ? "usuario" : actorDisplayName.Trim();
        var now = DateTimeOffset.UtcNow;
        var id = Guid.NewGuid();

        var created = await repository.CreateAsync(
            tenantId, id, actorUserId, actorProfessionalId, display, now,
            new CreateAppointmentRequest
            {
                BranchId = request.BranchId,
                SubjectId = request.SubjectId,
                ProfessionalId = request.ProfessionalId,
                RoomId = request.RoomId,
                ScheduledStartUtc = request.ScheduledStartUtc.ToUniversalTime(),
                ScheduledEndUtc = request.ScheduledEndUtc.ToUniversalTime(),
                ServiceCode = Norm(request.ServiceCode),
                Notes = Norm(request.Notes)
            },
            ct);

        return created ?? throw new InvalidOperationException("No se pudo crear la cita.");
    }

    public Task<AppointmentDto?> GetByIdAsync(Guid tenantId, Guid appointmentId, CancellationToken ct) =>
        repository.GetByIdAsync(tenantId, appointmentId, ct);

    public async Task<AppointmentDto?> RescheduleAsync(
        Guid tenantId, Guid appointmentId, Guid actorUserId, Guid? actorProfessionalId,
        RescheduleAppointmentRequest request, CancellationToken ct)
    {
        ValidateInterval(request.ScheduledStartUtc, request.ScheduledEndUtc);
        return await repository.RescheduleAsync(
            tenantId, appointmentId, actorUserId, actorProfessionalId, DateTimeOffset.UtcNow,
            new RescheduleAppointmentRequest
            {
                ScheduledStartUtc = request.ScheduledStartUtc.ToUniversalTime(),
                ScheduledEndUtc = request.ScheduledEndUtc.ToUniversalTime(),
                ProfessionalId = request.ProfessionalId,
                RoomId = request.RoomId,
                ServiceCode = Norm(request.ServiceCode),
                Notes = Norm(request.Notes)
            },
            ct);
    }

    public async Task<AppointmentDto?> ChangeStateAsync(
        Guid tenantId, Guid appointmentId, Guid actorUserId, Guid? actorProfessionalId,
        ChangeAppointmentStateRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.ToState))
            throw new ArgumentException("toState es obligatorio.");
        var toState = request.ToState.Trim().ToLowerInvariant();
        if (!AppointmentStates.All.Contains(toState))
            throw new ArgumentException("Estado de cita no reconocido.");

        if (toState == AppointmentStates.Cancelada && string.IsNullOrWhiteSpace(request.Reason))
            throw new ArgumentException("Cancelar una cita exige motivo.");

        var current = await repository.GetByIdAsync(tenantId, appointmentId, ct)
            ?? throw new InvalidOperationException("Cita no encontrada.");
        if (!AppointmentStates.CanTransition(current.State, toState))
            throw new ArgumentException("Transición de estado de cita no permitida.");

        return await repository.ChangeStateAsync(
            tenantId, appointmentId, actorUserId, actorProfessionalId, DateTimeOffset.UtcNow,
            new ChangeAppointmentStateRequest
            {
                ToState = toState,
                Reason = Norm(request.Reason)
            },
            ct);
    }

    public async Task<IReadOnlyList<AppointmentDto>> ListByRangeAsync(
        Guid tenantId,
        Guid branchId,
        DateTimeOffset fromUtc,
        DateTimeOffset toUtc,
        Guid? filterProfessionalId,
        Guid? roomId,
        Guid? sessionProfessionalId,
        bool mineOnly,
        CancellationToken ct)
    {
        if (branchId == Guid.Empty)
            throw new ArgumentException("branchId es obligatorio.");
        if (toUtc <= fromUtc)
            throw new ArgumentException("El rango de fechas es inválido (to debe ser posterior a from).");

        // Filtro «mi agenda»: sin profesional en sesión → vacío (fail closed).
        if (mineOnly)
        {
            if (sessionProfessionalId is null)
                return Array.Empty<AppointmentDto>();
            filterProfessionalId = sessionProfessionalId;
        }

        return await repository.ListByRangeAsync(
            tenantId, branchId, fromUtc.ToUniversalTime(), toUtc.ToUniversalTime(),
            filterProfessionalId, roomId, ct);
    }

    public Task<IReadOnlyList<AppointmentDto>> ListBySubjectAsync(
        Guid tenantId, Guid subjectId, CancellationToken ct) =>
        repository.ListBySubjectAsync(tenantId, subjectId, ct);

    public Task<IReadOnlyList<ScheduleBlockDto>> ListBlocksAsync(
        Guid tenantId, Guid branchId, DateTimeOffset fromUtc, DateTimeOffset toUtc, CancellationToken ct) =>
        repository.ListBlocksAsync(tenantId, branchId, fromUtc, toUtc, ct);

    public async Task<ScheduleBlockDto> UpsertBlockAsync(
        Guid tenantId, Guid blockId, Guid actorUserId, UpsertScheduleBlockRequest request, CancellationToken ct)
    {
        if (request.BranchId == Guid.Empty)
            throw new ArgumentException("branchId es obligatorio.");
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new ArgumentException("El nombre de la regla es obligatorio.");
        if (request.Name.Trim().Length > 200)
            throw new ArgumentException("El nombre de la regla no puede exceder 200 caracteres.");
        var kind = (request.Kind ?? string.Empty).Trim().ToLowerInvariant();
        if (!ScheduleBlockKinds.All.Contains(kind))
            throw new ArgumentException("Tipo de bloqueo no reconocido.");
        ValidateInterval(request.StartUtc, request.EndUtc);

        if (kind == ScheduleBlockKinds.Medico && (request.ProfessionalId is null || request.ProfessionalId == Guid.Empty))
            throw new ArgumentException("El bloqueo por médico requiere professionalId.");
        if (kind == ScheduleBlockKinds.Especialidad && (request.SpecialtyId is null || request.SpecialtyId == Guid.Empty))
            throw new ArgumentException("El bloqueo por especialidad requiere specialtyId.");

        var normalized = new UpsertScheduleBlockRequest
        {
            BranchId = request.BranchId,
            Kind = kind,
            Name = request.Name.Trim(),
            LocalDate = request.LocalDate,
            StartUtc = request.StartUtc.ToUniversalTime(),
            EndUtc = request.EndUtc.ToUniversalTime(),
            ProfessionalId = kind == ScheduleBlockKinds.Medico ? request.ProfessionalId : null,
            SpecialtyId = kind == ScheduleBlockKinds.Especialidad ? request.SpecialtyId : null,
            IsActive = request.IsActive
        };

        return await repository.UpsertBlockAsync(tenantId, blockId, actorUserId, normalized, ct)
            ?? throw new InvalidOperationException("No se pudo guardar la regla de bloqueo.");
    }

    public Task SoftDeleteBlockAsync(Guid tenantId, Guid blockId, Guid actorUserId, CancellationToken ct) =>
        repository.SoftDeleteBlockAsync(tenantId, blockId, actorUserId, ct);

    /// <summary>Detecta traslape de intervalos abiertos por la izquierda [start, end).</summary>
    public static bool IntervalsOverlap(
        DateTimeOffset aStart, DateTimeOffset aEnd, DateTimeOffset bStart, DateTimeOffset bEnd) =>
        aStart < bEnd && aEnd > bStart;

    private static void ValidateInterval(DateTimeOffset start, DateTimeOffset end)
    {
        if (end <= start)
            throw new ArgumentException("La hora de fin debe ser posterior a la de inicio.");
    }

    private static string? Norm(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
