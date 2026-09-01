using System.Text.Json;
using MediCore.Business.Prescription;
using MediCore.DataAccess.Encounter;
using MediCore.DataAccess.Prescription;
using MediCore.DataAccess.Professional;
using MediCore.DataAccess.Tenant;
using MediCore.Models.Notes;
using MediCore.Models.Prescription;
using MediCore.Models.Sync;

namespace MediCore.Business.Sync.Handlers;

/// <summary>Despacha prescription.create|sign (sign + seal en la misma TX).</summary>
public sealed class PrescriptionSyncCommandHandler(
    IPrescriptionRepository prescriptionRepository,
    IEncounterRepository encounterRepository,
    IBranchRepository branchRepository,
    IHealthcareProfessionalRepository professionalRepository) : ISyncCommandHandler
{
    public IReadOnlyCollection<string> CommandTypes { get; } =
    [
        "prescription.create",
        "prescription.sign"
    ];

    public SyncCommandSupport Support => SyncCommandSupport.Full;

    public async Task<SyncCommandPlan> PlanAsync(SyncCommandContext context, CancellationToken ct)
    {
        var type = context.Request.CommandType.Trim().ToLowerInvariant();
        return type switch
        {
            "prescription.create" => await PlanCreateAsync(context, ct),
            "prescription.sign" => await PlanSignAsync(context, ct),
            _ => throw new ArgumentException($"commandType '{type}' no soportado por PrescriptionSyncCommandHandler.")
        };
    }

    private async Task<SyncCommandPlan> PlanCreateAsync(SyncCommandContext context, CancellationToken ct)
    {
        var payload = SyncHandlerSupport.DeserializePayload<SyncPrescriptionCreatePayload>(
            context.Request.PayloadJson, "prescription.create");
        if (payload.EncounterId == Guid.Empty)
            throw new ArgumentException("payload.encounterId es obligatorio.");

        PrescriptionDomain.EnsureItems(payload.Items);

        foreach (var item in payload.Items)
        {
            var med = await prescriptionRepository.GetMedicationAsync(context.TenantId, item.MedicationId, ct)
                ?? throw new ArgumentException($"Medicamento {item.MedicationId} no encontrado.");
            if (med.IsControlledSubstance)
                throw new PrescriptionControlledSubstanceException();
        }

        var display = await SyncHandlerSupport.SoftDisplayNameAsync(
            professionalRepository, context.TenantId, context.ActorProfessionalId, ct);
        var prescriptionId = Guid.NewGuid();
        var occurred = payload.OccurredAtUtc ?? SyncHandlerSupport.OccurredAt(context);

        var itemsPayload = payload.Items.Select(i => new
        {
            medicationId = i.MedicationId,
            dose = i.Dose,
            route = i.Route,
            frequency = i.Frequency,
            durationDays = i.DurationDays,
            quantity = i.Quantity,
            refillsAllowed = i.RefillsAllowed,
            instructions = i.Instructions,
            brandNameSnapshot = i.BrandNameSnapshot
        });
        var itemsJson = JsonSerializer.Serialize(itemsPayload, PrescriptionJson.Options);

        return new SyncCommandPlan
        {
            ServerEntityId = prescriptionId.ToString("D"),
            ClinicalProcedures =
            [
                new SyncProcedureCall
                {
                    ProcedureName = "sp_Prescription_Create",
                    Parameters = new
                    {
                        PrescriptionId = prescriptionId,
                        TenantId = context.TenantId,
                        EncounterId = payload.EncounterId,
                        ItemsJson = itemsJson,
                        GeneralInstructions = payload.GeneralInstructions,
                        AllergyOverrideJustification = payload.AllergyOverrideJustification,
                        AllergyStatusCaptureEventId = payload.AllergyStatusCaptureEventId,
                        ActorUserId = context.UserId,
                        ActorProfessionalId = context.ActorProfessionalId,
                        ActorDisplayName = display,
                        OccurredAtUtc = occurred.UtcDateTime
                    }
                }
            ]
        };
    }

    private async Task<SyncCommandPlan> PlanSignAsync(SyncCommandContext context, CancellationToken ct)
    {
        var payload = SyncHandlerSupport.DeserializePayload<SyncPrescriptionSignPayload>(
            context.Request.PayloadJson, "prescription.sign");
        if (payload.PrescriptionId == Guid.Empty)
            throw new ArgumentException("payload.prescriptionId es obligatorio.");

        if (context.ActorProfessionalId is null || context.ActorProfessionalId == Guid.Empty)
            throw new UnauthorizedAccessException(
                "Sin profesional sanitario ligado a la sesión; no se puede firmar (fail closed).");

        var rx = await prescriptionRepository.GetByIdAsync(context.TenantId, payload.PrescriptionId, ct)
            ?? throw new KeyNotFoundException("Receta no encontrada.");

        if (rx.CancelledAtUtc is not null)
            throw new InvalidOperationException("No se puede firmar una receta cancelada.");
        if (rx.SignedAtUtc is not null)
            throw new InvalidOperationException("La receta ya está firmada (inmutable).");

        var professional = await professionalRepository.GetByIdAsync(
            context.TenantId, context.ActorProfessionalId.Value, ct);
        if (professional is null || !professional.IsActive)
            throw new UnauthorizedAccessException("Profesional no encontrado o inactivo.");
        if (string.IsNullOrWhiteSpace(professional.ProfessionalLicense))
            throw new UnauthorizedAccessException(
                "Sin cédula profesional capturada; no se puede firmar (fail closed).");

        var expectedHash = PrescriptionDomain.HashCanonical(rx);
        if (!string.IsNullOrWhiteSpace(payload.ContentHash)
            && !string.Equals(payload.ContentHash.Trim(), expectedHash, StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("ContentHash no coincide con el contenido canónico de la receta.");

        var licenseSnapshot = JsonSerializer.Serialize(
            PrescriptionSnapshots.FromProfessional(
                professional.HealthcareProfessionalId,
                professional.FullName,
                professional.ProfessionalLicense!,
                professional.SpecialtyId,
                professional.SpecialtyName),
            NoteJson.Options);

        var facilityJson = await SyncHandlerSupport.BuildFacilitySnapshotJsonAsync(
            encounterRepository, branchRepository, context.TenantId, rx.EncounterId, ct);

        var saleClasses = new List<string>();
        foreach (var item in rx.Items)
        {
            var med = await prescriptionRepository.GetMedicationAsync(context.TenantId, item.MedicationId, ct);
            if (med is not null)
                saleClasses.Add(med.SaleClassification);
        }

        var signedAt = SyncHandlerSupport.OccurredAt(context);
        var validUntil = PrescriptionDomain.DeriveValidUntil(signedAt, saleClasses);

        return new SyncCommandPlan
        {
            ServerEntityId = payload.PrescriptionId.ToString("D"),
            ClinicalProcedures =
            [
                new SyncProcedureCall
                {
                    ProcedureName = "sp_Prescription_Sign",
                    Parameters = new
                    {
                        TenantId = context.TenantId,
                        PrescriptionId = payload.PrescriptionId,
                        ActorUserId = context.UserId,
                        AuthorProfessionalId = context.ActorProfessionalId.Value,
                        ContentHash = expectedHash,
                        AuthorLicenseSnapshot = licenseSnapshot,
                        FacilitySnapshotJson = facilityJson,
                        SignedAtUtc = signedAt.UtcDateTime,
                        ValidUntilUtc = validUntil?.UtcDateTime
                    }
                },
                new SyncProcedureCall
                {
                    ProcedureName = "sp_Prescription_Seal",
                    Parameters = new
                    {
                        TenantId = context.TenantId,
                        PrescriptionId = payload.PrescriptionId,
                        SealedAtUtc = signedAt.UtcDateTime
                    }
                }
            ]
        };
    }
}
