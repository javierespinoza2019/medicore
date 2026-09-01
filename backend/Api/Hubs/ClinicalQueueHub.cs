using System.Security.Claims;
using MediCore.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace MediCore.Api.Hubs;

/// <summary>
/// Empuje en vivo de colas (M10 / WS-K). Autenticado; grupos por tenant+sucursal.
/// No es fuente de verdad: quien recibe vuelve a consultar la API.
/// </summary>
[Authorize]
public sealed class ClinicalQueueHub : Hub
{
    /// <summary>
    /// Une al grupo de la sucursal del <em>tenant del token</em>.
    /// Un token de otro tenant nunca entra al grupo ajeno aunque envíe el mismo branchId.
    /// </summary>
    public Task JoinBranch(Guid branchId)
    {
        if (branchId == Guid.Empty)
            throw new HubException("branchId requerido.");

        var tenantId = ResolveTenantId();
        var group = ClinicalQueueGroups.For(tenantId, branchId);
        return Groups.AddToGroupAsync(Context.ConnectionId, group);
    }

    public Task LeaveBranch(Guid branchId)
    {
        if (branchId == Guid.Empty)
            throw new HubException("branchId requerido.");

        var tenantId = ResolveTenantId();
        var group = ClinicalQueueGroups.For(tenantId, branchId);
        return Groups.RemoveFromGroupAsync(Context.ConnectionId, group);
    }

    private Guid ResolveTenantId()
    {
        var raw = Context.User?.FindFirstValue(MediCoreClaims.TenantId);
        if (!Guid.TryParse(raw, out var tenantId) || tenantId == Guid.Empty)
            throw new HubException("Token sin tenant_id válido.");
        return tenantId;
    }
}
