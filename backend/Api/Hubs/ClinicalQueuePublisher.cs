using MediCore.Common;
using Microsoft.AspNetCore.SignalR;

namespace MediCore.Api.Hubs;

public sealed class ClinicalQueuePublisher(
    IHubContext<ClinicalQueueHub> hub,
    ILogger<ClinicalQueuePublisher> logger) : IClinicalQueuePublisher
{
    public Task QueueChangedAsync(
        Guid tenantId,
        Guid branchId,
        Guid? encounterId,
        string reason,
        CancellationToken ct = default) =>
        SafeSendAsync(
            tenantId,
            branchId,
            ClinicalQueueEvents.QueueChanged,
            new QueueChangedPayload(branchId, encounterId, reason, UtcClock.Now),
            ct);

    public Task TriageChangedAsync(
        Guid tenantId,
        Guid branchId,
        Guid encounterId,
        string? level,
        int? levelPriority,
        CancellationToken ct = default) =>
        SafeSendAsync(
            tenantId,
            branchId,
            ClinicalQueueEvents.TriageChanged,
            new TriageChangedPayload(branchId, encounterId, level, levelPriority, UtcClock.Now),
            ct);

    public Task AppointmentChangedAsync(
        Guid tenantId,
        Guid branchId,
        Guid appointmentId,
        string state,
        CancellationToken ct = default) =>
        SafeSendAsync(
            tenantId,
            branchId,
            ClinicalQueueEvents.AppointmentChanged,
            new AppointmentChangedPayload(branchId, appointmentId, state, UtcClock.Now),
            ct);

    public Task EncounterStateChangedAsync(
        Guid tenantId,
        Guid branchId,
        Guid encounterId,
        string state,
        string? triageLevel,
        CancellationToken ct = default) =>
        SafeSendAsync(
            tenantId,
            branchId,
            ClinicalQueueEvents.EncounterStateChanged,
            new EncounterStateChangedPayload(branchId, encounterId, state, triageLevel, UtcClock.Now),
            ct);

    private async Task SafeSendAsync<T>(
        Guid tenantId,
        Guid branchId,
        string eventName,
        T payload,
        CancellationToken ct)
    {
        try
        {
            var group = ClinicalQueueGroups.For(tenantId, branchId);
            await hub.Clients.Group(group).SendAsync(eventName, payload, ct);
        }
        catch (Exception ex)
        {
            // El live es mejora de latencia; no debe abortar el acto clínico.
            logger.LogWarning(ex, "No se pudo publicar {Event} al grupo de cola clínica.", eventName);
        }
    }
}
