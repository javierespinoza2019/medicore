using System.Security.Claims;
using MediCore.Business.Auth;
using MediCore.Business.Role;
using MediCore.Common;
using MediCore.DataAccess.Auth;
using MediCore.Models.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(
    IAuthService authService,
    IAuthRepository authRepository,
    IBreakGlassService breakGlassService) : ControllerBase
{
    private const string RefreshCookieName = "mc_refresh";

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<LoginResultDto>>> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var session = await authService.LoginAsync(request, ct);
        if (session is null)
            return Unauthorized(ApiResponse<LoginResultDto>.Fail("Credenciales inválidas o cuenta bloqueada."));

        SetRefreshCookie(session.RefreshTokenPlain);
        return Ok(ApiResponse<LoginResultDto>.Ok(session.Login));
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<LoginResultDto>>> Refresh(CancellationToken ct)
    {
        var refresh = Request.Cookies[RefreshCookieName];
        var session = await authService.RefreshAsync(refresh ?? string.Empty, ct);
        if (session is null)
        {
            ClearRefreshCookie();
            return Unauthorized(ApiResponse<LoginResultDto>.Fail("Sesión expirada."));
        }

        SetRefreshCookie(session.RefreshTokenPlain);
        return Ok(ApiResponse<LoginResultDto>.Ok(session.Login));
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<object?>>> Logout(CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var tenantId = Guid.Parse(User.FindFirstValue(MediCoreClaims.TenantId)!);
        var refresh = Request.Cookies[RefreshCookieName];
        var cerrada = await authService.LogoutAsync(tenantId, userId, refresh, ct);

        // La cookie se limpia siempre: esta estación deja de tener sesión pase lo que pase.
        ClearRefreshCookie();

        if (!cerrada)
        {
            // Sin cookie válida no hay sesión identificable que revocar, y el logout cierra
            // sólo la sesión actual (decisión 73): responder 200 afirmaría un cierre que no
            // ocurrió y las otras estaciones no deben cerrarse por omisión.
            return BadRequest(ApiResponse.Fail(
                "No se recibió una sesión vigente que cerrar. La cookie de sesión se limpió en esta estación."));
        }

        return Ok(ApiResponse.Ok("Sesión de esta estación cerrada."));
    }

    /// <summary>#75 autogestión: cierra todas las sesiones del usuario autenticado.</summary>
    [HttpPost("sessions/revoke-all")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<object?>>> RevokeAllSessions(CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var tenantId = Guid.Parse(User.FindFirstValue(MediCoreClaims.TenantId)!);

        await authService.RevokeAllSessionsAsync(tenantId, userId, ct);
        ClearRefreshCookie();
        return Ok(ApiResponse.Ok("Sesiones cerradas en todos los dispositivos."));
    }

    /// <summary>#75 admin: revoca todas las sesiones de un usuario del tenant.</summary>
    [HttpPost("users/{userId:guid}/sessions/revoke-all")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<object?>>> RevokeAllSessionsForUser(Guid userId, CancellationToken ct)
    {
        if (!CanManageSessions())
            return Forbid();

        var tenantId = Guid.Parse(User.FindFirstValue(MediCoreClaims.TenantId)!);
        if (!await authRepository.UserExistsInTenantAsync(tenantId, userId, ct))
            return NotFound(ApiResponse.Fail("Usuario no encontrado en este tenant."));

        await authService.RevokeAllSessionsAsync(tenantId, userId, ct);
        return Ok(ApiResponse.Ok("Sesiones del usuario revocadas."));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<LoginResultDto>>> Me(CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var tenantId = Guid.Parse(User.FindFirstValue(MediCoreClaims.TenantId)!);
        var snapshot = await authService.GetSessionSnapshotAsync(tenantId, userId, ct);
        if (snapshot is null)
            return Unauthorized(ApiResponse<LoginResultDto>.Fail("Sesión no válida."));

        snapshot.AccessToken = string.Empty;
        return Ok(ApiResponse<LoginResultDto>.Ok(snapshot));
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<object?>>> ChangePassword(
        [FromBody] ChangePasswordRequest request,
        CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var tenantId = Guid.Parse(User.FindFirstValue(MediCoreClaims.TenantId)!);

        try
        {
            var ok = await authService.ChangePasswordAsync(tenantId, userId, request, ct);
            if (!ok)
                return BadRequest(ApiResponse.Fail("Contraseña actual incorrecta o cuenta no activa."));

            ClearRefreshCookie();
            return Ok(ApiResponse.Ok("Contraseña actualizada. Inicie sesión de nuevo."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse.Fail(ex.Message));
        }
    }

    /// <summary>Break-glass #23: acceso de emergencia con justificación auditable.</summary>
    [HttpPost("break-glass")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<LoginResultDto>>> StartBreakGlass(
        [FromBody] StartBreakGlassRequest request,
        CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var tenantId = Guid.Parse(User.FindFirstValue(MediCoreClaims.TenantId)!);
        var isSuperAdmin = string.Equals(
            User.FindFirstValue(MediCoreClaims.IsSuperAdmin),
            "true",
            StringComparison.OrdinalIgnoreCase);
        var roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();

        try
        {
            var result = await breakGlassService.StartAsync(
                tenantId, userId, isSuperAdmin, roles, request, ct);
            return Ok(ApiResponse<LoginResultDto>.Ok(result));
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<LoginResultDto>.Fail(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<LoginResultDto>.Fail(ex.Message));
        }
    }

    private void SetRefreshCookie(string token)
    {
        Response.Cookies.Append(RefreshCookieName, token, new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Path = "/api/auth",
            Expires = DateTimeOffset.UtcNow.AddDays(14)
        });
    }

    private void ClearRefreshCookie()
    {
        Response.Cookies.Delete(RefreshCookieName, new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Path = "/api/auth"
        });
    }

    private bool CanManageSessions()
    {
        var isSuperAdmin = string.Equals(
            User.FindFirstValue(MediCoreClaims.IsSuperAdmin),
            "true",
            StringComparison.OrdinalIgnoreCase);
        var roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value);
        return RoleAccess.CanManageMatrix(isSuperAdmin, roles);
    }
}
