using MediCore.Business.Triage;
using MediCore.Models.Triage;

namespace MediCore.Business.Tests.Triage;

public sealed class TriageVitalsNormalizerTests
{
    [Fact]
    public void Guardado_sin_signos_medidos_completa_no_tomado()
    {
        var result = TriageVitalsNormalizer.NormalizeForPersist(null);
        Assert.Equal(VitalSignCodes.Canonical.Count, result.Count);
        Assert.All(result, m =>
        {
            Assert.Equal(VitalMeasurementStates.NoMedido, m.State);
            Assert.Null(m.Value);
            Assert.Equal("no tomado", m.NotMeasuredReason);
        });
    }

    [Fact]
    public void No_fabrica_cero_cuando_falta_valor()
    {
        var result = TriageVitalsNormalizer.NormalizeForPersist(
        [
            new VitalMeasurementDto
            {
                SignCode = VitalSignCodes.Peso,
                Value = null,
                Unit = "kg",
                State = VitalMeasurementStates.NoMedido,
                NotMeasuredReason = "paciente en reanimación"
            }
        ]);
        var peso = result.Single(m => m.SignCode == VitalSignCodes.Peso);
        Assert.Null(peso.Value);
        Assert.Equal("paciente en reanimación", peso.NotMeasuredReason);
    }

    [Fact]
    public void Medido_exige_valor()
    {
        Assert.Throws<ArgumentException>(() =>
            TriageVitalsNormalizer.NormalizeExplicitOnly(
            [
                new VitalMeasurementDto
                {
                    SignCode = VitalSignCodes.Temperatura,
                    Value = null,
                    Unit = "C",
                    State = VitalMeasurementStates.Medido
                }
            ]));
    }
}

public sealed class TriageScaleRulesTests
{
    [Fact]
    public void Cascada_prioridad_resuelve_nivel()
    {
        var scale = new TriageScaleConfigDto
        {
            ScaleCode = "demo",
            Levels =
            [
                new TriageScaleLevelDto { Code = "prioridad_1", Label = "Inmediato", Priority = 1 },
                new TriageScaleLevelDto { Code = "prioridad_5", Label = "No urgente", Priority = 5 },
            ]
        };
        Assert.Null(TriageScaleRules.ResolvePriority(scale, null));
        Assert.Equal(1, TriageScaleRules.ResolvePriority(scale, "prioridad_1"));
        Assert.Throws<ArgumentException>(() => TriageScaleRules.ResolvePriority(scale, "rojo"));
    }

    [Fact]
    public void Priority_cero_reservado_a_sin_clasificar()
    {
        Assert.Throws<ArgumentException>(() =>
            TriageScaleRules.EnsureValidLevels(
            [
                new TriageScaleLevelDto { Code = "x", Label = "X", Priority = 0 }
            ]));
    }
}

public sealed class VitalReferenceRangesTests
{
    [Fact]
    public void Usa_solo_sexo_biologico_no_genero()
    {
        // Ausente ≠ masculino. Banda genérica.
        var gen = VitalReferenceRanges.For(VitalSignCodes.FrecuenciaCardiaca, null);
        var fem = VitalReferenceRanges.For(VitalSignCodes.FrecuenciaCardiaca, "femenino");
        Assert.NotNull(gen);
        Assert.NotNull(fem);
        Assert.NotEqual(gen!.Min, fem!.Min);
    }

    [Fact]
    public void Valor_ausente_no_es_fuera_de_rango()
    {
        // IsOutOfRange sólo aplica a magnitudes medidas.
        Assert.False(VitalReferenceRanges.IsOutOfRange(VitalSignCodes.Temperatura, 36.5m, null));
        Assert.True(VitalReferenceRanges.IsOutOfRange(VitalSignCodes.Temperatura, 41m, null));
    }
}

public sealed class EncounterQueueWithTriagePriorityTests
{
    [Fact]
    public void Nivel_nulo_ordena_primero_luego_prioridad_de_escala()
    {
        var t0 = DateTimeOffset.Parse("2026-08-28T10:00:00Z");
        var items = new List<MediCore.Models.Encounter.EncounterDto>
        {
            new()
            {
                EncounterId = Guid.NewGuid(),
                State = MediCore.Models.Encounter.EncounterStates.Abierto,
                ArrivalAtUtc = t0,
                TriageLevel = "prioridad_5",
                TriagePriority = 5,
                TurnNumber = 3
            },
            new()
            {
                EncounterId = Guid.NewGuid(),
                State = MediCore.Models.Encounter.EncounterStates.Abierto,
                ArrivalAtUtc = t0.AddMinutes(5),
                TriageLevel = null,
                TriagePriority = 0,
                TurnNumber = 1
            },
            new()
            {
                EncounterId = Guid.NewGuid(),
                State = MediCore.Models.Encounter.EncounterStates.Abierto,
                ArrivalAtUtc = t0.AddMinutes(1),
                TriageLevel = "prioridad_1",
                TriagePriority = 1,
                TurnNumber = 2
            },
        };

        var sorted = MediCore.Business.Encounter.EncounterQueueOrdering.Sort(items);
        Assert.Null(sorted[0].TriageLevel);
        Assert.Equal("prioridad_1", sorted[1].TriageLevel);
        Assert.Equal("prioridad_5", sorted[2].TriageLevel);
    }
}
