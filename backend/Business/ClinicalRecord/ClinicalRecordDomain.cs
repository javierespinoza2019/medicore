using MediCore.Models.ClinicalRecord;

namespace MediCore.Business.ClinicalRecord;

/// <summary>AuthZ provisional del expediente (matriz por tenant pendiente; doc 06 §19).</summary>
public static class ClinicalRecordAccess
{
    private static readonly HashSet<string> ClinicalRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        "admin", "SuperAdmin", "medico", "enfermeria"
    };

    public static bool CanReadOrWrite(bool isSuperAdmin, IEnumerable<string> roles)
    {
        if (isSuperAdmin) return true;
        foreach (var role in roles)
        {
            if (ClinicalRoles.Contains(role)) return true;
        }
        return false;
    }
}

/// <summary>
/// Fábrica y reglas de presentación del expediente.
/// Prohibido fabricar negado/normal; lista vacía ≠ no_interrogado.
/// </summary>
public static class ClinicalRecordDomain
{
    public static MedicalHistoryBody CreateEmptyHistoryBody() =>
        MedicalHistoryBody.EmptyNoInterrogado();

    /// <summary>
    /// Texto UI seguro para estado alérgico. Nunca «sin alergias» si es no_interrogado
    /// aunque la lista esté vacía (BM-PAC-01, SC-01).
    /// </summary>
    public static string AllergyStatusDisplayLabel(string status, int activeAllergyCount)
    {
        var s = (status ?? string.Empty).Trim().ToLowerInvariant();
        return s switch
        {
            AllergyStatusCodes.NoInterrogado => "Alergias no interrogadas",
            AllergyStatusCodes.PacienteNoPuedeResponder => "Paciente no puede responder sobre alergias",
            AllergyStatusCodes.SeDesconoce => "Se desconoce estado alérgico",
            AllergyStatusCodes.Niega => "Niega alergias conocidas",
            AllergyStatusCodes.Refiere => activeAllergyCount > 0
                ? $"Refiere alergias ({activeAllergyCount})"
                : "Refiere alergias (detalle pendiente)",
            _ => "Estado alérgico no disponible"
        };
    }

    public static bool LooksLikeSinAlergiasClaim(string status, int activeAllergyCount) =>
        string.Equals(status, AllergyStatusCodes.NoInterrogado, StringComparison.OrdinalIgnoreCase)
        && activeAllergyCount == 0;

    public static void EnsureInterrogatorioCampos(MedicalHistoryBody body)
    {
        ArgumentNullException.ThrowIfNull(body);
        ValidateCampo(nameof(body.HeredoFamiliares), body.HeredoFamiliares);
        ValidateCampo(nameof(body.PersonalesPatologicos), body.PersonalesPatologicos);
        ValidateCampo(nameof(body.PersonalesNoPatologicos), body.PersonalesNoPatologicos);
        ValidateCampo(nameof(body.GinecoObstetricos), body.GinecoObstetricos);
        ValidateCampo(nameof(body.AparatosYSistemas), body.AparatosYSistemas);
        ValidateCampo(nameof(body.HabitusExterior), body.HabitusExterior);
        ValidateCampo(nameof(body.PadecimientoActual), body.PadecimientoActual);
    }

    private static void ValidateCampo(string name, InterrogatorioCampo campo)
    {
        if (campo is null)
            throw new ArgumentException($"Campo {name} es obligatorio (use no_interrogado, no omita).", name);

        var estado = (campo.Estado ?? string.Empty).Trim().ToLowerInvariant();
        if (!InterrogatorioEstados.All.Contains(estado))
            throw new ArgumentException(
                $"Estado de interrogatorio inválido en {name} (no_interrogado|se_desconoce|no_aplica|conocido).",
                name);

        campo.Estado = estado;

        var hasValor = campo.Valor is { } el && el.ValueKind is not System.Text.Json.JsonValueKind.Null
            and not System.Text.Json.JsonValueKind.Undefined;

        if (estado == InterrogatorioEstados.Conocido && !hasValor)
            throw new ArgumentException($"Estado conocido en {name} exige valor (lista vacía permitida; no use null).", name);

        if (estado != InterrogatorioEstados.Conocido && hasValor)
            throw new ArgumentException($"Sólo el estado conocido admite valor en {name}.", name);
    }
}
