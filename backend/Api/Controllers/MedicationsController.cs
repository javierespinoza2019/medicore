using MediCore.Business.Prescription;
using MediCore.Business.Role;
using MediCore.Common;
using MediCore.Models.Prescription;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

/// <summary>Catálogo de medicamentos (M8 / WS-I). Controlados visibles solo con includeControlled.</summary>
[ApiController]
[Authorize]
[Route("api/medications")]
public sealed class MedicationsController(
    IPrescriptionService prescriptionService,
    IEffectivePermissionService permissionService) : MediCoreControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<MedicationDto[]>>> Search(
        [FromQuery] string? query,
        [FromQuery] bool includeControlled = false,
        CancellationToken ct = default)
    {
        if (!await CanAccessPrescriptionsAsync(permissionService, ct))
            return Forbidden<MedicationDto[]>("Sin permiso para catálogo de medicamentos.");

        // Por defecto se excluyen controlados en la búsqueda de prescritir.
        var list = await prescriptionService.SearchMedicationsAsync(
            TenantId(), query, excludeControlled: !includeControlled, ct);
        return Ok(ApiResponse<MedicationDto[]>.Ok(list.ToArray()));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<MedicationDto>>> Upsert(
        [FromBody] UpsertMedicationRequest request,
        [FromQuery] Guid? medicationId = null,
        CancellationToken ct = default)
    {
        if (!await CanManageCatalogsAsync(permissionService, ct))
            return Forbidden<MedicationDto>("Sin permiso para alta de medicamentos.");

        try
        {
            var med = await prescriptionService.UpsertMedicationAsync(
                TenantId(), UserId(), medicationId, request, ct);
            return Ok(ApiResponse<MedicationDto>.Ok(med));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<MedicationDto>.Fail(ex.Message));
        }
    }
}
