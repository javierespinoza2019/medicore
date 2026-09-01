using MediCore.Business.ClinicalRecord;
using MediCore.Models.ClinicalRecord;

namespace MediCore.Business.Tests.ClinicalRecord;

public sealed class ClinicalRecordDomainTests
{
    [Fact]
    public void Fabrica_historia_nueva_todo_en_no_interrogado()
    {
        var body = ClinicalRecordDomain.CreateEmptyHistoryBody();

        Assert.Equal(InterrogatorioEstados.NoInterrogado, body.HeredoFamiliares.Estado);
        Assert.Equal(InterrogatorioEstados.NoInterrogado, body.PersonalesPatologicos.Estado);
        Assert.Equal(InterrogatorioEstados.NoInterrogado, body.PersonalesNoPatologicos.Estado);
        Assert.Equal(InterrogatorioEstados.NoInterrogado, body.GinecoObstetricos.Estado);
        Assert.Equal(InterrogatorioEstados.NoInterrogado, body.AparatosYSistemas.Estado);
        Assert.Equal(InterrogatorioEstados.NoInterrogado, body.HabitusExterior.Estado);
        Assert.Equal(InterrogatorioEstados.NoInterrogado, body.PadecimientoActual.Estado);
        Assert.Null(body.Observaciones);

        var json = body.ToJson();
        Assert.Contains("no_interrogado", json);
        Assert.DoesNotContain("negado", json);
        Assert.DoesNotContain("\"normal\"", json);
    }

    [Fact]
    public void Estado_alergico_no_interrogado_no_se_presenta_como_sin_alergias()
    {
        var label = ClinicalRecordDomain.AllergyStatusDisplayLabel(
            AllergyStatusCodes.NoInterrogado, activeAllergyCount: 0);

        Assert.Equal("Alergias no interrogadas", label);
        Assert.DoesNotContain("sin alergias", label, StringComparison.OrdinalIgnoreCase);
        Assert.True(ClinicalRecordDomain.LooksLikeSinAlergiasClaim(
            AllergyStatusCodes.NoInterrogado, 0));
    }

    [Fact]
    public void Niega_y_refiere_tienen_etiquetas_distintas_de_no_interrogado()
    {
        var niega = ClinicalRecordDomain.AllergyStatusDisplayLabel(AllergyStatusCodes.Niega, 0);
        var refiere = ClinicalRecordDomain.AllergyStatusDisplayLabel(AllergyStatusCodes.Refiere, 2);
        var noInter = ClinicalRecordDomain.AllergyStatusDisplayLabel(AllergyStatusCodes.NoInterrogado, 0);

        Assert.Contains("Niega", niega, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Refiere", refiere, StringComparison.OrdinalIgnoreCase);
        Assert.NotEqual(niega, noInter);
        Assert.NotEqual(refiere, noInter);
    }

    [Fact]
    public void Paciente_no_puede_responder_es_estado_explicito_para_prescripcion()
    {
        var label = ClinicalRecordDomain.AllergyStatusDisplayLabel(
            AllergyStatusCodes.PacienteNoPuedeResponder, 0);
        Assert.Contains("no puede responder", label, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void AuthZ_provisional_roles_clinicos()
    {
        Assert.True(ClinicalRecordAccess.CanReadOrWrite(true, ["caja"]));
        Assert.True(ClinicalRecordAccess.CanReadOrWrite(false, ["medico"]));
        Assert.True(ClinicalRecordAccess.CanReadOrWrite(false, ["enfermeria"]));
        Assert.True(ClinicalRecordAccess.CanReadOrWrite(false, ["admin"]));
        Assert.False(ClinicalRecordAccess.CanReadOrWrite(false, ["caja"]));
        Assert.False(ClinicalRecordAccess.CanReadOrWrite(false, ["recepcion"]));
    }

    [Fact]
    public void Interrogatorio_conocido_exige_valor_incluso_lista_vacia()
    {
        var body = ClinicalRecordDomain.CreateEmptyHistoryBody();
        body.HeredoFamiliares = new InterrogatorioCampo
        {
            Estado = InterrogatorioEstados.Conocido,
            Valor = null
        };
        Assert.Throws<ArgumentException>(() => ClinicalRecordDomain.EnsureInterrogatorioCampos(body));
    }
}
