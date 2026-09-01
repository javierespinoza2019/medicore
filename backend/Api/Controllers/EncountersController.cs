using System.Security.Claims;
using MediCore.Api.Hubs;
using MediCore.Business.Encounter;
using MediCore.Common;
using MediCore.Models.Encounter;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

/// <summary>
/// Episodio de atención / urgencias (M4 / WS-E).
/// Nada bloquea el ingreso: abrir sólo exige SubjectId + BranchId (+ tipo).
/// </summary>
[ApiController]
[Authorize]
[Route("api/encounters")]
public sealed class EncountersController(
    IEncounterService encounterService,
    IClinicalQueuePublisher queuePublisher) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<ApiResponse<EncounterDto>>> Open(
        [FromBody] OpenEncounterRequest request,
        CancellationToken ct)
    {
        try
        {
            var created = await encounterService.OpenAsync(
                TenantId(), UserId(), ProfessionalId(), request, ct);
            await queuePublisher.QueueChangedAsync(
                created.TenantId, created.BranchId, created.EncounterId, "encounter.open", ct);
            return Ok(ApiResponse<EncounterDto>.Ok(created));
        }
        catch (ArgumentException ex)
        {
            var msg = ex.Message;
            if (msg.Contains("sujeto", StringComparison.OrdinalIgnoreCase))
                return NotFound(ApiResponse<EncounterDto>.Fail(msg));
            return BadRequest(ApiResponse<EncounterDto>.Fail(msg));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<EncounterDto>.Fail(ex.Message));
        }
    }

    [HttpGet("queue")]
    public async Task<ActionResult<ApiResponse<EncounterQueueDto>>> Queue(
        [FromQuery] Guid branchId,
        [FromQuery] bool includeClosed = false,
        CancellationToken ct = default)
    {
        try
        {
            var queue = await encounterService.ListQueueAsync(TenantId(), branchId, includeClosed, ct);
            return Ok(ApiResponse<EncounterQueueDto>.Ok(queue));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<EncounterQueueDto>.Fail(ex.Message));
        }
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<EncounterDto>>> Get(Guid id, CancellationToken ct)
    {
        var encounter = await encounterService.GetByIdAsync(TenantId(), id, ct);
        if (encounter is null)
            return NotFound(ApiResponse<EncounterDto>.Fail("Episodio no encontrado."));
        return Ok(ApiResponse<EncounterDto>.Ok(encounter));
    }

    [HttpGet("~/api/subjects/{subjectId:guid}/encounters")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<EncounterDto>>>> ListBySubject(
        Guid subjectId, CancellationToken ct)
    {
        var list = await encounterService.ListBySubjectAsync(TenantId(), subjectId, ct);
        return Ok(ApiResponse<IReadOnlyList<EncounterDto>>.Ok(list));
    }

    [HttpPut("{id:guid}/admission")]
    public async Task<ActionResult<ApiResponse<EncounterDto>>> UpdateAdmission(
        Guid id,
        [FromBody] UpdateAdmissionRequest request,
        CancellationToken ct)
    {
        try
        {
            var updated = await encounterService.UpdateAdmissionAsync(
                TenantId(), id, UserId(), ProfessionalId(), request, ct);
            if (updated is null)
                return NotFound(ApiResponse<EncounterDto>.Fail("Episodio no encontrado."));
            await queuePublisher.QueueChangedAsync(
                updated.TenantId, updated.BranchId, updated.EncounterId, "encounter.admission", ct);
            return Ok(ApiResponse<EncounterDto>.Ok(updated));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<EncounterDto>.Fail(ex.Message));
        }
    }

    [HttpPost("{id:guid}/state")]
    public async Task<ActionResult<ApiResponse<EncounterDto>>> TransitionState(
        Guid id,
        [FromBody] TransitionStateRequest request,
        CancellationToken ct)
    {
        try
        {
            var updated = await encounterService.TransitionStateAsync(
                TenantId(), id, UserId(), ProfessionalId(), request, ct);
            if (updated is null)
                return NotFound(ApiResponse<EncounterDto>.Fail("Episodio no encontrado."));
            await queuePublisher.EncounterStateChangedAsync(
                updated.TenantId,
                updated.BranchId,
                updated.EncounterId,
                updated.State,
                updated.TriageLevel,
                ct);
            await queuePublisher.QueueChangedAsync(
                updated.TenantId, updated.BranchId, updated.EncounterId, "encounter.state", ct);
            return Ok(ApiResponse<EncounterDto>.Ok(updated));
        }
        catch (KeyNotFoundException)
        {
            return NotFound(ApiResponse<EncounterDto>.Fail("Episodio no encontrado."));
        }
        catch (EncounterCloseWithoutTriageException ex)
        {
            return Conflict(ApiResponse<EncounterDto>.Fail(ex.Message));
        }
        catch (EncounterCloseWithPendingPrescriptionsException ex)
        {
            return Conflict(ApiResponse<EncounterDto>.Fail(ex.Message));
        }
        catch (EncounterCloseWithoutJustificationException ex)
        {
            return UnprocessableEntity(ApiResponse<EncounterDto>.Fail(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<EncounterDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<EncounterDto>.Fail(ex.Message));
        }
    }

    [HttpPost("{id:guid}/assign-professional")]
    public async Task<ActionResult<ApiResponse<EncounterDto>>> AssignProfessional(
        Guid id,
        [FromBody] AssignProfessionalRequest request,
        CancellationToken ct)
    {
        try
        {
            var updated = await encounterService.AssignProfessionalAsync(
                TenantId(), id, UserId(), ProfessionalId(), request, ct);
            if (updated is null)
                return NotFound(ApiResponse<EncounterDto>.Fail("Episodio no encontrado."));
            await queuePublisher.QueueChangedAsync(
                updated.TenantId, updated.BranchId, updated.EncounterId, "encounter.assign", ct);
            return Ok(ApiResponse<EncounterDto>.Ok(updated));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<EncounterDto>.Fail(ex.Message));
        }
    }

    [HttpPost("{id:guid}/mp-notice")]
    public async Task<ActionResult<ApiResponse<MpNoticeDto>>> CreateMpNotice(
        Guid id,
        [FromBody] CreateMpNoticeRequest request,
        CancellationToken ct)
    {
        try
        {
            var notice = await encounterService.CreateMpNoticeAsync(TenantId(), id, UserId(), request, ct);
            if (notice is null)
                return NotFound(ApiResponse<MpNoticeDto>.Fail("Episodio no encontrado."));
            return Ok(ApiResponse<MpNoticeDto>.Ok(notice));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<MpNoticeDto>.Fail(ex.Message));
        }
    }

    [HttpPost("{id:guid}/care-without-consent")]
    public async Task<ActionResult<ApiResponse<CareWithoutConsentDto>>> CareWithoutConsent(
        Guid id,
        [FromBody] CreateCareWithoutConsentRequest request,
        CancellationToken ct)
    {
        try
        {
            var record = await encounterService.CreateCareWithoutConsentAsync(
                TenantId(), id, UserId(), request, ct);
            if (record is null)
                return NotFound(ApiResponse<CareWithoutConsentDto>.Fail("Episodio no encontrado."));
            return Ok(ApiResponse<CareWithoutConsentDto>.Ok(record));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<CareWithoutConsentDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            // Menos de dos profesionales distintos → 409
            return Conflict(ApiResponse<CareWithoutConsentDto>.Fail(ex.Message));
        }
    }

    private Guid TenantId() => Guid.Parse(User.FindFirstValue(MediCoreClaims.TenantId)!);
    private Guid UserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private Guid? ProfessionalId()
    {
        var raw = User.FindFirstValue(MediCoreClaims.HealthcareProfessionalId);
        return Guid.TryParse(raw, out var id) ? id : null;
    }
}

