using System.Data;
using Dapper;
using MediCore.Models.Device;

namespace MediCore.DataAccess.Device;

public interface IDeviceRepository
{
    Task<DeviceDto?> UpsertPendingAsync(Guid tenantId, Guid userId, RegisterDeviceRequest request, CancellationToken ct);
    Task<DeviceDto?> GetByPublicIdAsync(Guid tenantId, string devicePublicId, CancellationToken ct);
}

public sealed class DeviceRepository(ISqlConnectionFactory connectionFactory) : IDeviceRepository
{
    public async Task<DeviceDto?> UpsertPendingAsync(Guid tenantId, Guid userId, RegisterDeviceRequest request, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Device_UpsertPending",
            new
            {
                TenantId = tenantId,
                RequestedByUserId = userId,
                DevicePublicId = request.DevicePublicId,
                DisplayName = request.DisplayName,
                Platform = request.Platform,
                BranchId = request.BranchId
            },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        return await conn.QuerySingleOrDefaultAsync<DeviceDto>(cmd);
    }

    public async Task<DeviceDto?> GetByPublicIdAsync(Guid tenantId, string devicePublicId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Device_GetByPublicId",
            new { TenantId = tenantId, DevicePublicId = devicePublicId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        return await conn.QuerySingleOrDefaultAsync<DeviceDto>(cmd);
    }
}
