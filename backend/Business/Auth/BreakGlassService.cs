using System.Text.Json;
using MediCore.Business.Audit;
using MediCore.Business.Role;
using MediCore.DataAccess.Auth;
using MediCore.DataAccess.Outbox;
using MediCore.Models.Audit;
using MediCore.Models.Auth;

namespace MediCore.Business.Auth;

public interface IBreakGlassService
{
    Task<LoginResultDto> StartAsync(
        Guid tenantId,
        Guid userId,
        bool isSuperAdmin,
        IReadOnlyList<string> roles,
        StartBreakGlassRequest request,
        CancellationToken ct);
}

public sealed class BreakGlassService(
    IBreakGlassRepository breakGlassRepository,
    IRoleService roleService,
    IAuditService auditService,
    IOutboxRepository outboxRepository) : IBreakGlassService
{
    public async Task<LoginResultDto> StartAsync(
        Guid tenantId,
        Guid userId,
        bool isSuperAdmin,
        IReadOnlyList<string> roles,
        StartBreakGlassRequest request,
        CancellationToken ct)
    {
        if (!BreakGlassDomain.CanRequest(isSuperAdmin, roles))
            throw new InvalidOperationException("Su rol no puede solicitar acceso de emergencia.");

        var basePermissions = await roleService.GetEffectivePermissionsAsync(tenantId, isSuperAdmin, roles, ct);
        var errors = BreakGlassDomain.ValidateRequest(request.Justification, request.PermissionKeys, basePermissions);
        if (errors.Count > 0)
            throw new ArgumentException(string.Join(' ', errors));

        var keys = request.PermissionKeys
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        var grantedJson = JsonSerializer.Serialize(keys);

        var grant = await breakGlassRepository.StartGrantAsync(
            tenantId, userId, request.Justification.Trim(), grantedJson, ct);

        await auditService.AppendAsync(new AppendAuditEventCommand
        {
            AuditEventId = grant.GrantId,
            TenantId = tenantId,
            ActorUserId = userId,
            EventType = AuditEventTypes.BreakGlassStarted,
            EntityName = "BreakGlassGrant",
            EntityId = grant.GrantId,
            DetailJson = JsonSerializer.Serialize(new
            {
                justification = request.Justification.Trim(),
                permissionKeys = keys,
                expiresAtUtc = grant.ExpiresAtUtc
            }),
            OccurredAtUtc = grant.StartedAtUtc
        }, ct);

        await outboxRepository.EnqueueAsync(
            tenantId,
            OutboxChannels.SecurityAlert,
            JsonSerializer.Serialize(new
            {
                alertType = "break_glass.started",
                grantId = grant.GrantId,
                userId,
                permissionKeys = keys,
                justification = request.Justification.Trim(),
                expiresAtUtc = grant.ExpiresAtUtc,
                notifyRoles = new[] { "admin" }
            }),
            ct);

        var active = await breakGlassRepository.ListActiveForUserAsync(tenantId, userId, ct);
        var merged = MergeAllPermissions(basePermissions, active);

        return new LoginResultDto
        {
            UserId = userId,
            TenantId = tenantId,
            Permissions = merged,
            BreakGlassGrants = BreakGlassRepository.ToDtos(active)
        };
    }

    internal static IReadOnlyDictionary<string, bool> MergeAllPermissions(
        IReadOnlyDictionary<string, bool> basePermissions,
        IReadOnlyList<BreakGlassGrantRow> activeGrants)
    {
        var keys = activeGrants
            .SelectMany(g => BreakGlassRepository.ParseGrantedList(g.GrantedPermissionsJson));
        return BreakGlassDomain.MergeBreakGlass(basePermissions, keys);
    }
}
