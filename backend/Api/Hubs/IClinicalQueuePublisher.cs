namespace MediCore.Api.Hubs;

/// <summary>
/// Publica invalidaciones de cola al hub. Payloads sin PHI.
/// Fallar al publicar no debe tumbar la operación clínica (best-effort).
/// </summary>
public interface IClinicalQueuePublisher
{
    Task QueueChangedAsync(
        Guid tenantId,
        Guid branchId,
        Guid? encounterId,
        string reason,
        CancellationToken ct = default);

    Task TriageChangedAsync(
        Guid tenantId,
        Guid branchId,
        Guid encounterId,
        string? level,
        int? levelPriority,
        CancellationToken ct = default);

    Task AppointmentChangedAsync(
        Guid tenantId,
        Guid branchId,
        Guid appointmentId,
        string state,
        CancellationToken ct = default);

    Task EncounterStateChangedAsync(
        Guid tenantId,
        Guid branchId,
        Guid encounterId,
        string state,
        string? triageLevel,
        CancellationToken ct = default);
}
