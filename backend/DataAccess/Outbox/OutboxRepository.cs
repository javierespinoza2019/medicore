using System.Data;
using Dapper;

namespace MediCore.DataAccess.Outbox;

public sealed class OutboxItem
{
    public Guid OutboxId { get; set; }
    public Guid TenantId { get; set; }
    public string Channel { get; set; } = string.Empty;
    public string PayloadJson { get; set; } = string.Empty;
    public int AttemptCount { get; set; }
}

public interface IOutboxRepository
{
    Task EnqueueAsync(Guid tenantId, string channel, string payloadJson, CancellationToken ct);
    Task<IReadOnlyList<OutboxItem>> ClaimPendingAsync(int batchSize, CancellationToken ct);
    Task MarkSentAsync(Guid outboxId, CancellationToken ct);
    Task MarkFailedAsync(Guid outboxId, string error, CancellationToken ct);
}

public static class OutboxChannels
{
    public const string SecurityAlert = "security.alert";
}

public sealed class OutboxRepository(ISqlConnectionFactory connectionFactory) : IOutboxRepository
{
    public async Task EnqueueAsync(Guid tenantId, string channel, string payloadJson, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Outbox_Enqueue",
            new
            {
                OutboxId = Guid.NewGuid(),
                TenantId = tenantId,
                Channel = channel,
                PayloadJson = payloadJson
            },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        await conn.ExecuteAsync(cmd);
    }

    public async Task<IReadOnlyList<OutboxItem>> ClaimPendingAsync(int batchSize, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Outbox_ClaimPending",
            new { BatchSize = batchSize },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        var rows = await conn.QueryAsync<OutboxItem>(cmd);
        return rows.ToList();
    }

    public async Task MarkSentAsync(Guid outboxId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Outbox_MarkSent",
            new { OutboxId = outboxId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        await conn.ExecuteAsync(cmd);
    }

    public async Task MarkFailedAsync(Guid outboxId, string error, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Outbox_MarkFailed",
            new { OutboxId = outboxId, LastError = error },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        await conn.ExecuteAsync(cmd);
    }
}
