using MediCore.Business.Professional;
using MediCore.Business.Role;
using MediCore.Common;
using MediCore.Models.Professional;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

/// <summary>
/// Profesionales sanitarios (M1). TenantId desde claims. Escritura: canAdminMedicos.
/// DELETE HTTP = baja lógica (sin DELETE SQL).
/// </summary>
[ApiController]
[Authorize]
[Route("api/professionals")]
public sealed class ProfessionalsController(
    IProfessionalService professionalService,
    IEffectivePermissionService permissionService) : MediCoreControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<ProfessionalDto[]>>> List(
        [FromQuery] bool onlyActive = true,
        [FromQuery] string? search = null,
        CancellationToken ct = default)
    {
        if (!await CanReadProfessionalsAsync(permissionService, ct))
            return Forbidden<ProfessionalDto[]>("Sin permiso para listar profesionales.");

        var list = await professionalService.ListAsync(TenantId(), onlyActive, search, ct);
        return Ok(ApiResponse<ProfessionalDto[]>.Ok(list.ToArray()));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ProfessionalDto>>> Get(Guid id, CancellationToken ct)
    {
        if (!await CanReadProfessionalsAsync(permissionService, ct))
            return Forbidden<ProfessionalDto>("Sin permiso para consultar profesionales.");

        var item = await professionalService.GetByIdAsync(TenantId(), id, ct);
        if (item is null)
            return NotFound(ApiResponse<ProfessionalDto>.Fail("Profesional no encontrado."));
        return Ok(ApiResponse<ProfessionalDto>.Ok(item));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<ProfessionalDto>>> Create(
        [FromBody] CreateProfessionalRequest request,
        CancellationToken ct)
    {
        if (!await CanManageProfessionalsAsync(permissionService, ct))
            return Forbidden<ProfessionalDto>("Sin permiso para alta de profesionales.");

        try
        {
            var created = await professionalService.CreateAsync(TenantId(), UserId(), request, ct);
            return Ok(ApiResponse<ProfessionalDto>.Ok(created));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<ProfessionalDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("cédula", StringComparison.OrdinalIgnoreCase))
        {
            return Conflict(ApiResponse<ProfessionalDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ProfessionalDto>.Fail(ex.Message));
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ProfessionalDto>>> Update(
        Guid id,
        [FromBody] UpdateProfessionalRequest request,
        CancellationToken ct)
    {
        if (!await CanManageProfessionalsAsync(permissionService, ct))
            return Forbidden<ProfessionalDto>("Sin permiso para editar profesionales.");

        try
        {
            var updated = await professionalService.UpdateAsync(TenantId(), id, UserId(), request, ct);
            if (updated is null)
                return NotFound(ApiResponse<ProfessionalDto>.Fail("Profesional no encontrado."));
            return Ok(ApiResponse<ProfessionalDto>.Ok(updated));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<ProfessionalDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("cédula", StringComparison.OrdinalIgnoreCase))
        {
            return Conflict(ApiResponse<ProfessionalDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ProfessionalDto>.Fail(ex.Message));
        }
    }

    /// <summary>Baja lógica. El verbo HTTP DELETE no ejecuta DELETE SQL.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<object?>>> SoftDelete(Guid id, CancellationToken ct)
    {
        if (!await CanManageProfessionalsAsync(permissionService, ct))
            return Forbidden<object?>("Sin permiso para baja de profesionales.");

        var ok = await professionalService.SoftDeleteAsync(TenantId(), id, UserId(), ct);
        if (!ok)
            return NotFound(ApiResponse<object?>.Fail("Profesional no encontrado."));
        return Ok(ApiResponse<object?>.Ok(null));
    }
}
