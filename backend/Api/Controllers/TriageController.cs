using MediCore.Api.Hubs;
using MediCore.Business.Encounter;
using MediCore.Business.Role;
using MediCore.Business.Subject;
using MediCore.Business.Triage;
using MediCore.Common;
using MediCore.Models.Subject;
using MediCore.Models.Triage;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

/// <summary>
/// Triage y signos vitales (M5 / WS-F).
/// Nada bloquea iniciar triage por falta de identidad. Ningún signo obligatorio.
/// Escala configurable (cascada sucursal &gt; tenant).
/// </summary>
[ApiController]
[Authorize]
public sealed class TriageController(
    ITriageService triageService,
    IEncounterService encounterService,
    IClinicalQueuePublisher queuePublisher,
    IEffectivePermissionService permissionService) : MediCoreControllerBase
{
    [HttpGet("api/branches/{branchId:guid}/triage-scale")]
    public async Task<ActionResult<ApiResponse<TriageScaleConfigDto>>> GetEffectiveScale(
        Guid branchId, CancellationToken ct)
    {
        if (!await CanReadTriageAsync(permissionService, ct))
            return Forbidden<TriageScaleConfigDto>("Sin permiso para consultar escala de triage.");

        try
        {
            var scale = await triageService.GetEffectiveScaleAsync(TenantId(), branchId, ct);
            if (scale is null)
                return NotFound(ApiResponse<TriageScaleConfigDto>.Fail(
                    "No hay escala de triage configurada para esta sucursal ni su tenant."));
            return Ok(ApiResponse<TriageScaleConfigDto>.Ok(scale));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<TriageScaleConfigDto>.Fail(ex.Message));
        }
    }

    [HttpPut("api/tenant/triage-scale")]
    public async Task<ActionResult<ApiResponse<TriageScaleConfigDto>>> UpsertTenantScale(
        [FromBody] UpsertTriageScaleRequest request, CancellationToken ct)
    {
        if (!await CanManageCatalogsAsync(permissionService, ct))
            return Forbidden<TriageScaleConfigDto>("Sin permiso para configurar escala de triage.");

        try
        {
            var scale = await triageService.UpsertTenantScaleAsync(
                TenantId(), UserId(), request, ct);
            return Ok(ApiResponse<TriageScaleConfigDto>.Ok(scale));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<TriageScaleConfigDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<TriageScaleConfigDto>.Fail(ex.Message));
        }
    }

    [HttpPut("api/branches/{branchId:guid}/triage-scale")]
    public async Task<ActionResult<ApiResponse<TriageScaleConfigDto>>> UpsertBranchScale(
        Guid branchId, [FromBody] UpsertTriageScaleRequest request, CancellationToken ct)
    {
        if (!await CanManageCatalogsAsync(permissionService, ct))
            return Forbidden<TriageScaleConfigDto>("Sin permiso para configurar escala de triage.");

        try
        {
            var scale = await triageService.UpsertBranchScaleAsync(
                TenantId(), branchId, UserId(), request, ct);
            return Ok(ApiResponse<TriageScaleConfigDto>.Ok(scale));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<TriageScaleConfigDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<TriageScaleConfigDto>.Fail(ex.Message));
        }
    }

    [HttpPost("api/encounters/{id:guid}/triage")]
    public async Task<ActionResult<ApiResponse<TriageDto>>> Save(
        Guid id, [FromBody] SaveTriageRequest request, CancellationToken ct)
    {
        if (!await CanAccessTriageAsync(permissionService, ct))
            return Forbidden<TriageDto>("Sin permiso para registrar triage.");

        try
        {
            var triage = await triageService.SaveAsync(
                TenantId(), id, UserId(), ProfessionalId(), DisplayName(), request, ct);
            await PublishTriageAsync(id, triage, ct);
            return Ok(ApiResponse<TriageDto>.Ok(triage));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<TriageDto>.Fail(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<TriageDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<TriageDto>.Fail(ex.Message));
        }
    }

    [HttpGet("api/encounters/{id:guid}/triage")]
    public async Task<ActionResult<ApiResponse<TriageDto>>> Get(Guid id, CancellationToken ct)
    {
        if (!await CanReadTriageAsync(permissionService, ct))
            return Forbidden<TriageDto>("Sin permiso para leer triage.");

        var triage = await triageService.GetByEncounterAsync(TenantId(), id, ct);
        if (triage is null)
            return NotFound(ApiResponse<TriageDto>.Fail("Triage no encontrado para el episodio."));
        return Ok(ApiResponse<TriageDto>.Ok(triage));
    }

    [HttpPost("api/encounters/{id:guid}/triage/reclassify")]
    public async Task<ActionResult<ApiResponse<TriageDto>>> Reclassify(
        Guid id, [FromBody] ReclassifyTriageRequest request, CancellationToken ct)
    {
        if (!await CanAccessTriageAsync(permissionService, ct))
            return Forbidden<TriageDto>("Sin permiso para reclasificar triage.");

        try
        {
            var triage = await triageService.ReclassifyAsync(
                TenantId(), id, UserId(), ProfessionalId(), DisplayName(), request, ct);
            await PublishTriageAsync(id, triage, ct);
            return Ok(ApiResponse<TriageDto>.Ok(triage));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<TriageDto>.Fail(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<TriageDto>.Fail(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<TriageDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<TriageDto>.Fail(ex.Message));
        }
    }

    [HttpPost("api/encounters/{id:guid}/vitals")]
    public async Task<ActionResult<ApiResponse<VitalSetDto>>> AppendVitals(
        Guid id, [FromBody] AppendVitalsRequest request, CancellationToken ct)
    {
        if (!await CanAccessTriageAsync(permissionService, ct))
            return Forbidden<VitalSetDto>("Sin permiso para registrar signos vitales.");

        try
        {
            var set = await triageService.AppendVitalsAsync(
                TenantId(), id, UserId(), ProfessionalId(), request, ct);
            return Ok(ApiResponse<VitalSetDto>.Ok(set));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<VitalSetDto>.Fail(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<VitalSetDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<VitalSetDto>.Fail(ex.Message));
        }
    }

    [HttpGet("api/encounters/{id:guid}/vitals")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<VitalSetDto>>>> ListVitals(
        Guid id, CancellationToken ct)
    {
        if (!await CanReadTriageAsync(permissionService, ct))
            return Forbidden<IReadOnlyList<VitalSetDto>>("Sin permiso para leer signos vitales.");

        var list = await triageService.ListVitalsAsync(TenantId(), id, ct);
        if (list.Count == 0)
            return NotFound(ApiResponse<IReadOnlyList<VitalSetDto>>.Fail(
                "No hay sets de signos para el episodio."));
        return Ok(ApiResponse<IReadOnlyList<VitalSetDto>>.Ok(list));
    }

    private async Task PublishTriageAsync(Guid encounterId, TriageDto triage, CancellationToken ct)
    {
        var encounter = await encounterService.GetByIdAsync(TenantId(), encounterId, ct);
        if (encounter is null) return;

        await queuePublisher.TriageChangedAsync(
            TenantId(),
            encounter.BranchId,
            encounterId,
            triage.Level,
            triage.LevelPriority,
            ct);
        await queuePublisher.QueueChangedAsync(
            TenantId(), encounter.BranchId, encounterId, "triage.changed", ct);
    }
}
