using MediCore.Business.Role;
using MediCore.Business.Subject;
using MediCore.Common;
using MediCore.Models.Subject;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

/// <summary>
/// Sujeto e identidad progresiva (M3 / WS-D).
/// AuthZ: permisos efectivos + break-glass (#23).
/// </summary>
[ApiController]
[Authorize]
[Route("api/subjects")]
public sealed class SubjectsController(
    ISubjectService subjectService,
    IEffectivePermissionService permissionService) : MediCoreControllerBase
{
    [HttpPost]
    public async Task<ActionResult<ApiResponse<SubjectDto>>> Create(
        [FromBody] CreateSubjectRequest request,
        CancellationToken ct)
    {
        if (!await CanAccessPatientsAsync(permissionService, ct))
            return Forbidden<SubjectDto>("Sin permiso para registrar sujetos.");

        try
        {
            var created = await subjectService.CreateAsync(
                TenantId(), UserId(), ProfessionalId(), DisplayName(), request, ct);
            return Ok(ApiResponse<SubjectDto>.Ok(created));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<SubjectDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("CURP", StringComparison.OrdinalIgnoreCase))
        {
            return Conflict(ApiResponse<SubjectDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<SubjectDto>.Fail(ex.Message));
        }
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<SubjectListItemDto>>>> Search(
        [FromQuery] string? search,
        [FromQuery] bool includeUnidentified = true,
        CancellationToken ct = default)
    {
        if (!await CanAccessPatientsAsync(permissionService, ct))
            return Forbidden<IReadOnlyList<SubjectListItemDto>>("Sin permiso para buscar sujetos.");

        var list = await subjectService.SearchAsync(TenantId(), search, includeUnidentified, ct);
        return Ok(ApiResponse<IReadOnlyList<SubjectListItemDto>>.Ok(list));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<SubjectDto>>> Get(Guid id, CancellationToken ct)
    {
        if (!await CanAccessPatientsAsync(permissionService, ct))
            return Forbidden<SubjectDto>("Sin permiso para consultar sujetos.");

        var includeMarks = await CanViewSubjectMarksAsync(permissionService, ct);
        var subject = await subjectService.GetByIdAsync(TenantId(), id, includeMarks, ct);
        if (subject is null)
            return NotFound(ApiResponse<SubjectDto>.Fail("Sujeto no encontrado."));
        return Ok(ApiResponse<SubjectDto>.Ok(subject));
    }

    [HttpPut("{id:guid}/identity")]
    public async Task<ActionResult<ApiResponse<SubjectDto>>> UpdateIdentity(
        Guid id,
        [FromBody] UpdateIdentityRequest request,
        CancellationToken ct)
    {
        if (!await CanAccessPatientsAsync(permissionService, ct))
            return Forbidden<SubjectDto>("Sin permiso para actualizar identidad.");

        try
        {
            var updated = await subjectService.UpdateIdentityAsync(TenantId(), id, UserId(), request, ct);
            if (updated is null)
                return NotFound(ApiResponse<SubjectDto>.Fail("Sujeto no encontrado."));
            return Ok(ApiResponse<SubjectDto>.Ok(updated));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<SubjectDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("CURP", StringComparison.OrdinalIgnoreCase))
        {
            return Conflict(ApiResponse<SubjectDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<SubjectDto>.Fail(ex.Message));
        }
    }

    [HttpPost("{id:guid}/identity-state")]
    public async Task<ActionResult<ApiResponse<IdentityStateEventDto>>> TransitionState(
        Guid id,
        [FromBody] TransitionIdentityStateRequest request,
        CancellationToken ct)
    {
        if (!await CanAccessPatientsAsync(permissionService, ct))
            return Forbidden<IdentityStateEventDto>("Sin permiso para transición de identidad.");

        try
        {
            var canVerify = await CanVerifyOrRectifySubjectAsync(permissionService, ct);
            var ev = await subjectService.TransitionStateAsync(
                TenantId(), id, UserId(), ProfessionalId(), canVerify, request, ct);
            if (ev is null)
                return NotFound(ApiResponse<IdentityStateEventDto>.Fail("Sujeto no encontrado."));
            return Ok(ApiResponse<IdentityStateEventDto>.Ok(ev));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                ApiResponse<IdentityStateEventDto>.Fail(ex.Message));
        }
        catch (KeyNotFoundException)
        {
            return NotFound(ApiResponse<IdentityStateEventDto>.Fail("Sujeto no encontrado."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<IdentityStateEventDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<IdentityStateEventDto>.Fail(ex.Message));
        }
    }

    [HttpPost("{id:guid}/marks")]
    public async Task<ActionResult<ApiResponse<SubjectDistinctiveMarkDto>>> AddMark(
        Guid id,
        [FromBody] AddDistinctiveMarkRequest request,
        CancellationToken ct)
    {
        if (!await CanViewSubjectMarksAsync(permissionService, ct))
            return Forbidden<SubjectDistinctiveMarkDto>(
                "Sin permiso para capturar señas (roles clínicos con secreto profesional).");

        try
        {
            var mark = await subjectService.AddMarkAsync(
                TenantId(), id, UserId(), ProfessionalId(), DisplayName(), request, ct);
            if (mark is null)
                return NotFound(ApiResponse<SubjectDistinctiveMarkDto>.Fail("Sujeto no encontrado."));
            return Ok(ApiResponse<SubjectDistinctiveMarkDto>.Ok(mark));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<SubjectDistinctiveMarkDto>.Fail(ex.Message));
        }
    }

    [HttpPost("{id:guid}/belongings")]
    public async Task<ActionResult<ApiResponse<SubjectBelongingDto>>> AddBelonging(
        Guid id,
        [FromBody] AddBelongingRequest request,
        CancellationToken ct)
    {
        if (!await CanAccessPatientsAsync(permissionService, ct))
            return Forbidden<SubjectBelongingDto>("Sin permiso para registrar pertenencias.");

        try
        {
            var belonging = await subjectService.AddBelongingAsync(TenantId(), id, UserId(), request, ct);
            if (belonging is null)
                return NotFound(ApiResponse<SubjectBelongingDto>.Fail("Sujeto no encontrado."));
            return Ok(ApiResponse<SubjectBelongingDto>.Ok(belonging));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<SubjectBelongingDto>.Fail(ex.Message));
        }
    }

    [HttpPost("search-by-description")]
    public async Task<ActionResult<ApiResponse<DescriptionSearchResultDto>>> SearchByDescription(
        [FromBody] SearchByDescriptionRequest request,
        CancellationToken ct)
    {
        if (!await CanSearchSubjectByDescriptionAsync(permissionService, ct))
            return Forbidden<DescriptionSearchResultDto>(
                "Sin permiso para búsqueda por descripción.");

        var result = await subjectService.SearchByDescriptionAsync(TenantId(), UserId(), request, ct);
        return Ok(ApiResponse<DescriptionSearchResultDto>.Ok(result));
    }

    [HttpPost("{id:guid}/links")]
    public async Task<ActionResult<ApiResponse<SubjectLinkDto>>> Link(
        Guid id,
        [FromBody] LinkSubjectsRequest request,
        CancellationToken ct)
    {
        if (!await CanVerifyOrRectifySubjectAsync(permissionService, ct))
            return Forbidden<SubjectLinkDto>("Sin permiso para vinculación.");

        if (request.SurvivingSubjectId == Guid.Empty)
            request.SurvivingSubjectId = id;

        try
        {
            var link = await subjectService.LinkAsync(TenantId(), UserId(), request, ct);
            return Ok(ApiResponse<SubjectLinkDto>.Ok(link));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<SubjectLinkDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<SubjectLinkDto>.Fail(ex.Message));
        }
    }

    [HttpPost("{id:guid}/links/{linkId:guid}/revert")]
    public async Task<ActionResult<ApiResponse<SubjectLinkDto>>> RevertLink(
        Guid id,
        Guid linkId,
        [FromBody] RevertSubjectLinkRequest request,
        CancellationToken ct)
    {
        if (!await CanVerifyOrRectifySubjectAsync(permissionService, ct))
            return Forbidden<SubjectLinkDto>("Sin permiso para revertir vinculación.");

        try
        {
            var link = await subjectService.RevertLinkAsync(
                TenantId(), id, linkId, UserId(), ProfessionalId(), DisplayName(),
                request, ct);
            return Ok(ApiResponse<SubjectLinkDto>.Ok(link));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<SubjectLinkDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<SubjectLinkDto>.Fail(ex.Message));
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> SoftDelete(Guid id, CancellationToken ct)
    {
        if (!await CanVerifyOrRectifySubjectAsync(permissionService, ct))
            return Forbidden<object>("Sin permiso para baja lógica.");

        await subjectService.SoftDeleteAsync(TenantId(), id, UserId(), ct);
        return Ok(ApiResponse<object>.Ok(new { softDeleted = true }));
    }

    [HttpGet("~/api/branches/{branchId:guid}/unidentified-label-config")]
    public async Task<ActionResult<ApiResponse<UnidentifiedLabelConfigDto>>> GetEffectiveLabelConfig(
        Guid branchId, CancellationToken ct)
    {
        if (!await CanAccessPatientsAsync(permissionService, ct))
            return Forbidden<UnidentifiedLabelConfigDto>("Sin permiso para consultar etiquetas.");

        var config = await subjectService.GetEffectiveLabelConfigAsync(TenantId(), branchId, ct);
        if (config is null)
            return NotFound(ApiResponse<UnidentifiedLabelConfigDto>.Fail(
                "Sin configuración de etiqueta (tenant ni sucursal)."));
        return Ok(ApiResponse<UnidentifiedLabelConfigDto>.Ok(config));
    }

    [HttpPut("~/api/tenant/unidentified-label-config")]
    public async Task<ActionResult<ApiResponse<UnidentifiedLabelConfigDto>>> UpsertTenantLabelConfig(
        [FromBody] UpsertLabelConfigRequest request,
        CancellationToken ct)
    {
        if (!await CanVerifyOrRectifySubjectAsync(permissionService, ct))
            return Forbidden<UnidentifiedLabelConfigDto>("Sin permiso para configurar etiquetas.");

        request.BranchId = null;
        try
        {
            var saved = await subjectService.UpsertLabelConfigAsync(TenantId(), UserId(), request, ct);
            return Ok(ApiResponse<UnidentifiedLabelConfigDto>.Ok(saved));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<UnidentifiedLabelConfigDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<UnidentifiedLabelConfigDto>.Fail(ex.Message));
        }
    }
}
