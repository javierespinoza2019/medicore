namespace MediCore.Models.Files;

public static class FileStorageModules
{
    public const string Tenant = "Tenant";
    public const string Branches = "Branches";
    public const string Pacientes = "Pacientes";
}

public sealed class StoredFileResult
{
    /// <summary>Ruta relativa desde la raíz <c>files/</c> (se guarda en BD).</summary>
    public required string RelativePath { get; init; }
    public required string ContentType { get; init; }
    public required long SizeBytes { get; init; }
    public required string FileName { get; init; }
}

public sealed class StoredFileRead
{
    public required Stream Content { get; init; }
    public required string ContentType { get; init; }
    public required string FileName { get; init; }
}
