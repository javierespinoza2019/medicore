using System.Data;
using Dapper;
using MediCore.Models.Auth;

namespace MediCore.DataAccess.Auth;

public interface IBreakGlassRepository
{
    Task<BreakGlassGrantRow> StartGrantAsync(
        Guid tenantId,
        Guid userId,
        string justification,
        string grantedPermissionsJson,
        CancellationToken ct);

    Task<IReadOnlyList<BreakGlassGrantRow>> ListActiveForUserAsync(Guid tenantId, Guid userId, CancellationToken ct);
}

public sealed class BreakGlassRepository(ISqlConnectionFactory connectionFactory) : IBreakGlassRepository
{
    public async Task<BreakGlassGrantRow> StartGrantAsync(
        Guid tenantId,
        Guid userId,
        string justification,
        string grantedPermissionsJson,
        CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_BreakGlass_Start",
            new
            {
                GrantId = Guid.NewGuid(),
                TenantId = tenantId,
                UserId = userId,
                Justification = justification,
                GrantedPermissionsJson = grantedPermissionsJson,
                DurationMinutes = 60
            },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        return await conn.QuerySingleAsync<BreakGlassGrantRow>(cmd);
    }

    public async Task<IReadOnlyList<BreakGlassGrantRow>> ListActiveForUserAsync(
        Guid tenantId,
        Guid userId,
        CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_BreakGlass_ListActiveForUser",
            new { TenantId = tenantId, UserId = userId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        var rows = await conn.QueryAsync<BreakGlassGrantRow>(cmd);
        return rows.ToList();
    }

    public static IReadOnlyList<string> ParseGrantedList(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return System.Text.Json.JsonSerializer.Deserialize<List<string>>(json) ?? [];
        }
        catch (System.Text.Json.JsonException)
        {
            return [];
        }
    }

    public static IReadOnlyList<BreakGlassGrantDto> ToDtos(IEnumerable<BreakGlassGrantRow> rows)
    {
        var list = new List<BreakGlassGrantDto>();
        foreach (var row in rows)
        {
            foreach (var key in ParseGrantedList(row.GrantedPermissionsJson))
            {
                list.Add(new BreakGlassGrantDto
                {
                    GrantId = row.GrantId,
                    PermissionKey = key,
                    ExpiresAtUtc = row.ExpiresAtUtc
                });
            }
        }
        return list;
    }
}
