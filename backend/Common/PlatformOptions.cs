namespace MediCore.Common;

/// <summary>
/// Perfil del ambiente. Gobierna las salvaguardas de doc 12: shared/demo sin PHI,
/// dedicado antes de paciente real, DGIS siempre presente con destino según ambiente.
/// </summary>
public sealed class PlatformOptions
{
    public const string SectionName = "Platform";

    /// <summary>Development | QA | Production.</summary>
    public string EnvironmentName { get; set; } = "Development";

    /// <summary>Ambiente de demostración/ventas: banner visible, datos sintéticos.</summary>
    public bool IsDemo { get; set; }

    /// <summary>Permite ejecutar seeds sintéticos.</summary>
    public bool AllowSyntheticSeed { get; set; }

    /// <summary>Habilita el uso con pacientes reales (PHI). Solo entorno dedicado.</summary>
    public bool AllowRealPatientData { get; set; }

    /// <summary>Destino de envío DGIS/SINBA: non-production | production. El módulo nunca se apaga.</summary>
    public string DgisDestination { get; set; } = "non-production";

    /// <summary>Muestra la franja de ambiente en el cliente.</summary>
    public bool ShowEnvironmentBanner { get; set; } = true;

    public bool IsProduction =>
        string.Equals(EnvironmentName, "Production", StringComparison.OrdinalIgnoreCase);

    public bool IsDevelopment =>
        string.Equals(EnvironmentName, "Development", StringComparison.OrdinalIgnoreCase);

    /// <summary>Falla al arrancar si el perfil es contradictorio (no se corrige en silencio).</summary>
    public void Validate()
    {
        var errors = new List<string>();

        if (DgisDestination is not ("non-production" or "production"))
            errors.Add("Platform:DgisDestination debe ser 'non-production' o 'production'.");

        if (AllowRealPatientData && IsDemo)
            errors.Add("Platform: un ambiente demo no puede habilitar AllowRealPatientData (doc 12: shared/demo sin PHI).");

        if (AllowRealPatientData && AllowSyntheticSeed)
            errors.Add("Platform: no se mezclan pacientes reales con seed sintético en el mismo ambiente.");

        if (IsProduction && AllowSyntheticSeed)
            errors.Add("Platform: Production no permite AllowSyntheticSeed.");

        if (!AllowRealPatientData && DgisDestination == "production")
            errors.Add("Platform: destino DGIS 'production' requiere un ambiente autorizado para datos reales.");

        if (errors.Count > 0)
            throw new InvalidOperationException("Configuración de ambiente inválida: " + string.Join(" | ", errors));
    }
}
