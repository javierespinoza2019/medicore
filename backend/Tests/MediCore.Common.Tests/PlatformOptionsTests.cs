using MediCore.Common;

namespace MediCore.Common.Tests;

/// <summary>
/// Salvaguardas del doc 12: shared/demo sin PHI, dedicado antes de paciente real,
/// DGIS siempre presente con destino según ambiente. Un perfil contradictorio no arranca.
/// </summary>
public class PlatformOptionsTests
{
    private static PlatformOptions Dev() => new()
    {
        EnvironmentName = "Development",
        IsDemo = true,
        AllowSyntheticSeed = true,
        AllowRealPatientData = false,
        DgisDestination = "non-production"
    };

    [Fact]
    public void PerfilDev_DemoConSeedSintetico_EsValido()
    {
        Dev().Validate();
    }

    [Fact]
    public void PerfilProduction_SinSeedNiPhi_EsValido()
    {
        var options = new PlatformOptions
        {
            EnvironmentName = "Production",
            IsDemo = false,
            AllowSyntheticSeed = false,
            AllowRealPatientData = false,
            DgisDestination = "non-production"
        };

        options.Validate();
    }

    [Fact]
    public void EntornoDedicadoAutorizado_PermiteDestinoDgisProduction()
    {
        var options = new PlatformOptions
        {
            EnvironmentName = "Production",
            IsDemo = false,
            AllowSyntheticSeed = false,
            AllowRealPatientData = true,
            DgisDestination = "production"
        };

        options.Validate();
    }

    [Fact]
    public void Demo_ConPacientesReales_NoArranca()
    {
        var options = Dev();
        options.AllowRealPatientData = true;
        options.AllowSyntheticSeed = false;

        var error = Assert.Throws<InvalidOperationException>(options.Validate);
        Assert.Contains("AllowRealPatientData", error.Message);
    }

    [Fact]
    public void PacientesReales_ConSeedSintetico_NoArranca()
    {
        var options = new PlatformOptions
        {
            EnvironmentName = "QA",
            IsDemo = false,
            AllowSyntheticSeed = true,
            AllowRealPatientData = true,
            DgisDestination = "non-production"
        };

        var error = Assert.Throws<InvalidOperationException>(options.Validate);
        Assert.Contains("seed sintético", error.Message);
    }

    [Fact]
    public void Production_ConSeedSintetico_NoArranca()
    {
        var options = new PlatformOptions
        {
            EnvironmentName = "Production",
            IsDemo = false,
            AllowSyntheticSeed = true,
            AllowRealPatientData = false,
            DgisDestination = "non-production"
        };

        var error = Assert.Throws<InvalidOperationException>(options.Validate);
        Assert.Contains("Production", error.Message);
    }

    [Fact]
    public void DestinoDgisProduction_SinAutorizacionDeDatosReales_NoArranca()
    {
        var options = Dev();
        options.DgisDestination = "production";

        var error = Assert.Throws<InvalidOperationException>(options.Validate);
        Assert.Contains("destino DGIS", error.Message);
    }

    [Theory]
    [InlineData("")]
    [InlineData("Production")]
    [InlineData("prod")]
    [InlineData("demo")]
    public void DestinoDgisDesconocido_NoArranca(string destino)
    {
        var options = Dev();
        options.DgisDestination = destino;

        var error = Assert.Throws<InvalidOperationException>(options.Validate);
        Assert.Contains("DgisDestination", error.Message);
    }

    [Theory]
    [InlineData("Production", true, false)]
    [InlineData("production", true, false)]
    [InlineData("Development", false, true)]
    [InlineData("QA", false, false)]
    public void BanderasDeAmbiente_SeDerivanDelNombre(string nombre, bool esProduction, bool esDevelopment)
    {
        var options = new PlatformOptions { EnvironmentName = nombre };

        Assert.Equal(esProduction, options.IsProduction);
        Assert.Equal(esDevelopment, options.IsDevelopment);
    }
}
