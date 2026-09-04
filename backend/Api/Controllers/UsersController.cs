using MediCore.Business.Role;
using MediCore.Business.UserAdmin;
using MediCore.Common;
using MediCore.Models.UserAdmin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

/// <summary>
/// Usuarios del tenant. TenantId desde claims. Escritura: canAdminUsers.
/// DELETE HTTP = baja lógica + revocación de sesiones (#75).
/// </summary>
[ApiController]
[Authorize]
[Route("api/users")]
public sealed class UsersController(
    ITenantUserService userService,
    IEffectivePermissionService permissionService) : MediCoreControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<TenantUserDto[]>>> List(
        [FromQuery] bool onlyActive = false,
        [FromQuery] string? search = null,
        CancellationToken ct = default)
    {
        if (!await CanManageUsersAsync(permissionService, ct))
            return Forbidden<TenantUserDto[]>("Sin permiso para gestionar usuarios.");

        var list = await userService.ListAsync(TenantId(), onlyActive, search, ct);
        return Ok(ApiResponse<TenantUserDto[]>.Ok(list.ToArray()));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<TenantUserDto>>> Get(Guid id, CancellationToken ct)
    {
        if (!await CanManageUsersAsync(permissionService, ct))
            return Forbidden<TenantUserDto>("Sin permiso para gestionar usuarios.");

        var item = await userService.GetByIdAsync(TenantId(), id, ct);
        if (item is null)
            return NotFound(ApiResponse<TenantUserDto>.Fail("Usuario no encontrado."));
        return Ok(ApiResponse<TenantUserDto>.Ok(item));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<TenantUserDto>>> Create(
        [FromBody] CreateTenantUserRequest request,
        CancellationToken ct)
    {
        if (!await CanManageUsersAsync(permissionService, ct))
            return Forbidden<TenantUserDto>("Sin permiso para alta de usuarios.");

        try
        {
            var created = await userService.CreateAsync(TenantId(), UserId(), request, ct);
            return Ok(ApiResponse<TenantUserDto>.Ok(created));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<TenantUserDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("Ya existe", StringComparison.OrdinalIgnoreCase))
        {
            return Conflict(ApiResponse<TenantUserDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<TenantUserDto>.Fail(ex.Message));
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<TenantUserDto>>> Update(
        Guid id,
        [FromBody] UpdateTenantUserRequest request,
        CancellationToken ct)
    {
        if (!await CanManageUsersAsync(permissionService, ct))
            return Forbidden<TenantUserDto>("Sin permiso para editar usuarios.");

        try
        {
            var updated = await userService.UpdateAsync(TenantId(), id, UserId(), request, ct);
            if (updated is null)
                return NotFound(ApiResponse<TenantUserDto>.Fail("Usuario no encontrado."));
            return Ok(ApiResponse<TenantUserDto>.Ok(updated));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<TenantUserDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<TenantUserDto>.Fail(ex.Message));
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<object?>>> SoftDelete(Guid id, CancellationToken ct)
    {
        if (!await CanManageUsersAsync(permissionService, ct))
            return Forbidden<object?>("Sin permiso para baja de usuarios.");

        try
        {
            await userService.SoftDeleteAsync(TenantId(), id, UserId(), ct);
            return Ok(ApiResponse<object?>.Ok(null));
        }
        catch (KeyNotFoundException)
        {
            return NotFound(ApiResponse<object?>.Fail("Usuario no encontrado."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object?>.Fail(ex.Message));
        }
    }

    [HttpPost("{id:guid}/password")]
    public async Task<ActionResult<ApiResponse<object?>>> SetPassword(
        Guid id,
        [FromBody] SetTenantUserPasswordRequest request,
        CancellationToken ct)
    {
        if (!await CanManageUsersAsync(permissionService, ct))
            return Forbidden<object?>("Sin permiso para restablecer contraseña.");

        try
        {
            await userService.SetPasswordAsync(TenantId(), id, UserId(), request, ct);
            return Ok(ApiResponse<object?>.Ok(null));
        }
        catch (KeyNotFoundException)
        {
            return NotFound(ApiResponse<object?>.Fail("Usuario no encontrado."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object?>.Fail(ex.Message));
        }
    }
}
