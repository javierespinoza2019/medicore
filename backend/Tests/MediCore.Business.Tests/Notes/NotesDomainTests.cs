using System.Text.Json;
using MediCore.Business.Notes;
using MediCore.Models.Clinical;
using MediCore.Models.Notes;

namespace MediCore.Business.Tests.Notes;

public sealed class NotesDomainTests
{
    [Fact]
    public void Canonical_hash_es_estable_ante_mismo_contenido()
    {
        using var doc = JsonDocument.Parse("""{"plan":"reposo","subjetivo":"cefalea"}""");
        var h1 = NotesDomain.HashCanonical("evolucion", doc.RootElement, "reservado");
        var h2 = NotesDomain.HashCanonical("evolucion", doc.RootElement, "reservado");
        Assert.Equal(h1, h2);
        Assert.Equal(64, h1.Length);
    }

    [Fact]
    public void Canonical_hash_ordena_propiedades_del_body()
    {
        using var a = JsonDocument.Parse("""{"b":1,"a":2}""");
        using var b = JsonDocument.Parse("""{"a":2,"b":1}""");
        var h1 = NotesDomain.HashCanonical("evolucion", a.RootElement, null);
        var h2 = NotesDomain.HashCanonical("evolucion", b.RootElement, null);
        Assert.Equal(h1, h2);
    }

    [Fact]
    public void Canonical_hash_cambia_si_cambia_el_contenido()
    {
        using var a = JsonDocument.Parse("""{"plan":"A"}""");
        using var b = JsonDocument.Parse("""{"plan":"B"}""");
        var h1 = NotesDomain.HashCanonical("evolucion", a.RootElement, null);
        var h2 = NotesDomain.HashCanonical("evolucion", b.RootElement, null);
        Assert.NotEqual(h1, h2);
    }

    [Fact]
    public void NoteType_invalido_se_rechaza()
    {
        Assert.Throws<ArgumentException>(() => NotesDomain.EnsureNoteType("soap"));
        NotesDomain.EnsureNoteType("evolucion");
    }

    [Fact]
    public void Firma_pendiente_no_lleva_sello()
    {
        var hash = Firma.HashContenidoSha256("x");
        var firma = Firma.Pendiente(NotesDomain.HashAlgorithm, hash, DateTimeOffset.UtcNow);
        Assert.Equal(SelloEstado.Pendiente, firma.SelloEstado);
        Assert.Null(firma.SelloAtUtc);
    }

    [Fact]
    public void Acceso_clinico_provisional()
    {
        Assert.True(NotesAccess.CanReadOrWrite(false, ["medico"]));
        Assert.True(NotesAccess.CanReadOrWrite(false, ["enfermeria"]));
        Assert.False(NotesAccess.CanReadOrWrite(false, ["caja"]));
        Assert.True(NotesAccess.CanReadOrWrite(true, ["caja"]));
    }
}
