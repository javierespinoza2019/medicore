using System.Security.Claims;
using MediCore.Business.Tenant;
using MediCore.Common;
using MediCore.Models.Tenant;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/tenant")]
public sealed class TenantController(ITenantService tenantService) : ControllerBase
{
    [HttpGet("profile")]
    public async Task<ActionResult<ApiResponse<TenantProfileDto>>> GetProfile(CancellationToken ct)
    {
        var tenantId = Guid.Parse(User.FindFirstValue(MediCoreClaims.TenantId)!);
        var profile = await tenantService.GetProfileAsync(tenantId, ct);
        if (profile is null)
            return NotFound(ApiResponse<TenantProfileDto>.Fail("Perfil de organización no encontrado."));
        return Ok(ApiResponse<TenantProfileDto>.Ok(profile));
    }

    [HttpPut("profile")]
    public async Task<ActionResult<ApiResponse<TenantProfileDto>>> UpdateProfile(
        [FromBody] UpdateTenantProfileRequest request,
        CancellationToken ct)
    {
        var tenantId = Guid.Parse(User.FindFirstValue(MediCoreClaims.TenantId)!);
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        try
        {
            var profile = await tenantService.UpdateProfileAsync(tenantId, userId, request, ct);
            if (profile is null)
                return NotFound(ApiResponse<TenantProfileDto>.Fail("Perfil de organización no encontrado."));
            return Ok(ApiResponse<TenantProfileDto>.Ok(profile));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<TenantProfileDto>.Fail(ex.Message));
        }
    }
}
