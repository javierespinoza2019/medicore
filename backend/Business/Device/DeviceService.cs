using MediCore.DataAccess.Device;
using MediCore.Models.Device;

namespace MediCore.Business.Device;

public interface IDeviceService
{
    Task<DeviceDto?> RegisterPendingAsync(Guid tenantId, Guid userId, RegisterDeviceRequest request, CancellationToken ct);
    Task<DeviceDto?> GetAsync(Guid tenantId, string devicePublicId, CancellationToken ct);
}

public sealed class DeviceService(IDeviceRepository deviceRepository) : IDeviceService
{
    public Task<DeviceDto?> RegisterPendingAsync(Guid tenantId, Guid userId, RegisterDeviceRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.DevicePublicId))
            throw new ArgumentException("DevicePublicId es obligatorio.");
        if (string.IsNullOrWhiteSpace(request.DisplayName))
            throw new ArgumentException("DisplayName es obligatorio.");

        return deviceRepository.UpsertPendingAsync(tenantId, userId, request, ct);
    }

    public Task<DeviceDto?> GetAsync(Guid tenantId, string devicePublicId, CancellationToken ct) =>
        deviceRepository.GetByPublicIdAsync(tenantId, devicePublicId, ct);
}
