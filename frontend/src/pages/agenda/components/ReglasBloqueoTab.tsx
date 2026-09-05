import { useEffect, useState } from 'react';
import type { ReglaBloqueo, ReglaBloqueoTipo } from '@/pages/agenda/agendaRulesTypes';
import { useAgendaProfessionalsCatalog } from '@/pages/agenda/hooks/useAgendaProfessionalsCatalog';
import {
  fullDayLocalToUtc,
  localRangeToUtc,
  softDeleteScheduleBlock,
  upsertScheduleBlock,
} from '@/api/scheduleBlocks';
import Button from '@/components/base/Button';
import Input from '@/components/base/Input';
import Select from '@/components/base/Select';
import Badge from '@/components/base/Badge';

interface ReglasBloqueoTabProps {
  branchId: string | null;
  reglasBloqueo: ReglaBloqueo[];
  defaultFecha: string;
  onReload: () => Promise<void>;
}

const tipoConfig: Record<
  ReglaBloqueoTipo,
  { label: string; icon: string; badge: 'danger' | 'warning' | 'info' | 'secondary' }
> = {
  rango: { label: 'Rango de horario', icon: 'ri-time-line', badge: 'warning' },
  dia: { label: 'Día completo', icon: 'ri-calendar-close-line', badge: 'danger' },
  medico: { label: 'Médico', icon: 'ri-user-unfollow-line', badge: 'info' },
  especialidad: { label: 'Especialidad', icon: 'ri-stethoscope-line', badge: 'secondary' },
};

export default function ReglasBloqueoTab({
  branchId,
  reglasBloqueo,
  defaultFecha,
  onReload,
}: ReglasBloqueoTabProps) {
  const { professionals, specialties } = useAgendaProfessionalsCatalog(true);
  const [isAdding, setIsAdding] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [tipo, setTipo] = useState<ReglaBloqueoTipo>('rango');
  const [nombre, setNombre] = useState('');
  const [fecha, setFecha] = useState(defaultFecha);
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('10:00');
  const [doctorId, setDoctorId] = useState('');
  const [especialidadId, setEspecialidadId] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isAdding) setFecha(defaultFecha);
  }, [defaultFecha, isAdding]);

  const describeRegla = (r: ReglaBloqueo): string => {
    if (r.tipo === 'rango') return `${r.fecha} · ${r.horaInicio}–${r.horaFin}`;
    if (r.tipo === 'dia') return `${r.fecha} · Todo el día`;
    if (r.tipo === 'medico') {
      const d = professionals.find((x) => x.healthcareProfessionalId === r.doctorId);
      return `${r.fecha} · ${d?.fullName || 'Médico'}`;
    }
    const s = specialties.find((x) => x.specialtyId === r.especialidadId);
    return `${r.fecha} · ${s?.name || 'Especialidad'}`;
  };

  const openAdd = () => {
    setTipo('rango');
    setNombre('');
    setFecha(defaultFecha);
    setHoraInicio('09:00');
    setHoraFin('10:00');
    setDoctorId('');
    setEspecialidadId('');
    setFormError('');
    setIsAdding(true);
  };

  const save = async () => {
    if (!branchId) {
      setFormError('Selecciona una sucursal activa.');
      return;
    }
    if (!nombre.trim()) {
      setFormError('El nombre de la regla es obligatorio');
      return;
    }
    if (!fecha) {
      setFormError('Selecciona una fecha');
      return;
    }
    if (tipo === 'rango' && (!horaInicio || !horaFin)) {
      setFormError('Define el rango de horario');
      return;
    }
    if (tipo === 'medico' && !doctorId) {
      setFormError('Selecciona un médico');
      return;
    }
    if (tipo === 'especialidad' && !especialidadId) {
      setFormError('Selecciona una especialidad');
      return;
    }

    const range =
      tipo === 'rango'
        ? localRangeToUtc(fecha, horaInicio, horaFin)
        : fullDayLocalToUtc(fecha);

    setBusy(true);
    setFormError('');
    const blockId = crypto.randomUUID();
    const res = await upsertScheduleBlock(blockId, {
      branchId,
      kind: tipo,
      name: nombre.trim(),
      localDate: fecha,
      startUtc: range.startUtc,
      endUtc: range.endUtc,
      professionalId: tipo === 'medico' ? doctorId : null,
      specialtyId: tipo === 'especialidad' ? especialidadId : null,
      isActive: true,
    });
    setBusy(false);
    if (!res.success) {
      setFormError(res.message ?? 'No se pudo guardar la regla.');
      return;
    }
    setIsAdding(false);
    await onReload();
  };

  const toggleActivo = async (r: ReglaBloqueo) => {
    if (!branchId) return;
    const range =
      r.tipo === 'rango' && r.horaInicio && r.horaFin
        ? localRangeToUtc(r.fecha, r.horaInicio, r.horaFin)
        : fullDayLocalToUtc(r.fecha);
    setBusy(true);
    const res = await upsertScheduleBlock(r.id, {
      branchId,
      kind: r.tipo,
      name: r.nombre,
      localDate: r.fecha,
      startUtc: range.startUtc,
      endUtc: range.endUtc,
      professionalId: r.tipo === 'medico' ? r.doctorId ?? null : null,
      specialtyId: r.tipo === 'especialidad' ? r.especialidadId ?? null : null,
      isActive: !r.activo,
    });
    setBusy(false);
    if (!res.success) {
      setFormError(res.message ?? 'No se pudo actualizar la regla.');
      return;
    }
    await onReload();
  };

  const remove = async (id: string) => {
    setBusy(true);
    const res = await softDeleteScheduleBlock(id);
    setBusy(false);
    setPendingDeleteId(null);
    if (!res.success) {
      setFormError(res.message ?? 'No se pudo eliminar la regla.');
      return;
    }
    await onReload();
  };

  return (
    <div className="space-y-4" data-testid="agenda-reglas-bloqueo-tab">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground-900">Reglas de bloqueo</p>
          <p className="text-xs text-foreground-500">
            Bloquea horarios, días, médicos o especialidades. Se persisten en API y rechazan citas
            conflictivas (409).
          </p>
        </div>
        {!isAdding && (
          <Button variant="primary" size="sm" onClick={openAdd} disabled={!branchId || busy}>
            <i className="ri-add-line"></i> Agregar regla
          </Button>
        )}
      </div>

      {formError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {formError}
        </p>
      )}

      {pendingDeleteId && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-xs text-red-600 font-medium">¿Eliminar esta regla de bloqueo?</p>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="danger" size="sm" disabled={busy} onClick={() => void remove(pendingDeleteId)}>
              Eliminar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPendingDeleteId(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {isAdding && (
        <div className="p-4 bg-secondary-50 border border-secondary-200 rounded-xl space-y-3">
          <p className="text-sm font-semibold text-foreground-900">Nueva regla de bloqueo</p>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Tipo de bloqueo"
              options={[
                { value: 'rango', label: 'Rango de horario' },
                { value: 'dia', label: 'Día completo' },
                { value: 'medico', label: 'Médico' },
                { value: 'especialidad', label: 'Especialidad' },
              ]}
              value={tipo}
              onChange={(e) => setTipo(e.target.value as ReglaBloqueoTipo)}
            />
            <Input
              label="Nombre"
              placeholder="Ej: Junta médica"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            {tipo === 'rango' ? (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Inicio"
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                />
                <Input
                  label="Fin"
                  type="time"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                />
              </div>
            ) : tipo === 'medico' ? (
              <Select
                label="Médico"
                options={[
                  { value: '', label: 'Seleccionar…' },
                  ...professionals.map((p) => ({
                    value: p.healthcareProfessionalId,
                    label: p.fullName,
                  })),
                ]}
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
              />
            ) : tipo === 'especialidad' ? (
              <Select
                label="Especialidad"
                options={[
                  { value: '', label: 'Seleccionar…' },
                  ...specialties.map((s) => ({ value: s.specialtyId, label: s.name })),
                ]}
                value={especialidadId}
                onChange={(e) => setEspecialidadId(e.target.value)}
              />
            ) : (
              <div className="flex items-end">
                <p className="text-xs text-foreground-500 pb-2">Bloquea todo el día en la sucursal.</p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={() => void save()} disabled={busy}>
              Guardar
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {reglasBloqueo.map((r) => {
          const cfg = tipoConfig[r.tipo];
          return (
            <div
              key={r.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${
                r.activo ? 'border-secondary-200 bg-background-50' : 'border-secondary-100 bg-secondary-50/50 opacity-60'
              }`}
            >
              <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary-100 text-foreground-600 shrink-0">
                <i className={`${cfg.icon} text-sm`} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground-900 truncate">{r.nombre}</p>
                  <Badge variant={cfg.badge} size="sm">
                    {cfg.label}
                  </Badge>
                </div>
                <p className="text-xs text-foreground-500">{describeRegla(r)}</p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void toggleActivo(r)}
                className="text-xs font-medium text-primary-600 hover:text-primary-700 cursor-pointer"
              >
                {r.activo ? 'Desactivar' : 'Activar'}
              </button>
              <button
                type="button"
                disabled={busy}
                aria-label={`Eliminar regla ${r.nombre}`}
                onClick={() => setPendingDeleteId(r.id)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
              >
                <i className="ri-delete-bin-line text-sm" />
              </button>
            </div>
          );
        })}
        {reglasBloqueo.length === 0 && !isAdding && (
          <p className="text-sm text-foreground-400 text-center py-8">
            No hay reglas de bloqueo configuradas.
          </p>
        )}
      </div>
    </div>
  );
}
