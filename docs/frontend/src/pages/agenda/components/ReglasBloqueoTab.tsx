import { useState } from 'react';
import type { ReglaBloqueo, ReglaBloqueoTipo } from '@/mocks/agendaRules';
import { doctors } from '@/mocks/doctors';
import { specialties } from '@/mocks/doctors';
import Button from '@/components/base/Button';
import Input from '@/components/base/Input';
import Select from '@/components/base/Select';
import Badge from '@/components/base/Badge';

interface ReglasBloqueoTabProps {
  reglasBloqueo: ReglaBloqueo[];
  onChange: (updater: (prev: ReglaBloqueo[]) => ReglaBloqueo[]) => void;
  defaultFecha: string;
}

const tipoConfig: Record<ReglaBloqueoTipo, { label: string; icon: string; badge: 'danger' | 'warning' | 'info' | 'secondary' }> = {
  rango: { label: 'Rango de horario', icon: 'ri-time-line', badge: 'warning' },
  dia: { label: 'Día completo', icon: 'ri-calendar-close-line', badge: 'danger' },
  medico: { label: 'Médico', icon: 'ri-user-unfollow-line', badge: 'info' },
  especialidad: { label: 'Especialidad', icon: 'ri-stethoscope-line', badge: 'secondary' },
};

function describeRegla(r: ReglaBloqueo): string {
  if (r.tipo === 'rango') return `${r.fecha} · ${r.horaInicio}–${r.horaFin}`;
  if (r.tipo === 'dia') return `${r.fecha} · Todo el día`;
  if (r.tipo === 'medico') {
    const d = doctors.find((x) => x.id === r.doctorId);
    return `${r.fecha} · ${d?.nombre.split(' ').slice(0, 2).join(' ') || 'Médico'}`;
  }
  const s = specialties.find((x) => x.id === r.especialidadId);
  return `${r.fecha} · ${s?.nombre || 'Especialidad'}`;
}

export default function ReglasBloqueoTab({ reglasBloqueo, onChange, defaultFecha }: ReglasBloqueoTabProps) {
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

  const save = () => {
    if (!nombre.trim()) { setFormError('El nombre de la regla es obligatorio'); return; }
    if (!fecha) { setFormError('Selecciona una fecha'); return; }
    if (tipo === 'rango' && (!horaInicio || !horaFin)) { setFormError('Define el rango de horario'); return; }
    if (tipo === 'medico' && !doctorId) { setFormError('Selecciona un médico'); return; }
    if (tipo === 'especialidad' && !especialidadId) { setFormError('Selecciona una especialidad'); return; }

    const nueva: ReglaBloqueo = {
      id: `reg-${Date.now()}`,
      tipo,
      nombre: nombre.trim(),
      fecha,
      horaInicio: tipo === 'rango' ? horaInicio : undefined,
      horaFin: tipo === 'rango' ? horaFin : undefined,
      doctorId: tipo === 'medico' ? doctorId : undefined,
      especialidadId: tipo === 'especialidad' ? especialidadId : undefined,
      activo: true,
    };
    onChange((prev) => [...prev, nueva]);
    setIsAdding(false);
    setFormError('');
  };

  const toggleActivo = (id: string) => {
    onChange((prev) => prev.map((r) => (r.id === id ? { ...r, activo: !r.activo } : r)));
  };

  const remove = (id: string) => {
    onChange((prev) => prev.filter((r) => r.id !== id));
    setPendingDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground-900">Reglas de bloqueo</p>
          <p className="text-xs text-foreground-500">Bloquea horarios, días, médicos o especialidades para evitar agendar citas.</p>
        </div>
        {!isAdding && (
          <Button variant="primary" size="sm" onClick={openAdd}>
            <i className="ri-add-line"></i> Agregar regla
          </Button>
        )}
      </div>

      {pendingDeleteId && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-xs text-red-600 font-medium">¿Eliminar esta regla de bloqueo?</p>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="danger" size="sm" onClick={() => remove(pendingDeleteId)}>Eliminar</Button>
            <Button variant="ghost" size="sm" onClick={() => setPendingDeleteId(null)}>Cancelar</Button>
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
            <Input
              label="Fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
            {tipo === 'rango' && (
              <div className="grid grid-cols-2 gap-2">
                <Input label="Hora inicio" type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
                <Input label="Hora fin" type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} />
              </div>
            )}
          </div>
          {tipo === 'medico' && (
            <Select
              label="Médico a bloquear"
              placeholder="Seleccionar médico"
              options={doctors.filter((d) => d.status === 'activo').map((d) => ({ value: d.id, label: d.nombre }))}
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
            />
          )}
          {tipo === 'especialidad' && (
            <Select
              label="Especialidad a bloquear"
              placeholder="Seleccionar especialidad"
              options={specialties.map((s) => ({ value: s.id, label: s.nombre }))}
              value={especialidadId}
              onChange={(e) => setEspecialidadId(e.target.value)}
            />
          )}
          {formError && <p className="text-xs text-red-500" role="alert">{formError}</p>}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" onClick={save}>
              <i className="ri-check-line"></i> Guardar regla
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {reglasBloqueo.map((r) => {
          const cfg = tipoConfig[r.tipo];
          return (
            <div key={r.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${r.activo ? 'border-secondary-200 bg-background-50' : 'border-secondary-200 bg-secondary-50 opacity-70'}`}>
              <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 shrink-0">
                <i className={`${cfg.icon} text-lg`}></i>
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-sm font-semibold text-foreground-900 truncate">{r.nombre}</p>
                  <Badge variant={cfg.badge} size="sm">{cfg.label}</Badge>
                  {!r.activo && <Badge variant="secondary" size="sm">Inactiva</Badge>}
                </div>
                <p className="text-xs text-foreground-500 truncate">{describeRegla(r)}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleActivo(r.id)}
                  aria-label={r.activo ? 'Desactivar regla' : 'Activar regla'}
                  title={r.activo ? 'Desactivar' : 'Activar'}
                  className={`relative w-9 h-5 rounded-full transition-base cursor-pointer ${r.activo ? 'bg-emerald-500' : 'bg-secondary-300'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-base ${r.activo ? 'left-[18px]' : 'left-0.5'}`}></span>
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDeleteId(r.id)}
                  aria-label="Eliminar regla"
                  title="Eliminar"
                  className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-500 hover:text-red-500 hover:bg-red-500/10 transition-base cursor-pointer"
                >
                  <i className="ri-delete-bin-line text-sm"></i>
                </button>
              </div>
            </div>
          );
        })}
        {reglasBloqueo.length === 0 && (
          <p className="text-sm text-foreground-400 text-center py-8">No hay reglas de bloqueo configuradas.</p>
        )}
      </div>
    </div>
  );
}