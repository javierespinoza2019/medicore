using MediCore.Business.ClinicalRecord;
using MediCore.Business.Role;
using MediCore.Common;
using MediCore.Models.ClinicalRecord;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

/// <summary>
/// Expediente e historia clínica (M7 / WS-G). AuthZ: permisos efectivos + break-glass (#23).
/// </summary>
[ApiController]
[Authorize]
[Route("api/subjects/{subjectId:guid}")]
public sealed class ClinicalRecordController(
    IClinicalRecordService clinicalRecordService,
    IEffectivePermissionService permissionService) : MediCoreControllerBase
{
    [HttpGet("record")]
    public async Task<ActionResult<ApiResponse<ClinicalRecordDto>>> GetRecord(
        Guid subjectId, CancellationToken ct)
    {
        if (!await CanAccessClinicalAsync(permissionService, ct))
            return Forbidden<ClinicalRecordDto>("Sin permiso para leer el expediente.");

        try
        {
            var record = await clinicalRecordService.GetBySubjectAsync(
                TenantId(), subjectId, UserId(), ProfessionalId(), DisplayName(), ct);
            return Ok(ApiResponse<ClinicalRecordDto>.Ok(record));
        }
        catch (KeyNotFoundException)
        {
            return NotFound(ApiResponse<ClinicalRecordDto>.Fail("Sujeto o expediente no encontrado."));
        }
        catch (ArgumentException ex)
        {
            return NotFound(ApiResponse<ClinicalRecordDto>.Fail(ex.Message));
        }
    }

    [HttpPost("history")]
    public async Task<ActionResult<ApiResponse<MedicalHistoryDto>>> SaveHistory(
        Guid subjectId, [FromBody] SaveMedicalHistoryRequest request, CancellationToken ct)
    {
        if (!await CanAccessClinicalAsync(permissionService, ct))
            return Forbidden<MedicalHistoryDto>("Sin permiso para capturar historia clínica.");

        try
        {
            var saved = await clinicalRecordService.SaveHistoryAsync(
                TenantId(), subjectId, UserId(), ProfessionalId(), DisplayName(), request, ct);
            return Ok(ApiResponse<MedicalHistoryDto>.Ok(saved));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<MedicalHistoryDto>.Fail(ex.Message));
        }
        catch (KeyNotFoundException)
        {
            return NotFound(ApiResponse<MedicalHistoryDto>.Fail("Sujeto no encontrado."));
        }
    }

    [HttpPost("history/amendments")]
    public async Task<ActionResult<ApiResponse<AmendmentDto>>> AddAmendment(
        Guid subjectId, [FromBody] AddAmendmentRequest request, CancellationToken ct)
    {
        if (!await CanAccessClinicalAsync(permissionService, ct))
            return Forbidden<AmendmentDto>("Sin permiso para addendum de historia.");

        try
        {
            var amendment = await clinicalRecordService.AddAmendmentAsync(
                TenantId(), subjectId, UserId(), ProfessionalId(), DisplayName(), request, ct);
            return Ok(ApiResponse<AmendmentDto>.Ok(amendment));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<AmendmentDto>.Fail(ex.Message));
        }
        catch (KeyNotFoundException)
        {
            return NotFound(ApiResponse<AmendmentDto>.Fail("Expediente o historia no encontrada."));
        }
    }

    [HttpPut("allergy-status")]
    public async Task<ActionResult<ApiResponse<AllergyStatusDto>>> SetAllergyStatus(
        Guid subjectId, [FromBody] SetAllergyStatusRequest request, CancellationToken ct)
    {
        if (!await CanAccessClinicalAsync(permissionService, ct))
            return Forbidden<AllergyStatusDto>("Sin permiso para estado alérgico.");

        try
        {
            var status = await clinicalRecordService.SetAllergyStatusAsync(
                TenantId(), subjectId, UserId(), ProfessionalId(), DisplayName(), request, ct);
            return Ok(ApiResponse<AllergyStatusDto>.Ok(status));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<AllergyStatusDto>.Fail(ex.Message));
        }
    }

    [HttpPost("allergies")]
    public async Task<ActionResult<ApiResponse<AllergyDto>>> AddAllergy(
        Guid subjectId, [FromBody] AddAllergyRequest request, CancellationToken ct)
    {
        if (!await CanAccessClinicalAsync(permissionService, ct))
            return Forbidden<AllergyDto>("Sin permiso para registrar alergias.");

        try
        {
            var allergy = await clinicalRecordService.AddAllergyAsync(
                TenantId(), subjectId, UserId(), ProfessionalId(), DisplayName(), request, ct);
            return Ok(ApiResponse<AllergyDto>.Ok(allergy));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<AllergyDto>.Fail(ex.Message));
        }
    }

    [HttpDelete("allergies/{allergyId:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> SoftDeleteAllergy(
        Guid subjectId, Guid allergyId, CancellationToken ct)
    {
        if (!await CanAccessClinicalAsync(permissionService, ct))
            return Forbidden<object>("Sin permiso para baja lógica de alergia.");

        try
        {
            await clinicalRecordService.SoftDeleteAllergyAsync(
                TenantId(), subjectId, allergyId, UserId(), ct);
            return Ok(ApiResponse<object>.Ok(new { softDeleted = true }));
        }
        catch (KeyNotFoundException)
        {
            return NotFound(ApiResponse<object>.Fail("Alergia no encontrada."));
        }
    }

    [HttpPut("flags")]
    public async Task<ActionResult<ApiResponse<SubjectFlagDto>>> SetFlag(
        Guid subjectId, [FromBody] SetSubjectFlagRequest request, CancellationToken ct)
    {
        if (!await CanAccessClinicalAsync(permissionService, ct))
            return Forbidden<SubjectFlagDto>("Sin permiso para alertas del sujeto.");

        try
        {
            var flag = await clinicalRecordService.SetFlagAsync(
                TenantId(), subjectId, UserId(), ProfessionalId(), DisplayName(), request, ct);
            return Ok(ApiResponse<SubjectFlagDto>.Ok(flag));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<SubjectFlagDto>.Fail(ex.Message));
        }
    }

}
