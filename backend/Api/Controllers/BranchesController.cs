using MediCore.Business.Role;
using MediCore.Business.Tenant;
using MediCore.Common;
using MediCore.Models.Tenant;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/branches")]
public sealed class BranchesController(
    IBranchService branchService,
    ILogoBrandingService logoBranding,
    IEffectivePermissionService permissionService) : MediCoreControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<BranchDto>>>> List(
        [FromQuery] bool onlyActive = true,
        CancellationToken ct = default)
    {
        var branches = await branchService.ListAsync(TenantId(), onlyActive, ct);
        return Ok(ApiResponse<IReadOnlyList<BranchDto>>.Ok(branches));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<BranchDto>>> Get(Guid id, CancellationToken ct)
    {
        var branch = await branchService.GetByIdAsync(TenantId(), id, ct);
        if (branch is null)
            return NotFound(ApiResponse<BranchDto>.Fail("Sucursal no encontrada."));
        return Ok(ApiResponse<BranchDto>.Ok(branch));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<BranchDto>>> Upsert(
        Guid id,
        [FromBody] UpsertBranchRequest request,
        CancellationToken ct)
    {
        try
        {
            var branch = await branchService.UpsertAsync(TenantId(), id, UserId(), request, ct);
            if (branch is null)
                return NotFound(ApiResponse<BranchDto>.Fail("Sucursal no encontrada."));
            return Ok(ApiResponse<BranchDto>.Ok(branch));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<BranchDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<BranchDto>.Fail(ex.Message));
        }
    }

    /// <summary>
    /// Logo efectivo: variante de sucursal si existe; si no, logo del tenant.
    /// </summary>
    [HttpGet("{id:guid}/logo")]
    public async Task<IActionResult> GetLogo(Guid id, CancellationToken ct)
    {
        var branch = await branchService.GetByIdAsync(TenantId(), id, ct);
        if (branch is null)
            return NotFound();

        var file = await logoBranding.OpenEffectiveLogoAsync(TenantId(), id, ct);
        if (file is null)
            return NotFound();
        return File(file.Content, file.ContentType, file.FileName);
    }

    [HttpPut("{id:guid}/logo")]
    [RequestSizeLimit(2 * 1024 * 1024 + 64 * 1024)]
    public async Task<ActionResult<ApiResponse<BranchDto>>> UploadLogo(
        Guid id,
        IFormFile? file,
        CancellationToken ct)
    {
        if (!await CanManageEstablishmentAsync(permissionService, ct))
            return Forbidden<BranchDto>("Sin permiso para administrar el logo de la sucursal.");
        if (file is null || file.Length == 0)
            return BadRequest(ApiResponse<BranchDto>.Fail("Debe enviar un archivo de imagen."));

        try
        {
            await using var stream = file.OpenReadStream();
            var branch = await logoBranding.UploadBranchLogoAsync(
                TenantId(), id, UserId(), file.FileName, stream, file.Length, ct);
            return Ok(ApiResponse<BranchDto>.Ok(branch));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<BranchDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(ApiResponse<BranchDto>.Fail(ex.Message));
        }
    }

    [HttpDelete("{id:guid}/logo")]
    public async Task<ActionResult<ApiResponse<BranchDto>>> ClearLogo(Guid id, CancellationToken ct)
    {
        if (!await CanManageEstablishmentAsync(permissionService, ct))
            return Forbidden<BranchDto>("Sin permiso para administrar el logo de la sucursal.");

        try
        {
            var branch = await logoBranding.ClearBranchLogoAsync(TenantId(), id, UserId(), ct);
            return Ok(ApiResponse<BranchDto>.Ok(branch));
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(ApiResponse<BranchDto>.Fail(ex.Message));
        }
    }

    private async Task<bool> CanManageEstablishmentAsync(
        IEffectivePermissionService permissions,
        CancellationToken ct)
    {
        var perms = await PermissionsAsync(permissions, ct);
        return IsSuperAdmin()
            || EffectivePermissionAccess.CanManageCatalogs(IsSuperAdmin(), perms)
            || EffectivePermissionAccess.CanManageUsers(IsSuperAdmin(), perms);
    }
}
