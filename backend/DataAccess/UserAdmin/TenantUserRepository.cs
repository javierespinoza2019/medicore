using System.Data;
using Dapper;
using MediCore.Models.UserAdmin;
using Microsoft.Data.SqlClient;

namespace MediCore.DataAccess.UserAdmin;

public interface ITenantUserRepository
{
    Task<IReadOnlyList<TenantUserRow>> ListAsync(
        Guid tenantId, bool onlyActive, string? search, CancellationToken ct);
    Task<TenantUserRow?> GetByIdAsync(Guid tenantId, Guid userId, CancellationToken ct);
    Task<TenantUserRow> CreateAsync(
        Guid tenantId,
        Guid userId,
        string userName,
        string displayName,
        string passwordHash,
        bool isActive,
        string? roleCodesCsv,
        string? branchIdsCsv,
        Guid? actorUserId,
        CancellationToken ct);
    Task<TenantUserRow> UpdateAsync(
        Guid tenantId,
        Guid userId,
        string displayName,
        bool isActive,
        DateTime? lockoutUntilUtc,
        string? roleCodesCsv,
        string? branchIdsCsv,
        Guid? actorUserId,
        CancellationToken ct);
    Task SoftDeleteAsync(Guid tenantId, Guid userId, Guid? actorUserId, CancellationToken ct);
    Task SetPasswordAsync(
        Guid tenantId, Guid userId, string passwordHash, Guid? actorUserId, CancellationToken ct);
}

public sealed class TenantUserRepository(ISqlConnectionFactory connectionFactory) : ITenantUserRepository
{
    public async Task<IReadOnlyList<TenantUserRow>> ListAsync(
        Guid tenantId, bool onlyActive, string? search, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_User_List",
            new { TenantId = tenantId, OnlyActive = onlyActive, Search = search },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        var rows = await conn.QueryAsync<TenantUserRow>(cmd);
        return rows.ToList();
    }

    public async Task<TenantUserRow?> GetByIdAsync(Guid tenantId, Guid userId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_User_GetById",
            new { TenantId = tenantId, UserId = userId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        return await conn.QuerySingleOrDefaultAsync<TenantUserRow>(cmd);
    }

    public async Task<TenantUserRow> CreateAsync(
        Guid tenantId,
        Guid userId,
        string userName,
        string displayName,
        string passwordHash,
        bool isActive,
        string? roleCodesCsv,
        string? branchIdsCsv,
        Guid? actorUserId,
        CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_User_Create",
                new
                {
                    TenantId = tenantId,
                    UserId = userId,
                    UserName = userName,
                    DisplayName = displayName,
                    PasswordHash = passwordHash,
                    IsActive = isActive,
                    RoleCodesCsv = roleCodesCsv,
                    BranchIdsCsv = branchIdsCsv,
                    ActorUserId = actorUserId
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            return await conn.QuerySingleAsync<TenantUserRow>(cmd);
        }
        catch (SqlException ex) when (ex.Number is 50301)
        {
            throw new InvalidOperationException(ex.Message, ex);
        }
        catch (SqlException ex) when (ex.Number is 50302 or 50303 or 50304)
        {
            throw new ArgumentException(ex.Message, ex);
        }
    }

    public async Task<TenantUserRow> UpdateAsync(
        Guid tenantId,
        Guid userId,
        string displayName,
        bool isActive,
        DateTime? lockoutUntilUtc,
        string? roleCodesCsv,
        string? branchIdsCsv,
        Guid? actorUserId,
        CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_User_Update",
                new
                {
                    TenantId = tenantId,
                    UserId = userId,
                    DisplayName = displayName,
                    IsActive = isActive,
                    LockoutUntilUtc = lockoutUntilUtc,
                    RoleCodesCsv = roleCodesCsv,
                    BranchIdsCsv = branchIdsCsv,
                    ActorUserId = actorUserId
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            return await conn.QuerySingleAsync<TenantUserRow>(cmd);
        }
        catch (SqlException ex) when (ex.Number is 50310)
        {
            throw new KeyNotFoundException(ex.Message, ex);
        }
        catch (SqlException ex) when (ex.Number is 50302 or 50303 or 50304)
        {
            throw new ArgumentException(ex.Message, ex);
        }
    }

    public async Task SoftDeleteAsync(Guid tenantId, Guid userId, Guid? actorUserId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_User_SoftDelete",
                new { TenantId = tenantId, UserId = userId, ActorUserId = actorUserId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            await conn.ExecuteAsync(cmd);
        }
        catch (SqlException ex) when (ex.Number is 50310)
        {
            throw new KeyNotFoundException(ex.Message, ex);
        }
        catch (SqlException ex) when (ex.Number is 50320)
        {
            throw new InvalidOperationException(ex.Message, ex);
        }
    }

    public async Task SetPasswordAsync(
        Guid tenantId, Guid userId, string passwordHash, Guid? actorUserId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_User_SetPassword",
                new
                {
                    TenantId = tenantId,
                    UserId = userId,
                    PasswordHash = passwordHash,
                    ActorUserId = actorUserId
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            await conn.ExecuteAsync(cmd);
        }
        catch (SqlException ex) when (ex.Number is 50310)
        {
            throw new KeyNotFoundException(ex.Message, ex);
        }
    }
}
