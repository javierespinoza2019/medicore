import { useMemo, useState } from 'react';
import type { AgendaConsultorio } from '@/pages/agenda/consultorioTypes';
import { useAgendaProfessionalsCatalog } from '@/pages/agenda/hooks/useAgendaProfessionalsCatalog';
import Button from '@/components/base/Button';
import Input from '@/components/base/Input';
import Select from '@/components/base/Select';
import Badge from '@/components/base/Badge';

interface ConsultoriosTabProps {
  consultorios: AgendaConsultorio[];
  branchId: string | null;
  onUpsert: (input: {
    roomId?: string;
    code: string;
    name: string;
    isActive: boolean;
    specialtyId: string | null;
    professionalIds: string[];
  }) => Promise<boolean>;
}

const emptyForm = {
  nombre: '',
  codigo: '',
  especialidadId: '',
  medicosIds: [] as string[],
  activo: true,
};

function codeFromName(name: string): string {
  return name
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .toUpperCase();
}

export default function ConsultoriosTab({ consultorios, branchId, onUpsert }: ConsultoriosTabProps) {
  const { professionals, specialties } = useAgendaProfessionalsCatalog(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeactivateId, setPendingDeactivateId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const specialtyOptions = useMemo(
    () => [
      { value: '', label: 'Sin especialidad' },
      ...specialties
        .filter((s) => s.isActive)
        .map((s) => ({ value: s.specialtyId, label: s.name })),
    ],
    [specialties],
  );

  const doctorsForForm = useMemo(() => {
    let list = professionals.filter((d) => d.isActive);
    if (form.especialidadId) {
      list = list.filter((d) => d.specialtyId === form.especialidadId);
    }
    return list;
  }, [professionals, form.especialidadId]);

  const openAdd = () => {
    setForm(emptyForm);
    setFormError('');
    setIsAdding(true);
    setEditingId(null);
  };

  const openEdit = (c: AgendaConsultorio) => {
    setForm({
      nombre: c.nombre,
      codigo: c.ubicacion,
      especialidadId: c.especialidadId,
      medicosIds: [...c.medicosIds],
      activo: c.activo,
    });
    setFormError('');
    setEditingId(c.id);
    setIsAdding(true);
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormError('');
  };

  const toggleDoctor = (id: string) => {
    setForm((prev) => ({
      ...prev,
      medicosIds: prev.medicosIds.includes(id)
        ? prev.medicosIds.filter((m) => m !== id)
        : [...prev.medicosIds, id],
    }));
  };

  const save = async () => {
    if (!branchId) {
      setFormError('No hay sucursal activa para guardar el consultorio.');
      return;
    }
    if (!form.nombre.trim()) {
      setFormError('El nombre del consultorio es obligatorio');
      return;
    }
    const code = (form.codigo.trim() || codeFromName(form.nombre)).toUpperCase();
    if (!code) {
      setFormError('El código es obligatorio');
      return;
    }
    if (code.length > 64) {
      setFormError('El código admite máximo 64 caracteres');
      return;
    }
    setSaving(true);
    setFormError('');
    const ok = await onUpsert({
      roomId: editingId ?? undefined,
      code,
      name: form.nombre.trim(),
      isActive: form.activo,
      specialtyId: form.especialidadId || null,
      professionalIds: form.medicosIds,
    });
    setSaving(false);
    if (!ok) {
      setFormError('No se pudo guardar. Revisa el código (único por sucursal) e inténtalo de nuevo.');
      return;
    }
    cancelForm();
  };

  const persistMeta = (c: AgendaConsultorio) => ({
    specialtyId: c.especialidadId || null,
    professionalIds: c.medicosIds,
  });

  const toggleActivo = async (c: AgendaConsultorio) => {
    if (!branchId) return;
    setSaving(true);
    await onUpsert({
      roomId: c.id,
      code: c.ubicacion,
      name: c.nombre,
      isActive: !c.activo,
      ...persistMeta(c),
    });
    setSaving(false);
  };

  const deactivate = async (id: string) => {
    const c = consultorios.find((x) => x.id === id);
    if (!c || !branchId) return;
    setSaving(true);
    await onUpsert({
      roomId: c.id,
      code: c.ubicacion,
      name: c.nombre,
      isActive: false,
      ...persistMeta(c),
    });
    setSaving(false);
    setPendingDeactivateId(null);
  };

  const specialtyLabel = (id: string) =>
    specialties.find((s) => s.specialtyId === id)?.name ?? (id ? 'Especialidad' : 'Sin especialidad');

  const doctorsLabel = (ids: string[]) => {
    if (ids.length === 0) return 'Sin médicos asignados';
    return ids
      .map((id) => professionals.find((p) => p.healthcareProfessionalId === id)?.fullName ?? id.slice(0, 8))
      .join(', ');
  };

  return (
    <div className="space-y-4" data-testid="agenda-consultorios-tab">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground-900">Consultorios</p>
          <p className="text-xs text-foreground-500">
            Código, nombre, especialidad opcional y médicos asignados (API).
          </p>
        </div>
        {!isAdding && (
          <Button variant="primary" size="sm" onClick={openAdd} disabled={!branchId || saving}>
            <i className="ri-add-line"></i> Agregar consultorio
          </Button>
        )}
      </div>

      {!branchId && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Selecciona una sucursal para gestionar consultorios.
        </p>
      )}

      {pendingDeactivateId && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800 font-medium">
            ¿Desactivar este consultorio? No se borra: deja de mostrarse en el día y se puede reactivar.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="danger"
              size="sm"
              disabled={saving}
              onClick={() => void deactivate(pendingDeactivateId)}
            >
              Desactivar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPendingDeactivateId(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {isAdding && (
        <div className="p-4 bg-secondary-50 border border-secondary-200 rounded-xl space-y-3">
          <p className="text-sm font-semibold text-foreground-900">
            {editingId ? 'Editar consultorio' : 'Nuevo consultorio'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nombre"
              placeholder="Ej: Consultorio 301"
              value={form.nombre}
              onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
            />
            <Input
              label="Código"
              placeholder="Ej: C-301"
              value={form.codigo}
              onChange={(e) => setForm((p) => ({ ...p, codigo: e.target.value }))}
              hint={
                !form.codigo.trim() && form.nombre.trim()
                  ? `Se sugerirá: ${codeFromName(form.nombre)}`
                  : undefined
              }
            />
          </div>
          <Select
            label="Especialidad"
            value={form.especialidadId}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                especialidadId: e.target.value,
                medicosIds: [],
              }))
            }
            options={specialtyOptions}
            data-testid="consultorio-specialty"
          />
          <div>
            <p className="text-xs font-medium text-foreground-700 mb-1.5">Médicos asignados</p>
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
              {doctorsForForm.map((d) => {
                const selected = form.medicosIds.includes(d.healthcareProfessionalId);
                return (
                  <button
                    key={d.healthcareProfessionalId}
                    type="button"
                    onClick={() => toggleDoctor(d.healthcareProfessionalId)}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-base cursor-pointer ${
                      selected
                        ? 'bg-primary-100 border-primary-300 text-primary-800'
                        : 'bg-background-50 border-secondary-200 text-foreground-600 hover:border-secondary-300'
                    }`}
                  >
                    {d.fullName}
                  </button>
                );
              })}
              {doctorsForForm.length === 0 && (
                <p className="text-xs text-foreground-400">
                  {form.especialidadId
                    ? 'No hay médicos activos de esa especialidad.'
                    : 'No hay médicos activos en el catálogo.'}
                </p>
              )}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm((p) => ({ ...p, activo: e.target.checked }))}
              className="rounded border-secondary-300"
            />
            Activo (visible en vista día)
          </label>
          {formError && (
            <p className="text-xs text-red-500" role="alert">
              {formError}
            </p>
          )}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={cancelForm} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={() => void save()} disabled={saving}>
              <i className="ri-check-line"></i> {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {consultorios.map((c) => (
          <div
            key={c.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${c.activo ? 'border-secondary-200 bg-background-50' : 'border-secondary-200 bg-secondary-50 opacity-70'}`}
          >
            <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary-100 text-primary-600 shrink-0">
              <i className="ri-door-open-line text-lg"></i>
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-sm font-semibold text-foreground-900 truncate">{c.nombre}</p>
                <span className="text-[10px] text-foreground-400 whitespace-nowrap font-mono">
                  {c.ubicacion}
                </span>
                {!c.activo && (
                  <Badge variant="secondary" size="sm">
                    Inactivo
                  </Badge>
                )}
              </div>
              <p className="text-xs text-foreground-500 truncate">
                {specialtyLabel(c.especialidadId)} · {doctorsLabel(c.medicosIds)}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => void toggleActivo(c)}
                disabled={saving || !branchId}
                aria-label={c.activo ? 'Desactivar consultorio' : 'Activar consultorio'}
                title={c.activo ? 'Desactivar' : 'Activar'}
                className={`relative w-9 h-5 rounded-full transition-base cursor-pointer disabled:opacity-50 ${c.activo ? 'bg-emerald-500' : 'bg-secondary-300'}`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-base ${c.activo ? 'left-[18px]' : 'left-0.5'}`}
                ></span>
              </button>
              <button
                type="button"
                onClick={() => openEdit(c)}
                disabled={saving}
                aria-label="Editar consultorio"
                title="Editar"
                className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-500 hover:text-foreground-800 hover:bg-secondary-100 transition-base cursor-pointer disabled:opacity-50"
              >
                <i className="ri-pencil-line text-sm"></i>
              </button>
              <button
                type="button"
                onClick={() => setPendingDeactivateId(c.id)}
                disabled={saving || !c.activo}
                aria-label="Desactivar consultorio"
                title="Desactivar"
                className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-500 hover:text-amber-600 hover:bg-amber-50 transition-base cursor-pointer disabled:opacity-40"
              >
                <i className="ri-forbid-line text-sm"></i>
              </button>
            </div>
          </div>
        ))}
        {consultorios.length === 0 && (
          <p className="text-sm text-foreground-400 text-center py-8">
            No hay consultorios configurados. Agrega uno para organizar la vista del día.
          </p>
        )}
      </div>
    </div>
  );
}
