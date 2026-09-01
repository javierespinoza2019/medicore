using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using MediCore.Models.Clinical;
using MediCore.Models.Subject;

namespace MediCore.Business.Subject;

/// <summary>
/// Validación estructural de CURP con dígito verificador (algoritmo RENAPO).
/// No consulta RENAPO; no autogenera CURP (NOM-024 6.5.1).
/// </summary>
public static class CurpValidator
{
    private static readonly Regex CurpPattern = new(
        @"^[A-Z][AEIOUX][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM](AS|BC|BS|CC|CS|CH|CL|CM|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\d$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private const string Diccionario = "0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";

    /// <summary>Normaliza y valida. Devuelve CURP en mayúsculas o null si el input es vacío.</summary>
    public static string? NormalizeOptional(string? curp)
    {
        if (string.IsNullOrWhiteSpace(curp))
            return null;

        var valor = curp.Trim().ToUpperInvariant();
        if (valor.Length != 18)
            throw new ArgumentException("La CURP debe tener exactamente 18 caracteres.");
        if (!CurpPattern.IsMatch(valor))
            throw new ArgumentException("La CURP no tiene un formato válido.");
        if (!CheckDigitMatches(valor))
            throw new ArgumentException("El dígito verificador de la CURP no es válido.");

        return valor;
    }

    public static bool CheckDigitMatches(string curp18)
    {
        if (curp18.Length != 18) return false;
        var suma = 0;
        for (var i = 0; i < 17; i++)
        {
            var idx = Diccionario.IndexOf(curp18[i]);
            if (idx < 0) return false;
            suma += idx * (18 - i);
        }

        var digito = 10 - (suma % 10);
        if (digito == 10) digito = 0;
        return curp18[17] == (char)('0' + digito);
    }
}

/// <summary>Máquina de transiciones de IdentificationState (doc 08 §2).</summary>
public static class IdentificationStateMachine
{
    private static readonly HashSet<(string From, string To)> Allowed = new()
    {
        (IdentificationStates.NoIdentificado, IdentificationStates.DeclaradaSinDocumento),
        (IdentificationStates.NoIdentificado, IdentificationStates.VerificadaConDocumento),
        (IdentificationStates.NoIdentificado, IdentificationStates.Rectificada),
        (IdentificationStates.NoIdentificado, IdentificationStates.NoRecuperable),
        (IdentificationStates.DeclaradaSinDocumento, IdentificationStates.VerificadaConDocumento),
        (IdentificationStates.DeclaradaSinDocumento, IdentificationStates.Rectificada),
        (IdentificationStates.DeclaradaSinDocumento, IdentificationStates.NoRecuperable),
        (IdentificationStates.VerificadaConDocumento, IdentificationStates.Rectificada),
        (IdentificationStates.VerificadaConDocumento, IdentificationStates.NoRecuperable),
        (IdentificationStates.Rectificada, IdentificationStates.VerificadaConDocumento),
        (IdentificationStates.Rectificada, IdentificationStates.NoRecuperable),
    };

    public static bool CanTransition(string from, string to) =>
        Allowed.Contains((from, to));

    public static void EnsureAllowed(string from, string to)
    {
        if (!IdentificationStates.All.Contains(to))
            throw new ArgumentException($"Estado de identificación no reconocido: {to}.");
        if (!CanTransition(from, to))
            throw new InvalidOperationException($"Transición inválida: {from} → {to}.");
    }
}

/// <summary>
/// Emisor de etiqueta temporal según config (cascada resuelta).
/// Prohibido emitir tokens que sean colores (colisión con triage).
/// </summary>
public static class TemporaryLabelIssuer
{
    private static readonly HashSet<string> HardBlockedColors = new(StringComparer.OrdinalIgnoreCase)
    {
        "ROJO", "NARANJA", "AMARILLO", "VERDE", "AZUL", "MORADO", "NEGRO", "BLANCO", "GRIS", "ROSA",
        "RED", "ORANGE", "YELLOW", "GREEN", "BLUE", "PURPLE", "BLACK", "WHITE", "GRAY", "GREY", "PINK"
    };

    public sealed record IssuedLabel(
        string InternalCode,
        string OperationalLabel,
        string ConfigSnapshotJson,
        string Token);

    public static IssuedLabel Issue(
        UnidentifiedLabelConfigDto config,
        string branchCode,
        DateTimeOffset issuedAtUtc,
        IReadOnlyCollection<string> usedTokensToday)
    {
        using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(config.SchemeParamsJson)
            ? "{}"
            : config.SchemeParamsJson);
        var root = doc.RootElement;

        var alphabet = new List<string>();
        if (root.TryGetProperty("tokenAlphabet", out var alphaEl) && alphaEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var t in alphaEl.EnumerateArray())
            {
                var token = t.GetString()?.Trim().ToUpperInvariant();
                if (!string.IsNullOrEmpty(token))
                    alphabet.Add(token);
            }
        }

        if (alphabet.Count == 0)
            throw new InvalidOperationException(
                "La configuración de etiqueta no define tokenAlphabet. Configure el esquema del tenant/sucursal.");

        var blocked = new HashSet<string>(HardBlockedColors, StringComparer.OrdinalIgnoreCase);
        if (root.TryGetProperty("blockedTokens", out var blockedEl) && blockedEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var t in blockedEl.EnumerateArray())
            {
                var token = t.GetString()?.Trim();
                if (!string.IsNullOrEmpty(token))
                    blocked.Add(token.ToUpperInvariant());
            }
        }

        foreach (var token in alphabet)
        {
            if (blocked.Contains(token) || HardBlockedColors.Contains(token))
                throw new InvalidOperationException(
                    $"El alfabeto de etiqueta incluye el token de color «{token}», prohibido (colisión con triage).");
        }

        var used = new HashSet<string>(usedTokensToday, StringComparer.OrdinalIgnoreCase);
        string? chosen = null;
        foreach (var token in alphabet)
        {
            if (!used.Contains(token))
            {
                chosen = token;
                break;
            }
        }

        // Agotar alfabeto: concatenar segunda palabra (doc 08 §3.2).
        if (chosen is null)
        {
            foreach (var a in alphabet)
            {
                foreach (var b in alphabet)
                {
                    var compound = $"{a}-{b}";
                    if (!used.Contains(compound) && !blocked.Contains(a) && !blocked.Contains(b))
                    {
                        chosen = compound;
                        break;
                    }
                }
                if (chosen is not null) break;
            }
        }

        if (chosen is null)
            throw new InvalidOperationException("Se agotó el alfabeto de etiquetas para la sucursal/día.");

        EnsureNotColor(chosen);

        var datePart = issuedAtUtc.UtcDateTime.ToString("yyMMdd", CultureInfo.InvariantCulture);
        var branch = string.IsNullOrWhiteSpace(branchCode) ? "X" : branchCode.Trim().ToUpperInvariant();
        var internalCode = $"NN-{branch}-{datePart}-{chosen}";
        var operational = $"NN-{chosen}";

        var snapshot = JsonSerializer.Serialize(new
        {
            configId = config.ConfigId,
            schemeCode = config.SchemeCode,
            resolvedFrom = config.ResolvedFrom,
            branchCode = branch,
            issuedAtUtc = issuedAtUtc.UtcDateTime,
            token = chosen,
            note = "Snapshot de la config efectiva al emitir (cascada sucursal > tenant)."
        });

        return new IssuedLabel(internalCode, operational, snapshot, chosen);
    }

    public static void EnsureNotColor(string token)
    {
        foreach (var part in token.Split('-', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (HardBlockedColors.Contains(part))
                throw new InvalidOperationException(
                    $"Token de etiqueta «{part}» es un color y está prohibido (colisión con triage).");
        }
    }
}

public static class EstimatedAgeMapper
{
    public static string? ToJson(EstimatedAgeDto? dto)
    {
        if (dto is null) return null;
        var unidad = ParseUnidad(dto.Unidad);
        var origen = ParseOrigen(dto.Origen);
        _ = EdadEstimada.Crear(dto.Valor, unidad, origen, dto.RangoMin, dto.RangoMax);
        return JsonSerializer.Serialize(new
        {
            valor = dto.Valor,
            unidad = NormalizeUnidad(dto.Unidad),
            rangoMin = dto.RangoMin,
            rangoMax = dto.RangoMax,
            origen = NormalizeOrigen(dto.Origen)
        });
    }

    public static EstimatedAgeDto? FromJson(string? json) => EstimatedAgeJson.TryParse(json);

    private static UnidadEdad ParseUnidad(string unidad) => NormalizeUnidad(unidad) switch
    {
        "anios" => UnidadEdad.Anios,
        "meses" => UnidadEdad.Meses,
        "dias" => UnidadEdad.Dias,
        _ => throw new ArgumentException("Unidad de edad inválida (anios|meses|dias).")
    };

    private static OrigenEdad ParseOrigen(string origen) => NormalizeOrigen(origen) switch
    {
        "calculada" => OrigenEdad.Calculada,
        "estimada" => OrigenEdad.Estimada,
        "declarada" => OrigenEdad.Declarada,
        _ => throw new ArgumentException("Origen de edad inválido (calculada|estimada|declarada).")
    };

    private static string NormalizeUnidad(string u) => u.Trim().ToLowerInvariant()
        .Replace("años", "anios", StringComparison.Ordinal);

    private static string NormalizeOrigen(string o) => o.Trim().ToLowerInvariant();
}

/// <summary>
/// AuthZ de sujeto (decisiones C/D 2026-08-28; catálogo de roles aún abierto en pregunta A).
/// Búsqueda por descripción: recepción/trabajo_social = sucursal; admin/supervisor/SuperAdmin = organización.
/// Señas: solo secreto profesional u obligación equivalente (no recepción).
/// </summary>
public static class SubjectAccess
{
    public static bool IsOrgWideDescriptionSearch(bool isSuperAdmin, IEnumerable<string> roles)
    {
        if (isSuperAdmin) return true;
        foreach (var role in roles)
        {
            if (string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase)) return true;
            if (string.Equals(role, "SuperAdmin", StringComparison.OrdinalIgnoreCase)) return true;
            if (string.Equals(role, "supervisor", StringComparison.OrdinalIgnoreCase)) return true;
        }
        return false;
    }

    public static bool IsBranchScopedDescriptionSearch(IEnumerable<string> roles)
    {
        foreach (var role in roles)
        {
            if (string.Equals(role, "recepcion", StringComparison.OrdinalIgnoreCase)) return true;
            if (string.Equals(role, "trabajo_social", StringComparison.OrdinalIgnoreCase)) return true;
        }
        return false;
    }

    public static bool CanSearchByDescription(bool isSuperAdmin, IEnumerable<string> roles)
    {
        var list = roles as IList<string> ?? roles.ToList();
        return IsOrgWideDescriptionSearch(isSuperAdmin, list) || IsBranchScopedDescriptionSearch(list);
    }

    /// <summary>
    /// Señas: médico/enfermería (secreto profesional) y admin/supervisor (obligación equivalente de control).
    /// Recepción <strong>no</strong> ve señas (decisión D 2026-08-28).
    /// </summary>
    public static bool CanViewMarks(bool isSuperAdmin, IEnumerable<string> roles)
    {
        if (isSuperAdmin) return true;
        foreach (var role in roles)
        {
            if (string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase)) return true;
            if (string.Equals(role, "SuperAdmin", StringComparison.OrdinalIgnoreCase)) return true;
            if (string.Equals(role, "supervisor", StringComparison.OrdinalIgnoreCase)) return true;
            if (string.Equals(role, "medico", StringComparison.OrdinalIgnoreCase)) return true;
            if (string.Equals(role, "enfermeria", StringComparison.OrdinalIgnoreCase)) return true;
        }
        return false;
    }

    public static bool CanVerifyOrRectify(bool isSuperAdmin, IEnumerable<string> roles)
    {
        if (isSuperAdmin) return true;
        foreach (var role in roles)
        {
            if (string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase)) return true;
            if (string.Equals(role, "SuperAdmin", StringComparison.OrdinalIgnoreCase)) return true;
            if (string.Equals(role, "supervisor", StringComparison.OrdinalIgnoreCase)) return true;
        }
        return false;
    }
}

/// <summary>
/// Mapeo a reporte Urgencias DGIS (SEUL-16-P): solo sexo biológico → 1/2/3.
/// GenderIdentity NUNCA alimenta este mapeo ni dosis/rangos (opción B 2026-08-28 / doc 14).
/// Emisión cuando BiologicalSex es null / no_determinado: pendiente decisión 54.
/// </summary>
public static class DgisUrgenciasSexMapper
{
    /// <summary>
    /// Intenta mapear sexo biológico interno a código SEUL (1 hombre, 2 mujer, 3 intersexual).
    /// No inventa valor: null / no_determinado / no_especificado → null (capa de reporte decide).
    /// El parámetro genderIdentity se ignora a propósito (firma defensiva para no mezclar campos).
    /// </summary>
    public static string? ToSeulSexCode(string? biologicalSex, string? genderIdentity = null)
    {
        _ = genderIdentity; // explícitamente no usado en reporte Urgencias ni en clínica
        if (string.IsNullOrWhiteSpace(biologicalSex)) return null;
        return biologicalSex.Trim().ToLowerInvariant() switch
        {
            BiologicalSexCodes.Masculino => "1",
            BiologicalSexCodes.Femenino => "2",
            // intersexual aún no está en BiologicalSexCodes internos; si se agrega, mapear a "3"
            _ => null
        };
    }
}

/// <summary>
/// Helpers clínicos futuros (dosis, rangos) deben usar solo BiologicalSex.
/// GenderIdentity no es entrada válida de cálculo.
/// </summary>
public static class ClinicalSexRules
{
    /// <summary>Única fuente permitida para cálculo clínico ligado a sexo.</summary>
    public static string? SexForClinicalCalculation(string? biologicalSex, string? genderIdentity = null)
    {
        _ = genderIdentity;
        return string.IsNullOrWhiteSpace(biologicalSex) ? null : biologicalSex.Trim().ToLowerInvariant();
    }
}
