using System.Security.Claims;
using MediCore.Business.Tenant;
using MediCore.Common;
using MediCore.Models.Tenant;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/branches")]
public sealed class BranchesController(IBranchService branchService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<BranchDto>>>> List(
        [FromQuery] bool onlyActive = true,
        CancellationToken ct = default)
    {
        var tenantId = Guid.Parse(User.FindFirstValue(MediCoreClaims.TenantId)!);
        var branches = await branchService.ListAsync(tenantId, onlyActive, ct);
        return Ok(ApiResponse<IReadOnlyList<BranchDto>>.Ok(branches));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<BranchDto>>> Get(Guid id, CancellationToken ct)
    {
        var tenantId = Guid.Parse(User.FindFirstValue(MediCoreClaims.TenantId)!);
        var branch = await branchService.GetByIdAsync(tenantId, id, ct);
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
        var tenantId = Guid.Parse(User.FindFirstValue(MediCoreClaims.TenantId)!);
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        try
        {
            var branch = await branchService.UpsertAsync(tenantId, id, userId, request, ct);
            // Sucursal de otro tenant o inexistente tras el filtro: 404 (no 403 — no confirmar existencia).
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
}
