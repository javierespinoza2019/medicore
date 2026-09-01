using MediCore.Models.Sync;

namespace MediCore.Business.Sync;

/// <summary>Contexto de un comando de la cola offline al planificar el despacho.</summary>
public sealed class SyncCommandContext
{
    public required Guid TenantId { get; init; }
    public required Guid UserId { get; init; }
    public Guid? ActorProfessionalId { get; init; }
    public required SyncEnvelopeRequest Request { get; init; }
}

/// <summary>
/// Un handler por <c>commandType</c> (o familia). Planifica el efecto clínico;
/// la TX de idempotencia + SP + outbox la abre <see cref="ISyncRepository"/>.
/// </summary>
public interface ISyncCommandHandler
{
    IReadOnlyCollection<string> CommandTypes { get; }

    SyncCommandSupport Support { get; }

    /// <summary>
    /// Valida el payload y prepara el plan. Soporte parcial: lanza <see cref="ArgumentException"/> (400).
    /// </summary>
    Task<SyncCommandPlan> PlanAsync(SyncCommandContext context, CancellationToken ct);
}

public interface ISyncCommandRegistry
{
    bool TryGet(string commandType, out ISyncCommandHandler? handler);

    IReadOnlyCollection<string> RegisteredCommandTypes { get; }
}

public sealed class SyncCommandRegistry : ISyncCommandRegistry
{
    private readonly Dictionary<string, ISyncCommandHandler> _byType;

    public SyncCommandRegistry(IEnumerable<ISyncCommandHandler> handlers)
    {
        _byType = new Dictionary<string, ISyncCommandHandler>(StringComparer.OrdinalIgnoreCase);
        foreach (var handler in handlers)
        {
            foreach (var type in handler.CommandTypes)
            {
                if (string.IsNullOrWhiteSpace(type))
                    continue;
                if (!_byType.TryAdd(type.Trim(), handler))
                {
                    throw new InvalidOperationException(
                        $"commandType '{type}' está registrado más de una vez en el SyncCommandRegistry.");
                }
            }
        }
    }

    public IReadOnlyCollection<string> RegisteredCommandTypes => _byType.Keys.OrderBy(k => k).ToArray();

    public bool TryGet(string commandType, out ISyncCommandHandler? handler)
    {
        if (string.IsNullOrWhiteSpace(commandType))
        {
            handler = null;
            return false;
        }

        return _byType.TryGetValue(commandType.Trim(), out handler);
    }
}
