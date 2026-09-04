using MediCore.Business.Files;
using MediCore.DataAccess.Tenant;
using MediCore.Models.Files;
using MediCore.Models.Tenant;

namespace MediCore.Business.Tenant;

public interface ILogoBrandingService
{
    Task<TenantProfileDto> UploadTenantLogoAsync(
        Guid tenantId, Guid actorUserId, string fileName, Stream content, long sizeBytes, CancellationToken ct);

    Task<TenantProfileDto> ClearTenantLogoAsync(Guid tenantId, Guid actorUserId, CancellationToken ct);

    Task<BranchDto> UploadBranchLogoAsync(
        Guid tenantId, Guid branchId, Guid actorUserId, string fileName, Stream content, long sizeBytes, CancellationToken ct);

    Task<BranchDto> ClearBranchLogoAsync(Guid tenantId, Guid branchId, Guid actorUserId, CancellationToken ct);

    /// <summary>Logo de sucursal si existe; si no, logo de tenant. relativePath null → no hay archivo.</summary>
    Task<StoredFileRead?> OpenEffectiveLogoAsync(Guid tenantId, Guid? branchId, CancellationToken ct);

    Task<StoredFileRead?> OpenTenantLogoAsync(Guid tenantId, CancellationToken ct);
}

public sealed class LogoBrandingService(
    ITenantRepository tenantRepository,
    IBranchRepository branchRepository,
    IFileStorage fileStorage) : ILogoBrandingService
{
    public async Task<TenantProfileDto> UploadTenantLogoAsync(
        Guid tenantId, Guid actorUserId, string fileName, Stream content, long sizeBytes, CancellationToken ct)
    {
        FileUploadRules.Validate(fileName, sizeBytes, imagesOnly: true);
        var profile = await tenantRepository.GetByIdAsync(tenantId, ct)
            ?? throw new InvalidOperationException("Perfil de organización no encontrado.");

        if (!string.IsNullOrWhiteSpace(profile.LogoRelativePath))
            await fileStorage.DeleteIfExistsAsync(profile.LogoRelativePath, ct);

        var ext = Path.GetExtension(fileName);
        var stored = await fileStorage.SaveAsync(
            profile.Code,
            FileStorageModules.Tenant,
            tenantId,
            $"logo{ext}",
            content,
            FileUploadRules.ContentTypeForExtension(ext),
            ct);

        return await tenantRepository.SetLogoPathAsync(tenantId, actorUserId, stored.RelativePath, ct)
            ?? throw new InvalidOperationException("No se pudo guardar la ruta del logo.");
    }

    public async Task<TenantProfileDto> ClearTenantLogoAsync(Guid tenantId, Guid actorUserId, CancellationToken ct)
    {
        var profile = await tenantRepository.GetByIdAsync(tenantId, ct)
            ?? throw new InvalidOperationException("Perfil de organización no encontrado.");

        if (!string.IsNullOrWhiteSpace(profile.LogoRelativePath))
            await fileStorage.DeleteIfExistsAsync(profile.LogoRelativePath, ct);

        return await tenantRepository.SetLogoPathAsync(tenantId, actorUserId, null, ct)
            ?? throw new InvalidOperationException("No se pudo quitar el logo.");
    }

    public async Task<BranchDto> UploadBranchLogoAsync(
        Guid tenantId, Guid branchId, Guid actorUserId, string fileName, Stream content, long sizeBytes, CancellationToken ct)
    {
        FileUploadRules.Validate(fileName, sizeBytes, imagesOnly: true);
        var tenant = await tenantRepository.GetByIdAsync(tenantId, ct)
            ?? throw new InvalidOperationException("Perfil de organización no encontrado.");
        var branch = await branchRepository.GetByIdAsync(tenantId, branchId, ct)
            ?? throw new InvalidOperationException("Sucursal no encontrada.");

        if (!string.IsNullOrWhiteSpace(branch.LogoRelativePath))
            await fileStorage.DeleteIfExistsAsync(branch.LogoRelativePath, ct);

        var ext = Path.GetExtension(fileName);
        var stored = await fileStorage.SaveAsync(
            tenant.Code,
            FileStorageModules.Branches,
            branchId,
            $"logo{ext}",
            content,
            FileUploadRules.ContentTypeForExtension(ext),
            ct);

        return await branchRepository.SetLogoPathAsync(tenantId, branchId, actorUserId, stored.RelativePath, ct)
            ?? throw new InvalidOperationException("No se pudo guardar la ruta del logo de sucursal.");
    }

    public async Task<BranchDto> ClearBranchLogoAsync(
        Guid tenantId, Guid branchId, Guid actorUserId, CancellationToken ct)
    {
        var branch = await branchRepository.GetByIdAsync(tenantId, branchId, ct)
            ?? throw new InvalidOperationException("Sucursal no encontrada.");

        if (!string.IsNullOrWhiteSpace(branch.LogoRelativePath))
            await fileStorage.DeleteIfExistsAsync(branch.LogoRelativePath, ct);

        return await branchRepository.SetLogoPathAsync(tenantId, branchId, actorUserId, null, ct)
            ?? throw new InvalidOperationException("No se pudo quitar el logo de sucursal.");
    }

    public async Task<StoredFileRead?> OpenEffectiveLogoAsync(
        Guid tenantId, Guid? branchId, CancellationToken ct)
    {
        if (branchId is Guid bid)
        {
            var branch = await branchRepository.GetByIdAsync(tenantId, bid, ct);
            if (!string.IsNullOrWhiteSpace(branch?.LogoRelativePath))
            {
                var branchFile = await fileStorage.OpenReadAsync(branch.LogoRelativePath, ct);
                if (branchFile is not null)
                    return branchFile;
            }
        }

        return await OpenTenantLogoAsync(tenantId, ct);
    }

    public async Task<StoredFileRead?> OpenTenantLogoAsync(Guid tenantId, CancellationToken ct)
    {
        var profile = await tenantRepository.GetByIdAsync(tenantId, ct);
        if (string.IsNullOrWhiteSpace(profile?.LogoRelativePath))
            return null;
        return await fileStorage.OpenReadAsync(profile.LogoRelativePath, ct);
    }
}
