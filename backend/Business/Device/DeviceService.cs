using MediCore.DataAccess.Device;
using MediCore.Models.Device;

namespace MediCore.Business.Device;

public interface IDeviceService
{
    Task<DeviceDto?> RegisterPendingAsync(Guid tenantId, Guid userId, RegisterDeviceRequest request, CancellationToken ct);
    Task<DeviceDto?> GetAsync(Guid tenantId, string devicePublicId, CancellationToken ct);
    Task<IReadOnlyList<DeviceDto>> ListAsync(Guid tenantId, bool onlyPending, CancellationToken ct);
    Task<DeviceDto?> ApproveAsync(Guid tenantId, string devicePublicId, bool allowsOfflineQueue, CancellationToken ct);
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

    public Task<IReadOnlyList<DeviceDto>> ListAsync(Guid tenantId, bool onlyPending, CancellationToken ct) =>
        deviceRepository.ListAsync(tenantId, onlyPending, ct);

    public async Task<DeviceDto?> ApproveAsync(
        Guid tenantId,
        string devicePublicId,
        bool allowsOfflineQueue,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(devicePublicId))
            throw new ArgumentException("DevicePublicId es obligatorio.");

        return await deviceRepository.ApproveAsync(tenantId, devicePublicId.Trim(), allowsOfflineQueue, ct);
    }
}
