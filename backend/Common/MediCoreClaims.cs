namespace MediCore.Common;

/// <summary>Nombres de claims JWT. TenantId siempre desde claims, nunca solo del body.</summary>
public static class MediCoreClaims
{
    public const string TenantId = "tenant_id";
    public const string BranchIds = "branch_ids";
    public const string RoleCodes = "role_codes";
    public const string IsSuperAdmin = "is_super_admin";

    /// <summary>
    /// Profesional sanitario ligado al usuario. El claim **no se emite** cuando el usuario
    /// no tiene profesional asociado: su ausencia es el dato, y un filtro que acote por
    /// profesional debe fallar cerrado en ese caso, no dejar pasar todo.
    /// </summary>
    public const string HealthcareProfessionalId = "healthcare_professional_id";
}

public static class UtcClock
{
    public static DateTimeOffset Now => DateTimeOffset.UtcNow;
}
