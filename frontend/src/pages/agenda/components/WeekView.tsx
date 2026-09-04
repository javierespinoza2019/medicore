import { useMemo, useState, useCallback, useRef } from 'react';
import { DndContext, useDroppable, PointerSensor, useSensor, useSensors, DragOverlay, type DragEndEvent } from '@dnd-kit/core';
import { type AgendaAppointment, statusConfig, type Appointment } from '@/pages/agenda/types';
import WeekDayColumn from '@/pages/agenda/components/WeekDayColumn';
import Avatar from '@/components/base/Avatar';
import useDragToScroll from '@/hooks/useDragToScroll';
import {
  START_HOUR,
  END_HOUR,
  TOTAL_HOURS,
  toMinutes,
  minutesToTime,
  getGranularityConfig,
  type TimeGranularity,
} from '@/pages/agenda/components/timeGridConfig';

function getDuration(app: Appointment): number {
  return toMinutes(app.horaFin) - toMinutes(app.horaInicio);
}

interface WeekDay {
  date: string;
  dayName: string;
  dayNumber: string;
  isToday: boolean;
}

interface WeekViewProps {
  weekDays: WeekDay[];
  getAppointmentsForDate: (date: string) => Appointment[];
  onSelectAppointment: (appointment: Appointment) => void;
  onSelectDate: (date: string) => void;
  onScheduleAtDate: (date: string, time?: string) => void;
  onMoveAppointment: (appointmentId: string, newDate: string, newHoraInicio: string, newHoraFin: string) => void;
  timeGranularity: TimeGranularity;
}

// ── Droppable Day Column Wrapper ──
function DroppableDayColumn({
  day,
  appointments,
  onSelectAppointment,
  onSelectDate,
  onScheduleAtDate,
  timeGranularity,
  dragState,
}: {
  day: WeekDay;
  appointments: Appointment[];
  onSelectAppointment: (appointment: Appointment) => void;
  onSelectDate: (date: string) => void;
  onScheduleAtDate: (date: string, time?: string) => void;
  timeGranularity: TimeGranularity;
  dragState: React.MutableRefObject<{ moved: boolean }>;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${day.date}`,
    data: { date: day.date },
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative transition-base ${isOver ? 'bg-primary-50/40 ring-2 ring-inset ring-primary-300/60 rounded-md' : ''}`}
    >
      <WeekDayColumn
        day={day}
        appointments={appointments}
        onSelectAppointment={onSelectAppointment}
        onSelectDate={onSelectDate}
        onScheduleAtDate={onScheduleAtDate}
        timeGranularity={timeGranularity}
        dragState={dragState}
      />
      {/* Drop indicator */}
      {isOver && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30">
          <div className="bg-primary-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg">
            Soltar aquí
          </div>
        </div>
      )}
    </div>
  );
}

// ── Drag Overlay Content ──
function WeekDragOverlay({ appointment, config }: { appointment: Appointment; config: { HOUR_HEIGHT: number } }) {
  const cfg = statusConfig[appointment.estado];
  const duration = getDuration(appointment);
  const heightPx = Math.max((duration / 60) * config.HOUR_HEIGHT, 22);

  return (
    <div
      className="rounded-md border-2 border-primary-400 bg-background-50 shadow-xl"
      style={{ width: 140, height: heightPx }}
    >
      <div className="px-2 py-1.5 h-full flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-1 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.borderColor.replace('border-l-', 'bg-').replace('-400', '-500').replace('-300', '-400').replace('-500', '-500')}`}></span>
          <span className="text-[10px] font-mono font-bold text-foreground-600">{appointment.horaInicio}–{appointment.horaFin}</span>
        </div>
        <div className="flex items-center gap-1 mt-0.5 min-w-0">
          <Avatar name={appointment.patientName} size="xs" />
          <span className="text-[10px] font-semibold text-foreground-800 truncate">{appointment.patientName.split(' ')[0]}</span>
        </div>
      </div>
    </div>
  );
}

export default function WeekView({ weekDays, getAppointmentsForDate, onSelectAppointment, onSelectDate, onScheduleAtDate, onMoveAppointment, timeGranularity }: WeekViewProps) {
  const [activeDragAppointment, setActiveDragAppointment] = useState<Appointment | null>(null);
  const config = useMemo(() => getGranularityConfig(timeGranularity), [timeGranularity]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { onPointerDown, isPanning, dragState } = useDragToScroll();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

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

  const columnsData = useMemo(() => {
    return weekDays.map(day => {
      const apps = getAppointmentsForDate(day.date);
      const sorted = [...apps].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
      return { ...day, appointments: sorted };
    });
  }, [weekDays, getAppointmentsForDate]);

  const handleDragStart = useCallback((event: { active: { data: { current?: { appointment?: Appointment } } } }) => {
    const app = event.active.data.current?.appointment as Appointment | undefined;
    setActiveDragAppointment(app || null);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragAppointment(null);
    const { active, delta, over } = event;
    const app = active.data.current?.appointment as Appointment | undefined;
    if (!app) return;

    let targetDate = app.fecha;
    if (over && over.data.current?.date) {
      targetDate = over.data.current.date as string;
    }

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

    if (newHoraInicio !== app.horaInicio || targetDate !== app.fecha) {
      onMoveAppointment(app.id, targetDate, newHoraInicio, newHoraFin);
    }
  }, [onMoveAppointment, config]);

  const gridHeight = TOTAL_HOURS * config.HOUR_HEIGHT;

  return (
    <div className="flex h-full">
      {/* Time labels column */}
      <div className="w-[40px] shrink-0 relative pt-11">
        {Array.from({ length: TOTAL_HOURS }, (_, i) => {
          const hour = START_HOUR + i;
          const display = `${String(hour).padStart(2, '0')}:00`;
          return (
            <div
              key={hour}
              className="absolute left-0 right-0 flex items-start justify-end pr-1.5"
              style={{ top: i * config.HOUR_HEIGHT - 6 }}
            >
              <span className="text-[9px] font-mono font-medium text-foreground-400">{display}</span>
            </div>
          );
        })}
      </div>

      {/* 7 day columns */}
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
          <div className="grid grid-cols-7 min-w-0" style={{ minWidth: 7 * 110, height: gridHeight }}>
            {columnsData.map((day) => (
              <DroppableDayColumn
                key={day.date}
                day={day}
                appointments={day.appointments}
                onSelectAppointment={onSelectAppointment}
                onSelectDate={onSelectDate}
                onScheduleAtDate={onScheduleAtDate}
                timeGranularity={timeGranularity}
                dragState={dragState}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={{ duration: 150, easing: 'ease-out' }}>
            {activeDragAppointment ? (
              <WeekDragOverlay appointment={activeDragAppointment} config={config} />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}