using MediCore.Business.Professional;
using MediCore.Business.Role;
using MediCore.Common;
using MediCore.Models.Professional;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

/// <summary>Catálogo de especialidades por tenant (M1). Escritura canAdminMedicos.</summary>
[ApiController]
[Authorize]
[Route("api/specialties")]
public sealed class SpecialtiesController(
    ISpecialtyService specialtyService,
    IEffectivePermissionService permissionService) : MediCoreControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<SpecialtyDto[]>>> List(
        [FromQuery] bool onlyActive = true,
        CancellationToken ct = default)
    {
        if (!await CanReadProfessionalsAsync(permissionService, ct))
            return Forbidden<SpecialtyDto[]>("Sin permiso para listar especialidades.");

        var list = await specialtyService.ListAsync(TenantId(), onlyActive, ct);
        return Ok(ApiResponse<SpecialtyDto[]>.Ok(list.ToArray()));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<SpecialtyDto>>> Get(Guid id, CancellationToken ct)
    {
        if (!await CanReadProfessionalsAsync(permissionService, ct))
            return Forbidden<SpecialtyDto>("Sin permiso para consultar especialidades.");

        var item = await specialtyService.GetByIdAsync(TenantId(), id, ct);
        if (item is null)
            return NotFound(ApiResponse<SpecialtyDto>.Fail("Especialidad no encontrada."));
        return Ok(ApiResponse<SpecialtyDto>.Ok(item));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<SpecialtyDto>>> Upsert(
        Guid id,
        [FromBody] UpsertSpecialtyRequest request,
        CancellationToken ct)
    {
        if (!await CanManageProfessionalsAsync(permissionService, ct))
            return Forbidden<SpecialtyDto>("Sin permiso para administrar especialidades.");

        try
        {
            var saved = await specialtyService.UpsertAsync(TenantId(), id, request, ct);
            return Ok(ApiResponse<SpecialtyDto>.Ok(saved));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<SpecialtyDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("código", StringComparison.OrdinalIgnoreCase))
        {
            return Conflict(ApiResponse<SpecialtyDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<SpecialtyDto>.Fail(ex.Message));
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<object?>>> SoftDelete(Guid id, CancellationToken ct)
    {
        if (!await CanManageProfessionalsAsync(permissionService, ct))
            return Forbidden<object?>("Sin permiso para baja de especialidades.");

        var ok = await specialtyService.SoftDeleteAsync(TenantId(), id, ct);
        if (!ok)
            return NotFound(ApiResponse<object?>.Fail("Especialidad no encontrada."));
        return Ok(ApiResponse<object?>.Ok(null));
    }
}
