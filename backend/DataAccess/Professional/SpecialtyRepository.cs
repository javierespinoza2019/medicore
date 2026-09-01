using System.Data;
using Dapper;
using MediCore.Models.Professional;
using Microsoft.Data.SqlClient;

namespace MediCore.DataAccess.Professional;

public interface ISpecialtyRepository
{
    Task<IReadOnlyList<SpecialtyDto>> ListAsync(Guid tenantId, bool onlyActive, CancellationToken ct);
    Task<SpecialtyDto?> GetByIdAsync(Guid tenantId, Guid specialtyId, CancellationToken ct);
    Task<SpecialtyDto?> UpsertAsync(
        Guid tenantId, Guid specialtyId, UpsertSpecialtyRequest request, CancellationToken ct);
    Task<int> SoftDeleteAsync(Guid tenantId, Guid specialtyId, CancellationToken ct);
}

public sealed class SpecialtyRepository(ISqlConnectionFactory connectionFactory) : ISpecialtyRepository
{
    public async Task<IReadOnlyList<SpecialtyDto>> ListAsync(
        Guid tenantId, bool onlyActive, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Specialty_List",
            new { TenantId = tenantId, OnlyActive = onlyActive },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        var rows = await conn.QueryAsync<SpecialtyDto>(cmd);
        return rows.ToList();
    }

    public async Task<SpecialtyDto?> GetByIdAsync(Guid tenantId, Guid specialtyId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Specialty_GetById",
            new { TenantId = tenantId, SpecialtyId = specialtyId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        return await conn.QuerySingleOrDefaultAsync<SpecialtyDto>(cmd);
    }

    public async Task<SpecialtyDto?> UpsertAsync(
        Guid tenantId, Guid specialtyId, UpsertSpecialtyRequest request, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_Specialty_Upsert",
                new
                {
                    TenantId = tenantId,
                    SpecialtyId = specialtyId,
                    request.Code,
                    request.Name,
                    request.IsActive
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            return await conn.QuerySingleOrDefaultAsync<SpecialtyDto>(cmd);
        }
        catch (SqlException ex) when (ex.Number is 50040 or 50041 or 50043)
        {
            throw new ArgumentException(ex.Message, ex);
        }
        catch (SqlException ex) when (ex.Number == 50042)
        {
            throw new InvalidOperationException(ex.Message, ex);
        }
    }

    public async Task<int> SoftDeleteAsync(Guid tenantId, Guid specialtyId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Specialty_SoftDelete",
            new { TenantId = tenantId, SpecialtyId = specialtyId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        return await conn.QuerySingleAsync<int>(cmd);
    }
}
