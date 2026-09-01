using MediCore.Models.Encounter;

namespace MediCore.Business.Encounter;

/// <summary>Máquina de estados del episodio (M4).</summary>
public static class EncounterStateMachine
{
    private static readonly HashSet<(string From, string To)> Allowed = new()
    {
        (EncounterStates.Abierto, EncounterStates.EnObservacion),
        (EncounterStates.Abierto, EncounterStates.Cerrado),
        (EncounterStates.EnObservacion, EncounterStates.Abierto),
        (EncounterStates.EnObservacion, EncounterStates.Cerrado),
    };

    public static bool CanTransition(string from, string to) =>
        Allowed.Contains((from, to));

    public static void EnsureAllowed(string from, string to)
    {
        if (!EncounterStates.All.Contains(to))
            throw new ArgumentException($"Estado de episodio no reconocido: {to}.");
        if (string.Equals(from, EncounterStates.Cerrado, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("No se puede transicionar un episodio cerrado.");
        if (!CanTransition(from, to))
            throw new InvalidOperationException($"Transición inválida: {from} → {to}.");
    }
}

/// <summary>
/// Orden de cola: nivel triage → estado → llegada; «sin clasificar» primero (SC-07).
/// </summary>
public static class EncounterQueueOrdering
{
    /// <param name="triagePriority">null o ausente = sin clasificar (prioridad 0, arriba).</param>
    public static int TriageSortKey(int? triagePriority) =>
        triagePriority is null or < 0 ? 0 : triagePriority.Value;

    public static int StateSortKey(string state) => state.ToLowerInvariant() switch
    {
        EncounterStates.Abierto => 0,
        EncounterStates.EnObservacion => 1,
        EncounterStates.Cerrado => 2,
        _ => 9
    };

    public static IReadOnlyList<EncounterDto> Sort(IEnumerable<EncounterDto> items)
    {
        return items
            .OrderBy(e => TriageSortKey(e.TriagePriority ?? ParseTriagePriority(e.TriageLevel)))
            .ThenBy(e => StateSortKey(e.State))
            .ThenBy(e => e.ArrivalAtUtc)
            .ToList();
    }

    /// <summary>
    /// Sin nivel = sin clasificar (null → sort 0).
    /// Con nivel y sin TriagePriority explícito: clasificado genérico (1).
    /// </summary>
    public static int? ParseTriagePriority(string? triageLevel) =>
        string.IsNullOrWhiteSpace(triageLevel) ? null : 1;
}

/// <summary>
/// Sugiere valorar aviso al MP según circunstancia. Nunca determina ni bloquea.
/// Fundamento sanitario: Reglamento art. 19 fracc. V (presunción de ilícito = juicio humano).
/// No se afirma fundamento penal (doc 01 §8).
/// </summary>
public static class MpNoticeSuggestion
{
    public static bool ShouldSuggestEvaluation(string? admissionCircumstance)
    {
        if (string.IsNullOrWhiteSpace(admissionCircumstance)) return false;
        return AdmissionCircumstances.SuggestMpNotice.Contains(admissionCircumstance.Trim());
    }
}

/// <summary>Validación de constancia sin consentimiento (dos profesionales distintos).</summary>
public static class CareWithoutConsentRules
{
    public static void EnsureDistinctProfessionals(Guid professionalId1, Guid professionalId2)
    {
        if (professionalId1 == Guid.Empty || professionalId2 == Guid.Empty)
            throw new ArgumentException("Care-without-consent exige dos ProfessionalId.");
        if (professionalId1 == professionalId2)
            throw new InvalidOperationException(
                "Care-without-consent exige dos ProfessionalId distintos.");
    }
}

/// <summary>
/// SC-04: alta con recetas sin firmar. Defensa en profundidad; el SP es la fuente dura.
/// </summary>
public static class PendingPrescriptionCloseRules
{
    public static void EnsureAllowed(int pendingCount, string? overrideReason)
    {
        if (pendingCount <= 0)
            return;
        if (!string.IsNullOrWhiteSpace(overrideReason))
            return;
        throw new EncounterCloseWithPendingPrescriptionsException(pendingCount);
    }

    /// <summary>Parsea mensajes del SP: CLOSE_WITH_PENDING_RX:{n}:… o CLOSE_WITH_PENDING_RX:CLOSE_WITH_PENDING_RX:{n}:…</summary>
    public static EncounterCloseWithPendingPrescriptionsException FromRepositoryMessage(string message)
    {
        const string prefix = "CLOSE_WITH_PENDING_RX:";
        var payload = message.StartsWith(prefix, StringComparison.Ordinal)
            ? message[prefix.Length..]
            : message;
        if (payload.StartsWith(prefix, StringComparison.Ordinal))
            payload = payload[prefix.Length..];

        var colon = payload.IndexOf(':');
        var countPart = colon >= 0 ? payload[..colon] : payload;
        if (int.TryParse(countPart, out var count) && count > 0)
            return new EncounterCloseWithPendingPrescriptionsException(count);

        return new EncounterCloseWithPendingPrescriptionsException(1);
    }
}

// Excepciones de cierre viven en MediCore.Models.Encounter (uso desde DataAccess sin ciclo).
