namespace MediCore.Business.Role;

/// <summary>
/// Plantillas de permisos por rol (doc 06 §19). Fuente alineada con frontend/src/utils/permissions.ts.
/// Sin fila en BD → estos defaults; con fila → JSON del tenant reemplaza el mapa completo.
/// </summary>
public static class RolePermissionDefaults
{
    public static readonly IReadOnlyList<string> AllKeys =
    [
        "canCreatePatient",
        "canEditPatient",
        "canDeletePatient",
        "canCreateConsulta",
        "canEditConsulta",
        "canCreateReceta",
        "canDispensar",
        "canCobrar",
        "canCerrarCaja",
        "canAdminUsers",
        "canAdminMedicos",
        "canAdminCatalogos",
        "canVerAuditoria",
        "canEditTriage",
        "canAtenderUrgencia",
        "canVerEstadisticas",
        "canExportar",
    ];

    public static readonly IReadOnlyList<string> TemplateRoleCodes =
    [
        "admin",
        "medico",
        "recepcion",
        "enfermeria",
        "caja",
        "farmacia",
        "laboratorio",
        "directivo",
        "trabajo_social",
    ];

    private static readonly IReadOnlyDictionary<string, bool> Denied = AllKeys.ToDictionary(k => k, _ => false);

    private static readonly IReadOnlyDictionary<string, IReadOnlyDictionary<string, bool>> Templates =
        new Dictionary<string, IReadOnlyDictionary<string, bool>>(StringComparer.OrdinalIgnoreCase)
        {
            ["admin"] = Grant(
                canCreatePatient: true, canEditPatient: true, canDeletePatient: true,
                canCreateConsulta: true, canEditConsulta: true, canCreateReceta: true,
                canDispensar: true, canCobrar: true, canCerrarCaja: true,
                canAdminUsers: true, canAdminMedicos: true, canAdminCatalogos: true,
                canVerAuditoria: true, canEditTriage: true, canAtenderUrgencia: true,
                canVerEstadisticas: true, canExportar: true),
            ["medico"] = Grant(
                canCreatePatient: true, canEditPatient: true,
                canCreateConsulta: true, canEditConsulta: true, canCreateReceta: true,
                canEditTriage: true, canAtenderUrgencia: true, canExportar: true),
            ["recepcion"] = Grant(canCreatePatient: true, canEditPatient: true),
            ["enfermeria"] = Grant(canEditTriage: true),
            ["caja"] = Grant(canCobrar: true, canCerrarCaja: true, canExportar: true),
            ["farmacia"] = Grant(canDispensar: true),
            ["laboratorio"] = Denied,
            ["directivo"] = Grant(
                canAdminUsers: true, canAdminMedicos: true, canAdminCatalogos: true,
                canVerAuditoria: true, canVerEstadisticas: true, canExportar: true),
            ["trabajo_social"] = Grant(canEditPatient: true),
        };

    public static IReadOnlyDictionary<string, bool> ForRole(string roleCode)
    {
        if (Templates.TryGetValue(roleCode, out var map))
            return map;
        return Denied;
    }

    public static IReadOnlyDictionary<string, bool> FromGrantedList(IEnumerable<string> granted)
    {
        var set = new HashSet<string>(granted, StringComparer.OrdinalIgnoreCase);
        return AllKeys.ToDictionary(k => k, k => set.Contains(k));
    }

    public static IReadOnlyList<string> ToGrantedList(IReadOnlyDictionary<string, bool> permissions) =>
        permissions.Where(p => p.Value).Select(p => p.Key).OrderBy(k => k).ToList();

    private static IReadOnlyDictionary<string, bool> Grant(
        bool canCreatePatient = false,
        bool canEditPatient = false,
        bool canDeletePatient = false,
        bool canCreateConsulta = false,
        bool canEditConsulta = false,
        bool canCreateReceta = false,
        bool canDispensar = false,
        bool canCobrar = false,
        bool canCerrarCaja = false,
        bool canAdminUsers = false,
        bool canAdminMedicos = false,
        bool canAdminCatalogos = false,
        bool canVerAuditoria = false,
        bool canEditTriage = false,
        bool canAtenderUrgencia = false,
        bool canVerEstadisticas = false,
        bool canExportar = false) =>
        new Dictionary<string, bool>
        {
            ["canCreatePatient"] = canCreatePatient,
            ["canEditPatient"] = canEditPatient,
            ["canDeletePatient"] = canDeletePatient,
            ["canCreateConsulta"] = canCreateConsulta,
            ["canEditConsulta"] = canEditConsulta,
            ["canCreateReceta"] = canCreateReceta,
            ["canDispensar"] = canDispensar,
            ["canCobrar"] = canCobrar,
            ["canCerrarCaja"] = canCerrarCaja,
            ["canAdminUsers"] = canAdminUsers,
            ["canAdminMedicos"] = canAdminMedicos,
            ["canAdminCatalogos"] = canAdminCatalogos,
            ["canVerAuditoria"] = canVerAuditoria,
            ["canEditTriage"] = canEditTriage,
            ["canAtenderUrgencia"] = canAtenderUrgencia,
            ["canVerEstadisticas"] = canVerEstadisticas,
            ["canExportar"] = canExportar,
        };
}

/// <summary>Gestión de matriz: admin de tenant o SuperAdmin de plataforma.</summary>
public static class RoleAccess
{
    public const string AdminRole = "admin";
    public const string SuperAdminRole = "SuperAdmin";

    public static bool CanManageMatrix(bool isSuperAdmin, IEnumerable<string> roles)
    {
        if (isSuperAdmin) return true;
        foreach (var role in roles)
        {
            if (string.Equals(role, AdminRole, StringComparison.OrdinalIgnoreCase)) return true;
            if (string.Equals(role, SuperAdminRole, StringComparison.OrdinalIgnoreCase)) return true;
        }
        return false;
    }
}

public static class RolePermissionCatalog
{
    public static IReadOnlyList<(string Code, string Label, string Module)> Items =>
    [
        ("canCreatePatient", "Crear pacientes", "Pacientes"),
        ("canEditPatient", "Editar pacientes", "Pacientes"),
        ("canDeletePatient", "Eliminar pacientes", "Pacientes"),
        ("canCreateConsulta", "Crear consultas", "Consultas"),
        ("canEditConsulta", "Editar consultas", "Consultas"),
        ("canCreateReceta", "Crear recetas", "Recetas"),
        ("canDispensar", "Dispensar medicamentos", "Farmacia"),
        ("canCobrar", "Realizar cobros", "Caja"),
        ("canCerrarCaja", "Corte de caja", "Caja"),
        ("canAdminUsers", "Gestionar usuarios", "Administración"),
        ("canAdminMedicos", "Gestionar médicos", "Administración"),
        ("canAdminCatalogos", "Gestionar catálogos", "Administración"),
        ("canVerAuditoria", "Ver auditoría", "Seguridad"),
        ("canEditTriage", "Registrar triage", "Triage"),
        ("canAtenderUrgencia", "Atender urgencias", "Urgencias"),
        ("canVerEstadisticas", "Ver estadísticas", "Reportes"),
        ("canExportar", "Exportar datos", "Reportes"),
    ];
}
