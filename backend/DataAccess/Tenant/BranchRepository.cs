using System.Data;
using Dapper;
using MediCore.Models.Tenant;
using Microsoft.Data.SqlClient;

namespace MediCore.DataAccess.Tenant;

public interface IBranchRepository
{
    Task<IReadOnlyList<BranchDto>> ListAsync(Guid tenantId, bool onlyActive, CancellationToken ct);
    Task<BranchDto?> GetByIdAsync(Guid tenantId, Guid branchId, CancellationToken ct);
    Task<BranchDto?> UpsertAsync(
        Guid tenantId,
        Guid branchId,
        Guid actorUserId,
        UpsertBranchRequest request,
        CancellationToken ct);
}

public sealed class BranchRepository(ISqlConnectionFactory connectionFactory) : IBranchRepository
{
    public async Task<IReadOnlyList<BranchDto>> ListAsync(Guid tenantId, bool onlyActive, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Branch_List",
            new { TenantId = tenantId, OnlyActive = onlyActive },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        var rows = await conn.QueryAsync<BranchDto>(cmd);
        return rows.ToList();
    }

    public async Task<BranchDto?> GetByIdAsync(Guid tenantId, Guid branchId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Branch_GetById",
            new { TenantId = tenantId, BranchId = branchId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        return await conn.QuerySingleOrDefaultAsync<BranchDto>(cmd);
    }

    public async Task<BranchDto?> UpsertAsync(
        Guid tenantId,
        Guid branchId,
        Guid actorUserId,
        UpsertBranchRequest request,
        CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_Branch_Upsert",
                new
                {
                    TenantId = tenantId,
                    BranchId = branchId,
                    request.Code,
                    request.Name,
                    request.FacilityType,
                    request.LegalName,
                    request.AddressStreet,
                    request.AddressNumber,
                    request.AddressNeighborhood,
                    request.AddressMunicipality,
                    request.AddressState,
                    request.AddressPostalCode,
                    request.PhoneNumber,
                    request.HealthLicense,
                    request.ResponsiblePhysicianProfessionalId,
                    request.TimeZoneId,
                    request.HasEmergencyService,
                    request.IsActive,
                    ActorUserId = actorUserId
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            return await conn.QuerySingleOrDefaultAsync<BranchDto>(cmd);
        }
        catch (SqlException ex) when (ex.Number == 50011)
        {
            throw new InvalidOperationException(ex.Message, ex);
        }
    }
}
