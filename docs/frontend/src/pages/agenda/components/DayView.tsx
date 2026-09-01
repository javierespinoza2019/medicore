import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { DndContext, useDraggable, PointerSensor, useSensor, useSensors, DragOverlay, type DragEndEvent } from '@dnd-kit/core';
import { type Appointment, statusConfig } from '@/mocks/appointments';
import Avatar from '@/components/base/Avatar';
import useDragToScroll from '@/hooks/useDragToScroll';
import {
  START_HOUR,
  END_HOUR,
  TOTAL_HOURS,
  toMinutes,
  minutesToTime,
  getTimeFromY,
  getGranularityConfig,
  type TimeGranularity,
} from '@/pages/agenda/components/timeGridConfig';

function getDuration(app: Appointment): number {
  return toMinutes(app.horaFin) - toMinutes(app.horaInicio);
}

function getNow(): { date: string; minutes: number } {
  const now = new Date();
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const m = now.getHours() * 60 + now.getMinutes();
  return { date: d, minutes: m };
}

interface DayViewProps {
  date: string;
  appointments: Appointment[];
  onSelectAppointment: (appointment: Appointment) => void;
  onScheduleAtTime: (time: string) => void;
  onMoveAppointment: (appointmentId: string, newDate: string, newHoraInicio: string, newHoraFin: string) => void;
  timeGranularity: TimeGranularity;
}

function calculateLayout(appointments: Appointment[]) {
  const sorted = [...appointments].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  const items: { appointment: Appointment; col: number; totalCols: number }[] = [];
  const activeUntil: number[] = [];

  for (const app of sorted) {
    const start = toMinutes(app.horaInicio);
    for (let i = activeUntil.length - 1; i >= 0; i--) {
      if (activeUntil[i] <= start) activeUntil.splice(i, 1);
    }
    let col = 0;
    while (col < activeUntil.length) {
      if (activeUntil[col] <= start) break;
      col++;
    }
    const end = toMinutes(app.horaFin);
    if (col < activeUntil.length) {
      activeUntil[col] = end;
    } else {
      activeUntil.push(end);
    }
    items.push({ appointment: app, col, totalCols: 0 });
  }

  const maxCols = Math.max(activeUntil.length, 1);
  return items.map(item => ({ ...item, totalCols: maxCols }));
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

function DraggableBlock({
  appointment,
  col,
  totalCols,
  gridStartMinutes,
  onSelectAppointment,
  config,
}: {
  appointment: Appointment;
  col: number;
  totalCols: number;
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
  const height = Math.max(((endMin - startMin) / 60) * config.HOUR_HEIGHT, 22);

  const colWidth = `${100 / totalCols}%`;
  const left = `${(col * 100) / totalCols}%`;

  const cfg = statusConfig[appointment.estado];
  const isAvailable = appointment.estado === 'disponible';
  const isFinished = appointment.estado === 'atendida' || appointment.estado === 'cancelada' || appointment.estado === 'no_acudio';

  const dragStyle = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 40,
    opacity: isDragging ? 0.3 : 1,
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
      className={`absolute z-10 mx-0.5 rounded-lg border transition-base hover:shadow-sm hover:z-20 ${
        isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      } ${
        isAvailable
          ? 'border-dashed border-secondary-300 bg-secondary-50/80 hover:border-primary-300 hover:bg-primary-50/60'
          : `border ${cfg.borderColor.replace('border-l-', 'border-').replace('-400', '-300').replace('-500', '-400').replace('-300', '-200')} ${cfg.bgColor}`
      } ${isFinished ? 'opacity-55' : ''} ${isDragging ? 'shadow-lg ring-2 ring-primary-300/50' : ''}`}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        left,
        width: `calc(${colWidth} - 4px)`,
        touchAction: 'none',
        ...dragStyle,
      }}
    >
      <div className="px-2 py-1 h-full flex flex-col justify-center min-w-0">
        {isAvailable ? (
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 flex items-center justify-center rounded-full bg-secondary-200 text-foreground-500">
              <i className="ri-add-line text-[10px]"></i>
            </span>
            <span className="text-[10px] font-medium text-foreground-500 whitespace-nowrap">Disponible</span>
            <span className="text-[11px] font-mono font-bold text-foreground-400 whitespace-nowrap">{appointment.horaInicio} – {appointment.horaFin}</span>
          </div>
        ) : (
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.borderColor.replace('border-l-', 'bg-').replace('-400', '-500').replace('-300', '-400').replace('-500', '-500')}`}></span>
              <span className="text-[10px] font-mono font-bold text-foreground-600 whitespace-nowrap">
                {appointment.horaInicio}
              </span>
              <span className="text-[10px] text-foreground-400 font-mono whitespace-nowrap">– {appointment.horaFin}</span>
              {isDraggable && (
                <span className="ml-auto w-4 h-4 flex items-center justify-center text-foreground-300 shrink-0">
                  <i className="ri-draggable text-xs"></i>
                </span>
              )}
            </div>
            {height >= 56 && (
              <>
                <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                  <Avatar name={appointment.patientName} size="xs" />
                  <span className="text-[11px] font-semibold text-foreground-800 truncate">{appointment.patientName}</span>
                </div>
                <span className="text-[10px] text-foreground-500 truncate block mt-0.5">{appointment.doctorName.split(' ').slice(0, 3).join(' ')}</span>
              </>
            )}
            {height >= 72 && appointment.motivo && (
              <span className="text-[10px] text-foreground-500/70 truncate block mt-0.5 italic">{appointment.motivo}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DragOverlayContent({ appointment, config }: { appointment: Appointment; config: { HOUR_HEIGHT: number } }) {
  const duration = getDuration(appointment);
  const heightPx = Math.max(((duration) / 60) * config.HOUR_HEIGHT, 22);

  return (
    <div
      className={`rounded-lg border-2 border-primary-400 bg-background-50 shadow-xl`}
      style={{ width: 200, height: heightPx }}
    >
      <div className="px-2.5 py-2 h-full flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${statusConfig[appointment.estado].borderColor.replace('border-l-', 'bg-').replace('-400', '-500').replace('-300', '-400').replace('-500', '-500')}`}></span>
          <span className="text-[11px] font-mono font-bold text-foreground-600 whitespace-nowrap">{appointment.horaInicio} – {appointment.horaFin}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1 min-w-0">
          <Avatar name={appointment.patientName} size="xs" />
          <span className="text-xs font-semibold text-foreground-800 truncate">{appointment.patientName}</span>
        </div>
        {appointment.motivo && (
          <span className="text-[10px] text-foreground-500/70 truncate block mt-0.5 italic">{appointment.motivo}</span>
        )}
      </div>
    </div>
  );
}

export default function DayView({ date, appointments, onSelectAppointment, onScheduleAtTime, onMoveAppointment, timeGranularity }: DayViewProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const config = useMemo(() => getGranularityConfig(timeGranularity), [timeGranularity]);
  const layout = useMemo(() => calculateLayout(appointments), [appointments]);
  const nowIndicator = useMemo(() => getCurrentTimeIndicator(config), [config]);
  const [activeDragAppointment, setActiveDragAppointment] = useState<Appointment | null>(null);
  const [pastToast, setPastToast] = useState<string | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const { onPointerDown, isPanning, dragState } = useDragToScroll();

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => setHasOverflow(el.scrollHeight > el.clientHeight + 2);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [config, appointments]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const isToday = useMemo(() => {
    const d = new Date();
    return date === `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [date]);

  // Wheel scroll support — capture and prevent body scroll, support horizontal with Shift
  const handleWheel = useCallback((e: React.WheelEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      el.scrollLeft += e.deltaX || e.deltaY;
    } else {
      el.scrollTop += e.deltaY;
    }
  }, []);

  const handleGridClick = useCallback((e: React.MouseEvent) => {
    if (!gridRef.current) return;
    if (dragState.current.moved) {
      dragState.current.moved = false;
      return;
    }
    const rect = gridRef.current.getBoundingClientRect();
    const time = getTimeFromY(e.clientY, rect.top, timeGranularity);

    const now = getNow();
    if (date < now.date || (date === now.date && toMinutes(time) <= now.minutes)) {
      setPastToast('No se puede agendar en fechas u horarios ya pasados.');
      setTimeout(() => setPastToast(null), 3000);
      return;
    }

    onScheduleAtTime(time);
  }, [onScheduleAtTime, date, timeGranularity]);

  const handleDragStart = useCallback((event: { active: { data: { current?: { appointment?: Appointment } } } }) => {
    const app = event.active.data.current?.appointment as Appointment | undefined;
    setActiveDragAppointment(app || null);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragAppointment(null);
    const { active, delta } = event;
    const app = active.data.current?.appointment as Appointment | undefined;
    if (!app) return;

    const originalStart = toMinutes(app.horaInicio);
    const originalEnd = toMinutes(app.horaFin);
    const duration = originalEnd - originalStart;

    const { HOUR_HEIGHT, SNAP_MINUTES } = config;
    const deltaMinutes = Math.round((delta.y / HOUR_HEIGHT) * 60 / SNAP_MINUTES) * SNAP_MINUTES;
    let newStart = originalStart + deltaMinutes;

    const gridStart = START_HOUR * 60;
    const gridEnd = END_HOUR * 60;
    newStart = Math.max(gridStart, Math.min(gridEnd - duration, newStart));

    const newHoraInicio = minutesToTime(newStart);
    const newHoraFin = minutesToTime(newStart + duration);

    if (newHoraInicio !== app.horaInicio) {
      onMoveAppointment(app.id, date, newHoraInicio, newHoraFin);
    }
  }, [date, onMoveAppointment, config]);

  const gridStartMinutes = START_HOUR * 60;
  const gridHeight = TOTAL_HOURS * config.HOUR_HEIGHT;

  return (
    <div className="flex h-full relative">
      {/* Time labels column */}
      <div className="w-[52px] shrink-0 relative pt-1">
        {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => {
          const hour = START_HOUR + i;
          const display = `${String(hour).padStart(2, '0')}:00`;
          return (
            <div
              key={hour}
              className="absolute left-0 right-0 flex items-start justify-end pr-2"
              style={{ top: i * config.HOUR_HEIGHT - 8 }}
            >
              <span className="text-[10px] font-mono font-medium text-foreground-400">{display}</span>
            </div>
          );
        })}
      </div>

      {/* Scrollable grid area */}
      <div
        ref={scrollRef}
        className={`flex-1 min-w-0 overflow-auto overscroll-contain select-none agenda-scroll ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onWheel={handleWheel}
        onPointerDown={onPointerDown}
      >
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div
            ref={gridRef}
            className="relative"
            style={{ height: gridHeight }}
            onClick={handleGridClick}
          >
            {/* Hour lines */}
            {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0 border-t border-secondary-200/70"
                style={{ top: i * config.HOUR_HEIGHT }}
              ></div>
            ))}

            {/* Half-hour lines */}
            {config.showHalfLines && Array.from({ length: TOTAL_HOURS }, (_, i) => (
              <div
                key={`half-${i}`}
                className="absolute left-0 right-0 border-t border-dotted border-secondary-200/40"
                style={{ top: (i + 0.5) * config.HOUR_HEIGHT }}
              ></div>
            ))}

            {/* Quarter-hour lines */}
            {config.showQuarterLines && Array.from({ length: TOTAL_HOURS * 2 }, (_, i) => {
              const isHalf = i % 2 === 1;
              if (!isHalf) return null; // skip :00 and :30, only :15 and :45
              const top = (i + 1) * 0.25 * config.HOUR_HEIGHT;
              return (
                <div
                  key={`quarter-${i}`}
                  className="absolute left-0 right-0 border-t border-secondary-100/60"
                  style={{ top }}
                ></div>
              );
            })}

            {/* Current time indicator */}
            {isToday && nowIndicator?.visible && (
              <div
                className="absolute left-0 right-0 z-20 pointer-events-none"
                style={{ top: nowIndicator.top }}
              >
                <div className="flex items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1 -mt-1.5 shadow-sm"></div>
                  <div className="flex-1 h-[2px] bg-red-500"></div>
                  <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded -mt-2 -mr-0.5">{nowIndicator.time}</span>
                </div>
              </div>
            )}

            {/* Appointment blocks */}
            {layout.map(({ appointment, col, totalCols }) => (
              <DraggableBlock
                key={appointment.id}
                appointment={appointment}
                col={col}
                totalCols={totalCols}
                gridStartMinutes={gridStartMinutes}
                onSelectAppointment={onSelectAppointment}
                config={config}
              />
            ))}
          </div>

          {/* Drag overlay */}
          <DragOverlay dropAnimation={{ duration: 150, easing: 'ease-out' }}>
            {activeDragAppointment ? (
              <DragOverlayContent appointment={activeDragAppointment} config={config} />
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Scroll indicator */}
        {hasOverflow && (
          <div className="sticky bottom-0 left-0 right-0 z-30 pointer-events-none flex justify-center pb-1">
            <div className="flex items-center gap-1 px-2 py-1 bg-foreground-800/80 text-white rounded-full text-[10px] font-medium shadow-lg">
              <span className="w-3 h-3 flex items-center justify-center">
                <i className="ri-arrow-down-line text-[10px]"></i>
              </span>
              Scroll para ver más horarios
            </div>
          </div>
        )}
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