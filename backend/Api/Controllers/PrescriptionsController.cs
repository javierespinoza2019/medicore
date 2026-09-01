using MediCore.Business.Prescription;
using MediCore.Business.Role;
using MediCore.Common;
using MediCore.Models.Prescription;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

/// <summary>
/// Recetas (M8 / WS-I). Captura explícita de estado alérgico; controlados → 422;
/// firma fail closed con cédula.
/// </summary>
[ApiController]
[Authorize]
public sealed class PrescriptionsController(
    IPrescriptionService prescriptionService,
    IEffectivePermissionService permissionService) : MediCoreControllerBase
{
    [HttpPost("api/encounters/{encounterId:guid}/prescriptions")]
    public async Task<ActionResult<ApiResponse<PrescriptionDto>>> Create(
        Guid encounterId, [FromBody] CreatePrescriptionRequest request, CancellationToken ct)
    {
        if (!await CanAccessPrescriptionsAsync(permissionService, ct))
            return Forbidden<PrescriptionDto>("Sin permiso para emitir recetas.");

        try
        {
            var rx = await prescriptionService.CreateAsync(
                TenantId(), encounterId, UserId(), ProfessionalId(), DisplayName(), request, ct);
            return Ok(ApiResponse<PrescriptionDto>.Ok(rx));
        }
        catch (PrescriptionAllergyCaptureRequiredException ex)
        {
            return Conflict(ApiResponse<PrescriptionDto>.Fail(ex.Message));
        }
        catch (PrescriptionAllergyOverrideRequiredException ex)
        {
            return Conflict(ApiResponse<PrescriptionDto>.Fail(ex.Message));
        }
        catch (PrescriptionControlledSubstanceException ex)
        {
            return UnprocessableEntity(ApiResponse<PrescriptionDto>.Fail(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<PrescriptionDto>.Fail(ex.Message));
        }
        catch (KeyNotFoundException)
        {
            return NotFound(ApiResponse<PrescriptionDto>.Fail("Episodio no encontrado."));
        }
    }

    [HttpGet("api/prescriptions/{id:guid}")]
    public async Task<ActionResult<ApiResponse<PrescriptionDto>>> Get(Guid id, CancellationToken ct)
    {
        if (!await CanAccessPrescriptionsAsync(permissionService, ct))
            return Forbidden<PrescriptionDto>("Sin permiso para leer recetas.");

        try
        {
            var rx = await prescriptionService.GetByIdAsync(TenantId(), id, ct);
            return Ok(ApiResponse<PrescriptionDto>.Ok(rx));
        }
        catch (KeyNotFoundException)
        {
            return NotFound(ApiResponse<PrescriptionDto>.Fail("Receta no encontrada."));
        }
    }

    [HttpGet("api/subjects/{subjectId:guid}/prescriptions")]
    public async Task<ActionResult<ApiResponse<PrescriptionDto[]>>> ListBySubject(
        Guid subjectId, CancellationToken ct)
    {
        if (!await CanAccessPrescriptionsAsync(permissionService, ct))
            return Forbidden<PrescriptionDto[]>("Sin permiso para listar recetas.");

        var list = await prescriptionService.ListBySubjectAsync(TenantId(), subjectId, ct);
        return Ok(ApiResponse<PrescriptionDto[]>.Ok(list.ToArray()));
    }

    [HttpPost("api/prescriptions/{id:guid}/sign")]
    public async Task<ActionResult<ApiResponse<PrescriptionDto>>> Sign(
        Guid id, [FromBody] SignPrescriptionRequest? request, CancellationToken ct)
    {
        if (!await CanAccessPrescriptionsAsync(permissionService, ct))
            return Forbidden<PrescriptionDto>("Sin permiso para firmar recetas.");

        try
        {
            var rx = await prescriptionService.SignAsync(
                TenantId(), id, UserId(), ProfessionalId(), DisplayName(),
                request ?? new SignPrescriptionRequest(), ct);
            return Ok(ApiResponse<PrescriptionDto>.Ok(rx));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                ApiResponse<PrescriptionDto>.Fail(ex.Message));
        }
        catch (KeyNotFoundException)
        {
            return NotFound(ApiResponse<PrescriptionDto>.Fail("Receta no encontrada."));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<PrescriptionDto>.Fail(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<PrescriptionDto>.Fail(ex.Message));
        }
    }

    [HttpPost("api/prescriptions/{id:guid}/cancel")]
    public async Task<ActionResult<ApiResponse<PrescriptionDto>>> Cancel(
        Guid id, [FromBody] CancelPrescriptionRequest request, CancellationToken ct)
    {
        if (!await CanAccessPrescriptionsAsync(permissionService, ct))
            return Forbidden<PrescriptionDto>("Sin permiso para cancelar recetas.");

        try
        {
            var rx = await prescriptionService.CancelAsync(
                TenantId(), id, UserId(), ProfessionalId(), request, ct);
            return Ok(ApiResponse<PrescriptionDto>.Ok(rx));
        }
        catch (KeyNotFoundException)
        {
            return NotFound(ApiResponse<PrescriptionDto>.Fail("Receta no encontrada."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<PrescriptionDto>.Fail(ex.Message));
        }
    }
}
