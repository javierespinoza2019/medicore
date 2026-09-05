namespace MediCore.Models.Appointment;

/// <summary>
/// Estados de cita (M9). Incluye flujo clínico intermedio (#agenda 2026-09-02).
/// Sin DELETE físico; cancelada / no_asistio / atendida dejan historial.
/// </summary>
public static class AppointmentStates
{
    public const string Agendada = "agendada";
    public const string Confirmada = "confirmada";
    public const string Llego = "llego";
    public const string EnEspera = "en_espera";
    public const string EnConsulta = "en_consulta";
    public const string Atendida = "atendida";
    public const string NoAsistio = "no_asistio";
    public const string Cancelada = "cancelada";

    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        Agendada, Confirmada, Llego, EnEspera, EnConsulta, Atendida, NoAsistio, Cancelada
    };

    /// <summary>Estados que liberan el intervalo (no cuentan para traslape).</summary>
    public static readonly HashSet<string> NonBlocking = new(StringComparer.OrdinalIgnoreCase)
    {
        Cancelada, NoAsistio
    };

    /// <summary>Terminales: no admiten más cambios de estado.</summary>
    public static readonly HashSet<string> Terminal = new(StringComparer.OrdinalIgnoreCase)
    {
        Cancelada, NoAsistio, Atendida
    };

    /// <summary>
    /// Transiciones permitidas. Conserva atajos previos (p. ej. confirmada→atendida)
    /// y añade el flujo de llegada / sala / consulta.
    /// </summary>
    public static bool CanTransition(string fromState, string toState)
    {
        if (string.IsNullOrWhiteSpace(fromState) || string.IsNullOrWhiteSpace(toState))
            return false;
        var from = fromState.Trim().ToLowerInvariant();
        var to = toState.Trim().ToLowerInvariant();
        if (from == to) return false;
        if (Terminal.Contains(from)) return false;
        if (!All.Contains(from) || !All.Contains(to)) return false;

        return from switch
        {
            Agendada => to is Confirmada or Llego or Atendida or Cancelada or NoAsistio,
            Confirmada => to is Llego or EnEspera or EnConsulta or Atendida or Cancelada or NoAsistio,
            Llego => to is EnEspera or EnConsulta or Cancelada or NoAsistio,
            EnEspera => to is EnConsulta or Cancelada or NoAsistio,
            EnConsulta => to is Atendida or Cancelada,
            _ => false
        };
    }
}

public sealed class ConsultingRoomDto
{
    public Guid RoomId { get; set; }
    public Guid TenantId { get; set; }
    public Guid BranchId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public Guid? SpecialtyId { get; set; }
    public string? SpecialtyName { get; set; }
    public IReadOnlyList<Guid> ProfessionalIds { get; set; } = [];
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
}

public sealed class UpsertConsultingRoomRequest
{
    public Guid BranchId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public Guid? SpecialtyId { get; set; }
    public IReadOnlyList<Guid>? ProfessionalIds { get; set; }
}

public sealed class AppointmentDto
{
    public Guid AppointmentId { get; set; }
    public Guid TenantId { get; set; }
    public Guid BranchId { get; set; }
    public Guid SubjectId { get; set; }
    public Guid ProfessionalId { get; set; }
    public Guid? RoomId { get; set; }
    public DateTimeOffset ScheduledStartUtc { get; set; }
    public DateTimeOffset ScheduledEndUtc { get; set; }
    public string State { get; set; } = string.Empty;
    public string? ServiceCode { get; set; }
    public string? Notes { get; set; }
    public Guid CreatedByUserId { get; set; }
    public Guid? CreatedByProfessionalId { get; set; }
    public string CreatedByDisplayName { get; set; } = string.Empty;
    public DateTimeOffset OccurredAtUtc { get; set; }
    public DateTimeOffset RecordedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }

    public string? SubjectGivenName { get; set; }
    public string? SubjectFirstSurname { get; set; }
    public string? SubjectSecondSurname { get; set; }
    public string? SubjectPreferredName { get; set; }
    public string? SubjectIdentificationState { get; set; }
    public string? SubjectOperationalLabel { get; set; }
    public string? ProfessionalFullName { get; set; }
    public string? ProfessionalLicense { get; set; }
    public string? RoomCode { get; set; }
    public string? RoomName { get; set; }

    /// <summary>Etiqueta de presentación: nombre, preferred o etiqueta operativa.</summary>
    public string SubjectDisplayLabel
    {
        get
        {
            var parts = new[] { SubjectGivenName, SubjectFirstSurname, SubjectSecondSurname }
                .Where(p => !string.IsNullOrWhiteSpace(p))
                .Select(p => p!.Trim())
                .ToArray();
            if (parts.Length > 0)
                return string.Join(' ', parts);
            if (!string.IsNullOrWhiteSpace(SubjectPreferredName))
                return SubjectPreferredName.Trim();
            if (!string.IsNullOrWhiteSpace(SubjectOperationalLabel))
                return SubjectOperationalLabel.Trim();
            return "Sujeto sin nombre";
        }
    }
}

public sealed class CreateAppointmentRequest
{
    public Guid BranchId { get; set; }
    public Guid SubjectId { get; set; }
    public Guid ProfessionalId { get; set; }
    public Guid? RoomId { get; set; }
    public DateTimeOffset ScheduledStartUtc { get; set; }
    public DateTimeOffset ScheduledEndUtc { get; set; }
    public string? ServiceCode { get; set; }
    public string? Notes { get; set; }
}

public sealed class RescheduleAppointmentRequest
{
    public DateTimeOffset ScheduledStartUtc { get; set; }
    public DateTimeOffset ScheduledEndUtc { get; set; }
    public Guid? ProfessionalId { get; set; }
    public Guid? RoomId { get; set; }
    public string? ServiceCode { get; set; }
    public string? Notes { get; set; }
}

public sealed class ChangeAppointmentStateRequest
{
    public string ToState { get; set; } = string.Empty;
    /// <summary>Obligatorio al cancelar.</summary>
    public string? Reason { get; set; }
}

public static class ScheduleBlockKinds
{
    public const string Rango = "rango";
    public const string Dia = "dia";
    public const string Medico = "medico";
    public const string Especialidad = "especialidad";

    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        Rango, Dia, Medico, Especialidad
    };
}

public sealed class ScheduleBlockDto
{
    public Guid BlockId { get; set; }
    public Guid TenantId { get; set; }
    public Guid BranchId { get; set; }
    public string Kind { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public DateOnly LocalDate { get; set; }
    public DateTimeOffset StartUtc { get; set; }
    public DateTimeOffset EndUtc { get; set; }
    public Guid? ProfessionalId { get; set; }
    public string? ProfessionalFullName { get; set; }
    public Guid? SpecialtyId { get; set; }
    public string? SpecialtyName { get; set; }
    public bool IsActive { get; set; }
    public Guid CreatedByUserId { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
}

public sealed class UpsertScheduleBlockRequest
{
    public Guid BranchId { get; set; }
    public string Kind { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public DateOnly LocalDate { get; set; }
    public DateTimeOffset StartUtc { get; set; }
    public DateTimeOffset EndUtc { get; set; }
    public Guid? ProfessionalId { get; set; }
    public Guid? SpecialtyId { get; set; }
    public bool IsActive { get; set; } = true;
}
