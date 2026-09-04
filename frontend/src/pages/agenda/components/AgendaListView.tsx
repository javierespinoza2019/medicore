import { useMemo, useState } from 'react';
import { statusConfig, type Appointment } from '@/pages/agenda/types';
import Badge from '@/components/base/Badge';

interface AgendaListViewProps {
  appointments: Appointment[];
  onReprint: (appointment: Appointment) => void;
  onMarkAttendance: (appointment: Appointment) => void;
}

export default function AgendaListView({ appointments, onReprint, onMarkAttendance }: AgendaListViewProps) {
  const [filterEstado, setFilterEstado] = useState('');

  const sorted = useMemo(() => {
    return [...appointments].sort((a, b) => {
      if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
      return a.horaInicio.localeCompare(b.horaInicio);
    });
  }, [appointments]);

  const visible = useMemo(() => {
    if (!filterEstado) return sorted;
    return sorted.filter((a) => a.estado === filterEstado);
  }, [sorted, filterEstado]);

  const filterOptions = Object.entries(statusConfig).filter(
    ([k]) => k !== 'disponible' && k !== 'en_triage' && k !== 'llamando',
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <p className="text-xs text-foreground-500">Listado detallado de agendamientos</p>
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          aria-label="Filtrar listado por estado"
          className="px-2.5 py-1.5 text-xs bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 outline-none focus:border-primary-400 cursor-pointer"
        >
          <option value="">Todos los estados</option>
          {filterOptions.map(([key, cfg]) => (
            <option key={key} value={key}>
              {cfg.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-secondary-200">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10 bg-secondary-50">
            <tr className="text-left text-[11px] text-foreground-500 uppercase tracking-wide">
              <th className="px-4 py-2.5 font-medium whitespace-nowrap">Hora</th>
              <th className="px-4 py-2.5 font-medium whitespace-nowrap">Paciente</th>
              <th className="px-4 py-2.5 font-medium whitespace-nowrap">Médico</th>
              <th className="px-4 py-2.5 font-medium whitespace-nowrap">Especialidad</th>
              <th className="px-4 py-2.5 font-medium whitespace-nowrap">Consultorio</th>
              <th className="px-4 py-2.5 font-medium whitespace-nowrap">Estado</th>
              <th className="px-4 py-2.5 font-medium whitespace-nowrap text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((a) => {
              const cfg = statusConfig[a.estado];
              const canAttend =
                a.estado === 'reservada' ||
                a.estado === 'confirmada';
              return (
                <tr key={a.id} className="border-t border-secondary-100 hover:bg-secondary-50/60 transition-base">
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className="text-xs font-mono font-bold text-foreground-700">{a.horaInicio}</span>
                    <span className="text-[10px] text-foreground-400 block">{a.fecha}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="text-xs font-semibold text-foreground-900 whitespace-nowrap">{a.patientName}</p>
                    {a.motivo && <p className="text-[10px] text-foreground-400 truncate max-w-[180px]">{a.motivo}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-foreground-700 whitespace-nowrap">{a.doctorName}</td>
                  <td className="px-4 py-2.5 text-xs text-foreground-500 whitespace-nowrap">{a.especialidad}</td>
                  <td className="px-4 py-2.5 text-xs text-foreground-500 whitespace-nowrap">{a.consultorio}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={cfg.variant} size="sm">
                      {cfg.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onReprint(a)}
                        title="Reimprimir ticket"
                        aria-label={`Reimprimir ticket de ${a.patientName}`}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-500 hover:text-foreground-800 hover:bg-secondary-100 transition-base cursor-pointer"
                      >
                        <i className="ri-printer-line text-sm"></i>
                      </button>
                      {canAttend && (
                        <button
                          type="button"
                          onClick={() => onMarkAttendance(a)}
                          title="Registrar asistencia (llegó)"
                          aria-label={`Registrar asistencia de ${a.patientName}`}
                          className="w-7 h-7 flex items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-500/10 transition-base cursor-pointer"
                        >
                          <i className="ri-check-double-line text-sm"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-foreground-400">
                  No hay agendamientos para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
