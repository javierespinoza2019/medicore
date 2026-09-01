using System.Data;
using System.Text.Json;
using Dapper;
using MediCore.Models.Role;

namespace MediCore.DataAccess.Role;

public interface IRoleRepository
{
    Task<IReadOnlyList<RoleTemplateDto>> ListTemplatesAsync(Guid tenantId, CancellationToken ct);
    Task<TenantRolePermissionConfigRow?> GetPermissionConfigAsync(Guid tenantId, string roleCode, CancellationToken ct);
    Task<TenantRolePermissionConfigRow> UpsertPermissionConfigAsync(
        Guid tenantId,
        string roleCode,
        string grantedPermissionsJson,
        Guid actorUserId,
        CancellationToken ct);
}

public sealed class RoleRepository(ISqlConnectionFactory connectionFactory) : IRoleRepository
{
    public async Task<IReadOnlyList<RoleTemplateDto>> ListTemplatesAsync(Guid tenantId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Role_ListTemplates",
            new { TenantId = tenantId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        var rows = await conn.QueryAsync<RoleTemplateDto>(cmd);
        return rows.ToList();
    }

    public async Task<TenantRolePermissionConfigRow?> GetPermissionConfigAsync(
        Guid tenantId,
        string roleCode,
        CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Role_GetPermissionConfig",
            new { TenantId = tenantId, RoleCode = roleCode },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        return await conn.QuerySingleOrDefaultAsync<TenantRolePermissionConfigRow>(cmd);
    }

    public async Task<TenantRolePermissionConfigRow> UpsertPermissionConfigAsync(
        Guid tenantId,
        string roleCode,
        string grantedPermissionsJson,
        Guid actorUserId,
        CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Role_UpsertPermissionConfig",
            new
            {
                TenantId = tenantId,
                RoleCode = roleCode,
                GrantedPermissionsJson = grantedPermissionsJson,
                ActorUserId = actorUserId
            },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        return await conn.QuerySingleAsync<TenantRolePermissionConfigRow>(cmd);
    }

    public static IReadOnlyList<string> ParseGrantedList(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }
}
