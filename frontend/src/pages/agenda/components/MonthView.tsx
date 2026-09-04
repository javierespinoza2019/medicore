import { useMemo } from 'react';
import { type AgendaAppointment, statusConfig, type Appointment } from '@/pages/agenda/types';

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface MonthDay {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

function getMonthGrid(year: number, month: number): MonthDay[] {
  const today = getToday();
  const firstDay = new Date(year, month, 1);
  // getDay() returns 0=Sun, 1=Mon, ..., 6=Sat
  // We want Monday=0, Sunday=6
  const jsDayOfWeek = firstDay.getDay();
  const startOffset = jsDayOfWeek === 0 ? 6 : jsDayOfWeek - 1;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const grid: MonthDay[] = [];

  // Previous month days
  for (let i = startOffset - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const date = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    grid.push({ date, day, isCurrentMonth: false, isToday: date === today });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    grid.push({ date, day: d, isCurrentMonth: true, isToday: date === today });
  }

  // Next month days
  const remaining = 42 - grid.length;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  for (let d = 1; d <= remaining; d++) {
    const date = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    grid.push({ date, day: d, isCurrentMonth: false, isToday: date === today });
  }

  return grid;
}

interface MonthViewProps {
  year: number;
  month: number;
  appointments: Appointment[];
  onSelectDate: (date: string) => void;
  onSelectAppointment: (appointment: Appointment) => void;
}

export default function MonthView({ year, month, appointments, onSelectDate, onSelectAppointment }: MonthViewProps) {
  const today = getToday();
  const grid = useMemo(() => getMonthGrid(year, month), [year, month]);

  const appsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach(a => {
      if (!map[a.fecha]) map[a.fecha] = [];
      map[a.fecha].push(a);
    });
    return map;
  }, [appointments]);

  return (
    <div className="flex flex-col h-full">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1 shrink-0">
        {DIAS_SEMANA.map((dia) => (
          <div key={dia} className="text-center py-2">
            <span className="text-[11px] font-semibold text-foreground-400 uppercase tracking-wider">{dia}</span>
          </div>
        ))}
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-7 flex-1 min-h-0 border-t border-l border-secondary-200 rounded-t-lg overflow-hidden">
        {grid.map((day) => {
          const dayApps = appsByDate[day.date] || [];
          const sortedApps = [...dayApps].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
          // Limit visible appointment dots
          const visibleApps = sortedApps.slice(0, 4);
          const extraCount = Math.max(0, sortedApps.length - 4);

          return (
            <div
              key={day.date}
              role="button"
              aria-label={`Ver citas del ${day.day} de ${MESES[new Date(day.date).getMonth()]}`}
              onClick={() => onSelectDate(day.date)}
              className={`relative border-r border-b border-secondary-200 p-1.5 flex flex-col min-h-[88px] cursor-pointer transition-base hover:bg-secondary-50 group ${
                !day.isCurrentMonth ? 'bg-background-100/50' : 'bg-background-50'
              } ${day.isToday ? 'ring-1 ring-inset ring-primary-400 bg-primary-50/30' : ''}`}
            >
              {/* Day number */}
              <span
                className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full shrink-0 mb-1 ${
                  day.isToday
                    ? 'bg-primary-500 text-white'
                    : day.isCurrentMonth
                      ? 'text-foreground-800'
                      : 'text-foreground-300'
                }`}
              >
                {day.day}
              </span>

              {/* Appointment indicators */}
              <div className="flex-1 min-h-0 space-y-0.5 overflow-hidden">
                {visibleApps.map((app) => {
                  const cfg = statusConfig[app.estado];
                  const isAvailable = app.estado === 'disponible';
                  const isFinished = app.estado === 'atendida' || app.estado === 'cancelada' || app.estado === 'no_acudio';

                  return (
                    <div
                      key={app.id}
                      role="button"
                      aria-label={`${app.patientName} — ${app.horaInicio} a ${app.horaFin} — ${cfg.label}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAppointment(app);
                      }}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] leading-tight truncate cursor-pointer transition-base hover:brightness-95 ${
                        isAvailable
                          ? 'bg-secondary-100 text-foreground-500 border border-dashed border-secondary-300'
                          : `${cfg.bgColor} ${cfg.textColor} border ${cfg.borderColor.replace('border-l-', 'border-').replace('-400', '-300/60').replace('-500', '-400/60').replace('-300', '-200')}`
                      } ${isFinished ? 'opacity-50 line-through' : ''}`}
                    >
                      {isAvailable ? (
                        <>
                          <span className="w-1 h-1 rounded-full bg-secondary-400 shrink-0" aria-hidden="true"></span>
                          <span className="truncate">{app.horaInicio}</span>
                        </>
                      ) : (
                        <>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.borderColor.replace('border-l-', 'bg-').replace('-400', '-500').replace('-300', '-400').replace('-500', '-500')}`} aria-hidden="true"></span>
                          <span className="truncate font-medium">{app.horaInicio}</span>
                          <span className="truncate text-[9px]">{app.patientName.split(' ')[0]}</span>
                        </>
                      )}
                    </div>
                  );
                })}

                {extraCount > 0 && (
                  <span className="text-[10px] text-foreground-400 font-medium pl-1">+{extraCount} más</span>
                )}
              </div>

              {/* Hover: quick schedule button on empty-ish days */}
              {day.isCurrentMonth && sortedApps.filter(a => a.estado !== 'disponible').length === 0 && dayApps.length <= 1 && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-base">
                  <span className="text-[10px] font-medium text-primary-500 bg-primary-50 px-2 py-1 rounded-md border border-primary-200/60">
                    <i className="ri-add-line" aria-hidden="true"></i> Agendar
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { MESES };