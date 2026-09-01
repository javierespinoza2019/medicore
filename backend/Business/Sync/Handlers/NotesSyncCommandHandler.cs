using System.Text.Json;
using MediCore.Business.Notes;
using MediCore.DataAccess.Encounter;
using MediCore.DataAccess.Notes;
using MediCore.DataAccess.Professional;
using MediCore.DataAccess.Tenant;
using MediCore.Models.Notes;
using MediCore.Models.Sync;

namespace MediCore.Business.Sync.Handlers;

/// <summary>Despacha note.create|sign|addendum (sign + seal en la misma TX).</summary>
public sealed class NotesSyncCommandHandler(
    INotesRepository notesRepository,
    IEncounterRepository encounterRepository,
    IBranchRepository branchRepository,
    IHealthcareProfessionalRepository professionalRepository) : ISyncCommandHandler
{
    public IReadOnlyCollection<string> CommandTypes { get; } =
    [
        "note.create",
        "note.sign",
        "note.addendum"
    ];

    public SyncCommandSupport Support => SyncCommandSupport.Full;

    public async Task<SyncCommandPlan> PlanAsync(SyncCommandContext context, CancellationToken ct)
    {
        var type = context.Request.CommandType.Trim().ToLowerInvariant();
        return type switch
        {
            "note.create" => await PlanCreateAsync(context, ct),
            "note.sign" => await PlanSignAsync(context, ct),
            "note.addendum" => await PlanAddendumAsync(context, ct),
            _ => throw new ArgumentException($"commandType '{type}' no soportado por NotesSyncCommandHandler.")
        };
    }

    private async Task<SyncCommandPlan> PlanCreateAsync(SyncCommandContext context, CancellationToken ct)
    {
        var payload = SyncHandlerSupport.DeserializePayload<SyncNoteCreatePayload>(
            context.Request.PayloadJson, "note.create");
        if (payload.EncounterId == Guid.Empty)
            throw new ArgumentException("payload.encounterId es obligatorio.");

        NotesDomain.EnsureNoteType(payload.NoteType);
        var noteType = payload.NoteType.Trim().ToLowerInvariant();
        if (payload.Body.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
            throw new ArgumentException("body es obligatorio.");

        var display = await SyncHandlerSupport.RequireDisplayNameAsync(
            professionalRepository, context.TenantId, context.ActorProfessionalId, ct);
        var noteId = Guid.NewGuid();
        var occurred = payload.OccurredAtUtc ?? SyncHandlerSupport.OccurredAt(context);

        return new SyncCommandPlan
        {
            ServerEntityId = noteId.ToString("D"),
            ClinicalProcedures =
            [
                new SyncProcedureCall
                {
                    ProcedureName = "sp_ClinicalNote_Create",
                    Parameters = new
                    {
                        NoteId = noteId,
                        TenantId = context.TenantId,
                        EncounterId = payload.EncounterId,
                        NoteType = noteType,
                        BodyJson = payload.Body.GetRawText(),
                        Prognosis = SyncHandlerSupport.Norm(payload.Prognosis),
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
        var payload = SyncHandlerSupport.DeserializePayload<SyncNoteSignPayload>(
            context.Request.PayloadJson, "note.sign");
        if (payload.NoteId == Guid.Empty)
            throw new ArgumentException("payload.noteId es obligatorio.");

        if (context.ActorProfessionalId is null || context.ActorProfessionalId == Guid.Empty)
            throw new UnauthorizedAccessException(
                "Sin profesional sanitario ligado a la sesión; no se puede firmar (fail closed).");

        var note = await notesRepository.GetByIdAsync(context.TenantId, payload.NoteId, ct)
            ?? throw new KeyNotFoundException("Nota no encontrada.");

        if (note.SignedAtUtc is not null)
            throw new InvalidOperationException("La nota ya está firmada (inmutable).");

        var professional = await professionalRepository.GetByIdAsync(
            context.TenantId, context.ActorProfessionalId.Value, ct);
        if (professional is null || !professional.IsActive)
            throw new UnauthorizedAccessException("Profesional no encontrado o inactivo.");
        if (string.IsNullOrWhiteSpace(professional.ProfessionalLicense))
            throw new UnauthorizedAccessException(
                "Sin cédula profesional capturada; no se puede firmar (fail closed).");

        var expectedHash = NotesDomain.HashCanonical(note.NoteType, note.Body, note.Prognosis);
        if (!string.IsNullOrWhiteSpace(payload.ContentHash)
            && !string.Equals(payload.ContentHash.Trim(), expectedHash, StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("ContentHash no coincide con el contenido canónico de la nota.");

        var licenseSnapshot = JsonSerializer.Serialize(new AuthorLicenseSnapshot
        {
            ProfessionalId = professional.HealthcareProfessionalId,
            FullName = professional.FullName,
            ProfessionalLicense = professional.ProfessionalLicense!,
            SpecialtyId = professional.SpecialtyId,
            SpecialtyName = professional.SpecialtyName
        }, NoteJson.Options);

        var facilityJson = await SyncHandlerSupport.BuildFacilitySnapshotJsonAsync(
            encounterRepository, branchRepository, context.TenantId, note.EncounterId, ct);

        var signedAt = SyncHandlerSupport.OccurredAt(context);
        var sealedAt = signedAt;

        return new SyncCommandPlan
        {
            ServerEntityId = payload.NoteId.ToString("D"),
            ClinicalProcedures =
            [
                new SyncProcedureCall
                {
                    ProcedureName = "sp_ClinicalNote_Sign",
                    Parameters = new
                    {
                        TenantId = context.TenantId,
                        NoteId = payload.NoteId,
                        ContentHash = expectedHash,
                        AuthorProfessionalId = context.ActorProfessionalId.Value,
                        AuthorLicenseSnapshot = licenseSnapshot,
                        FacilitySnapshotJson = facilityJson,
                        SignedAtUtc = signedAt.UtcDateTime,
                        ActorUserId = context.UserId
                    }
                },
                new SyncProcedureCall
                {
                    ProcedureName = "sp_ClinicalNote_Seal",
                    Parameters = new
                    {
                        TenantId = context.TenantId,
                        NoteId = payload.NoteId,
                        SealedAtUtc = sealedAt.UtcDateTime
                    }
                }
            ]
        };
    }

    private async Task<SyncCommandPlan> PlanAddendumAsync(SyncCommandContext context, CancellationToken ct)
    {
        var payload = SyncHandlerSupport.DeserializePayload<SyncNoteAddendumPayload>(
            context.Request.PayloadJson, "note.addendum");
        if (payload.NoteId == Guid.Empty)
            throw new ArgumentException("payload.noteId es obligatorio.");
        if (string.IsNullOrWhiteSpace(payload.ReasonText))
            throw new ArgumentException("reasonText del addendum es obligatorio.");

        var display = await SyncHandlerSupport.RequireDisplayNameAsync(
            professionalRepository, context.TenantId, context.ActorProfessionalId, ct);
        var addendumId = Guid.NewGuid();
        var now = SyncHandlerSupport.OccurredAt(context);

        return new SyncCommandPlan
        {
            ServerEntityId = addendumId.ToString("D"),
            ClinicalProcedures =
            [
                new SyncProcedureCall
                {
                    ProcedureName = "sp_ClinicalNote_AddAddendum",
                    Parameters = new
                    {
                        AddendumId = addendumId,
                        TenantId = context.TenantId,
                        NoteId = payload.NoteId,
                        ReasonText = payload.ReasonText.Trim(),
                        BodyJson = payload.BodyJson,
                        ActorUserId = context.UserId,
                        ActorProfessionalId = context.ActorProfessionalId,
                        ActorDisplayName = display,
                        OccurredAtUtc = now.UtcDateTime
                    }
                }
            ]
        };
    }
}
