using MediCore.DataAccess.Professional;
using MediCore.Models.Appointment;
using MediCore.Models.Sync;

namespace MediCore.Business.Sync.Handlers;

/// <summary>Despacha appointment.create|state (M9 estable).</summary>
public sealed class AppointmentSyncCommandHandler(
    IHealthcareProfessionalRepository professionalRepository) : ISyncCommandHandler
{
    public IReadOnlyCollection<string> CommandTypes { get; } =
    [
        "appointment.create",
        "appointment.state"
    ];

    public SyncCommandSupport Support => SyncCommandSupport.Full;

    public async Task<SyncCommandPlan> PlanAsync(SyncCommandContext context, CancellationToken ct)
    {
        var type = context.Request.CommandType.Trim().ToLowerInvariant();
        return type switch
        {
            "appointment.create" => await PlanCreateAsync(context, ct),
            "appointment.state" => PlanState(context),
            _ => throw new ArgumentException($"commandType '{type}' no soportado por AppointmentSyncCommandHandler.")
        };
    }

    private async Task<SyncCommandPlan> PlanCreateAsync(SyncCommandContext context, CancellationToken ct)
    {
        var payload = SyncHandlerSupport.DeserializePayload<SyncAppointmentCreatePayload>(
            context.Request.PayloadJson, "appointment.create");

        ValidateInterval(payload.ScheduledStartUtc, payload.ScheduledEndUtc);
        if (payload.BranchId == Guid.Empty)
            throw new ArgumentException("branchId es obligatorio.");
        if (payload.SubjectId == Guid.Empty)
            throw new ArgumentException("subjectId es obligatorio (puede ser sujeto sin identidad completa).");
        if (payload.ProfessionalId == Guid.Empty)
            throw new ArgumentException("professionalId es obligatorio.");

        var display = await SyncHandlerSupport.SoftDisplayNameAsync(
            professionalRepository, context.TenantId, context.ActorProfessionalId, ct);
        var appointmentId = Guid.NewGuid();
        var now = SyncHandlerSupport.OccurredAt(context);

        return new SyncCommandPlan
        {
            ServerEntityId = appointmentId.ToString("D"),
            ClinicalProcedures =
            [
                new SyncProcedureCall
                {
                    ProcedureName = "sp_Appointment_Create",
                    Parameters = new
                    {
                        AppointmentId = appointmentId,
                        TenantId = context.TenantId,
                        BranchId = payload.BranchId,
                        SubjectId = payload.SubjectId,
                        ProfessionalId = payload.ProfessionalId,
                        RoomId = payload.RoomId,
                        ScheduledStartUtc = payload.ScheduledStartUtc.ToUniversalTime().UtcDateTime,
                        ScheduledEndUtc = payload.ScheduledEndUtc.ToUniversalTime().UtcDateTime,
                        ServiceCode = SyncHandlerSupport.Norm(payload.ServiceCode),
                        Notes = SyncHandlerSupport.Norm(payload.Notes),
                        ActorUserId = context.UserId,
                        ActorProfessionalId = context.ActorProfessionalId,
                        ActorDisplayName = display,
                        OccurredAtUtc = now.UtcDateTime
                    }
                }
            ]
        };
    }

    private SyncCommandPlan PlanState(SyncCommandContext context)
    {
        var payload = SyncHandlerSupport.DeserializePayload<SyncAppointmentStatePayload>(
            context.Request.PayloadJson, "appointment.state");
        if (payload.AppointmentId == Guid.Empty)
            throw new ArgumentException("payload.appointmentId es obligatorio.");
        if (string.IsNullOrWhiteSpace(payload.ToState))
            throw new ArgumentException("toState es obligatorio.");

        var toState = payload.ToState.Trim().ToLowerInvariant();
        if (!AppointmentStates.All.Contains(toState))
            throw new ArgumentException("Estado de cita no reconocido.");
        if (toState == AppointmentStates.Cancelada && string.IsNullOrWhiteSpace(payload.Reason))
            throw new ArgumentException("Cancelar una cita exige motivo.");

        var now = SyncHandlerSupport.OccurredAt(context);
        return new SyncCommandPlan
        {
            ServerEntityId = payload.AppointmentId.ToString("D"),
            ClinicalProcedures =
            [
                new SyncProcedureCall
                {
                    ProcedureName = "sp_Appointment_ChangeState",
                    Parameters = new
                    {
                        TenantId = context.TenantId,
                        AppointmentId = payload.AppointmentId,
                        ToState = toState,
                        Reason = SyncHandlerSupport.Norm(payload.Reason),
                        ActorUserId = context.UserId,
                        ActorProfessionalId = context.ActorProfessionalId,
                        OccurredAtUtc = now.UtcDateTime
                    }
                }
            ]
        };
    }

    private static void ValidateInterval(DateTimeOffset start, DateTimeOffset end)
    {
        if (end <= start)
            throw new ArgumentException("ScheduledEndUtc debe ser posterior a ScheduledStartUtc.");
    }
}
