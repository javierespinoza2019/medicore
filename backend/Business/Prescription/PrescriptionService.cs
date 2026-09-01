using System.Text.Json;
using MediCore.DataAccess.Encounter;
using MediCore.DataAccess.Prescription;
using MediCore.DataAccess.Professional;
using MediCore.DataAccess.Tenant;
using MediCore.Models.Notes;
using MediCore.Models.Prescription;

namespace MediCore.Business.Prescription;

public interface IPrescriptionService
{
    Task<IReadOnlyList<MedicationDto>> SearchMedicationsAsync(
        Guid tenantId, string? query, bool excludeControlled, CancellationToken ct);

    Task<MedicationDto> UpsertMedicationAsync(
        Guid tenantId, Guid actorUserId, Guid? medicationId, UpsertMedicationRequest request, CancellationToken ct);

    Task<PrescriptionDto> CreateAsync(
        Guid tenantId, Guid encounterId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, CreatePrescriptionRequest request, CancellationToken ct);

    Task<PrescriptionDto> GetByIdAsync(Guid tenantId, Guid prescriptionId, CancellationToken ct);

    Task<IReadOnlyList<PrescriptionDto>> ListBySubjectAsync(
        Guid tenantId, Guid subjectId, CancellationToken ct);

    Task<PrescriptionDto> SignAsync(
        Guid tenantId, Guid prescriptionId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, SignPrescriptionRequest request, CancellationToken ct);

    Task<PrescriptionDto> CancelAsync(
        Guid tenantId, Guid prescriptionId, Guid actorUserId, Guid? actorProfessionalId,
        CancelPrescriptionRequest request, CancellationToken ct);
}

public sealed class PrescriptionService(
    IPrescriptionRepository prescriptionRepository,
    IEncounterRepository encounterRepository,
    IBranchRepository branchRepository,
    IHealthcareProfessionalRepository professionalRepository) : IPrescriptionService
{
    public Task<IReadOnlyList<MedicationDto>> SearchMedicationsAsync(
        Guid tenantId, string? query, bool excludeControlled, CancellationToken ct) =>
        prescriptionRepository.SearchMedicationsAsync(tenantId, query, excludeControlled, 40, ct);

    public async Task<MedicationDto> UpsertMedicationAsync(
        Guid tenantId, Guid actorUserId, Guid? medicationId, UpsertMedicationRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.GenericName))
            throw new ArgumentException("genericName es obligatorio (denominación genérica).");
        if (!SaleClassifications.All.Contains(request.SaleClassification))
            throw new ArgumentException("saleClassification inválida (I–VI).");
        if (string.Equals(request.SaleClassification, SaleClassifications.I, StringComparison.OrdinalIgnoreCase)
            && !request.IsControlledSubstance)
            throw new ArgumentException("Fracción I exige isControlledSubstance = true.");

        var id = medicationId is null || medicationId == Guid.Empty ? Guid.NewGuid() : medicationId.Value;
        var saved = await prescriptionRepository.UpsertMedicationAsync(tenantId, id, actorUserId, request, ct);
        return saved ?? throw new InvalidOperationException("No se pudo guardar el medicamento.");
    }

    public async Task<PrescriptionDto> CreateAsync(
        Guid tenantId, Guid encounterId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, CreatePrescriptionRequest request, CancellationToken ct)
    {
        PrescriptionDomain.EnsureItems(request.Items);

        // Fail closed temprano en Business si algún ítem es controlado (el SP también rechaza).
        foreach (var item in request.Items)
        {
            var med = await prescriptionRepository.GetMedicationAsync(tenantId, item.MedicationId, ct)
                ?? throw new ArgumentException($"Medicamento {item.MedicationId} no encontrado.");
            if (med.IsControlledSubstance)
                throw new PrescriptionControlledSubstanceException();
        }

        var occurred = request.OccurredAtUtc ?? DateTimeOffset.UtcNow;
        var created = await prescriptionRepository.CreateAsync(
            tenantId, Guid.NewGuid(), encounterId, actorUserId, actorProfessionalId,
            Display(actorDisplayName), occurred, request, ct);

        return created ?? throw new InvalidOperationException("No se pudo crear la receta.");
    }

    public async Task<PrescriptionDto> GetByIdAsync(Guid tenantId, Guid prescriptionId, CancellationToken ct)
    {
        var rx = await prescriptionRepository.GetByIdAsync(tenantId, prescriptionId, ct);
        return rx ?? throw new KeyNotFoundException("Receta no encontrada.");
    }

    public Task<IReadOnlyList<PrescriptionDto>> ListBySubjectAsync(
        Guid tenantId, Guid subjectId, CancellationToken ct) =>
        prescriptionRepository.ListBySubjectAsync(tenantId, subjectId, ct);

    public async Task<PrescriptionDto> SignAsync(
        Guid tenantId, Guid prescriptionId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, SignPrescriptionRequest request, CancellationToken ct)
    {
        _ = actorDisplayName;

        if (actorProfessionalId is null || actorProfessionalId == Guid.Empty)
            throw new UnauthorizedAccessException(
                "Sin profesional sanitario ligado a la sesión; no se puede firmar (fail closed).");

        var rx = await prescriptionRepository.GetByIdAsync(tenantId, prescriptionId, ct)
            ?? throw new KeyNotFoundException("Receta no encontrada.");

        if (rx.CancelledAtUtc is not null)
            throw new InvalidOperationException("No se puede firmar una receta cancelada.");

        if (rx.SignedAtUtc is not null)
            throw new InvalidOperationException("La receta ya está firmada (inmutable).");

        var professional = await professionalRepository.GetByIdAsync(
            tenantId, actorProfessionalId.Value, ct);
        if (professional is null || !professional.IsActive)
            throw new UnauthorizedAccessException("Profesional no encontrado o inactivo.");

        if (string.IsNullOrWhiteSpace(professional.ProfessionalLicense))
            throw new UnauthorizedAccessException(
                "Sin cédula profesional capturada; no se puede firmar (fail closed).");

        var expectedHash = PrescriptionDomain.HashCanonical(rx);
        if (!string.IsNullOrWhiteSpace(request.ContentHash)
            && !string.Equals(request.ContentHash.Trim(), expectedHash, StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("ContentHash no coincide con el contenido canónico de la receta.");

        var licenseSnapshot = JsonSerializer.Serialize(
            PrescriptionSnapshots.FromProfessional(
                professional.HealthcareProfessionalId,
                professional.FullName,
                professional.ProfessionalLicense!,
                professional.SpecialtyId,
                professional.SpecialtyName),
            NoteJson.Options);

        string? facilityJson = null;
        var encounter = await encounterRepository.GetByIdAsync(tenantId, rx.EncounterId, ct);
        if (encounter is not null)
        {
            var branch = await branchRepository.GetByIdAsync(tenantId, encounter.BranchId, ct);
            if (branch is not null)
            {
                facilityJson = JsonSerializer.Serialize(new FacilitySnapshot
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

        var saleClasses = new List<string>();
        foreach (var item in rx.Items)
        {
            var med = await prescriptionRepository.GetMedicationAsync(tenantId, item.MedicationId, ct);
            if (med is not null)
                saleClasses.Add(med.SaleClassification);
        }

        var signedAt = DateTimeOffset.UtcNow;
        var validUntil = PrescriptionDomain.DeriveValidUntil(signedAt, saleClasses);

        var signed = await prescriptionRepository.SignAsync(
            tenantId, prescriptionId, actorUserId, actorProfessionalId.Value,
            expectedHash, licenseSnapshot, facilityJson, signedAt, validUntil, ct)
            ?? throw new InvalidOperationException("No se pudo firmar la receta.");

        // Escritura online: sello inmediato. Offline: commandType prescription.sign → seal (no cableado Sync).
        try
        {
            signed = await prescriptionRepository.SealAsync(tenantId, prescriptionId, DateTimeOffset.UtcNow, ct)
                ?? signed;
        }
        catch (InvalidOperationException)
        {
            // Ya sellada u otro estado.
        }

        return signed;
    }

    public async Task<PrescriptionDto> CancelAsync(
        Guid tenantId, Guid prescriptionId, Guid actorUserId, Guid? actorProfessionalId,
        CancelPrescriptionRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
            throw new ArgumentException("Cancelar una receta exige motivo.");

        var cancelled = await prescriptionRepository.CancelAsync(
            tenantId, prescriptionId, actorUserId, actorProfessionalId,
            request.Reason.Trim(), DateTimeOffset.UtcNow, ct);

        return cancelled ?? throw new KeyNotFoundException("Receta no encontrada.");
    }

    private static string Display(string? name) =>
        string.IsNullOrWhiteSpace(name) ? "usuario" : name.Trim();
}
