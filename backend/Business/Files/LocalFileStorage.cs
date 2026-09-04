using MediCore.Common;
using MediCore.Models.Files;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace MediCore.Business.Files;

public sealed class LocalFileStorage : IFileStorage
{
    private readonly string _root;

    public LocalFileStorage(IOptions<FileStorageOptions> options, IHostEnvironment env)
    {
        var configured = options.Value.RootPath?.Trim();
        if (string.IsNullOrWhiteSpace(configured))
            configured = "files";

        _root = Path.IsPathRooted(configured)
            ? Path.GetFullPath(configured)
            : Path.GetFullPath(Path.Combine(env.ContentRootPath, configured));

        Directory.CreateDirectory(_root);
    }

    public async Task<StoredFileResult> SaveAsync(
        string tenantCode,
        string module,
        Guid entityId,
        string fileName,
        Stream content,
        string contentType,
        CancellationToken ct)
    {
        var tenantSeg = PathSegmentSanitizer.Sanitize(tenantCode);
        var moduleSeg = PathSegmentSanitizer.Sanitize(module);
        var safeName = PathSegmentSanitizer.SanitizeFileName(fileName);
        var entitySeg = entityId.ToString("D");

        var relative = string.Join('/', tenantSeg, moduleSeg, entitySeg, safeName);
        EnsureRelativeSafe(relative);

        var physicalDir = Path.Combine(_root, tenantSeg, moduleSeg, entitySeg);
        Directory.CreateDirectory(physicalDir);
        var physicalPath = Path.Combine(physicalDir, safeName);

        await using (var fs = new FileStream(
            physicalPath, FileMode.Create, FileAccess.Write, FileShare.None, 64 * 1024, useAsync: true))
        {
            await content.CopyToAsync(fs, ct);
        }

        var info = new FileInfo(physicalPath);
        return new StoredFileResult
        {
            RelativePath = relative,
            ContentType = contentType,
            SizeBytes = info.Length,
            FileName = safeName
        };
    }

    public Task<StoredFileRead?> OpenReadAsync(string relativePath, CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();
        if (string.IsNullOrWhiteSpace(relativePath))
            return Task.FromResult<StoredFileRead?>(null);

        var normalized = NormalizeRelative(relativePath);
        EnsureRelativeSafe(normalized);

        var physical = ToPhysical(normalized);
        if (!File.Exists(physical))
            return Task.FromResult<StoredFileRead?>(null);

        Stream stream = new FileStream(physical, FileMode.Open, FileAccess.Read, FileShare.Read, 64 * 1024, useAsync: true);
        var name = Path.GetFileName(physical);
        return Task.FromResult<StoredFileRead?>(new StoredFileRead
        {
            Content = stream,
            ContentType = FileUploadRules.ContentTypeForExtension(Path.GetExtension(name)),
            FileName = name
        });
    }

    public Task DeleteIfExistsAsync(string relativePath, CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();
        if (string.IsNullOrWhiteSpace(relativePath))
            return Task.CompletedTask;

        var normalized = NormalizeRelative(relativePath);
        EnsureRelativeSafe(normalized);
        var physical = ToPhysical(normalized);
        if (File.Exists(physical))
            File.Delete(physical);

        return Task.CompletedTask;
    }

    private string ToPhysical(string relativeWithSlash)
    {
        var parts = relativeWithSlash.Split('/', StringSplitOptions.RemoveEmptyEntries);
        return Path.GetFullPath(Path.Combine(new[] { _root }.Concat(parts).ToArray()));
    }

    private void EnsureRelativeSafe(string relativeWithSlash)
    {
        var physical = ToPhysical(relativeWithSlash);
        var rootFull = Path.GetFullPath(_root)
            .TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
            + Path.DirectorySeparatorChar;
        if (!physical.StartsWith(rootFull, StringComparison.OrdinalIgnoreCase)
            && !string.Equals(physical, Path.GetFullPath(_root), StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Ruta de archivo fuera del almacén permitido.");
        }
    }

    private static string NormalizeRelative(string relativePath) =>
        relativePath.Replace('\\', '/').Trim().TrimStart('/');
}
