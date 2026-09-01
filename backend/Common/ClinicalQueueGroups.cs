namespace MediCore.Common;

/// <summary>
/// Grupos SignalR de cola clínica (M10). Siempre <c>TenantId + BranchId</c>;
/// nunca broadcast global. El TenantId del grupo sale de claims JWT, no del cliente.
/// </summary>
public static class ClinicalQueueGroups
{
    public static string For(Guid tenantId, Guid branchId)
    {
        if (tenantId == Guid.Empty)
            throw new ArgumentException("TenantId requerido.", nameof(tenantId));
        if (branchId == Guid.Empty)
            throw new ArgumentException("BranchId requerido.", nameof(branchId));

        return $"tenant:{tenantId:D}:branch:{branchId:D}";
    }
}
