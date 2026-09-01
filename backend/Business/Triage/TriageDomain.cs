using MediCore.Models.Triage;

namespace MediCore.Business.Triage;

/// <summary>
/// Normalización de signos y validación de escala (M5).
/// Prohibido fabricar magnitudes (?? 0, parseFloat||0). Faltantes → no_medido.
/// Rangos clínicos usan sólo BiologicalSex (opción B), nunca GenderIdentity.
/// </summary>
public static class TriageVitalsNormalizer
{
    public const string DefaultNotMeasuredReason = "no tomado";

    /// <summary>
    /// Normaliza mediciones enviadas sin completar el set canónico
    /// (útil para append parcial en evolución).
    /// </summary>
    public static IReadOnlyList<VitalMeasurementDto> NormalizeExplicitOnly(
        IEnumerable<VitalMeasurementDto> incoming,
        string defaultReason = DefaultNotMeasuredReason)
    {
        var result = new List<VitalMeasurementDto>();
        foreach (var raw in incoming)
        {
            if (string.IsNullOrWhiteSpace(raw.SignCode))
                continue;
            var code = raw.SignCode.Trim().ToLowerInvariant();
            result.Add(NormalizeOne(code, raw, defaultReason));
        }
        return result;
    }

    /// <summary>
    /// Completa el set canónico: lo no enviado queda no_medido con razón explícita.
    /// No inventa valores numéricos.
    /// </summary>
    public static IReadOnlyList<VitalMeasurementDto> NormalizeForPersist(
        IEnumerable<VitalMeasurementDto>? incoming,
        string defaultReason = DefaultNotMeasuredReason)
    {
        var byCode = new Dictionary<string, VitalMeasurementDto>(StringComparer.OrdinalIgnoreCase);
        if (incoming is not null)
        {
            foreach (var raw in incoming)
            {
                if (string.IsNullOrWhiteSpace(raw.SignCode))
                    continue;
                var code = raw.SignCode.Trim().ToLowerInvariant();
                byCode[code] = NormalizeOne(code, raw, defaultReason);
            }
        }

        var result = new List<VitalMeasurementDto>(VitalSignCodes.Canonical.Count);
        foreach (var code in VitalSignCodes.Canonical)
        {
            if (byCode.TryGetValue(code, out var existing))
            {
                result.Add(existing);
                byCode.Remove(code);
            }
            else
            {
                result.Add(new VitalMeasurementDto
                {
                    SignCode = code,
                    Value = null,
                    Unit = VitalSignCodes.DefaultUnit(code),
                    State = VitalMeasurementStates.NoMedido,
                    Source = VitalMeasurementSources.Medido,
                    NotMeasuredReason = defaultReason
                });
            }
        }

        foreach (var extra in byCode.Values)
            result.Add(extra);

        return result;
    }

    private static VitalMeasurementDto NormalizeOne(
        string code, VitalMeasurementDto raw, string defaultReason)
    {
        var state = string.IsNullOrWhiteSpace(raw.State)
            ? (raw.Value is null ? VitalMeasurementStates.NoMedido : VitalMeasurementStates.Medido)
            : raw.State.Trim().ToLowerInvariant();

        if (!VitalMeasurementStates.All.Contains(state))
            throw new ArgumentException($"Estado de medición inválido: {raw.State}.");

        var source = string.IsNullOrWhiteSpace(raw.Source)
            ? VitalMeasurementSources.Medido
            : raw.Source.Trim().ToLowerInvariant();
        if (!VitalMeasurementSources.All.Contains(source))
            throw new ArgumentException($"Origen de medición inválido: {raw.Source}.");

        var unit = string.IsNullOrWhiteSpace(raw.Unit)
            ? VitalSignCodes.DefaultUnit(code)
            : raw.Unit.Trim();

        if (state == VitalMeasurementStates.Medido)
        {
            if (raw.Value is null)
                throw new ArgumentException($"Signo '{code}' en estado medido exige valor (no fabricar).");
            return new VitalMeasurementDto
            {
                SignCode = code,
                Value = raw.Value,
                Unit = unit,
                State = state,
                Source = source,
                NotMeasuredReason = null
            };
        }

        // no_medido / no_valorable: Value debe ser null; razón obligatoria.
        if (raw.Value is not null)
            throw new ArgumentException(
                $"Signo '{code}' sin medir no admite valor (prohibido fabricar magnitud).");

        var reason = string.IsNullOrWhiteSpace(raw.NotMeasuredReason)
            ? defaultReason
            : raw.NotMeasuredReason.Trim();

        return new VitalMeasurementDto
        {
            SignCode = code,
            Value = null,
            Unit = unit,
            State = state,
            Source = source,
            NotMeasuredReason = reason
        };
    }
}

public static class TriageScaleRules
{
    public static void EnsureValidLevels(IReadOnlyList<TriageScaleLevelDto> levels)
    {
        if (levels.Count == 0)
            throw new ArgumentException("La escala debe declarar al menos un nivel.");

        var codes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var level in levels)
        {
            if (string.IsNullOrWhiteSpace(level.Code))
                throw new ArgumentException("Cada nivel exige code.");
            if (string.IsNullOrWhiteSpace(level.Label))
                throw new ArgumentException($"Nivel '{level.Code}' exige label.");
            if (level.Priority < 1)
                throw new ArgumentException(
                    $"Nivel '{level.Code}': priority debe ser >= 1 (0 está reservado a sin_clasificar).");
            if (!codes.Add(level.Code.Trim()))
                throw new ArgumentException($"Código de nivel duplicado: {level.Code}.");
        }
    }

    public static int? ResolvePriority(TriageScaleConfigDto scale, string? levelCode)
    {
        if (string.IsNullOrWhiteSpace(levelCode))
            return null;
        var match = scale.Levels.FirstOrDefault(l =>
            string.Equals(l.Code, levelCode.Trim(), StringComparison.OrdinalIgnoreCase));
        if (match is null)
            throw new ArgumentException(
                $"Nivel '{levelCode}' no pertenece a la escala efectiva '{scale.ScaleCode}'.");
        return match.Priority;
    }
}

/// <summary>
/// Rangos de referencia para destacar (no para rellenar). Sólo BiologicalSex (opción B).
/// Ausencia de sexo → rangos genéricos sin asumir masculino/femenino.
/// </summary>
public static class VitalReferenceRanges
{
    public sealed record Range(decimal Min, decimal Max, string Unit);

    public static Range? For(string signCode, string? biologicalSex)
    {
        var sex = biologicalSex?.Trim().ToLowerInvariant();
        return signCode.ToLowerInvariant() switch
        {
            VitalSignCodes.Temperatura => new(35.0m, 38.0m, "C"),
            VitalSignCodes.TensionSistolica => new(90m, 140m, "mmHg"),
            VitalSignCodes.TensionDiastolica => new(60m, 90m, "mmHg"),
            VitalSignCodes.FrecuenciaCardiaca => sex switch
            {
                "femenino" => new(60m, 100m, "lpm"),
                "masculino" => new(55m, 95m, "lpm"),
                _ => new(50m, 110m, "lpm")
            },
            VitalSignCodes.FrecuenciaRespiratoria => new(12m, 20m, "rpm"),
            VitalSignCodes.Saturacion => new(94m, 100m, "%"),
            VitalSignCodes.Glucosa => new(70m, 140m, "mg/dL"),
            VitalSignCodes.Peso => new(0.5m, 300m, "kg"),
            VitalSignCodes.Talla => new(0.3m, 2.5m, "m"),
            _ => null
        };
    }

    public static bool IsOutOfRange(string signCode, decimal value, string? biologicalSex)
    {
        var range = For(signCode, biologicalSex);
        if (range is null) return false;
        return value < range.Min || value > range.Max;
    }
}
