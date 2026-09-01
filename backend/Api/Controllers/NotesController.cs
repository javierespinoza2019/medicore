using MediCore.Business.Notes;
using MediCore.Business.Role;
using MediCore.Common;
using MediCore.Models.Notes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

/// <summary>
/// Notas clínicas y firma local + sello (M6 / WS-H).
/// Autoría desde claims (SC-12). Nota firmada inmutable (SC-06).
/// No afirma validez jurídica de la firma (pregunta G / dictamen 69).
/// </summary>
[ApiController]
[Authorize]
public sealed class NotesController(
    INotesService notesService,
    IEffectivePermissionService permissionService) : MediCoreControllerBase
{
    [HttpPost("api/encounters/{encounterId:guid}/notes")]
    public async Task<ActionResult<ApiResponse<ClinicalNoteDto>>> Create(
        Guid encounterId, [FromBody] CreateNoteRequest request, CancellationToken ct)
    {
        if (!await CanAccessClinicalAsync(permissionService, ct))
            return Forbidden<ClinicalNoteDto>("Sin permiso para crear notas clínicas.");

        try
        {
            var note = await notesService.CreateAsync(
                TenantId(), encounterId, UserId(), ProfessionalId(), DisplayName(), request, ct);
            return Ok(ApiResponse<ClinicalNoteDto>.Ok(note));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<ClinicalNoteDto>.Fail(ex.Message));
        }
        catch (KeyNotFoundException)
        {
            return NotFound(ApiResponse<ClinicalNoteDto>.Fail("Episodio no encontrado."));
        }
    }

    [HttpGet("api/encounters/{encounterId:guid}/notes")]
    public async Task<ActionResult<ApiResponse<ClinicalNoteDto[]>>> ListByEncounter(
        Guid encounterId, CancellationToken ct)
    {
        if (!await CanAccessClinicalAsync(permissionService, ct))
            return Forbidden<ClinicalNoteDto[]>("Sin permiso para listar notas.");

        try
        {
            var list = await notesService.ListByEncounterAsync(TenantId(), encounterId, ct);
            return Ok(ApiResponse<ClinicalNoteDto[]>.Ok(list.ToArray()));
        }
        catch (KeyNotFoundException)
        {
            return NotFound(ApiResponse<ClinicalNoteDto[]>.Fail("Episodio no encontrado."));
        }
    }

    [HttpGet("api/notes/{noteId:guid}")]
    public async Task<ActionResult<ApiResponse<ClinicalNoteDto>>> GetById(
        Guid noteId, CancellationToken ct)
    {
        if (!await CanAccessClinicalAsync(permissionService, ct))
            return Forbidden<ClinicalNoteDto>("Sin permiso para leer notas.");

        try
        {
            var note = await notesService.GetByIdAsync(TenantId(), noteId, ct);
            return Ok(ApiResponse<ClinicalNoteDto>.Ok(note));
        }
        catch (KeyNotFoundException)
        {
            return NotFound(ApiResponse<ClinicalNoteDto>.Fail("Nota no encontrada."));
        }
    }

    [HttpPost("api/notes/{noteId:guid}/sign")]
    public async Task<ActionResult<ApiResponse<ClinicalNoteDto>>> Sign(
        Guid noteId, [FromBody] SignNoteRequest? request, CancellationToken ct)
    {
        if (!await CanAccessClinicalAsync(permissionService, ct))
            return Forbidden<ClinicalNoteDto>("Sin permiso para firmar notas.");

        try
        {
            var note = await notesService.SignAsync(
                TenantId(), noteId, UserId(), ProfessionalId(), DisplayName(),
                request ?? new SignNoteRequest(), ct);
            return Ok(ApiResponse<ClinicalNoteDto>.Ok(note));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                ApiResponse<ClinicalNoteDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<ClinicalNoteDto>.Fail(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<ClinicalNoteDto>.Fail(ex.Message));
        }
        catch (KeyNotFoundException)
        {
            return NotFound(ApiResponse<ClinicalNoteDto>.Fail("Nota no encontrada."));
        }
    }

    [HttpPost("api/notes/{noteId:guid}/addenda")]
    public async Task<ActionResult<ApiResponse<NoteAddendumDto>>> AddAddendum(
        Guid noteId, [FromBody] AddNoteAddendumRequest request, CancellationToken ct)
    {
        if (!await CanAccessClinicalAsync(permissionService, ct))
            return Forbidden<NoteAddendumDto>("Sin permiso para addendum de nota.");

        try
        {
            var addendum = await notesService.AddAddendumAsync(
                TenantId(), noteId, UserId(), ProfessionalId(), DisplayName(), request, ct);
            return Ok(ApiResponse<NoteAddendumDto>.Ok(addendum));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<NoteAddendumDto>.Fail(ex.Message));
        }
        catch (KeyNotFoundException)
        {
            return NotFound(ApiResponse<NoteAddendumDto>.Fail("Nota no encontrada."));
        }
    }

    [HttpPost("api/notes/{noteId:guid}/co-authors")]
    public async Task<ActionResult<ApiResponse<ClinicalNoteDto>>> AddCoAuthor(
        Guid noteId, [FromBody] AddCoAuthorRequest request, CancellationToken ct)
    {
        if (!await CanAccessClinicalAsync(permissionService, ct))
            return Forbidden<ClinicalNoteDto>("Sin permiso para co-autoría.");

        try
        {
            var note = await notesService.AddCoAuthorAsync(TenantId(), noteId, UserId(), request, ct);
            return Ok(ApiResponse<ClinicalNoteDto>.Ok(note));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                ApiResponse<ClinicalNoteDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<ClinicalNoteDto>.Fail(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<ClinicalNoteDto>.Fail(ex.Message));
        }
        catch (KeyNotFoundException)
        {
            return NotFound(ApiResponse<ClinicalNoteDto>.Fail("Nota no encontrada."));
        }
    }

    [HttpGet("api/notes/pending-evolution")]
    public async Task<ActionResult<ApiResponse<PendingEvolutionDto[]>>> PendingEvolution(
        [FromQuery] Guid branchId, [FromQuery] int hoursThreshold = 8, CancellationToken ct = default)
    {
        if (!await CanAccessClinicalAsync(permissionService, ct))
            return Forbidden<PendingEvolutionDto[]>("Sin permiso para pendientes de evolución.");

        if (branchId == Guid.Empty)
            return BadRequest(ApiResponse<PendingEvolutionDto[]>.Fail("branchId es obligatorio."));

        try
        {
            var list = await notesService.ListPendingEvolutionAsync(
                TenantId(), branchId, hoursThreshold, ct);
            return Ok(ApiResponse<PendingEvolutionDto[]>.Ok(list.ToArray()));
        }
        catch (KeyNotFoundException)
        {
            return NotFound(ApiResponse<PendingEvolutionDto[]>.Fail("Sucursal no encontrada."));
        }
    }

    /// <summary>SC-06: no existe ruta de edición de nota firmada.</summary>
    [HttpPut("api/notes/{noteId:guid}")]
    [HttpPatch("api/notes/{noteId:guid}")]
    public ActionResult<ApiResponse<object>> RejectMutation(Guid noteId) =>
        StatusCode(StatusCodes.Status405MethodNotAllowed,
            ApiResponse<object>.Fail(
                "Una nota clínica no se edita por PUT/PATCH. Si está firmada es inmutable; use addendum (SC-06)."));
}
