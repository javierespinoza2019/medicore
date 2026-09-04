import { useMemo, useRef, useCallback, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { type AgendaAppointment, statusConfig, type Appointment } from '@/pages/agenda/types';
import Avatar from '@/components/base/Avatar';
import {
  START_HOUR,
  END_HOUR,
  TOTAL_HOURS,
  toMinutes,
  getTimeFromY,
  getGranularityConfig,
  type TimeGranularity,
} from '@/pages/agenda/components/timeGridConfig';

function getNow(): { date: string; minutes: number } {
  const now = new Date();
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const m = now.getHours() * 60 + now.getMinutes();
  return { date: d, minutes: m };
}

function getCurrentTimeIndicator(config: { HOUR_HEIGHT: number }): { top: number; visible: boolean; time: string } | null {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = START_HOUR * 60;
  const endMinutes = END_HOUR * 60;
  if (nowMinutes < startMinutes || nowMinutes > endMinutes) return { top: 0, visible: false, time: '' };
  const top = ((nowMinutes - startMinutes) / 60) * config.HOUR_HEIGHT;
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return { top, visible: true, time: `${h}:${m}` };
}

interface WeekDayColumnProps {
  day: {
    date: string;
    dayName: string;
    dayNumber: string;
    isToday: boolean;
  };
  appointments: Appointment[];
  onSelectAppointment: (appointment: Appointment) => void;
  onSelectDate: (date: string) => void;
  onScheduleAtDate: (date: string, time?: string) => void;
  timeGranularity: TimeGranularity;
  dragState: React.MutableRefObject<{ moved: boolean }>;
}

function DraggableWeekBlock({
  appointment,
  gridStartMinutes,
  onSelectAppointment,
  config,
}: {
  appointment: Appointment;
  gridStartMinutes: number;
  onSelectAppointment: (app: Appointment) => void;
  config: { HOUR_HEIGHT: number };
}) {
  const isDraggable = appointment.estado !== 'disponible' && appointment.estado !== 'atendida' && appointment.estado !== 'cancelada' && appointment.estado !== 'no_acudio';

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appointment.id,
    data: { appointment },
    disabled: !isDraggable,
  });

  const startMin = toMinutes(appointment.horaInicio);
  const endMin = toMinutes(appointment.horaFin);
  const top = ((startMin - gridStartMinutes) / 60) * config.HOUR_HEIGHT;
  const height = Math.max(((endMin - startMin) / 60) * config.HOUR_HEIGHT, 18);

  const cfg = statusConfig[appointment.estado];
  const isAvailable = appointment.estado === 'disponible';
  const isFinished = appointment.estado === 'atendida' || appointment.estado === 'cancelada' || appointment.estado === 'no_acudio';

  if (isAvailable) {
    return (
      <div
        key={appointment.id}
        data-no-pan
        onClick={(e) => {
          e.stopPropagation();
          onSelectAppointment(appointment);
        }}
        className="absolute left-0.5 right-0.5 z-10 rounded-md border border-dashed border-secondary-300 bg-secondary-50/60 hover:border-primary-300 hover:bg-primary-50/40 cursor-pointer transition-base"
        style={{ top: `${top}px`, height: `${height}px` }}
      >
        <div className="px-1.5 py-0.5 h-full flex items-center justify-center">
          <span className="text-[9px] text-foreground-400 font-medium">{appointment.horaInicio}</span>
        </div>
      </div>
    );
  }

  const dragStyle = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 40,
    opacity: 0.3,
  } : {};

  return (
    <div
      ref={setNodeRef}
      data-no-pan
      onClick={(e) => {
        e.stopPropagation();
        if (!isDragging) onSelectAppointment(appointment);
      }}
      {...(isDraggable ? { ...listeners, ...attributes } : {})}
      className={`absolute left-0.5 right-0.5 z-10 rounded-md border transition-base hover:shadow-sm hover:z-20 ${
        isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      } border ${cfg.borderColor.replace('border-l-', 'border-').replace('-400', '-300').replace('-500', '-400').replace('-300', '-200')} ${cfg.bgColor} ${isFinished ? 'opacity-50' : ''} ${isDragging ? 'shadow-lg ring-2 ring-primary-300/50' : ''}`}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        touchAction: 'none',
        ...dragStyle,
      }}
    >
      <div className="px-1.5 py-0.5 h-full flex flex-col justify-center min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-1 min-w-0">
            <span className={`w-1 h-1 rounded-full shrink-0 ${cfg.borderColor.replace('border-l-', 'bg-').replace('-400', '-500').replace('-300', '-400').replace('-500', '-500')}`}></span>
            <span className="text-[9px] font-mono font-bold text-foreground-600 block leading-tight">
              {appointment.horaInicio}
            </span>
            {isDraggable && (
              <span className="ml-auto w-3 h-3 flex items-center justify-center text-foreground-300 shrink-0">
                <i className="ri-draggable text-[9px]"></i>
              </span>
            )}
          </div>
          {height >= 40 && (
            <>
              <div className="flex items-center gap-1 mt-0.5 min-w-0">
                <Avatar name={appointment.patientName} size="xs" />
                <span className="text-[9px] font-semibold text-foreground-800 truncate leading-tight">
                  {appointment.patientName.split(' ')[0]}
                </span>
              </div>
            </>
          )}
          {height >= 60 && appointment.motivo && (
            <span className="text-[8px] text-foreground-500/70 truncate block mt-0.5 italic leading-tight">
              {appointment.motivo}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WeekDayColumn({ day, appointments, onSelectAppointment, onSelectDate, onScheduleAtDate, timeGranularity, dragState }: WeekDayColumnProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const config = useMemo(() => getGranularityConfig(timeGranularity), [timeGranularity]);
  const nowIndicator = getCurrentTimeIndicator(config);
  const gridStartMinutes = START_HOUR * 60;
  const gridHeight = TOTAL_HOURS * config.HOUR_HEIGHT;
  const [pastToast, setPastToast] = useState<string | null>(null);

  const handleGridClick = useCallback((e: React.MouseEvent) => {
    if (!gridRef.current) return;
    if (dragState.current.moved) {
      dragState.current.moved = false;
      return;
    }
    const rect = gridRef.current.getBoundingClientRect();
    const time = getTimeFromY(e.clientY, rect.top, timeGranularity);

    const now = getNow();
    if (day.date < now.date || (day.date === now.date && toMinutes(time) <= now.minutes)) {
      setPastToast('No se puede agendar en fechas u horarios ya pasados.');
      setTimeout(() => setPastToast(null), 3000);
      return;
    }

    onScheduleAtDate(day.date, time);
  }, [day.date, onScheduleAtDate, timeGranularity, dragState]);

  return (
    <div className="flex flex-col min-w-0 border-r border-secondary-200 last:border-r-0 relative h-full">
      {/* Day header */}
      <button
        type="button"
        aria-label={`Ver citas del ${day.dayName} ${day.dayNumber}`}
        onClick={() => onSelectDate(day.date)}
        className={`text-center py-1.5 shrink-0 transition-base cursor-pointer ${
          day.isToday
            ? 'bg-primary-500 text-white'
            : 'bg-secondary-100 text-foreground-700 hover:bg-secondary-200'
        }`}
      >
        <p className="text-[9px] font-semibold uppercase tracking-wide leading-tight">{day.dayName}</p>
        <p className={`text-xs font-bold leading-tight ${day.isToday ? '' : 'text-foreground-900'}`}>
          {day.dayNumber}
        </p>
      </button>

      {/* Time grid column */}
      <div
        className="relative flex-1 cursor-grab"
        style={{ minHeight: 0 }}
      >
        <div
          ref={gridRef}
          className="relative"
          style={{ height: gridHeight, minWidth: 80 }}
          onClick={handleGridClick}
        >
          {/* Hour lines */}
          {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 border-t border-secondary-200/60"
              style={{ top: i * config.HOUR_HEIGHT }}
            ></div>
          ))}

          {/* Half-hour lines */}
          {config.showHalfLines && Array.from({ length: TOTAL_HOURS }, (_, i) => (
            <div
              key={`half-${i}`}
              className="absolute left-0 right-0 border-t border-dotted border-secondary-200/30"
              style={{ top: (i + 0.5) * config.HOUR_HEIGHT }}
            ></div>
          ))}

          {/* Quarter-hour lines */}
          {config.showQuarterLines && Array.from({ length: TOTAL_HOURS * 2 }, (_, i) => {
            const isHalf = i % 2 === 1;
            if (!isHalf) return null;
            const top = (i + 1) * 0.25 * config.HOUR_HEIGHT;
            return (
              <div
                key={`quarter-${i}`}
                className="absolute left-0 right-0 border-t border-secondary-100/50"
                style={{ top }}
              ></div>
            );
          })}

          {/* Current time indicator on today column */}
          {day.isToday && nowIndicator?.visible && (
            <div
              className="absolute left-0 right-0 z-20 pointer-events-none"
              style={{ top: nowIndicator.top }}
              aria-hidden="true"
            >
              <div className="flex items-center">
                <div className="flex-1 h-[2px] bg-red-500"></div>
                <span className="text-[8px] font-bold text-red-500 bg-red-50 px-1 rounded -mt-1.5 -mr-0.5">{nowIndicator.time}</span>
              </div>
            </div>
          )}

          {/* Appointment blocks */}
          {appointments.map((app) => (
            <DraggableWeekBlock
              key={app.id}
              appointment={app}
              gridStartMinutes={gridStartMinutes}
              onSelectAppointment={onSelectAppointment}
              config={config}
            />
          ))}
        </div>
      </div>

      {/* ── Past-time toast ── */}
      {pastToast && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl shadow-lg">
            <span className="w-5 h-5 flex items-center justify-center shrink-0">
              <i className="ri-alert-line text-sm"></i>
            </span>
            <p className="text-xs font-semibold whitespace-nowrap">{pastToast}</p>
          </div>
        </div>
      )}
    </div>
  );
}