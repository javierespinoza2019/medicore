using MediCore.Business.Role;
using MediCore.Business.Tenant;
using MediCore.Common;
using MediCore.Models.Tenant;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/tenant")]
public sealed class TenantController(
    ITenantService tenantService,
    ILogoBrandingService logoBranding,
    IEffectivePermissionService permissionService) : MediCoreControllerBase
{
    [HttpGet("profile")]
    public async Task<ActionResult<ApiResponse<TenantProfileDto>>> GetProfile(CancellationToken ct)
    {
        var profile = await tenantService.GetProfileAsync(TenantId(), ct);
        if (profile is null)
            return NotFound(ApiResponse<TenantProfileDto>.Fail("Perfil de organización no encontrado."));
        return Ok(ApiResponse<TenantProfileDto>.Ok(profile));
    }

    [HttpPut("profile")]
    public async Task<ActionResult<ApiResponse<TenantProfileDto>>> UpdateProfile(
        [FromBody] UpdateTenantProfileRequest request,
        CancellationToken ct)
    {
        try
        {
            var profile = await tenantService.UpdateProfileAsync(TenantId(), UserId(), request, ct);
            if (profile is null)
                return NotFound(ApiResponse<TenantProfileDto>.Fail("Perfil de organización no encontrado."));
            return Ok(ApiResponse<TenantProfileDto>.Ok(profile));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<TenantProfileDto>.Fail(ex.Message));
        }
    }

    [HttpGet("logo")]
    public async Task<IActionResult> GetLogo(CancellationToken ct)
    {
        var file = await logoBranding.OpenTenantLogoAsync(TenantId(), ct);
        if (file is null)
            return NotFound();
        return File(file.Content, file.ContentType, file.FileName);
    }

    [HttpPut("logo")]
    [RequestSizeLimit(2 * 1024 * 1024 + 64 * 1024)]
    public async Task<ActionResult<ApiResponse<TenantProfileDto>>> UploadLogo(
        IFormFile? file,
        CancellationToken ct)
    {
        if (!await CanManageEstablishmentAsync(permissionService, ct))
            return Forbidden<TenantProfileDto>("Sin permiso para administrar el logo de la organización.");
        if (file is null || file.Length == 0)
            return BadRequest(ApiResponse<TenantProfileDto>.Fail("Debe enviar un archivo de imagen."));

        try
        {
            await using var stream = file.OpenReadStream();
            var profile = await logoBranding.UploadTenantLogoAsync(
                TenantId(), UserId(), file.FileName, stream, file.Length, ct);
            return Ok(ApiResponse<TenantProfileDto>.Ok(profile));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<TenantProfileDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(ApiResponse<TenantProfileDto>.Fail(ex.Message));
        }
    }

    [HttpDelete("logo")]
    public async Task<ActionResult<ApiResponse<TenantProfileDto>>> ClearLogo(CancellationToken ct)
    {
        if (!await CanManageEstablishmentAsync(permissionService, ct))
            return Forbidden<TenantProfileDto>("Sin permiso para administrar el logo de la organización.");

        try
        {
            var profile = await logoBranding.ClearTenantLogoAsync(TenantId(), UserId(), ct);
            return Ok(ApiResponse<TenantProfileDto>.Ok(profile));
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(ApiResponse<TenantProfileDto>.Fail(ex.Message));
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
