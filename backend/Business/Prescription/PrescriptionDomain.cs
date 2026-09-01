using System.Text;
using System.Text.Json;
using MediCore.Models.Clinical;
using MediCore.Models.Prescription;

namespace MediCore.Business.Prescription;

/// <summary>Reglas de dominio de receta (M8). Sin I/O.</summary>
public static class PrescriptionDomain
{
    public const string HashAlgorithm = "SHA-256";

    public static void EnsureFrequency(FrequencyDto frequency)
    {
        ArgumentNullException.ThrowIfNull(frequency);
        if (!FrequencyKinds.All.Contains(frequency.Kind))
            throw new ArgumentException(
                "frequency.kind inválido (every_n_hours|n_times_per_day); no se acepta texto libre.");
        if (frequency.N < 1)
            throw new ArgumentException("frequency.n debe ser >= 1.");
    }

    public static void EnsureDose(DoseDto dose)
    {
        ArgumentNullException.ThrowIfNull(dose);
        if (string.IsNullOrWhiteSpace(dose.Unidad))
            throw new ArgumentException("dose.unidad es obligatoria.");

        var estado = (dose.Estado ?? string.Empty).Trim().ToLowerInvariant();
        dose.Estado = estado switch
        {
            "medido" => "medido",
            "no_medido" => "no_medido",
            "no_valorable" => "no_valorable",
            _ => throw new ArgumentException("dose.estado inválido (medido|no_medido|no_valorable).")
        };

        if (estado == "medido")
        {
            if (dose.Valor is null)
                throw new ArgumentException("dose.valor es obligatorio cuando estado = medido.");
            if (!string.IsNullOrWhiteSpace(dose.RazonNoMedido))
                throw new ArgumentException("dose medida no lleva razonNoMedido.");
        }
        else if (string.IsNullOrWhiteSpace(dose.RazonNoMedido))
        {
            throw new ArgumentException("dose sin valor exige razonNoMedido explícita.");
        }
    }

    public static void EnsureItems(IReadOnlyList<CreatePrescriptionItemRequest> items)
    {
        if (items is null || items.Count == 0)
            throw new ArgumentException("La receta exige al menos un medicamento.");

        foreach (var item in items)
        {
            if (item.MedicationId == Guid.Empty)
                throw new ArgumentException("medicationId es obligatorio.");
            if (string.IsNullOrWhiteSpace(item.Route))
                throw new ArgumentException("route es obligatorio.");
            EnsureDose(item.Dose);
            EnsureFrequency(item.Frequency);
            if (item.RefillsAllowed is < 0 or > 3)
                throw new ArgumentException("refillsAllowed debe estar entre 0 y 3 (LGS art. 226).");
        }
    }

    /// <summary>
    /// Vigencia derivada de clasificación de venta (LGS art. 226: 30 días típicos para
    /// fracciones con receta). V/VI sin vigencia forzada.
    /// </summary>
    public static DateTimeOffset? DeriveValidUntil(DateTimeOffset issuedAt, IEnumerable<string> saleClasses)
    {
        var needsValidity = saleClasses.Any(c =>
            string.Equals(c, SaleClassifications.I, StringComparison.OrdinalIgnoreCase)
            || string.Equals(c, SaleClassifications.II, StringComparison.OrdinalIgnoreCase)
            || string.Equals(c, SaleClassifications.III, StringComparison.OrdinalIgnoreCase)
            || string.Equals(c, SaleClassifications.IV, StringComparison.OrdinalIgnoreCase));

        return needsValidity ? issuedAt.AddDays(30) : null;
    }

    public static string HashCanonical(PrescriptionDto prescription)
    {
        var sb = new StringBuilder();
        sb.Append(prescription.EncounterId.ToString("D")).Append('|');
        sb.Append(prescription.SubjectId.ToString("D")).Append('|');
        sb.Append(prescription.AllergyStatusAtIssue).Append('|');

        foreach (var item in prescription.Items.OrderBy(i => i.LineNumber))
        {
            sb.Append(item.MedicationId.ToString("D")).Append(';');
            sb.Append(item.GenericNameSnapshot).Append(';');
            sb.Append(JsonSerializer.Serialize(item.Dose, PrescriptionJson.Options)).Append(';');
            sb.Append(item.Route).Append(';');
            sb.Append(JsonSerializer.Serialize(item.Frequency, PrescriptionJson.Options)).Append(';');
            sb.Append(item.DurationDays?.ToString() ?? "").Append(';');
            sb.Append(item.Quantity?.ToString(System.Globalization.CultureInfo.InvariantCulture) ?? "");
            sb.Append('|');
        }

        sb.Append(prescription.GeneralInstructions ?? "");
        return Firma.HashContenidoSha256(sb.ToString());
    }

    public static bool IsClinicalRole(bool isSuperAdmin, IEnumerable<string> roles) =>
        isSuperAdmin
        || roles.Any(r =>
            string.Equals(r, "medico", StringComparison.OrdinalIgnoreCase)
            || string.Equals(r, "enfermeria", StringComparison.OrdinalIgnoreCase)
            || string.Equals(r, "admin", StringComparison.OrdinalIgnoreCase));
}

public static class PrescriptionAccess
{
    public static bool CanReadOrWrite(bool isSuperAdmin, IEnumerable<string> roles) =>
        PrescriptionDomain.IsClinicalRole(isSuperAdmin, roles);
}
