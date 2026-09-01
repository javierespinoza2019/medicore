using System.Security.Claims;
using MediCore.Business.Role;
using MediCore.Common;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

/// <summary>
/// Helpers comunes de controllers autenticados + carga de permisos efectivos (matriz + break-glass).
/// </summary>
public abstract class MediCoreControllerBase : ControllerBase
{
    private IReadOnlyDictionary<string, bool>? _permissions;

    protected async Task<IReadOnlyDictionary<string, bool>> PermissionsAsync(
        IEffectivePermissionService permissionService,
        CancellationToken ct)
    {
        if (_permissions is null)
        {
            _permissions = await permissionService.GetForUserAsync(
                TenantId(), UserId(), IsSuperAdmin(), Roles().ToList(), ct);
        }
        return _permissions;
    }

    protected Guid TenantId() => Guid.Parse(User.FindFirstValue(MediCoreClaims.TenantId)!);

    protected Guid UserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    protected Guid? ProfessionalId()
    {
        var raw = User.FindFirstValue(MediCoreClaims.HealthcareProfessionalId);
        return Guid.TryParse(raw, out var id) ? id : null;
    }

    protected string DisplayName() =>
        User.FindFirstValue("name")
        ?? User.FindFirstValue(ClaimTypes.Name)
        ?? User.Identity?.Name
        ?? "usuario";

    protected bool IsSuperAdmin() =>
        string.Equals(User.FindFirstValue(MediCoreClaims.IsSuperAdmin), "true", StringComparison.OrdinalIgnoreCase);

    protected IEnumerable<string> Roles() => User.FindAll(ClaimTypes.Role).Select(c => c.Value);

    protected async Task<bool> CanAccessClinicalAsync(
        IEffectivePermissionService permissionService,
        CancellationToken ct)
    {
        var perms = await PermissionsAsync(permissionService, ct);
        return EffectivePermissionAccess.CanAccessClinicalRecord(IsSuperAdmin(), perms);
    }

    protected async Task<bool> CanAccessPrescriptionsAsync(
        IEffectivePermissionService permissionService,
        CancellationToken ct)
    {
        var perms = await PermissionsAsync(permissionService, ct);
        return EffectivePermissionAccess.CanAccessPrescriptions(IsSuperAdmin(), perms);
    }

    protected async Task<bool> CanQueryAuditAsync(
        IEffectivePermissionService permissionService,
        CancellationToken ct)
    {
        var perms = await PermissionsAsync(permissionService, ct);
        return EffectivePermissionAccess.CanQueryAudit(IsSuperAdmin(), perms);
    }

    protected async Task<bool> CanReadProfessionalsAsync(
        IEffectivePermissionService permissionService,
        CancellationToken ct)
    {
        var perms = await PermissionsAsync(permissionService, ct);
        return EffectivePermissionAccess.CanReadProfessionals(IsSuperAdmin(), perms);
    }

    protected async Task<bool> CanManageProfessionalsAsync(
        IEffectivePermissionService permissionService,
        CancellationToken ct)
    {
        var perms = await PermissionsAsync(permissionService, ct);
        return EffectivePermissionAccess.CanManageProfessionals(IsSuperAdmin(), perms);
    }

    protected async Task<bool> CanManageCatalogsAsync(
        IEffectivePermissionService permissionService,
        CancellationToken ct)
    {
        var perms = await PermissionsAsync(permissionService, ct);
        return EffectivePermissionAccess.CanManageCatalogs(IsSuperAdmin(), perms);
    }

    protected async Task<bool> CanAccessPatientsAsync(
        IEffectivePermissionService permissionService,
        CancellationToken ct)
    {
        var perms = await PermissionsAsync(permissionService, ct);
        return EffectivePermissionAccess.CanAccessPatients(IsSuperAdmin(), perms);
    }

    protected async Task<bool> CanViewSubjectMarksAsync(
        IEffectivePermissionService permissionService,
        CancellationToken ct)
    {
        var perms = await PermissionsAsync(permissionService, ct);
        return EffectivePermissionAccess.CanViewSubjectMarks(IsSuperAdmin(), perms);
    }

    protected async Task<bool> CanVerifyOrRectifySubjectAsync(
        IEffectivePermissionService permissionService,
        CancellationToken ct)
    {
        var perms = await PermissionsAsync(permissionService, ct);
        return EffectivePermissionAccess.CanVerifyOrRectifySubject(IsSuperAdmin(), perms);
    }

    protected async Task<bool> CanSearchSubjectByDescriptionAsync(
        IEffectivePermissionService permissionService,
        CancellationToken ct)
    {
        var perms = await PermissionsAsync(permissionService, ct);
        return EffectivePermissionAccess.CanSearchSubjectByDescription(IsSuperAdmin(), perms);
    }

    protected async Task<bool> CanAccessTriageAsync(
        IEffectivePermissionService permissionService,
        CancellationToken ct)
    {
        var perms = await PermissionsAsync(permissionService, ct);
        return EffectivePermissionAccess.CanAccessTriage(IsSuperAdmin(), perms)
            || EffectivePermissionAccess.CanAccessUrgencies(IsSuperAdmin(), perms);
    }

    protected async Task<bool> CanReadTriageAsync(
        IEffectivePermissionService permissionService,
        CancellationToken ct)
    {
        var perms = await PermissionsAsync(permissionService, ct);
        return EffectivePermissionAccess.CanReadTriage(IsSuperAdmin(), perms);
    }

    protected static ActionResult<ApiResponse<T>> Forbidden<T>(string message) =>
        new ObjectResult(ApiResponse<T>.Fail(message)) { StatusCode = StatusCodes.Status403Forbidden };
}
