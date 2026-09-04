using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace MediCore.Common;

/// <summary>
/// Sanitiza segmentos de ruta de archivos: quita .,:;:/\- y espacios → _.
/// Normaliza acentos para rutas estables en Windows.
/// </summary>
public static partial class PathSegmentSanitizer
{
    private static readonly HashSet<char> Forbidden =
    [
        '.', ',', ';', ':', '-', '/', '\\'
    ];

    public static string Sanitize(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            throw new ArgumentException("El segmento de ruta no puede quedar vacío.");

        var normalized = raw.Trim().Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(normalized.Length);
        foreach (var ch in normalized)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(ch);
            if (category is UnicodeCategory.NonSpacingMark or UnicodeCategory.SpacingCombiningMark
                or UnicodeCategory.EnclosingMark)
                continue;

            if (char.IsWhiteSpace(ch))
            {
                sb.Append('_');
                continue;
            }

            if (Forbidden.Contains(ch))
                continue;

            sb.Append(ch);
        }

        var result = CollapseUnderscores().Replace(sb.ToString(), "_").Trim('_');
        if (string.IsNullOrWhiteSpace(result))
            throw new ArgumentException("El segmento de ruta quedó vacío tras sanitizar.");

        return result;
    }

    /// <summary>Nombre de archivo: conserva extensión; sanitiza el stem.</summary>
    public static string SanitizeFileName(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName))
            throw new ArgumentException("El nombre de archivo es obligatorio.");

        var trimmed = fileName.Trim();
        var ext = Path.GetExtension(trimmed);
        var stem = Path.GetFileNameWithoutExtension(trimmed);
        var safeStem = Sanitize(string.IsNullOrWhiteSpace(stem) ? "file" : stem);
        if (string.IsNullOrWhiteSpace(ext))
            return safeStem;

        var safeExt = Sanitize(ext.TrimStart('.'));
        return $"{safeStem}.{safeExt}";
    }

    [GeneratedRegex("_{2,}")]
    private static partial Regex CollapseUnderscores();
}
