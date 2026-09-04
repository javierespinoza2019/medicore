namespace MediCore.Common;

public sealed class FileStorageOptions
{
    public const string SectionName = "FileStorage";

    /// <summary>
    /// Raíz física. Relativa al ContentRoot de la API o absoluta.
    /// Por omisión: carpeta <c>files</c>.
    /// </summary>
    public string RootPath { get; set; } = "files";
}
