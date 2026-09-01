using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using MediCore.Common;
using MediCore.DataAccess.Sync;
using MediCore.Models.Sync;

namespace MediCore.Business.Sync;

public interface ISyncService
{
    Task<SyncAcceptedDto> AcceptAsync(
        Guid tenantId,
        Guid userId,
        Guid? actorProfessionalId,
        SyncEnvelopeRequest request,
        CancellationToken ct);
}

/// <summary>
/// La misma IdempotencyKey se reutilizó con otro CommandType u otro contenido:
/// no es un reintento de la cola offline, es un conflicto que el cliente debe resolver.
/// </summary>
public sealed class SyncIdempotencyConflictException(string idempotencyKey, string registeredCommandType)
    : Exception($"La clave de idempotencia '{idempotencyKey}' ya está registrada para el comando " +
                $"'{registeredCommandType}' con otro contenido. Use una clave nueva.")
{
    public string IdempotencyKey { get; } = idempotencyKey;
    public string RegisteredCommandType { get; } = registeredCommandType;
}

/// <summary>
/// Recibe comandos de la cola del cliente. Idempotencia al capturar (ADR-014).
/// Despacha por registro de handlers: efecto clínico + outbox DGIS en la misma TX.
/// </summary>
public sealed class SyncService(
    ISyncRepository syncRepository,
    ISyncCommandRegistry commandRegistry) : ISyncService
{
    public async Task<SyncAcceptedDto> AcceptAsync(
        Guid tenantId,
        Guid userId,
        Guid? actorProfessionalId,
        SyncEnvelopeRequest request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.IdempotencyKey))
            throw new ArgumentException("IdempotencyKey es obligatoria.", nameof(request));
        if (string.IsNullOrWhiteSpace(request.CommandType))
            throw new ArgumentException("CommandType es obligatorio.", nameof(request));

        var ctx = new SyncCommandContext
        {
            TenantId = tenantId,
            UserId = userId,
            ActorProfessionalId = actorProfessionalId,
            Request = request
        };

        // Tipos sin handler: se aceptan sólo con idempotencia (compat contrato e2e.contract.noop).
        SyncCommandPlan plan;
        if (commandRegistry.TryGet(request.CommandType, out var handler) && handler is not null)
        {
            plan = await handler.PlanAsync(ctx, ct);
        }
        else
        {
            plan = new SyncCommandPlan { ServerEntityId = UlidId.New() };
        }

        var accepted = new SyncAcceptedDto
        {
            IdempotencyKey = request.IdempotencyKey,
            Status = "accepted",
            ServerEntityId = plan.ServerEntityId
        };
        var responseJson = JsonSerializer.Serialize(accepted, SyncJson.Options);

        // DGIS/SINBA: capacidad fija — si el comando implica reporte, encolar (canal siempre disponible).
        var requiereOutbox =
            plan.RequiresDgisOutbox ||
            request.CommandType.StartsWith("dgis.", StringComparison.OrdinalIgnoreCase) ||
            request.CommandType.StartsWith("sinba.", StringComparison.OrdinalIgnoreCase);

        string? outboxPayload = requiereOutbox
            ? JsonSerializer.Serialize(new
            {
                userId,
                request.CommandType,
                request.PayloadJson,
                request.OccurredAtUtc,
                serverId = plan.ServerEntityId
            }, SyncJson.Options)
            : null;

        var registration = await syncRepository.RegisterCommandAsync(
            tenantId,
            request.IdempotencyKey,
            request.CommandType,
            HuellaPayload(request.PayloadJson),
            responseJson,
            plan.ClinicalProcedures,
            requiereOutbox ? "dgis" : null,
            outboxPayload,
            ct);

        switch (registration.Outcome)
        {
            case SyncRegistrationResult.Created:
                return accepted;

            case SyncRegistrationResult.Conflict:
                throw new SyncIdempotencyConflictException(request.IdempotencyKey, registration.CommandType);

            default:
                if (!string.IsNullOrWhiteSpace(registration.ResponseJson))
                {
                    var prior = JsonSerializer.Deserialize<SyncAcceptedDto>(registration.ResponseJson, SyncJson.Options);
                    if (prior is not null)
                    {
                        prior.Status = "duplicate";
                        return prior;
                    }
                }

                return new SyncAcceptedDto
                {
                    IdempotencyKey = request.IdempotencyKey,
                    Status = "duplicate"
                };
        }
    }

    private static string HuellaPayload(string? payloadJson) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(payloadJson ?? string.Empty)));
}
