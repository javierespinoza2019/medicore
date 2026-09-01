using System.Data;
using MediCore.DataAccess.Audit;
using MediCore.Models.Audit;

namespace MediCore.Business.Audit;

public interface IAuditService
{
    /// <summary>Append listo para usarse dentro de la transacción del hecho clínico (cuando exista).</summary>
    Task AppendInTransactionAsync(
        IDbConnection connection,
        IDbTransaction transaction,
        AppendAuditEventCommand command,
        CancellationToken ct);

    Task AppendAsync(AppendAuditEventCommand command, CancellationToken ct);

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

public sealed class AuditService(IAuditRepository repository) : IAuditService
{
    public Task AppendInTransactionAsync(
        IDbConnection connection,
        IDbTransaction transaction,
        AppendAuditEventCommand command,
        CancellationToken ct) =>
        repository.AppendInTransactionAsync(connection, transaction, command, ct);

    public Task AppendAsync(AppendAuditEventCommand command, CancellationToken ct) =>
        repository.AppendAsync(command, ct);

    public Task<IReadOnlyList<AuditEventDto>> ListBySubjectAsync(
        Guid tenantId,
        Guid subjectId,
        DateTimeOffset? fromUtc,
        DateTimeOffset? toUtc,
        CancellationToken ct) =>
        repository.ListBySubjectAsync(tenantId, subjectId, fromUtc, toUtc, ct);

    public Task<IReadOnlyList<AuditEventDto>> ListByActorAsync(
        Guid tenantId,
        Guid actorUserId,
        DateTimeOffset fromUtc,
        DateTimeOffset toUtc,
        CancellationToken ct) =>
        repository.ListByActorAsync(tenantId, actorUserId, fromUtc, toUtc, ct);
}

/// <summary>
/// Autorización de consulta de auditoría.
/// Decisión 19 (doc 06, 2026-08-30): permanece SuperAdmin o rol <c>admin</c>
/// hasta una fase posterior; la matriz por tenant aún no sustituye este gate.
/// </summary>
public static class AuditAccess
{
    public const string AdminRole = "admin";
    public const string SuperAdminRole = "SuperAdmin";

    public static bool CanQuery(bool isSuperAdmin, IEnumerable<string> roles)
    {
        if (isSuperAdmin)
            return true;

        foreach (var role in roles)
        {
            if (string.Equals(role, AdminRole, StringComparison.OrdinalIgnoreCase))
                return true;
            if (string.Equals(role, SuperAdminRole, StringComparison.OrdinalIgnoreCase))
                return true;
        }

        return false;
    }
}
