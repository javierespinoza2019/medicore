namespace MediCore.Business.Files;

/// <summary>Reglas de tamaño y extensión para uploads (white-label / adjuntos).</summary>
public static class FileUploadRules
{
    public const long MaxImageBytes = 2 * 1024 * 1024;
    public const long MaxDocumentBytes = 5 * 1024 * 1024;

    private static readonly HashSet<string> ImageExtensions =
        new(StringComparer.OrdinalIgnoreCase) { ".jpg", ".jpeg", ".png", ".gif" };

    private static readonly HashSet<string> DocumentExtensions =
        new(StringComparer.OrdinalIgnoreCase) { ".pdf", ".doc", ".xlsx" };

    public static bool IsImage(string extension) =>
        ImageExtensions.Contains(NormalizeExt(extension));

    public static bool IsDocument(string extension) =>
        DocumentExtensions.Contains(NormalizeExt(extension));

    public static bool IsAllowed(string extension) =>
        IsImage(extension) || IsDocument(extension);

    public static long MaxBytesFor(string extension)
    {
        var ext = NormalizeExt(extension);
        if (IsImage(ext)) return MaxImageBytes;
        if (IsDocument(ext)) return MaxDocumentBytes;
        throw new ArgumentException($"Extensión no permitida: {ext}");
    }

    /// <summary>Valida extensión y tamaño; lanza ArgumentException con mensaje en español.</summary>
    public static void Validate(string fileName, long sizeBytes, bool imagesOnly = false)
    {
        var ext = Path.GetExtension(fileName);
        if (string.IsNullOrWhiteSpace(ext) || !IsAllowed(ext))
            throw new ArgumentException(
                "Tipo de archivo no permitido. Imágenes: .jpg .jpeg .png .gif. Documentos: .pdf .doc .xlsx.");

        if (imagesOnly && !IsImage(ext))
            throw new ArgumentException("Solo se permiten imágenes (.jpg .jpeg .png .gif).");

        var max = MaxBytesFor(ext);
        if (sizeBytes <= 0)
            throw new ArgumentException("El archivo está vacío.");
        if (sizeBytes > max)
        {
            var mb = max / (1024 * 1024);
            throw new ArgumentException(
                IsImage(ext)
                    ? $"La imagen no puede exceder {mb} MB."
                    : $"El documento no puede exceder {mb} MB.");
        }
    }

    public static string ContentTypeForExtension(string extension) =>
        NormalizeExt(extension) switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".pdf" => "application/pdf",
            ".doc" => "application/msword",
            ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            _ => "application/octet-stream"
        };

    private static string NormalizeExt(string extension)
    {
        var e = extension.Trim();
        if (!e.StartsWith(".", StringComparison.Ordinal))
            e = "." + e;
        return e.ToLowerInvariant();
    }
}
