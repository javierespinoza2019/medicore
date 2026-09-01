namespace MediCore.Models.Audit;

public sealed class AuditEventDto
{
    public Guid AuditEventId { get; init; }
    public Guid TenantId { get; init; }
    public Guid ActorUserId { get; init; }
    public Guid? ActorProfessionalId { get; init; }
    public Guid? BranchId { get; init; }
    public string EventType { get; init; } = string.Empty;
    public string EntityName { get; init; } = string.Empty;
    public Guid EntityId { get; init; }
    public Guid? SubjectId { get; init; }
    public string? DetailJson { get; init; }
    public DateTimeOffset OccurredAtUtc { get; init; }
    public DateTimeOffset RecordedAtUtc { get; init; }
    public Guid? DeviceId { get; init; }
    public string? IpAddress { get; init; }
}

public sealed class AppendAuditEventCommand
{
    public Guid AuditEventId { get; init; }
    public Guid TenantId { get; init; }
    public Guid ActorUserId { get; init; }
    public Guid? ActorProfessionalId { get; init; }
    public Guid? BranchId { get; init; }
    public required string EventType { get; init; }
    public required string EntityName { get; init; }
    public Guid EntityId { get; init; }
    public Guid? SubjectId { get; init; }
    public string? DetailJson { get; init; }
    public DateTimeOffset OccurredAtUtc { get; init; }
    public Guid? DeviceId { get; init; }
    public string? IpAddress { get; init; }
}

/// <summary>Tipos de evento conocidos. La lectura de expediente usa <see cref="RecordRead"/> (NOM-004 5.5.1 / 5.7, doc 01).</summary>
public static class AuditEventTypes
{
    public const string RecordRead = "record.read";

    /// <summary>SC-04: alta forzada pese a recetas sin firmar (excepción clínica auditable).</summary>
    public const string DischargeWithPendingPrescriptions =
        "clinical_exception.discharge_with_pending_prescriptions";

    /// <summary>Break-glass #23: acceso de emergencia con justificación.</summary>
    public const string BreakGlassStarted = "security.break_glass.started";
}
