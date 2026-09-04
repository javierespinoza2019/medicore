using MediCore.Business.Files;
using MediCore.DataAccess.Subject;
using MediCore.DataAccess.Tenant;
using MediCore.Models.Files;
using MediCore.Models.Subject;

namespace MediCore.Business.Subject;

public interface ISubjectPhotoService
{
    Task<SubjectDto> UploadAsync(
        Guid tenantId, Guid subjectId, Guid actorUserId,
        string fileName, Stream content, long sizeBytes, CancellationToken ct);

    Task<SubjectDto> ClearAsync(Guid tenantId, Guid subjectId, Guid actorUserId, CancellationToken ct);

    Task<StoredFileRead?> OpenAsync(Guid tenantId, Guid subjectId, CancellationToken ct);
}

/// <summary>Foto de identificación del sujeto (#44). files/{Tenant}/Pacientes/{subjectId}/foto.ext</summary>
public sealed class SubjectPhotoService(
    ISubjectRepository subjectRepository,
    ITenantRepository tenantRepository,
    IFileStorage fileStorage) : ISubjectPhotoService
{
    public async Task<SubjectDto> UploadAsync(
        Guid tenantId, Guid subjectId, Guid actorUserId,
        string fileName, Stream content, long sizeBytes, CancellationToken ct)
    {
        FileUploadRules.Validate(fileName, sizeBytes, imagesOnly: true);

        var subject = await subjectRepository.GetByIdAsync(tenantId, subjectId, ct)
            ?? throw new InvalidOperationException("Sujeto no encontrado.");
        var targetId = subject.ResolvedSubjectId != Guid.Empty ? subject.ResolvedSubjectId : subject.SubjectId;

        var tenant = await tenantRepository.GetByIdAsync(tenantId, ct)
            ?? throw new InvalidOperationException("Perfil de organización no encontrado.");

        if (!string.IsNullOrWhiteSpace(subject.PhotoRelativePath))
            await fileStorage.DeleteIfExistsAsync(subject.PhotoRelativePath, ct);

        var ext = Path.GetExtension(fileName);
        var stored = await fileStorage.SaveAsync(
            tenant.Code,
            FileStorageModules.Pacientes,
            targetId,
            $"foto{ext}",
            content,
            FileUploadRules.ContentTypeForExtension(ext),
            ct);

        return await subjectRepository.SetPhotoPathAsync(tenantId, targetId, actorUserId, stored.RelativePath, ct)
            ?? throw new InvalidOperationException("No se pudo guardar la ruta de la foto.");
    }

    public async Task<SubjectDto> ClearAsync(
        Guid tenantId, Guid subjectId, Guid actorUserId, CancellationToken ct)
    {
        var subject = await subjectRepository.GetByIdAsync(tenantId, subjectId, ct)
            ?? throw new InvalidOperationException("Sujeto no encontrado.");
        var targetId = subject.ResolvedSubjectId != Guid.Empty ? subject.ResolvedSubjectId : subject.SubjectId;

        if (!string.IsNullOrWhiteSpace(subject.PhotoRelativePath))
            await fileStorage.DeleteIfExistsAsync(subject.PhotoRelativePath, ct);

        return await subjectRepository.SetPhotoPathAsync(tenantId, targetId, actorUserId, null, ct)
            ?? throw new InvalidOperationException("No se pudo quitar la foto.");
    }

    public async Task<StoredFileRead?> OpenAsync(Guid tenantId, Guid subjectId, CancellationToken ct)
    {
        var subject = await subjectRepository.GetByIdAsync(tenantId, subjectId, ct);
        if (string.IsNullOrWhiteSpace(subject?.PhotoRelativePath))
            return null;
        return await fileStorage.OpenReadAsync(subject.PhotoRelativePath, ct);
    }
}
