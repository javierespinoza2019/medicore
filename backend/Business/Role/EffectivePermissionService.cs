using MediCore.Business.Auth;
using MediCore.DataAccess.Auth;
using MediCore.Models.Auth;

namespace MediCore.Business.Role;

public interface IEffectivePermissionService
{
    Task<IReadOnlyDictionary<string, bool>> GetForUserAsync(
        Guid tenantId,
        Guid userId,
        bool isSuperAdmin,
        IReadOnlyList<string> roleCodes,
        CancellationToken ct);

    Task<IReadOnlyList<BreakGlassGrantDto>> GetActiveBreakGlassGrantsAsync(
        Guid tenantId,
        Guid userId,
        CancellationToken ct);
}

public sealed class EffectivePermissionService(
    IRoleService roleService,
    IBreakGlassRepository breakGlassRepository) : IEffectivePermissionService
{
    public async Task<IReadOnlyDictionary<string, bool>> GetForUserAsync(
        Guid tenantId,
        Guid userId,
        bool isSuperAdmin,
        IReadOnlyList<string> roleCodes,
        CancellationToken ct)
    {
        var basePermissions = await roleService.GetEffectivePermissionsAsync(
            tenantId, isSuperAdmin, roleCodes, ct);
        var active = await breakGlassRepository.ListActiveForUserAsync(tenantId, userId, ct);
        return BreakGlassService.MergeAllPermissions(basePermissions, active);
    }

    public async Task<IReadOnlyList<BreakGlassGrantDto>> GetActiveBreakGlassGrantsAsync(
        Guid tenantId,
        Guid userId,
        CancellationToken ct)
    {
        var active = await breakGlassRepository.ListActiveForUserAsync(tenantId, userId, ct);
        return BreakGlassRepository.ToDtos(active);
    }
}

/// <summary>
/// AuthZ por permisos efectivos (matriz tenant + break-glass). Fuente alineada con frontend PermissionKey.
/// </summary>
public static class EffectivePermissionAccess
{
    public static bool Has(IReadOnlyDictionary<string, bool> permissions, string key) =>
        permissions.TryGetValue(key, out var granted) && granted;

    public static bool HasAny(IReadOnlyDictionary<string, bool> permissions, params string[] keys) =>
        keys.Any(k => Has(permissions, k));

    public static bool CanAccessClinicalRecord(bool isSuperAdmin, IReadOnlyDictionary<string, bool> permissions) =>
        isSuperAdmin || HasAny(permissions, "canCreateConsulta", "canEditConsulta");

    public static bool CanAccessPrescriptions(bool isSuperAdmin, IReadOnlyDictionary<string, bool> permissions) =>
        isSuperAdmin || HasAny(permissions, "canCreateReceta", "canDispensar");

    public static bool CanAccessTriage(bool isSuperAdmin, IReadOnlyDictionary<string, bool> permissions) =>
        isSuperAdmin || Has(permissions, "canEditTriage");

    public static bool CanAccessUrgencies(bool isSuperAdmin, IReadOnlyDictionary<string, bool> permissions) =>
        isSuperAdmin || Has(permissions, "canAtenderUrgencia");

    public static bool CanAccessPatients(bool isSuperAdmin, IReadOnlyDictionary<string, bool> permissions) =>
        isSuperAdmin || HasAny(permissions, "canCreatePatient", "canEditPatient");

    public static bool CanManageProfessionals(bool isSuperAdmin, IReadOnlyDictionary<string, bool> permissions) =>
        isSuperAdmin || Has(permissions, "canAdminMedicos");

    public static bool CanManageCatalogs(bool isSuperAdmin, IReadOnlyDictionary<string, bool> permissions) =>
        isSuperAdmin || Has(permissions, "canAdminCatalogos");

    public static bool CanManageUsers(bool isSuperAdmin, IReadOnlyDictionary<string, bool> permissions) =>
        isSuperAdmin || Has(permissions, "canAdminUsers");

    public static bool CanQueryAudit(bool isSuperAdmin, IReadOnlyDictionary<string, bool> permissions) =>
        isSuperAdmin || Has(permissions, "canVerAuditoria");

    public static bool CanAccessCash(bool isSuperAdmin, IReadOnlyDictionary<string, bool> permissions) =>
        isSuperAdmin || HasAny(permissions, "canCobrar", "canCerrarCaja");

    public static bool CanViewStatistics(bool isSuperAdmin, IReadOnlyDictionary<string, bool> permissions) =>
        isSuperAdmin || Has(permissions, "canVerEstadisticas");

    public static bool CanReadProfessionals(bool isSuperAdmin, IReadOnlyDictionary<string, bool> permissions) =>
        isSuperAdmin || HasAny(permissions,
            "canAdminMedicos", "canCreatePatient", "canEditPatient",
            "canCreateConsulta", "canEditConsulta");

    public static bool CanViewSubjectMarks(bool isSuperAdmin, IReadOnlyDictionary<string, bool> permissions) =>
        isSuperAdmin || HasAny(permissions,
            "canCreateConsulta", "canEditConsulta", "canEditTriage",
            "canAtenderUrgencia", "canAdminMedicos");

    public static bool CanVerifyOrRectifySubject(bool isSuperAdmin, IReadOnlyDictionary<string, bool> permissions) =>
        isSuperAdmin || HasAny(permissions, "canDeletePatient", "canAdminUsers");

    /// <summary>
    /// SC-23 / SubjectAccess: org = admin (canAdminUsers); sucursal = recepción/trabajo_social
    /// (canEditPatient sin permisos de consulta clínica). Médico NO (tenía fuga vía canEditPatient).
    /// </summary>
    public static bool CanSearchSubjectByDescription(bool isSuperAdmin, IReadOnlyDictionary<string, bool> permissions)
    {
        if (isSuperAdmin || Has(permissions, "canAdminUsers"))
            return true;

        // Plantillas recepción / trabajo_social: editan paciente sin crear/editar consulta.
        return Has(permissions, "canEditPatient")
            && !HasAny(permissions, "canCreateConsulta", "canEditConsulta");
    }

    public static bool CanReadTriage(bool isSuperAdmin, IReadOnlyDictionary<string, bool> permissions) =>
        isSuperAdmin || HasAny(permissions,
            "canEditTriage", "canAtenderUrgencia", "canCreateConsulta", "canEditConsulta",
            "canCreatePatient", "canEditPatient");
}
