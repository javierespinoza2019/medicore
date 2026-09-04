using MediCore.Common;

namespace MediCore.Common.Tests;

public class PathSegmentSanitizerTests
{
    [Theory]
    [InlineData("Clínica Del Valle", "Clinica_Del_Valle")]
    [InlineData("demo", "demo")]
    [InlineData("A/B\\C", "ABC")]
    [InlineData("foo.bar:baz", "foobarbaz")]
    [InlineData("  hola  mundo  ", "hola_mundo")]
    public void Sanitize_aplica_reglas(string input, string expected) =>
        Assert.Equal(expected, PathSegmentSanitizer.Sanitize(input));

    [Fact]
    public void SanitizeFileName_conserva_extension() =>
        Assert.Equal("foto_paciente.jpg", PathSegmentSanitizer.SanitizeFileName("foto paciente.jpg"));

    [Fact]
    public void Sanitize_vacio_lanza() =>
        Assert.Throws<ArgumentException>(() => PathSegmentSanitizer.Sanitize("..."));
}
