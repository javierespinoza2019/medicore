using System.Data;
using Dapper;
using MediCore.Models.Auth;

namespace MediCore.DataAccess.Auth;

public interface IAuthRepository
{
    Task<UserAuthRow?> GetUserForLoginAsync(string tenantCode, string userName, CancellationToken ct);
    Task<UserAuthRow?> GetUserByIdAsync(Guid tenantId, Guid userId, CancellationToken ct);
    Task UpdateLoginFailureAsync(Guid tenantId, Guid userId, int failedCount, DateTimeOffset? lockoutUntilUtc, CancellationToken ct);
    Task ResetLoginFailureAsync(Guid tenantId, Guid userId, CancellationToken ct);
    Task SaveRefreshTokenAsync(Guid tenantId, Guid userId, string tokenHash, DateTimeOffset expiresAtUtc, CancellationToken ct);
    Task<RefreshTokenRow?> GetRefreshTokenAsync(string tokenHash, CancellationToken ct);
    /// <summary>Revoca sólo esa sesión. Devuelve false si ya estaba revocada o no es del usuario.</summary>
    Task<bool> RevokeRefreshTokenAsync(Guid refreshTokenId, Guid tenantId, Guid userId, CancellationToken ct);
    /// <summary>
    /// Cierre global. El logout ordinario no lo usa (decisión 73: sólo la sesión actual).
    /// Política §75 (2026-08-30): cambio de contraseña, bloqueo/baja admin y
    /// «cerrar en todos mis dispositivos»; no lockout por intentos fallidos.
    /// </summary>
    Task RevokeAllRefreshTokensForUserAsync(Guid tenantId, Guid userId, CancellationToken ct);
    Task<bool> UserExistsInTenantAsync(Guid tenantId, Guid userId, CancellationToken ct);
    Task<bool> ChangePasswordAsync(Guid tenantId, Guid userId, string passwordHash, CancellationToken ct);
}

public sealed class AuthRepository(ISqlConnectionFactory connectionFactory) : IAuthRepository
{
    public async Task<UserAuthRow?> GetUserForLoginAsync(string tenantCode, string userName, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Auth_GetUserForLogin",
            new { TenantCode = tenantCode, UserName = userName },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        return await conn.QuerySingleOrDefaultAsync<UserAuthRow>(cmd);
    }

    public async Task<UserAuthRow?> GetUserByIdAsync(Guid tenantId, Guid userId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Auth_GetUserById",
            new { TenantId = tenantId, UserId = userId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        return await conn.QuerySingleOrDefaultAsync<UserAuthRow>(cmd);
    }

    public async Task UpdateLoginFailureAsync(Guid tenantId, Guid userId, int failedCount, DateTimeOffset? lockoutUntilUtc, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Auth_UpdateLoginFailure",
            new { TenantId = tenantId, UserId = userId, FailedLoginCount = failedCount, LockoutUntilUtc = lockoutUntilUtc },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        await conn.ExecuteAsync(cmd);
    }

    public async Task ResetLoginFailureAsync(Guid tenantId, Guid userId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Auth_ResetLoginFailure",
            new { TenantId = tenantId, UserId = userId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        await conn.ExecuteAsync(cmd);
    }

    public async Task SaveRefreshTokenAsync(Guid tenantId, Guid userId, string tokenHash, DateTimeOffset expiresAtUtc, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Auth_SaveRefreshToken",
            new
            {
                RefreshTokenId = Guid.NewGuid(),
                TenantId = tenantId,
                UserId = userId,
                TokenHash = tokenHash,
                ExpiresAtUtc = expiresAtUtc
            },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        await conn.ExecuteAsync(cmd);
    }

    public async Task<RefreshTokenRow?> GetRefreshTokenAsync(string tokenHash, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Auth_GetRefreshToken",
            new { TokenHash = tokenHash },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        return await conn.QuerySingleOrDefaultAsync<RefreshTokenRow>(cmd);
    }

    public async Task<bool> RevokeRefreshTokenAsync(Guid refreshTokenId, Guid tenantId, Guid userId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Auth_RevokeRefreshToken",
            new { RefreshTokenId = refreshTokenId, TenantId = tenantId, UserId = userId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        return await conn.ExecuteScalarAsync<int>(cmd) > 0;
    }

    public async Task RevokeAllRefreshTokensForUserAsync(Guid tenantId, Guid userId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Auth_RevokeAllRefreshTokensForUser",
            new { TenantId = tenantId, UserId = userId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        await conn.ExecuteAsync(cmd);
    }

    public async Task<bool> UserExistsInTenantAsync(Guid tenantId, Guid userId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Auth_UserExistsInTenant",
            new { TenantId = tenantId, UserId = userId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        return await conn.ExecuteScalarAsync<bool>(cmd);
    }

    public async Task<bool> ChangePasswordAsync(Guid tenantId, Guid userId, string passwordHash, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Auth_ChangePassword",
            new { TenantId = tenantId, UserId = userId, PasswordHash = passwordHash },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        return await conn.ExecuteScalarAsync<int>(cmd) > 0;
    }
}
