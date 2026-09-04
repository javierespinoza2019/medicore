using MediCore.Models.Files;

namespace MediCore.Business.Files;

public interface IFileStorage
{
    /// <summary>
    /// Guarda bytes bajo tenantCode/module/entityId/fileName.
    /// Devuelve ruta relativa (con /) para persistir en BD.
    /// </summary>
    Task<StoredFileResult> SaveAsync(
        string tenantCode,
        string module,
        Guid entityId,
        string fileName,
        Stream content,
        string contentType,
        CancellationToken ct);

    Task<StoredFileRead?> OpenReadAsync(string relativePath, CancellationToken ct);

    /// <summary>Quita el archivo del disco si existe. No toca BD.</summary>
    Task DeleteIfExistsAsync(string relativePath, CancellationToken ct);
}
