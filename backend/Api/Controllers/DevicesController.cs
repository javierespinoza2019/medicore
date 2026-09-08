using MediCore.Business.Device;
using MediCore.Business.Role;
using MediCore.Common;
using MediCore.Models.Device;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/devices")]
public sealed class DevicesController(
    IDeviceService deviceService,
    IEffectivePermissionService permissionService) : MediCoreControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<ApiResponse<DeviceDto>>> Register(
        [FromBody] RegisterDeviceRequest request,
        CancellationToken ct)
    {
        try
        {
            var device = await deviceService.RegisterPendingAsync(TenantId(), UserId(), request, ct);
            return Ok(ApiResponse<DeviceDto>.Ok(device!));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<DeviceDto>.Fail(ex.Message));
        }
    }

    [HttpGet("me/{devicePublicId}")]
    public async Task<ActionResult<ApiResponse<DeviceDto>>> GetMine(string devicePublicId, CancellationToken ct)
    {
        var device = await deviceService.GetAsync(TenantId(), devicePublicId, ct);
        if (device is null)
            return NotFound(ApiResponse<DeviceDto>.Fail("Dispositivo no encontrado."));
        return Ok(ApiResponse<DeviceDto>.Ok(device));
    }

    /// <summary>Compatibilidad con ruta previa GET /api/devices/{id}.</summary>
    [HttpGet("{devicePublicId}")]
    public Task<ActionResult<ApiResponse<DeviceDto>>> Get(string devicePublicId, CancellationToken ct) =>
        GetMine(devicePublicId, ct);

    [HttpGet]
    public async Task<ActionResult<ApiResponse<DeviceDto[]>>> List(
        [FromQuery] bool onlyPending = false,
        CancellationToken ct = default)
    {
        if (!await CanManageUsersAsync(permissionService, ct))
            return Forbidden<DeviceDto[]>("Sin permiso para administrar dispositivos.");

        var list = await deviceService.ListAsync(TenantId(), onlyPending, ct);
        return Ok(ApiResponse<DeviceDto[]>.Ok(list.ToArray()));
    }

    [HttpPost("{devicePublicId}/approve")]
    public async Task<ActionResult<ApiResponse<DeviceDto>>> Approve(
        string devicePublicId,
        [FromBody] ApproveDeviceRequest? request,
        CancellationToken ct)
    {
        if (!await CanManageUsersAsync(permissionService, ct))
            return Forbidden<DeviceDto>("Sin permiso para aprobar dispositivos.");

        try
        {
            var device = await deviceService.ApproveAsync(
                TenantId(),
                devicePublicId,
                request?.AllowsOfflineQueue ?? true,
                ct);
            if (device is null)
                return NotFound(ApiResponse<DeviceDto>.Fail("Dispositivo no encontrado."));
            return Ok(ApiResponse<DeviceDto>.Ok(device));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<DeviceDto>.Fail(ex.Message));
        }
    }
}
