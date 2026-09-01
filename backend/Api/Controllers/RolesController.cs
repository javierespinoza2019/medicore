using System.Security.Claims;
using MediCore.Business.Role;
using MediCore.Common;
using MediCore.Models.Role;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/roles")]
public sealed class RolesController(IRoleService roleService) : ControllerBase
{
    [HttpGet("permission-matrix")]
    public async Task<ActionResult<ApiResponse<RolePermissionMatrixDto>>> GetPermissionMatrix(CancellationToken ct)
    {
        if (!CanManage()) return Forbid();

        var tenantId = Guid.Parse(User.FindFirstValue(MediCoreClaims.TenantId)!);
        var matrix = await roleService.GetPermissionMatrixAsync(tenantId, ct);
        return Ok(ApiResponse<RolePermissionMatrixDto>.Ok(matrix));
    }

    [HttpPut("{roleCode}/permissions")]
    public async Task<ActionResult<ApiResponse<RolePermissionMatrixDto>>> SavePermissions(
        string roleCode,
        [FromBody] SaveRolePermissionsRequest request,
        CancellationToken ct)
    {
        if (!CanManage()) return Forbid();

        var tenantId = Guid.Parse(User.FindFirstValue(MediCoreClaims.TenantId)!);
        var actorUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        try
        {
            var matrix = await roleService.SaveRolePermissionsAsync(tenantId, roleCode, actorUserId, request, ct);
            return Ok(ApiResponse<RolePermissionMatrixDto>.Ok(matrix));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<RolePermissionMatrixDto>.Fail(ex.Message));
        }
    }

    private bool CanManage()
    {
        var isSuperAdmin = string.Equals(
            User.FindFirstValue(MediCoreClaims.IsSuperAdmin),
            "true",
            StringComparison.OrdinalIgnoreCase);
        var roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value);
        return RoleAccess.CanManageMatrix(isSuperAdmin, roles);
    }
}
