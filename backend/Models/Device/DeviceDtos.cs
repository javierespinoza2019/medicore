namespace MediCore.Models.Device;

public sealed class RegisterDeviceRequest
{
    public string DevicePublicId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Platform { get; set; }
    public Guid? BranchId { get; set; }
}

public sealed class ApproveDeviceRequest
{
    public bool AllowsOfflineQueue { get; set; } = true;
}

public sealed class DeviceDto
{
    public Guid DeviceId { get; set; }
    public string DevicePublicId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Platform { get; set; }
    public Guid? BranchId { get; set; }
    public bool IsApproved { get; set; }
    public bool AllowsOfflineQueue { get; set; }
    public Guid? RequestedByUserId { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
