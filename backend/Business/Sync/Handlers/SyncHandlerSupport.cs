using System.Text.Json;
using MediCore.DataAccess.Encounter;
using MediCore.DataAccess.Professional;
using MediCore.DataAccess.Sync;
using MediCore.DataAccess.Tenant;
using MediCore.Models.Notes;
using MediCore.Models.Sync;

namespace MediCore.Business.Sync.Handlers;

/// <summary>Utilidades compartidas por handlers Full (prep-read antes de la TX).</summary>
internal static class SyncHandlerSupport
{
    public static T DeserializePayload<T>(string? payloadJson, string commandType)
    {
        if (string.IsNullOrWhiteSpace(payloadJson))
            throw new ArgumentException($"PayloadJson es obligatorio para {commandType}.");

        try
        {
            var dto = JsonSerializer.Deserialize<T>(payloadJson, SyncJson.Options);
            return dto ?? throw new ArgumentException($"PayloadJson de {commandType} no es válido.");
        }
        catch (JsonException ex)
        {
            throw new ArgumentException($"PayloadJson de {commandType} no es JSON válido.", ex);
        }
    }

    public static string? Norm(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    public static DateTimeOffset OccurredAt(SyncCommandContext context) =>
        context.Request.OccurredAtUtc == default
            ? DateTimeOffset.UtcNow
            : context.Request.OccurredAtUtc.ToUniversalTime();

    /// <summary>Fallback suave (agenda / expediente / receta create).</summary>
    public static async Task<string> SoftDisplayNameAsync(
        IHealthcareProfessionalRepository professionals,
        Guid tenantId,
        Guid? actorProfessionalId,
        CancellationToken ct)
    {
        if (actorProfessionalId is Guid id && id != Guid.Empty)
        {
            var p = await professionals.GetByIdAsync(tenantId, id, ct);
            if (p is not null && !string.IsNullOrWhiteSpace(p.FullName))
                return p.FullName.Trim();
        }

        return "usuario";
    }

    /// <summary>Fail closed de autoría visible (notas create/addendum, triage save).</summary>
    public static async Task<string> RequireDisplayNameAsync(
        IHealthcareProfessionalRepository professionals,
        Guid tenantId,
        Guid? actorProfessionalId,
        CancellationToken ct)
    {
        if (actorProfessionalId is Guid id && id != Guid.Empty)
        {
            var p = await professionals.GetByIdAsync(tenantId, id, ct);
            if (p is not null && !string.IsNullOrWhiteSpace(p.FullName))
                return p.FullName.Trim();
        }

        throw new ArgumentException(
            "DisplayName de autoría es obligatorio; ligue profesional sanitario a la sesión o use la API online.");
    }

    public static async Task<string?> BuildFacilitySnapshotJsonAsync(
        IEncounterRepository encounterRepository,
        IBranchRepository branchRepository,
        Guid tenantId,
        Guid encounterId,
        CancellationToken ct)
    {
        var encounter = await encounterRepository.GetByIdAsync(tenantId, encounterId, ct);
        if (encounter is null) return null;

        var branch = await branchRepository.GetByIdAsync(tenantId, encounter.BranchId, ct);
        if (branch is null) return null;

        // Campos no capturados quedan null; no se inventa domicilio (M11 / NOM-004 5.2).
        return JsonSerializer.Serialize(new FacilitySnapshot
        {
            BranchId = branch.BranchId,
            FacilityType = branch.FacilityType,
            LegalName = branch.LegalName,
            AddressStreet = branch.AddressStreet,
            AddressNumber = branch.AddressNumber,
            AddressNeighborhood = branch.AddressNeighborhood,
            AddressMunicipality = branch.AddressMunicipality,
            AddressState = branch.AddressState,
            AddressPostalCode = branch.AddressPostalCode,
            PhoneNumber = branch.PhoneNumber,
            HealthLicense = branch.HealthLicense
        }, NoteJson.Options);
    }
}
