namespace MediCore.Models.Sync;

public sealed class SyncEnvelopeRequest
{
    public string IdempotencyKey { get; set; } = string.Empty;
    public string CommandType { get; set; } = string.Empty;
    public string PayloadJson { get; set; } = string.Empty;
    public DateTimeOffset OccurredAtUtc { get; set; }
    public string? DeviceId { get; set; }
}

public sealed class SyncAcceptedDto
{
    public string IdempotencyKey { get; set; } = string.Empty;
    public string Status { get; set; } = "accepted"; // accepted | duplicate | conflict
    public string? ServerEntityId { get; set; }
}

public sealed class IdempotencyRow
{
    public Guid TenantId { get; set; }
    public string IdempotencyKey { get; set; } = string.Empty;
    public string CommandType { get; set; } = string.Empty;
    public string? ResponseJson { get; set; }

    /// <summary>SHA-256 hex del payload; huella para detectar conflicto sin guardar contenido clínico.</summary>
    public string? PayloadHash { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; }
}

/// <summary>
/// Desenlace del registro atómico de idempotencia (`sp_Sync_SaveIdempotency`).
/// </summary>
public sealed class SyncRegistrationResult
{
    public const string Created = "created";
    public const string Duplicate = "duplicate";
    public const string Conflict = "conflict";

    public string Outcome { get; set; } = Created;
    public string CommandType { get; set; } = string.Empty;
    public string? ResponseJson { get; set; }
}
