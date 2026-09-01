namespace MediCore.Models.Sync;

/// <summary>Nivel de soporte del handler para un <c>commandType</c>.</summary>
public enum SyncCommandSupport
{
    /// <summary>Ejecuta el efecto clínico (SP) en la misma TX que la idempotencia.</summary>
    Full = 0,

    /// <summary>Tipo documentado pero aún sin DTO/efecto estable → 400 claro.</summary>
    Partial = 1
}

/// <summary>Invocación de un SP clínico dentro de la TX de sync.</summary>
public sealed class SyncProcedureCall
{
    public required string ProcedureName { get; init; }
    public required object Parameters { get; init; }
}

/// <summary>
/// Plan producido por un handler antes de abrir la TX de sync.
/// Las lecturas de preparación ya ocurrieron; aquí solo van escrituras atómicas.
/// </summary>
public sealed class SyncCommandPlan
{
    public required string ServerEntityId { get; init; }

    /// <summary>Vacío = sólo idempotencia (p. ej. noop de contrato o tipo sin efecto aún).</summary>
    public IReadOnlyList<SyncProcedureCall> ClinicalProcedures { get; init; } = [];

    /// <summary>Además del prefijo dgis./sinba. del SyncService.</summary>
    public bool RequiresDgisOutbox { get; init; }
}
