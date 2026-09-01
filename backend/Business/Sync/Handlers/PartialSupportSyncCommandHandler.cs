using MediCore.Models.Sync;

namespace MediCore.Business.Sync.Handlers;

/// <summary>
/// Reserva para commandTypes documentados aún sin DTO/efecto SP estable.
/// M3–M9 (create/state clínicos) ya están en handlers Full.
/// </summary>
public sealed class PartialSupportSyncCommandHandler : ISyncCommandHandler
{
    public static readonly string[] DocumentedTypes = [];

    public IReadOnlyCollection<string> CommandTypes => DocumentedTypes;

    public SyncCommandSupport Support => SyncCommandSupport.Partial;

    public Task<SyncCommandPlan> PlanAsync(SyncCommandContext context, CancellationToken ct)
    {
        var type = context.Request.CommandType;
        throw new ArgumentException(
            $"El commandType '{type}' está documentado como offline pero aún tiene soporte parcial en SyncService: " +
            "no hay DTO/efecto SP estable para despacharlo en la misma transacción de idempotencia. " +
            "Use la API online del módulo correspondiente, o reintente cuando el handler Full esté disponible.");
    }
}
