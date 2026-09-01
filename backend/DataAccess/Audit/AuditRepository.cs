using System.Data;
using System.Data.Common;
using Dapper;
using MediCore.Models.Audit;

namespace MediCore.DataAccess.Audit;

public interface IAuditRepository
{
    /// <summary>
    /// Inserta un evento en su propia conexión/transacción. Preferir
    /// <see cref="AppendInTransactionAsync"/> cuando hay un hecho de negocio concurrente.
    /// </summary>
    Task AppendAsync(AppendAuditEventCommand command, CancellationToken ct);

    /// <summary>
    /// Inserta el evento en la <b>misma transacción</b> del hecho auditado (mismo patrón que outbox en Sync).
    /// </summary>
    Task AppendInTransactionAsync(
        IDbConnection connection,
        IDbTransaction transaction,
        AppendAuditEventCommand command,
        CancellationToken ct);

    Task<IReadOnlyList<AuditEventDto>> ListBySubjectAsync(
        Guid tenantId,
        Guid subjectId,
        DateTimeOffset? fromUtc,
        DateTimeOffset? toUtc,
        CancellationToken ct);

    Task<IReadOnlyList<AuditEventDto>> ListByActorAsync(
        Guid tenantId,
        Guid actorUserId,
        DateTimeOffset fromUtc,
        DateTimeOffset toUtc,
        CancellationToken ct);
}

public sealed class AuditRepository(ISqlConnectionFactory connectionFactory) : IAuditRepository
{
    public async Task AppendAsync(AppendAuditEventCommand command, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        if (conn is DbConnection asyncConn)
            await asyncConn.OpenAsync(ct);
        else
            conn.Open();

        using var tx = conn.BeginTransaction();
        await AppendInTransactionAsync(conn, tx, command, ct);
        tx.Commit();
    }

    public Task AppendInTransactionAsync(
        IDbConnection connection,
        IDbTransaction transaction,
        AppendAuditEventCommand command,
        CancellationToken ct)
    {
        var cmd = new CommandDefinition(
            "sp_Audit_Append",
            new
            {
                command.AuditEventId,
                command.TenantId,
                command.ActorUserId,
                command.ActorProfessionalId,
                command.BranchId,
                command.EventType,
                command.EntityName,
                command.EntityId,
                command.SubjectId,
                command.DetailJson,
                OccurredAtUtc = command.OccurredAtUtc.UtcDateTime,
                command.DeviceId,
                command.IpAddress
            },
            transaction: transaction,
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        return connection.ExecuteAsync(cmd);
    }

    public async Task<IReadOnlyList<AuditEventDto>> ListBySubjectAsync(
        Guid tenantId,
        Guid subjectId,
        DateTimeOffset? fromUtc,
        DateTimeOffset? toUtc,
        CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Audit_ListBySubject",
            new
            {
                TenantId = tenantId,
                SubjectId = subjectId,
                FromUtc = fromUtc?.UtcDateTime,
                ToUtc = toUtc?.UtcDateTime
            },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        var rows = await conn.QueryAsync<AuditEventDto>(cmd);
        return rows.ToList();
    }

    public async Task<IReadOnlyList<AuditEventDto>> ListByActorAsync(
        Guid tenantId,
        Guid actorUserId,
        DateTimeOffset fromUtc,
        DateTimeOffset toUtc,
        CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Audit_ListByActor",
            new
            {
                TenantId = tenantId,
                ActorUserId = actorUserId,
                FromUtc = fromUtc.UtcDateTime,
                ToUtc = toUtc.UtcDateTime
            },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        var rows = await conn.QueryAsync<AuditEventDto>(cmd);
        return rows.ToList();
    }
}
