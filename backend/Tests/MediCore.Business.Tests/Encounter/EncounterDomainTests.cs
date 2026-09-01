using MediCore.Business.Encounter;
using MediCore.Models.Encounter;

namespace MediCore.Business.Tests.Encounter;

public sealed class EncounterStateMachineTests
{
    [Theory]
    [InlineData(EncounterStates.Abierto, EncounterStates.EnObservacion)]
    [InlineData(EncounterStates.Abierto, EncounterStates.Cerrado)]
    [InlineData(EncounterStates.EnObservacion, EncounterStates.Abierto)]
    [InlineData(EncounterStates.EnObservacion, EncounterStates.Cerrado)]
    public void Transiciones_validas(string from, string to) =>
        Assert.True(EncounterStateMachine.CanTransition(from, to));

    [Theory]
    [InlineData(EncounterStates.Cerrado, EncounterStates.Abierto)]
    [InlineData(EncounterStates.Abierto, EncounterStates.Abierto)]
    public void Transiciones_invalidas(string from, string to) =>
        Assert.False(EncounterStateMachine.CanTransition(from, to));
}

public sealed class EncounterQueueOrderingTests
{
    [Fact]
    public void Sin_clasificar_va_arriba_luego_estado_luego_llegada()
    {
        var t0 = DateTimeOffset.Parse("2026-08-28T10:00:00Z");
        var t1 = DateTimeOffset.Parse("2026-08-28T10:05:00Z");
        var t2 = DateTimeOffset.Parse("2026-08-28T10:10:00Z");

        var items = new List<EncounterDto>
        {
            new()
            {
                EncounterId = Guid.NewGuid(), State = EncounterStates.Abierto,
                ArrivalAtUtc = t2, TriageLevel = "rojo", TurnNumber = 3
            },
            new()
            {
                EncounterId = Guid.NewGuid(), State = EncounterStates.EnObservacion,
                ArrivalAtUtc = t0, TriageLevel = null, TurnNumber = 1
            },
            new()
            {
                EncounterId = Guid.NewGuid(), State = EncounterStates.Abierto,
                ArrivalAtUtc = t1, TriageLevel = null, TurnNumber = 2
            },
        };

        var sorted = EncounterQueueOrdering.Sort(items);
        Assert.Equal(3, sorted.Count);
        // Ambos sin clasificar primero; entre ellos: abierto antes que en_observacion? 
        // StateSort: abierto=0, en_observacion=1. t1 abierto sin clasificar, t0 en_obs sin clasificar.
        Assert.Null(sorted[0].TriageLevel);
        Assert.Equal(EncounterStates.Abierto, sorted[0].State);
        Assert.Equal(t1, sorted[0].ArrivalAtUtc);
        Assert.Null(sorted[1].TriageLevel);
        Assert.Equal(EncounterStates.EnObservacion, sorted[1].State);
        Assert.NotNull(sorted[2].TriageLevel);
    }

    [Fact]
    public void Todos_sin_clasificar_ordenan_por_estado_y_llegada()
    {
        var early = DateTimeOffset.Parse("2026-08-28T08:00:00Z");
        var late = DateTimeOffset.Parse("2026-08-28T09:00:00Z");
        var items = new[]
        {
            new EncounterDto { EncounterId = Guid.NewGuid(), State = EncounterStates.Abierto, ArrivalAtUtc = late, TurnNumber = 2 },
            new EncounterDto { EncounterId = Guid.NewGuid(), State = EncounterStates.Abierto, ArrivalAtUtc = early, TurnNumber = 1 },
        };
        var sorted = EncounterQueueOrdering.Sort(items);
        Assert.Equal(early, sorted[0].ArrivalAtUtc);
        Assert.Equal(late, sorted[1].ArrivalAtUtc);
    }
}

public sealed class CareWithoutConsentRulesTests
{
    [Fact]
    public void Rechaza_mismo_profesional_dos_veces()
    {
        var id = Guid.NewGuid();
        Assert.Throws<InvalidOperationException>(() =>
            CareWithoutConsentRules.EnsureDistinctProfessionals(id, id));
    }

    [Fact]
    public void Acepta_dos_profesionales_distintos()
    {
        CareWithoutConsentRules.EnsureDistinctProfessionals(Guid.NewGuid(), Guid.NewGuid());
    }
}

public sealed class PendingPrescriptionCloseRulesTests
{
    [Fact]
    public void Sin_pendientes_permite_cierre()
    {
        PendingPrescriptionCloseRules.EnsureAllowed(0, null);
        PendingPrescriptionCloseRules.EnsureAllowed(0, "");
    }

    [Fact]
    public void Con_pendientes_y_motivo_permite_cierre()
    {
        PendingPrescriptionCloseRules.EnsureAllowed(2, "Firma pendiente de pediatría; alta urgente SC-04");
    }

    [Fact]
    public void Con_pendientes_sin_motivo_lanza_409()
    {
        var ex = Assert.Throws<EncounterCloseWithPendingPrescriptionsException>(() =>
            PendingPrescriptionCloseRules.EnsureAllowed(3, null));
        Assert.Equal(3, ex.PendingCount);
        Assert.Contains("sin firmar", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Motivo_en_blanco_se_trata_como_ausente()
    {
        Assert.Throws<EncounterCloseWithPendingPrescriptionsException>(() =>
            PendingPrescriptionCloseRules.EnsureAllowed(1, "   "));
    }

    [Theory]
    [InlineData("CLOSE_WITH_PENDING_RX:2:texto", 2)]
    [InlineData("CLOSE_WITH_PENDING_RX:CLOSE_WITH_PENDING_RX:5:texto", 5)]
    public void Parsea_mensaje_del_repositorio(string message, int expected)
    {
        var ex = PendingPrescriptionCloseRules.FromRepositoryMessage(message);
        Assert.Equal(expected, ex.PendingCount);
    }
}

public sealed class MpNoticeSuggestionTests
{
    [Theory]
    [InlineData("agresion", true)]
    [InlineData("hecho_transito", true)]
    [InlineData("causa_medica_no_traumatica", false)]
    [InlineData(null, false)]
    public void Sugiere_sin_determinar(string? circumstance, bool expected) =>
        Assert.Equal(expected, MpNoticeSuggestion.ShouldSuggestEvaluation(circumstance));
}
