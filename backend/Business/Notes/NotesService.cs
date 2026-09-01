using System.Text.Json;
using MediCore.DataAccess.Encounter;
using MediCore.DataAccess.Notes;
using MediCore.DataAccess.Professional;
using MediCore.DataAccess.Tenant;
using MediCore.Models.Notes;

namespace MediCore.Business.Notes;

public interface INotesService
{
    Task<ClinicalNoteDto> CreateAsync(
        Guid tenantId, Guid encounterId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, CreateNoteRequest request, CancellationToken ct);

    Task<ClinicalNoteDto> GetByIdAsync(Guid tenantId, Guid noteId, CancellationToken ct);

    Task<IReadOnlyList<ClinicalNoteDto>> ListByEncounterAsync(
        Guid tenantId, Guid encounterId, CancellationToken ct);

    Task<ClinicalNoteDto> SignAsync(
        Guid tenantId, Guid noteId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, SignNoteRequest request, CancellationToken ct);

    Task<NoteAddendumDto> AddAddendumAsync(
        Guid tenantId, Guid noteId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, AddNoteAddendumRequest request, CancellationToken ct);

    Task<ClinicalNoteDto> AddCoAuthorAsync(
        Guid tenantId, Guid noteId, Guid actorUserId, AddCoAuthorRequest request, CancellationToken ct);

    Task<IReadOnlyList<PendingEvolutionDto>> ListPendingEvolutionAsync(
        Guid tenantId, Guid branchId, int hoursThreshold, CancellationToken ct);
}

public sealed class NotesService(
    INotesRepository notesRepository,
    IEncounterRepository encounterRepository,
    IBranchRepository branchRepository,
    IHealthcareProfessionalRepository professionalRepository) : INotesService
{
    public async Task<ClinicalNoteDto> CreateAsync(
        Guid tenantId, Guid encounterId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, CreateNoteRequest request, CancellationToken ct)
    {
        NotesDomain.EnsureNoteType(request.NoteType);
        var noteType = request.NoteType.Trim().ToLowerInvariant();

        if (request.Body.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
            throw new ArgumentException("body es obligatorio.");

        var bodyJson = request.Body.GetRawText();
        var prognosis = string.IsNullOrWhiteSpace(request.Prognosis) ? null : request.Prognosis.Trim();
        var occurred = request.OccurredAtUtc ?? DateTimeOffset.UtcNow;

        var created = await notesRepository.CreateAsync(
            tenantId, Guid.NewGuid(), encounterId, actorUserId, actorProfessionalId,
            Display(actorDisplayName), occurred, noteType, bodyJson, prognosis, ct);

        return created ?? throw new InvalidOperationException("No se pudo crear la nota clínica.");
    }

    public async Task<ClinicalNoteDto> GetByIdAsync(Guid tenantId, Guid noteId, CancellationToken ct)
    {
        var note = await notesRepository.GetByIdAsync(tenantId, noteId, ct);
        return note ?? throw new KeyNotFoundException("Nota no encontrada.");
    }

    public Task<IReadOnlyList<ClinicalNoteDto>> ListByEncounterAsync(
        Guid tenantId, Guid encounterId, CancellationToken ct) =>
        notesRepository.ListByEncounterAsync(tenantId, encounterId, ct);

    public async Task<ClinicalNoteDto> SignAsync(
        Guid tenantId, Guid noteId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, SignNoteRequest request, CancellationToken ct)
    {
        // Fail closed: autoría desde token; sin profesional ligado no se firma (SC-12).
        if (actorProfessionalId is null || actorProfessionalId == Guid.Empty)
            throw new UnauthorizedAccessException(
                "Sin profesional sanitario ligado a la sesión; no se puede firmar (fail closed).");

        var note = await notesRepository.GetByIdAsync(tenantId, noteId, ct)
            ?? throw new KeyNotFoundException("Nota no encontrada.");

        if (note.SignedAtUtc is not null)
            throw new InvalidOperationException("La nota ya está firmada (inmutable).");

        var professional = await professionalRepository.GetByIdAsync(
            tenantId, actorProfessionalId.Value, ct);
        if (professional is null || !professional.IsActive)
            throw new UnauthorizedAccessException("Profesional no encontrado o inactivo.");

        if (string.IsNullOrWhiteSpace(professional.ProfessionalLicense))
            throw new UnauthorizedAccessException(
                "Sin cédula profesional capturada; no se puede firmar (fail closed).");

        var expectedHash = NotesDomain.HashCanonical(note.NoteType, note.Body, note.Prognosis);
        if (!string.IsNullOrWhiteSpace(request.ContentHash)
            && !string.Equals(request.ContentHash.Trim(), expectedHash, StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("ContentHash no coincide con el contenido canónico de la nota.");

        var licenseSnapshot = JsonSerializer.Serialize(new AuthorLicenseSnapshot
        {
            ProfessionalId = professional.HealthcareProfessionalId,
            FullName = professional.FullName,
            ProfessionalLicense = professional.ProfessionalLicense!,
            SpecialtyId = professional.SpecialtyId,
            SpecialtyName = professional.SpecialtyName
        }, NoteJson.Options);

        string? facilityJson = null;
        var encounter = await encounterRepository.GetByIdAsync(tenantId, note.EncounterId, ct);
        if (encounter is not null)
        {
            var branch = await branchRepository.GetByIdAsync(tenantId, encounter.BranchId, ct);
            if (branch is not null)
            {
                // Campos no capturados quedan null; no se inventa domicilio (M11 / NOM-004 5.2).
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

        var signedAt = DateTimeOffset.UtcNow;
        ClinicalNoteDto signed;
        try
        {
            signed = await notesRepository.SignAsync(
                tenantId, noteId, actorUserId, actorProfessionalId.Value,
                expectedHash, licenseSnapshot, facilityJson, signedAt, ct)
                ?? throw new InvalidOperationException("No se pudo firmar la nota.");
        }
        catch (UnauthorizedAccessException)
        {
            throw;
        }
        catch (InvalidOperationException)
        {
            throw;
        }

        // Escritura online: el servidor sella de inmediato. Offline dejaría «sello pendiente»
        // hasta SyncService (commandType note.sign → seal; handlers no cableados en este turno).
        try
        {
            signed = await notesRepository.SealAsync(tenantId, noteId, DateTimeOffset.UtcNow, ct)
                ?? signed;
        }
        catch (InvalidOperationException)
        {
            // Si ya estaba sellada u otro estado, devolvemos la firmada.
        }

        // Pregunta H: se registra el toque sin afirmar que cuente para retención NOM-004 5.4.
        await notesRepository.TryTouchMedicalActAsync(
            tenantId, signed.SubjectId, signedAt,
            NotesDomain.TentativeMedicalActType(signed.NoteType), actorUserId, ct);

        _ = actorDisplayName; // autoría ya congelada en snapshot; display del token no se reescribe
        return signed;
    }

    public async Task<NoteAddendumDto> AddAddendumAsync(
        Guid tenantId, Guid noteId, Guid actorUserId, Guid? actorProfessionalId,
        string actorDisplayName, AddNoteAddendumRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.ReasonText))
            throw new ArgumentException("reasonText del addendum es obligatorio.");

        var addendum = await notesRepository.AddAddendumAsync(
            tenantId, noteId, Guid.NewGuid(), actorUserId, actorProfessionalId,
            Display(actorDisplayName), DateTimeOffset.UtcNow, request.ReasonText.Trim(),
            request.BodyJson, ct);

        return addendum ?? throw new KeyNotFoundException("Nota no encontrada.");
    }

    public async Task<ClinicalNoteDto> AddCoAuthorAsync(
        Guid tenantId, Guid noteId, Guid actorUserId, AddCoAuthorRequest request, CancellationToken ct)
    {
        if (request.ProfessionalId == Guid.Empty)
            throw new ArgumentException("professionalId es obligatorio.");

        var note = await notesRepository.AddCoAuthorAsync(
            tenantId, noteId, Guid.NewGuid(), request.ProfessionalId, actorUserId, ct);

        return note ?? throw new KeyNotFoundException("Nota no encontrada.");
    }

    public Task<IReadOnlyList<PendingEvolutionDto>> ListPendingEvolutionAsync(
        Guid tenantId, Guid branchId, int hoursThreshold, CancellationToken ct) =>
        notesRepository.ListPendingEvolutionAsync(
            tenantId, branchId, hoursThreshold < 1 ? 8 : hoursThreshold, ct);

    private static string Display(string? name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("DisplayName de autoría es obligatorio; no se sustituye con un literal.");
        return name.Trim();
    }
}
