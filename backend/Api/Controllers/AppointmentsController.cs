using System.Security.Claims;
using MediCore.Api.Hubs;
using MediCore.Business.Appointment;
using MediCore.Common;
using MediCore.DataAccess.Appointment;
using MediCore.Models.Appointment;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

/// <summary>Agenda (M9 / WS-J): citas y consultorios.</summary>
[ApiController]
[Authorize]
[Route("api/appointments")]
public sealed class AppointmentsController(
    IAppointmentService appointmentService,
    IClinicalQueuePublisher queuePublisher) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<ApiResponse<AppointmentDto>>> Create(
        [FromBody] CreateAppointmentRequest request,
        CancellationToken ct)
    {
        try
        {
            var created = await appointmentService.CreateAsync(
                TenantId(), UserId(), ProfessionalId(), DisplayName(), request, ct);
            await queuePublisher.AppointmentChangedAsync(
                created.TenantId, created.BranchId, created.AppointmentId, created.State, ct);
            return Ok(ApiResponse<AppointmentDto>.Ok(created));
        }
        catch (AppointmentOverlapException ex)
        {
            return Conflict(ApiResponse<AppointmentDto>.Fail(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<AppointmentDto>.Fail(ex.Message));
        }
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<AppointmentDto>>> Get(Guid id, CancellationToken ct)
    {
        var appt = await appointmentService.GetByIdAsync(TenantId(), id, ct);
        if (appt is null)
            return NotFound(ApiResponse<AppointmentDto>.Fail("Cita no encontrada."));
        return Ok(ApiResponse<AppointmentDto>.Ok(appt));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<AppointmentDto>>> Reschedule(
        Guid id,
        [FromBody] RescheduleAppointmentRequest request,
        CancellationToken ct)
    {
        try
        {
            var updated = await appointmentService.RescheduleAsync(
                TenantId(), id, UserId(), ProfessionalId(), request, ct);
            if (updated is null)
                return NotFound(ApiResponse<AppointmentDto>.Fail("Cita no encontrada."));
            await queuePublisher.AppointmentChangedAsync(
                updated.TenantId, updated.BranchId, updated.AppointmentId, updated.State, ct);
            return Ok(ApiResponse<AppointmentDto>.Ok(updated));
        }
        catch (AppointmentOverlapException ex)
        {
            return Conflict(ApiResponse<AppointmentDto>.Fail(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<AppointmentDto>.Fail(ex.Message));
        }
    }

    [HttpPost("{id:guid}/state")]
    public async Task<ActionResult<ApiResponse<AppointmentDto>>> ChangeState(
        Guid id,
        [FromBody] ChangeAppointmentStateRequest request,
        CancellationToken ct)
    {
        try
        {
            var updated = await appointmentService.ChangeStateAsync(
                TenantId(), id, UserId(), ProfessionalId(), request, ct);
            if (updated is null)
                return NotFound(ApiResponse<AppointmentDto>.Fail("Cita no encontrada."));
            await queuePublisher.AppointmentChangedAsync(
                updated.TenantId, updated.BranchId, updated.AppointmentId, updated.State, ct);
            return Ok(ApiResponse<AppointmentDto>.Ok(updated));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<AppointmentDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(ApiResponse<AppointmentDto>.Fail(ex.Message));
        }
    }

    /// <summary>
    /// Lista citas en un rango. <c>mine=true</c> fuerza filtro al profesional de la sesión
    /// (fail closed: sin profesional → lista vacía).
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AppointmentDto>>>> ListByRange(
        [FromQuery] Guid branchId,
        [FromQuery] DateTimeOffset from,
        [FromQuery] DateTimeOffset to,
        [FromQuery] Guid? professionalId = null,
        [FromQuery] Guid? roomId = null,
        [FromQuery] bool mine = false,
        CancellationToken ct = default)
    {
        try
        {
            var list = await appointmentService.ListByRangeAsync(
                TenantId(), branchId, from, to, professionalId, roomId,
                ProfessionalId(), mine, ct);
            return Ok(ApiResponse<IReadOnlyList<AppointmentDto>>.Ok(list));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<IReadOnlyList<AppointmentDto>>.Fail(ex.Message));
        }
    }

    [HttpGet("by-subject/{subjectId:guid}")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AppointmentDto>>>> ListBySubject(
        Guid subjectId,
        CancellationToken ct)
    {
        var list = await appointmentService.ListBySubjectAsync(TenantId(), subjectId, ct);
        return Ok(ApiResponse<IReadOnlyList<AppointmentDto>>.Ok(list));
    }

    private Guid TenantId() => Guid.Parse(User.FindFirstValue(MediCoreClaims.TenantId)!);
    private Guid UserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private Guid? ProfessionalId()
    {
        var raw = User.FindFirstValue(MediCoreClaims.HealthcareProfessionalId);
        return Guid.TryParse(raw, out var id) ? id : null;
    }

    private string? DisplayName() =>
        User.FindFirstValue("name")
        ?? User.FindFirstValue(ClaimTypes.Name)
        ?? User.Identity?.Name;
}

[ApiController]
[Authorize]
[Route("api/consulting-rooms")]
public sealed class ConsultingRoomsController(IAppointmentService appointmentService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ConsultingRoomDto>>>> List(
        [FromQuery] Guid? branchId = null,
        [FromQuery] bool onlyActive = true,
        CancellationToken ct = default)
    {
        var tenantId = Guid.Parse(User.FindFirstValue(MediCoreClaims.TenantId)!);
        var list = await appointmentService.ListRoomsAsync(tenantId, branchId, onlyActive, ct);
        return Ok(ApiResponse<IReadOnlyList<ConsultingRoomDto>>.Ok(list));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ConsultingRoomDto>>> Upsert(
        Guid id,
        [FromBody] UpsertConsultingRoomRequest request,
        CancellationToken ct)
    {
        var tenantId = Guid.Parse(User.FindFirstValue(MediCoreClaims.TenantId)!);
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        try
        {
            var room = await appointmentService.UpsertRoomAsync(tenantId, id, userId, request, ct);
            return Ok(ApiResponse<ConsultingRoomDto>.Ok(room));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<ConsultingRoomDto>.Fail(ex.Message));
        }
    }
}

[ApiController]
[Authorize]
[Route("api/schedule-blocks")]
public sealed class ScheduleBlocksController(IAppointmentService appointmentService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ScheduleBlockDto>>>> List(
        [FromQuery] Guid branchId,
        [FromQuery] DateTimeOffset from,
        [FromQuery] DateTimeOffset to,
        CancellationToken ct = default)
    {
        var tenantId = Guid.Parse(User.FindFirstValue(MediCoreClaims.TenantId)!);
        try
        {
            var list = await appointmentService.ListBlocksAsync(tenantId, branchId, from, to, ct);
            return Ok(ApiResponse<IReadOnlyList<ScheduleBlockDto>>.Ok(list));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<IReadOnlyList<ScheduleBlockDto>>.Fail(ex.Message));
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ScheduleBlockDto>>> Upsert(
        Guid id,
        [FromBody] UpsertScheduleBlockRequest request,
        CancellationToken ct)
    {
        var tenantId = Guid.Parse(User.FindFirstValue(MediCoreClaims.TenantId)!);
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        try
        {
            var block = await appointmentService.UpsertBlockAsync(tenantId, id, userId, request, ct);
            return Ok(ApiResponse<ScheduleBlockDto>.Ok(block));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<ScheduleBlockDto>.Fail(ex.Message));
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<object?>>> SoftDelete(Guid id, CancellationToken ct)
    {
        var tenantId = Guid.Parse(User.FindFirstValue(MediCoreClaims.TenantId)!);
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        try
        {
            await appointmentService.SoftDeleteBlockAsync(tenantId, id, userId, ct);
            return Ok(ApiResponse<object?>.Ok(null));
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(ApiResponse<object?>.Fail(ex.Message));
        }
    }
}
