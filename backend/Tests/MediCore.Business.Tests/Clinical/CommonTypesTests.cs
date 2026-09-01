using MediCore.Business.Audit;
using MediCore.Models.Clinical;

namespace MediCore.Business.Tests.Clinical;

public sealed class CommonTypesTests
{
    [Fact]
    public void Medicion_medida_exige_unidad_y_conserva_valor()
    {
        var m = Medicion<string>.Medida(36.5m, "C", OrigenMedicion.Medido);
        Assert.Equal(36.5m, m.Valor);
        Assert.Equal("C", m.Unidad);
        Assert.Equal(EstadoMedicion.Medido, m.Estado);
    }

    [Fact]
    public void Medicion_sin_valor_exige_estado_y_razon_explicitos()
    {
        var noMedida = Medicion<string>.NoMedida("kg", "paciente_no_cooperador");
        Assert.Null(noMedida.Valor);
        Assert.Equal(EstadoMedicion.NoMedido, noMedida.Estado);
        Assert.Equal("paciente_no_cooperador", noMedida.RazonNoMedido);

        Assert.Throws<ArgumentException>(() =>
            Medicion<string>.NoMedida("kg", "   "));
    }

    [Fact]
    public void Medicion_cero_explicito_solo_como_medido_nunca_por_omision()
    {
        var m = Medicion<string>.Medida(0m, "kg");
        Assert.Equal(0m, m.Valor);
        Assert.Equal(EstadoMedicion.Medido, m.Estado);
    }

    [Fact]
    public void EstadoInterrogatorio_no_interrogado_no_colapsa_con_lista_vacia()
    {
        var noInterrogado = EstadoInterrogatorio<IReadOnlyList<string>>.NoInterrogado();
        var conocidoVacio = EstadoInterrogatorio<IReadOnlyList<string>>.Conocido(Array.Empty<string>());

        Assert.Equal(EstadoInterrogatorioCodigo.NoInterrogado, noInterrogado.Estado);
        Assert.Null(noInterrogado.Valor);

        Assert.Equal(EstadoInterrogatorioCodigo.Conocido, conocidoVacio.Estado);
        Assert.NotNull(conocidoVacio.Valor);
        Assert.Empty(conocidoVacio.Valor!);
        Assert.NotEqual(noInterrogado.Estado, conocidoVacio.Estado);
    }

    [Fact]
    public void Firma_hash_de_contenido_es_estable()
    {
        const string payload = """{"nota":"evolucion","cie10":null}""";
        var h1 = Firma.HashContenidoSha256(payload);
        var h2 = Firma.HashContenidoSha256(payload);
        Assert.Equal(h1, h2);
        Assert.Equal(64, h1.Length);

        var firma = Firma.Pendiente("SHA256", h1, DateTimeOffset.Parse("2026-08-28T12:00:00Z"));
        Assert.Equal(h1, firma.ContentHash);
        Assert.Equal(SelloEstado.Pendiente, firma.SelloEstado);
        Assert.Null(firma.SelloAtUtc);
    }

    [Fact]
    public void Autoria_rechaza_displayName_vacio()
    {
        Assert.Throws<ArgumentException>(() =>
            Autoria.Crear(Guid.NewGuid(), "  ", DateTimeOffset.UtcNow, DateTimeOffset.UtcNow));
    }

    [Fact]
    public void Dinero_rechaza_mas_de_cuatro_decimales()
    {
        Assert.Throws<ArgumentException>(() => Dinero.Crear(1.12345m, "MXN"));
        var ok = Dinero.Crear(1.1234m, "mxn");
        Assert.Equal("MXN", ok.Moneda);
    }

    [Fact]
    public void AuditAccess_solo_admin_o_superadmin()
    {
        Assert.True(AuditAccess.CanQuery(true, ["medico"]));
        Assert.True(AuditAccess.CanQuery(false, ["admin"]));
        Assert.True(AuditAccess.CanQuery(false, ["SuperAdmin"]));
        Assert.False(AuditAccess.CanQuery(false, ["medico"]));
        Assert.False(AuditAccess.CanQuery(false, ["recepcion", "enfermeria"]));
    }
}
