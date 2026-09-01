using MediCore.Business.Prescription;
using MediCore.Models.Prescription;

namespace MediCore.Business.Tests.Prescription;

public sealed class PrescriptionDomainTests
{
    [Fact]
    public void Item_controlado_mensaje_explicito()
    {
        Assert.Contains("recetario especial", PrescriptionControlledSubstanceException.DefaultMessage);
        Assert.Contains("LGS", PrescriptionControlledSubstanceException.DefaultMessage);
    }

    [Fact]
    public void Frecuencia_texto_libre_se_rechaza()
    {
        Assert.Throws<ArgumentException>(() =>
            PrescriptionDomain.EnsureFrequency(new FrequencyDto { Kind = "c/8h", N = 1 }));
    }

    [Fact]
    public void Frecuencia_estructurada_valida()
    {
        PrescriptionDomain.EnsureFrequency(new FrequencyDto
        {
            Kind = FrequencyKinds.EveryNHours,
            N = 8
        });
        PrescriptionDomain.EnsureFrequency(new FrequencyDto
        {
            Kind = FrequencyKinds.NTimesPerDay,
            N = 3
        });
    }

    [Fact]
    public void Vigencia_derivada_30_dias_para_fraccion_IV()
    {
        var issued = new DateTimeOffset(2026, 8, 28, 12, 0, 0, TimeSpan.Zero);
        var until = PrescriptionDomain.DeriveValidUntil(issued, [SaleClassifications.IV]);
        Assert.Equal(issued.AddDays(30), until);
    }

    [Fact]
    public void Vigencia_nula_para_fraccion_VI()
    {
        var issued = DateTimeOffset.UtcNow;
        var until = PrescriptionDomain.DeriveValidUntil(issued, [SaleClassifications.VI]);
        Assert.Null(until);
    }

    [Fact]
    public void Hash_canonico_estable()
    {
        var rx = SampleRx();
        var h1 = PrescriptionDomain.HashCanonical(rx);
        var h2 = PrescriptionDomain.HashCanonical(rx);
        Assert.Equal(h1, h2);
        Assert.Equal(64, h1.Length);
    }

    [Fact]
    public void Acceso_clinico_provisional()
    {
        Assert.True(PrescriptionAccess.CanReadOrWrite(false, ["medico"]));
        Assert.False(PrescriptionAccess.CanReadOrWrite(false, ["caja"]));
        Assert.True(PrescriptionAccess.CanReadOrWrite(true, ["caja"]));
    }

    private static PrescriptionDto SampleRx() => new()
    {
        PrescriptionId = Guid.Parse("11111111-1111-1111-1111-111111111111"),
        EncounterId = Guid.Parse("22222222-2222-2222-2222-222222222222"),
        SubjectId = Guid.Parse("33333333-3333-3333-3333-333333333333"),
        AllergyStatusAtIssue = "niega",
        GeneralInstructions = "con alimentos",
        Items =
        [
            new PrescriptionItemDto
            {
                PrescriptionItemId = Guid.NewGuid(),
                PrescriptionId = Guid.Parse("11111111-1111-1111-1111-111111111111"),
                LineNumber = 1,
                MedicationId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001"),
                GenericNameSnapshot = "Paracetamol",
                Dose = new DoseDto { Valor = 500, Unidad = "mg", Estado = "medido", Origen = "medido" },
                Route = "oral",
                Frequency = new FrequencyDto { Kind = FrequencyKinds.EveryNHours, N = 8 },
                DurationDays = 5,
                Quantity = 15,
                RefillsAllowed = 0
            }
        ]
    };
}
