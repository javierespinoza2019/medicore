using System.Text.Json;
using System.Text.Json.Nodes;
using MediCore.Models.Clinical;
using MediCore.Models.Notes;

namespace MediCore.Business.Notes;

/// <summary>AuthZ provisional de notas (matriz por tenant pendiente; doc 06 §19).</summary>
public static class NotesAccess
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
/// Reglas de dominio M6: hash canónico estable, fail-closed de firma, textos sin afirmar validez jurídica.
/// </summary>
public static class NotesDomain
{
    public const string HashAlgorithm = "SHA256";

    /// <summary>
    /// Canonicaliza noteType + prognosis + body para hash determinista (base SC-06).
    /// Propiedades del body ordenadas lexicográficamente; sin whitespace significativo.
    /// </summary>
    public static string BuildCanonicalContent(string noteType, JsonElement body, string? prognosis)
    {
        var type = (noteType ?? string.Empty).Trim().ToLowerInvariant();
        var prog = string.IsNullOrWhiteSpace(prognosis) ? null : prognosis.Trim();

        JsonNode? bodyNode;
        try
        {
            bodyNode = JsonNode.Parse(body.GetRawText()) ?? new JsonObject();
        }
        catch (JsonException ex)
        {
            throw new ArgumentException("Body JSON inválido.", nameof(body), ex);
        }

        var sortedBody = SortNode(bodyNode);
        var root = new JsonObject
        {
            ["noteType"] = type,
            ["prognosis"] = prog,
            ["body"] = sortedBody
        };

        return root.ToJsonString(new JsonSerializerOptions
        {
            WriteIndented = false
        });
    }

    public static string HashCanonical(string noteType, JsonElement body, string? prognosis) =>
        Firma.HashContenidoSha256(BuildCanonicalContent(noteType, body, prognosis));

    public static void EnsureNoteType(string noteType)
    {
        var t = (noteType ?? string.Empty).Trim().ToLowerInvariant();
        if (!NoteTypes.All.Contains(t))
            throw new ArgumentException(
                "noteType inválido (urgencias_inicial|evolucion|interconsulta|referencia_traslado|egreso|enfermeria|certificado).");
    }

    /// <summary>
    /// ActType tentativo al tocar LastMedicalActAtUtc. Pregunta H abierta: no afirma que cuente para retención.
    /// </summary>
    public static string TentativeMedicalActType(string noteType) =>
        $"clinical_note_{(noteType ?? string.Empty).Trim().ToLowerInvariant()}";

    private static JsonNode SortNode(JsonNode? node)
    {
        if (node is null) return JsonValue.Create((string?)null)!;

        if (node is JsonObject obj)
        {
            var sorted = new JsonObject();
            foreach (var prop in obj.OrderBy(p => p.Key, StringComparer.Ordinal))
                sorted[prop.Key] = SortNode(prop.Value)?.DeepClone();
            return sorted;
        }

        if (node is JsonArray arr)
        {
            var sortedArr = new JsonArray();
            foreach (var item in arr)
                sortedArr.Add(SortNode(item)?.DeepClone());
            return sortedArr;
        }

        return node.DeepClone();
    }
}
