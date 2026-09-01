namespace MediCore.Api.Hubs;

/// <summary>
/// Nombres de eventos del hub. El live empuja invalidación + ids/nivel;
/// la UI vuelve a leer el detalle por API (fuente de verdad).
/// </summary>
public static class ClinicalQueueEvents
{
    public const string QueueChanged = "queueChanged";
    public const string TriageChanged = "triageChanged";
    public const string AppointmentChanged = "appointmentChanged";
    public const string EncounterStateChanged = "encounterStateChanged";
}

/// <summary>Sin PHI: sólo ids y motivo de invalidación.</summary>
public sealed record QueueChangedPayload(
    Guid BranchId,
    Guid? EncounterId,
    string Reason,
    DateTimeOffset AtUtc);

/// <summary>Sin PHI: ids + nivel de triage (código), no queja ni signos.</summary>
public sealed record TriageChangedPayload(
    Guid BranchId,
    Guid EncounterId,
    string? Level,
    int? LevelPriority,
    DateTimeOffset AtUtc);

/// <summary>Sin PHI: ids + estado de cita. Sin nombre de sujeto ni notas.</summary>
public sealed record AppointmentChangedPayload(
    Guid BranchId,
    Guid AppointmentId,
    string State,
    DateTimeOffset AtUtc);

/// <summary>Sin PHI: ids + estado de episodio + nivel si existe.</summary>
public sealed record EncounterStateChangedPayload(
    Guid BranchId,
    Guid EncounterId,
    string State,
    string? TriageLevel,
    DateTimeOffset AtUtc);
