import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { type AgendaAppointment, statusConfig } from '@/pages/agenda/types';
import type { AgendaConsultorio } from '@/pages/agenda/consultorioTypes';
import type { ReglaBloqueo } from '@/pages/agenda/agendaRulesTypes';
import Avatar from '@/components/base/Avatar';
import useDragToScroll from '@/hooks/useDragToScroll';
import { useAgendaProfessionalsCatalog } from '@/pages/agenda/hooks/useAgendaProfessionalsCatalog';
import {
  START_HOUR,
  END_HOUR,
  TOTAL_HOURS,
  toMinutes,
  getTimeFromY,
  getGranularityConfig,
  type GranularityConfig,
  type TimeGranularity,
} from '@/pages/agenda/components/timeGridConfig';
import { getBlockedSlots, isTimeBlocked, type BlockedSlot } from '@/pages/agenda/components/blockingRules';

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

interface ConsultoriosDayViewProps {
  date: string;
  appointments: AgendaAppointment[];
  consultorios: AgendaConsultorio[];
  reglasBloqueo: ReglaBloqueo[];
  onSelectAppointment: (appointment: AgendaAppointment) => void;
  onScheduleAtTime: (time: string, consultorioId?: string) => void;
  timeGranularity: TimeGranularity;
}

interface ColumnDef {
  key: string;
  titulo: string;
  subtitulo: string;
  consultorioId?: string;
  doctorIds: string[];
  especialidadId?: string;
  appointments: AgendaAppointment[];
}

function ConsultorioColumn({
  column,
  date,
  reglasBloqueo,
  config,
  onSelectAppointment,
  onScheduleAtTime,
  timeGranularity,
  dragState,
}: {
  column: ColumnDef;
  date: string;
  reglasBloqueo: ReglaBloqueo[];
  config: GranularityConfig;
  onSelectAppointment: (appointment: AgendaAppointment) => void;
  onScheduleAtTime: (time: string, consultorioId?: string) => void;
  timeGranularity: TimeGranularity;
  dragState: React.MutableRefObject<{ moved: boolean }>;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const gridStartMinutes = START_HOUR * 60;
  const gridHeight = TOTAL_HOURS * config.HOUR_HEIGHT;
  const nowIndicator = getCurrentTimeIndicator(config);
  const isToday = date === getNow().date;
  const [pastToast, setPastToast] = useState<string | null>(null);

  const blockedSlots = useMemo(
    () => getBlockedSlots(date, reglasBloqueo, { doctorIds: column.doctorIds, especialidadId: column.especialidadId }),
    [date, reglasBloqueo, column.doctorIds, column.especialidadId],
  );

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
    if (isTimeBlocked(blockedSlots, time)) {
      setPastToast('Este horario está bloqueado por una regla de configuración.');
      setTimeout(() => setPastToast(null), 3000);
      return;
    }
    onScheduleAtTime(time, column.consultorioId);
  }, [onScheduleAtTime, date, blockedSlots, column.consultorioId, timeGranularity, dragState]);

  return (
    <div className="flex flex-col min-w-0 border-r border-secondary-200 last:border-r-0 relative h-full">
      {/* Header del consultorio */}
      <div className="px-2 py-2 shrink-0 border-b border-secondary-200 bg-secondary-50">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-5 h-5 flex items-center justify-center rounded-md bg-primary-100 text-primary-600 shrink-0">
            <i className="ri-door-open-line text-xs"></i>
          </span>
          <p className="text-xs font-bold text-foreground-900 truncate whitespace-nowrap">{column.titulo}</p>
        </div>
        <p className="text-[10px] text-foreground-500 truncate mt-0.5 whitespace-nowrap">{column.subtitulo}</p>
      </div>

      {/* Grid de tiempo */}
      <div className="relative flex-1 cursor-grab" style={{ minHeight: 0 }}>
        <div
          ref={gridRef}
          className="relative"
          style={{ height: gridHeight, minWidth: 110 }}
          onClick={handleGridClick}
        >
          {/* Líneas de hora */}
          {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 border-t border-secondary-200/60"
              style={{ top: i * config.HOUR_HEIGHT }}
            ></div>
          ))}

          {/* Media hora */}
          {config.showHalfLines && Array.from({ length: TOTAL_HOURS }, (_, i) => (
            <div
              key={`half-${i}`}
              className="absolute left-0 right-0 border-t border-dotted border-secondary-200/30"
              style={{ top: (i + 0.5) * config.HOUR_HEIGHT }}
            ></div>
          ))}

          {/* Indicador de hora actual */}
          {isToday && nowIndicator?.visible && (
            <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: nowIndicator.top }} aria-hidden="true">
              <div className="flex items-center">
                <div className="flex-1 h-[2px] bg-red-500"></div>
                <span className="text-[8px] font-bold text-red-500 bg-red-50 px-1 rounded -mt-1.5 -mr-0.5">{nowIndicator.time}</span>
              </div>
            </div>
          )}

          {/* Bloques de bloqueo */}
          {blockedSlots.map((slot, idx) => {
            const top = ((toMinutes(slot.start) - gridStartMinutes) / 60) * config.HOUR_HEIGHT;
            const height = Math.max(((toMinutes(slot.end) - toMinutes(slot.start)) / 60) * config.HOUR_HEIGHT, 20);
            return (
              <div
                key={`block-${idx}`}
                data-no-pan
                onClick={(e) => e.stopPropagation()}
                className="absolute left-1 right-1 z-20 rounded-md bg-red-500/10 border border-red-500/20 flex flex-col items-center justify-center cursor-not-allowed"
                style={{ top: `${top}px`, height: `${height}px` }}
                title={`Bloqueado: ${slot.label}`}
              >
                <span className="w-4 h-4 flex items-center justify-center text-red-400">
                  <i className="ri-forbid-line text-xs"></i>
                </span>
                <span className="text-[9px] text-red-500 font-semibold text-center leading-tight px-1 line-clamp-2">{slot.label}</span>
              </div>
            );
          })}

          {/* Citas */}
          {column.appointments.map((app) => {
            const cfg = statusConfig[app.estado];
            const startMin = toMinutes(app.horaInicio);
            const endMin = toMinutes(app.horaFin);
            const top = ((startMin - gridStartMinutes) / 60) * config.HOUR_HEIGHT;
            const height = Math.max(((endMin - startMin) / 60) * config.HOUR_HEIGHT, 22);
            const isFinished = app.estado === 'atendida' || app.estado === 'cancelada' || app.estado === 'no_acudio';
            return (
              <div
                key={app.id}
                data-no-pan
                onClick={(e) => { e.stopPropagation(); onSelectAppointment(app); }}
                className={`absolute left-1 right-1 z-10 rounded-md border cursor-pointer transition-base hover:shadow-sm hover:z-30 border ${cfg.borderColor.replace('border-l-', 'border-').replace('-400', '-300').replace('-500', '-400').replace('-300', '-200')} ${cfg.bgColor} ${isFinished ? 'opacity-55' : ''}`}
                style={{ top: `${top}px`, height: `${height}px` }}
              >
                <div className="px-2 py-1 h-full flex flex-col justify-center min-w-0">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className={`w-1 h-1 rounded-full shrink-0 ${cfg.borderColor.replace('border-l-', 'bg-').replace('-400', '-500').replace('-300', '-400').replace('-500', '-500')}`}></span>
                    <span className="text-[10px] font-mono font-bold text-foreground-600 whitespace-nowrap">{app.horaInicio}</span>
                    <span className="text-[10px] text-foreground-400 font-mono whitespace-nowrap">– {app.horaFin}</span>
                  </div>
                  {height >= 40 && (
                    <div className="flex items-center gap-1 mt-0.5 min-w-0">
                      <Avatar name={app.patientName} size="xs" />
                      <span className="text-[10px] font-semibold text-foreground-800 truncate leading-tight">{app.patientName.split(' ')[0]}</span>
                    </div>
                  )}
                  {height >= 60 && app.doctorName && (
                    <span className="text-[9px] text-foreground-500 truncate block mt-0.5 leading-tight">{app.doctorName.split(' ').slice(0, 3).join(' ')}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

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

export default function ConsultoriosDayView({
  date,
  appointments,
  consultorios,
  reglasBloqueo,
  onSelectAppointment,
  onScheduleAtTime,
  timeGranularity,
}: ConsultoriosDayViewProps) {
  const config = useMemo(() => getGranularityConfig(timeGranularity), [timeGranularity]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const { onPointerDown, isPanning, dragState } = useDragToScroll();
  const { professionals, specialties } = useAgendaProfessionalsCatalog(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => setHasOverflow(el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [config, appointments, consultorios]);

  const activeConsultorios = useMemo(() => consultorios.filter((c) => c.activo), [consultorios]);
  const activeNames = useMemo(() => new Set(activeConsultorios.map((c) => c.nombre)), [activeConsultorios]);

  const columns = useMemo<ColumnDef[]>(() => {
    const cols: ColumnDef[] = activeConsultorios.map((c) => {
      const linkedDoctors = professionals.filter((d) =>
        c.medicosIds.includes(d.healthcareProfessionalId),
      );
      const specialty = specialties.find((s) => s.specialtyId === c.especialidadId);
      const subtitulo = [
        specialty ? specialty.name : '',
        linkedDoctors.map((d) => d.fullName.split(' ').slice(0, 2).join(' ')).join(', '),
      ].filter(Boolean).join(' · ');
      return {
        key: c.id,
        titulo: c.nombre,
        subtitulo: subtitulo || c.ubicacion,
        consultorioId: c.id,
        doctorIds: c.medicosIds,
        especialidadId: c.especialidadId,
        appointments: appointments.filter((a) => a.consultorio === c.nombre),
      };
    });

    // Columna "Sin consultorio" para citas sin consultorio activo asignado
    const unassigned = appointments.filter((a) => !activeNames.has(a.consultorio));
    if (unassigned.length > 0) {
      cols.push({
        key: 'sin-asignar',
        titulo: 'Sin consultorio',
        subtitulo: 'Citas sin ubicación',
        doctorIds: [],
        appointments: unassigned,
      });
    }
    return cols;
  }, [activeConsultorios, activeNames, appointments, professionals, specialties]);

  const gridHeight = TOTAL_HOURS * config.HOUR_HEIGHT;

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

  return (
    <div className="flex h-full relative">
      {/* Columna de horas */}
      <div className="w-[48px] shrink-0 relative pt-[54px]">
        {Array.from({ length: TOTAL_HOURS }, (_, i) => {
          const hour = START_HOUR + i;
          const display = `${String(hour).padStart(2, '0')}:00`;
          return (
            <div key={hour} className="absolute left-0 right-0 flex items-start justify-end pr-1.5" style={{ top: i * config.HOUR_HEIGHT - 6 }}>
              <span className="text-[9px] font-mono font-medium text-foreground-400">{display}</span>
            </div>
          );
        })}
      </div>

      {/* Columnas de consultorios */}
      <div
        ref={scrollRef}
        className={`flex-1 min-w-0 overflow-auto overscroll-contain select-none agenda-scroll ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onWheel={handleWheel}
        onPointerDown={onPointerDown}
      >
        <div
          className="grid min-w-0"
          style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(130px, 1fr))`, height: gridHeight + 54 }}
        >
          {columns.map((col) => (
            <ConsultorioColumn
              key={col.key}
              column={col}
              date={date}
              reglasBloqueo={reglasBloqueo}
              config={config}
              onSelectAppointment={onSelectAppointment}
              onScheduleAtTime={onScheduleAtTime}
              timeGranularity={timeGranularity}
              dragState={dragState}
            />
          ))}
        </div>

        {hasOverflow && (
          <div className="sticky bottom-0 left-0 right-0 z-30 pointer-events-none flex justify-center pb-1">
            <div className="flex items-center gap-1 px-2 py-1 bg-foreground-800/80 text-white rounded-full text-[10px] font-medium shadow-lg">
              <span className="w-3 h-3 flex items-center justify-center">
                <i className="ri-arrow-down-line text-[10px]"></i>
              </span>
              Desplázate para ver más consultorios y horarios
            </div>
          </div>
        )}
      </div>
    </div>
  );
}