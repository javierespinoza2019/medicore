using System.Data;
using Dapper;
using MediCore.Models.Tenant;

namespace MediCore.DataAccess.Tenant;

public interface ITenantRepository
{
    Task<TenantProfileDto?> GetByCodeAsync(string code, CancellationToken ct);
    Task<TenantProfileDto?> GetByIdAsync(Guid tenantId, CancellationToken ct);
    Task<TenantProfileDto?> UpdateProfileAsync(
        Guid tenantId,
        Guid actorUserId,
        UpdateTenantProfileRequest request,
        CancellationToken ct);
}

public sealed class TenantRepository(ISqlConnectionFactory connectionFactory) : ITenantRepository
{
    public async Task<TenantProfileDto?> GetByCodeAsync(string code, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Tenant_GetByCode",
            new { Code = code, TenantId = (Guid?)null },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        return await conn.QuerySingleOrDefaultAsync<TenantProfileDto>(cmd);
    }

    public async Task<TenantProfileDto?> GetByIdAsync(Guid tenantId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Tenant_GetByCode",
            new { Code = (string?)null, TenantId = tenantId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        return await conn.QuerySingleOrDefaultAsync<TenantProfileDto>(cmd);
    }

    public async Task<TenantProfileDto?> UpdateProfileAsync(
        Guid tenantId,
        Guid actorUserId,
        UpdateTenantProfileRequest request,
        CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Tenant_UpdateProfile",
            new
            {
                TenantId = tenantId,
                request.LegalName,
                request.Rfc,
                request.PrimaryColorToken,
                request.Name,
                ActorUserId = actorUserId
            },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        return await conn.QuerySingleOrDefaultAsync<TenantProfileDto>(cmd);
    }
}
