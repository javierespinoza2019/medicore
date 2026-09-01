using System.Data;
using System.Data.Common;
using System.Text.Json;
using Dapper;
using MediCore.Models.Encounter;
using MediCore.Models.Sync;
using Microsoft.Data.SqlClient;

namespace MediCore.DataAccess.Sync;

public interface ISyncRepository
{
    Task<IdempotencyRow?> GetIdempotencyAsync(Guid tenantId, string idempotencyKey, CancellationToken ct);

    /// <summary>
    /// Registra la idempotencia y, si el comando es nuevo, ejecuta los SPs clínicos
    /// y encola el outbox en la <b>misma transacción</b>.
    /// </summary>
    Task<SyncRegistrationResult> RegisterCommandAsync(
        Guid tenantId,
        string idempotencyKey,
        string commandType,
        string payloadHash,
        string responseJson,
        IReadOnlyList<SyncProcedureCall>? clinicalProcedures,
        string? outboxChannel,
        string? outboxPayloadJson,
        CancellationToken ct);
}

public sealed class SyncRepository(ISqlConnectionFactory connectionFactory) : ISyncRepository
{
    public async Task<IdempotencyRow?> GetIdempotencyAsync(Guid tenantId, string idempotencyKey, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Sync_GetIdempotency",
            new { TenantId = tenantId, IdempotencyKey = idempotencyKey },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        return await conn.QuerySingleOrDefaultAsync<IdempotencyRow>(cmd);
    }

    public async Task<SyncRegistrationResult> RegisterCommandAsync(
        Guid tenantId,
        string idempotencyKey,
        string commandType,
        string payloadHash,
        string responseJson,
        IReadOnlyList<SyncProcedureCall>? clinicalProcedures,
        string? outboxChannel,
        string? outboxPayloadJson,
        CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        if (conn is DbConnection asyncConn)
            await asyncConn.OpenAsync(ct);
        else
            conn.Open();

        using var tx = conn.BeginTransaction();

        try
        {
            var registration = await conn.QuerySingleAsync<SyncRegistrationResult>(new CommandDefinition(
                "sp_Sync_SaveIdempotency",
                new
                {
                    TenantId = tenantId,
                    IdempotencyKey = idempotencyKey,
                    CommandType = commandType,
                    ResponseJson = responseJson,
                    PayloadHash = payloadHash
                },
                transaction: tx,
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct));

            if (registration.Outcome == SyncRegistrationResult.Created)
            {
                if (clinicalProcedures is { Count: > 0 })
                {
                    foreach (var call in clinicalProcedures)
                    {
                        await conn.ExecuteAsync(new CommandDefinition(
                            call.ProcedureName,
                            call.Parameters,
                            transaction: tx,
                            commandType: CommandType.StoredProcedure,
                            cancellationToken: ct));
                    }
                }

                if (outboxChannel is not null)
                {
                    await conn.ExecuteAsync(new CommandDefinition(
                        "sp_Outbox_Enqueue",
                        new
                        {
                            OutboxId = Guid.NewGuid(),
                            TenantId = tenantId,
                            Channel = outboxChannel,
                            PayloadJson = outboxPayloadJson ?? "{}"
                        },
                        transaction: tx,
                        commandType: CommandType.StoredProcedure,
                        cancellationToken: ct));
                }
            }

            tx.Commit();
            return registration;
        }
        catch (SqlException ex) when (ex.Number == 50109)
        {
            try { tx.Rollback(); } catch { /* TX ya condenada */ }
            // SC-04: mensaje CLOSE_WITH_PENDING_RX:{n}:…
            var msg = ex.Message ?? string.Empty;
            const string marker = "CLOSE_WITH_PENDING_RX:";
            var idx = msg.IndexOf(marker, StringComparison.Ordinal);
            var pending = 1;
            if (idx >= 0)
            {
                var after = msg[(idx + marker.Length)..];
                var colon = after.IndexOf(':');
                var countPart = colon >= 0 ? after[..colon] : after;
                if (int.TryParse(countPart, out var n) && n > 0)
                    pending = n;
            }
            throw new EncounterCloseWithPendingPrescriptionsException(pending);
        }
        catch (SqlException ex) when (ex.Number is >= 50000 and < 51000)
        {
            try { tx.Rollback(); } catch { /* TX ya condenada */ }
            throw new ArgumentException(ex.Message, ex);
        }
        catch
        {
            try { tx.Rollback(); } catch { /* TX ya condenada */ }
            throw;
        }
    }
}

public static class SyncJson
{
    public static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };
}
