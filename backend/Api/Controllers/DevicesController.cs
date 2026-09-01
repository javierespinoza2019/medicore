using System.Security.Claims;
using MediCore.Business.Device;
using MediCore.Common;
using MediCore.Models.Device;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/devices")]
public sealed class DevicesController(IDeviceService deviceService) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<ApiResponse<DeviceDto>>> Register(
        [FromBody] RegisterDeviceRequest request,
        CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var tenantId = Guid.Parse(User.FindFirstValue(MediCoreClaims.TenantId)!);

        try
        {
            var device = await deviceService.RegisterPendingAsync(tenantId, userId, request, ct);
            return Ok(ApiResponse<DeviceDto>.Ok(device!));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<DeviceDto>.Fail(ex.Message));
        }
    }

    [HttpGet("{devicePublicId}")]
    public async Task<ActionResult<ApiResponse<DeviceDto>>> Get(string devicePublicId, CancellationToken ct)
    {
        var tenantId = Guid.Parse(User.FindFirstValue(MediCoreClaims.TenantId)!);
        var device = await deviceService.GetAsync(tenantId, devicePublicId, ct);
        if (device is null)
            return NotFound(ApiResponse<DeviceDto>.Fail("Dispositivo no encontrado."));
        return Ok(ApiResponse<DeviceDto>.Ok(device));
    }
}
