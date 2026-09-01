using System.Security.Claims;
using MediCore.Business.Sync;
using MediCore.Common;
using MediCore.Models.Encounter;
using MediCore.Models.Prescription;
using MediCore.Models.Sync;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/sync")]
public sealed class SyncController(ISyncService syncService) : ControllerBase
{
    [HttpPost("commands")]
    public async Task<ActionResult<ApiResponse<SyncAcceptedDto>>> Accept(
        [FromBody] SyncEnvelopeRequest request,
        CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var tenantId = Guid.Parse(User.FindFirstValue(MediCoreClaims.TenantId)!);
        var rawProfessional = User.FindFirstValue(MediCoreClaims.HealthcareProfessionalId);
        Guid? professionalId = Guid.TryParse(rawProfessional, out var parsed) ? parsed : null;

        try
        {
            var result = await syncService.AcceptAsync(tenantId, userId, professionalId, request, ct);
            return Ok(ApiResponse<SyncAcceptedDto>.Ok(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<SyncAcceptedDto>.Fail(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<SyncAcceptedDto>.Fail(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<SyncAcceptedDto>.Fail(ex.Message));
        }
        catch (PrescriptionControlledSubstanceException ex)
        {
            return UnprocessableEntity(ApiResponse<SyncAcceptedDto>.Fail(ex.Message));
        }
        catch (EncounterCloseWithoutJustificationException ex)
        {
            return UnprocessableEntity(ApiResponse<SyncAcceptedDto>.Fail(ex.Message));
        }
        catch (EncounterCloseWithPendingPrescriptionsException ex)
        {
            return Conflict(ApiResponse<SyncAcceptedDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<SyncAcceptedDto>.Fail(ex.Message));
        }
        catch (SyncIdempotencyConflictException ex)
        {
            // 409: la clave ya se usó con otro comando o contenido. Se distingue así del
            // reintento legítimo de la cola offline, que sigue devolviendo 200 + duplicate.
            return Conflict(new ApiResponse<SyncAcceptedDto>
            {
                Success = false,
                Message = ex.Message,
                Errors = [ex.Message],
                Data = new SyncAcceptedDto
                {
                    IdempotencyKey = ex.IdempotencyKey,
                    Status = "conflict"
                }
            });
        }
    }
}
