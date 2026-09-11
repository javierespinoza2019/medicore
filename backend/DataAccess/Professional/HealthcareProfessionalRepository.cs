using System.Data;
using Dapper;
using MediCore.Models.Auth;
using MediCore.Models.Professional;
using Microsoft.Data.SqlClient;

namespace MediCore.DataAccess.Professional;

/// <summary>
/// Profesional sanitario (M1). Lectura + administración. Baja lógica únicamente.
/// </summary>
public interface IHealthcareProfessionalRepository
{
    Task<HealthcareProfessionalRow?> GetByUserAsync(Guid tenantId, Guid userId, CancellationToken ct);
    Task<HealthcareProfessionalRow?> GetByIdAsync(Guid tenantId, Guid healthcareProfessionalId, CancellationToken ct);
    Task<ProfessionalDto?> GetDtoByIdAsync(Guid tenantId, Guid healthcareProfessionalId, CancellationToken ct);
    Task<IReadOnlyList<ProfessionalDto>> ListAsync(
        Guid tenantId, bool onlyActive, string? search, CancellationToken ct);
    Task<ProfessionalDto?> CreateAsync(
        Guid tenantId, Guid healthcareProfessionalId, Guid? actorUserId,
        CreateProfessionalRequest request, CancellationToken ct);
    Task<ProfessionalDto?> UpdateAsync(
        Guid tenantId, Guid healthcareProfessionalId, Guid? actorUserId,
        UpdateProfessionalRequest request, CancellationToken ct);
    Task<int> SoftDeleteAsync(
        Guid tenantId, Guid healthcareProfessionalId, Guid? actorUserId, CancellationToken ct);
}

public sealed class HealthcareProfessionalRepository(ISqlConnectionFactory connectionFactory)
    : IHealthcareProfessionalRepository
{
    public async Task<HealthcareProfessionalRow?> GetByUserAsync(Guid tenantId, Guid userId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_HealthcareProfessional_GetByUser",
            new { TenantId = tenantId, UserId = userId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        return await conn.QuerySingleOrDefaultAsync<HealthcareProfessionalRow>(cmd);
    }

    public async Task<HealthcareProfessionalRow?> GetByIdAsync(
        Guid tenantId, Guid healthcareProfessionalId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_HealthcareProfessional_GetById",
            new { TenantId = tenantId, HealthcareProfessionalId = healthcareProfessionalId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        return await conn.QuerySingleOrDefaultAsync<HealthcareProfessionalRow>(cmd);
    }

    public async Task<ProfessionalDto?> GetDtoByIdAsync(
        Guid tenantId, Guid healthcareProfessionalId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_HealthcareProfessional_GetById",
            new { TenantId = tenantId, HealthcareProfessionalId = healthcareProfessionalId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        return await conn.QuerySingleOrDefaultAsync<ProfessionalDto>(cmd);
    }

    public async Task<IReadOnlyList<ProfessionalDto>> ListAsync(
        Guid tenantId, bool onlyActive, string? search, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_HealthcareProfessional_List",
            new { TenantId = tenantId, OnlyActive = onlyActive, Search = search },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        var rows = await conn.QueryAsync<ProfessionalDto>(cmd);
        return rows.ToList();
    }

    public async Task<ProfessionalDto?> CreateAsync(
        Guid tenantId, Guid healthcareProfessionalId, Guid? actorUserId,
        CreateProfessionalRequest request, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_HealthcareProfessional_Create",
                new
                {
                    TenantId = tenantId,
                    HealthcareProfessionalId = healthcareProfessionalId,
                    request.UserId,
                    request.FullName,
                    request.ProfessionalLicense,
                    request.SpecialtyId,
                    request.IsActive,
                    request.RoomId,
                    ActorUserId = actorUserId
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            return await conn.QuerySingleOrDefaultAsync<ProfessionalDto>(cmd);
        }
        catch (SqlException ex) when (ex.Number is 50030 or 50031 or 50032 or 50033 or 50035)
        {
            throw new ArgumentException(ex.Message, ex);
        }
        catch (SqlException ex) when (ex.Number == 50034)
        {
            throw new InvalidOperationException(ex.Message, ex);
        }
    }

    public async Task<ProfessionalDto?> UpdateAsync(
        Guid tenantId, Guid healthcareProfessionalId, Guid? actorUserId,
        UpdateProfessionalRequest request, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_HealthcareProfessional_Update",
                new
                {
                    TenantId = tenantId,
                    HealthcareProfessionalId = healthcareProfessionalId,
                    request.UserId,
                    request.ClearUserId,
                    request.FullName,
                    request.ProfessionalLicense,
                    request.ClearProfessionalLicense,
                    request.SpecialtyId,
                    request.ClearSpecialtyId,
                    request.IsActive,
                    request.RoomId,
                    request.ClearRoomAssignments,
                    ActorUserId = actorUserId
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            return await conn.QuerySingleOrDefaultAsync<ProfessionalDto>(cmd);
        }
        catch (SqlException ex) when (ex.Number is 50030 or 50031 or 50032 or 50033 or 50035)
        {
            throw new ArgumentException(ex.Message, ex);
        }
        catch (SqlException ex) when (ex.Number == 50034)
        {
            throw new InvalidOperationException(ex.Message, ex);
        }
    }

    public async Task<int> SoftDeleteAsync(
        Guid tenantId, Guid healthcareProfessionalId, Guid? actorUserId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_HealthcareProfessional_SoftDelete",
            new
            {
                TenantId = tenantId,
                HealthcareProfessionalId = healthcareProfessionalId,
                ActorUserId = actorUserId
            },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        return await conn.QuerySingleAsync<int>(cmd);
    }
}
