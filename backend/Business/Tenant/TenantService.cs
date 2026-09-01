using MediCore.DataAccess.Tenant;
using MediCore.Models.Tenant;

namespace MediCore.Business.Tenant;

public interface ITenantService
{
    Task<TenantProfileDto?> GetProfileAsync(Guid tenantId, CancellationToken ct);
    Task<TenantProfileDto?> UpdateProfileAsync(
        Guid tenantId,
        Guid actorUserId,
        UpdateTenantProfileRequest request,
        CancellationToken ct);
}

public sealed class TenantService(ITenantRepository tenantRepository) : ITenantService
{
    public Task<TenantProfileDto?> GetProfileAsync(Guid tenantId, CancellationToken ct) =>
        tenantRepository.GetByIdAsync(tenantId, ct);

    public Task<TenantProfileDto?> UpdateProfileAsync(
        Guid tenantId,
        Guid actorUserId,
        UpdateTenantProfileRequest request,
        CancellationToken ct)
    {
        if (request.Rfc is { Length: > 0 } && request.Rfc.Length > 13)
            throw new ArgumentException("El RFC no puede exceder 13 caracteres.");
        if (request.LegalName is { Length: > 200 })
            throw new ArgumentException("La razón social no puede exceder 200 caracteres.");
        if (request.Name is { Length: > 0 } && string.IsNullOrWhiteSpace(request.Name))
            throw new ArgumentException("El nombre del tenant no puede quedar vacío.");

        return tenantRepository.UpdateProfileAsync(tenantId, actorUserId, request, ct);
    }
}
