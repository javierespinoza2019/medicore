using MediCore.Business.Role;

namespace MediCore.Business.Auth;

/// <summary>Reglas break-glass (#23, doc 06).</summary>
public static class BreakGlassDomain
{
    public const int MinJustificationLength = 15;
    public const int MaxPermissionsPerGrant = 5;
    public const int DefaultDurationMinutes = 60;

    /// <summary>Roles operativos que pueden solicitar break-glass (no admin/directivo por omisión).</summary>
    public static readonly IReadOnlySet<string> EligibleRoleCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "medico", "enfermeria", "recepcion", "farmacia", "caja", "laboratorio", "trabajo_social"
    };

    /// <summary>Permisos que break-glass puede conceder; excluye administración y auditoría.</summary>
    public static readonly IReadOnlySet<string> GrantablePermissionKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "canCreatePatient", "canEditPatient", "canCreateConsulta", "canEditConsulta",
        "canCreateReceta", "canDispensar", "canCobrar", "canEditTriage", "canAtenderUrgencia",
        "canExportar"
    };

    public static bool CanRequest(bool isSuperAdmin, IEnumerable<string> roles)
    {
        if (isSuperAdmin) return false;
        return roles.Any(r => EligibleRoleCodes.Contains(r));
    }

    public static IReadOnlyList<string> ValidateRequest(
        string justification,
        IReadOnlyList<string> permissionKeys,
        IReadOnlyDictionary<string, bool> currentPermissions)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(justification) || justification.Trim().Length < MinJustificationLength)
            errors.Add($"La justificación debe tener al menos {MinJustificationLength} caracteres.");

        if (permissionKeys is null || permissionKeys.Count == 0)
            errors.Add("Debe indicar al menos un permiso.");
        else if (permissionKeys.Count > MaxPermissionsPerGrant)
            errors.Add($"Máximo {MaxPermissionsPerGrant} permisos por concesión.");

        foreach (var key in permissionKeys ?? [])
        {
            if (!RolePermissionDefaults.AllKeys.Contains(key, StringComparer.OrdinalIgnoreCase))
                errors.Add($"Permiso no válido: {key}");
            else if (!GrantablePermissionKeys.Contains(key))
                errors.Add($"El permiso {key} no puede concederse por break-glass.");
            else if (currentPermissions.TryGetValue(key, out var has) && has)
                errors.Add($"Ya tiene el permiso {key}; no requiere break-glass.");
        }

        return errors;
    }

    public static IReadOnlyDictionary<string, bool> MergeBreakGlass(
        IReadOnlyDictionary<string, bool> basePermissions,
        IEnumerable<string> grantedKeys)
    {
        var merged = new Dictionary<string, bool>(basePermissions, StringComparer.OrdinalIgnoreCase);
        foreach (var key in grantedKeys)
        {
            if (RolePermissionDefaults.AllKeys.Contains(key, StringComparer.OrdinalIgnoreCase))
                merged[key] = true;
        }
        return merged;
    }
}
