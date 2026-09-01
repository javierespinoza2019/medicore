using MediCore.Business.Audit;
using MediCore.Business.Role;
using MediCore.Common;
using MediCore.Models.Audit;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/audit")]
public sealed class AuditController(
    IAuditService auditService,
    IEffectivePermissionService permissionService) : MediCoreControllerBase
{
    /// <summary>
    /// Eventos de auditoría por sujeto de atención.
    /// 403 si el rol no puede consultar auditoría (permiso canVerAuditoria / matriz tenant).
    /// </summary>
    [HttpGet("subject/{subjectId:guid}")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AuditEventDto>>>> BySubject(
        Guid subjectId,
        [FromQuery] DateTimeOffset? fromUtc,
        [FromQuery] DateTimeOffset? toUtc,
        CancellationToken ct)
    {
        if (!await CanQueryAuditAsync(permissionService, ct))
            return Forbidden<IReadOnlyList<AuditEventDto>>("Sin permiso para consultar auditoría.");

        var events = await auditService.ListBySubjectAsync(TenantId(), subjectId, fromUtc, toUtc, ct);
        return Ok(ApiResponse<IReadOnlyList<AuditEventDto>>.Ok(events));
    }

    [HttpGet("actor/{userId:guid}")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AuditEventDto>>>> ByActor(
        Guid userId,
        [FromQuery] DateTimeOffset? fromUtc,
        [FromQuery] DateTimeOffset? toUtc,
        CancellationToken ct)
    {
        if (!await CanQueryAuditAsync(permissionService, ct))
            return Forbidden<IReadOnlyList<AuditEventDto>>("Sin permiso para consultar auditoría.");

        var from = fromUtc ?? DateTimeOffset.UtcNow.AddDays(-30);
        var to = toUtc ?? DateTimeOffset.UtcNow;
        if (from > to)
            return BadRequest(ApiResponse<IReadOnlyList<AuditEventDto>>.Fail("fromUtc no puede ser posterior a toUtc."));

        var events = await auditService.ListByActorAsync(TenantId(), userId, from, to, ct);
        return Ok(ApiResponse<IReadOnlyList<AuditEventDto>>.Ok(events));
    }
}
