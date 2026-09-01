import { useState } from 'react';
import type { Consultorio } from '@/mocks/consultorios';
import { doctors } from '@/mocks/doctors';
import { specialties } from '@/mocks/doctors';
import Button from '@/components/base/Button';
import Input from '@/components/base/Input';
import Select from '@/components/base/Select';
import Badge from '@/components/base/Badge';

interface ConsultoriosTabProps {
  consultorios: Consultorio[];
  onChange: (updater: (prev: Consultorio[]) => Consultorio[]) => void;
}

const emptyForm = {
  nombre: '',
  ubicacion: '',
  especialidadId: '',
  medicosIds: [] as string[],
};

export default function ConsultoriosTab({ consultorios, onChange }: ConsultoriosTabProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  const openAdd = () => {
    setForm(emptyForm);
    setFormError('');
    setIsAdding(true);
    setEditingId(null);
  };

  const openEdit = (c: Consultorio) => {
    setForm({
      nombre: c.nombre,
      ubicacion: c.ubicacion,
      especialidadId: c.especialidadId,
      medicosIds: [...c.medicosIds],
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

  const save = () => {
    if (!form.nombre.trim()) {
      setFormError('El nombre del consultorio es obligatorio');
      return;
    }
    if (!form.especialidadId) {
      setFormError('Selecciona una especialidad vinculada');
      return;
    }
    if (editingId) {
      onChange((prev) => prev.map((c) => (c.id === editingId ? { ...c, ...form } : c)));
    } else {
      const nuevo: Consultorio = {
        id: `c-${Date.now()}`,
        nombre: form.nombre.trim(),
        ubicacion: form.ubicacion.trim() || 'Piso 1',
        especialidadId: form.especialidadId,
        medicosIds: form.medicosIds,
        activo: true,
      };
      onChange((prev) => [...prev, nuevo]);
    }
    cancelForm();
  };

  const toggleActivo = (id: string) => {
    onChange((prev) => prev.map((c) => (c.id === id ? { ...c, activo: !c.activo } : c)));
  };

  const remove = (id: string) => {
    onChange((prev) => prev.filter((c) => c.id !== id));
    setPendingDeleteId(null);
  };

  const activeDoctors = doctors.filter((d) => d.status === 'activo');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground-900">Consultorios</p>
          <p className="text-xs text-foreground-500">Los consultorios activos se muestran como columnas en la vista del día.</p>
        </div>
        {!isAdding && (
          <Button variant="primary" size="sm" onClick={openAdd}>
            <i className="ri-add-line"></i> Agregar consultorio
          </Button>
        )}
      </div>

      {/* Aviso de eliminación pendiente */}
      {pendingDeleteId && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-xs text-red-600 font-medium">¿Eliminar este consultorio? Las citas existentes no se pierden.</p>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="danger" size="sm" onClick={() => remove(pendingDeleteId)}>Eliminar</Button>
            <Button variant="ghost" size="sm" onClick={() => setPendingDeleteId(null)}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Formulario */}
      {isAdding && (
        <div className="p-4 bg-secondary-50 border border-secondary-200 rounded-xl space-y-3">
          <p className="text-sm font-semibold text-foreground-900">{editingId ? 'Editar consultorio' : 'Nuevo consultorio'}</p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nombre"
              placeholder="Ej: Consultorio 301"
              value={form.nombre}
              onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
            />
            <Input
              label="Ubicación"
              placeholder="Ej: Piso 3"
              value={form.ubicacion}
              onChange={(e) => setForm((p) => ({ ...p, ubicacion: e.target.value }))}
            />
          </div>
          <Select
            label="Especialidad vinculada"
            placeholder="Seleccionar especialidad"
            options={specialties.map((s) => ({ value: s.id, label: s.nombre }))}
            value={form.especialidadId}
            onChange={(e) => setForm((p) => ({ ...p, especialidadId: e.target.value }))}
          />
          <div>
            <p className="block text-sm font-medium text-foreground-800 mb-1.5">Médicos vinculados</p>
            <div className="flex flex-wrap gap-1.5">
              {activeDoctors.map((d) => {
                const selected = form.medicosIds.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDoctor(d.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-base cursor-pointer whitespace-nowrap ${
                      selected
                        ? 'bg-primary-500 text-white border-primary-500'
                        : 'bg-background-50 text-foreground-600 border-secondary-200 hover:border-primary-300'
                    }`}
                  >
                    {selected && <i className="ri-check-line text-xs"></i>}
                    {d.nombre.split(' ').slice(0, 2).join(' ')}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-foreground-400 mt-1">Selecciona uno o varios médicos que atienden en este consultorio.</p>
          </div>
          {formError && <p className="text-xs text-red-500" role="alert">{formError}</p>}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={cancelForm}>Cancelar</Button>
            <Button variant="primary" size="sm" onClick={save}>
              <i className="ri-check-line"></i> Guardar
            </Button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-2">
        {consultorios.map((c) => {
          const specialty = specialties.find((s) => s.id === c.especialidadId);
          const linkedDoctors = doctors.filter((d) => c.medicosIds.includes(d.id));
          return (
            <div key={c.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${c.activo ? 'border-secondary-200 bg-background-50' : 'border-secondary-200 bg-secondary-50 opacity-70'}`}>
              <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary-100 text-primary-600 shrink-0">
                <i className="ri-door-open-line text-lg"></i>
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-sm font-semibold text-foreground-900 truncate">{c.nombre}</p>
                  <span className="text-[10px] text-foreground-400 whitespace-nowrap">{c.ubicacion}</span>
                  {!c.activo && <Badge variant="secondary" size="sm">Inactivo</Badge>}
                </div>
                <p className="text-xs text-foreground-500 truncate">
                  {specialty?.nombre || 'Sin especialidad'}
                  {linkedDoctors.length > 0 && <span> · {linkedDoctors.map((d) => d.nombre.split(' ').slice(0, 2).join(' ')).join(', ')}</span>}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleActivo(c.id)}
                  aria-label={c.activo ? 'Desactivar consultorio' : 'Activar consultorio'}
                  title={c.activo ? 'Desactivar' : 'Activar'}
                  className={`relative w-9 h-5 rounded-full transition-base cursor-pointer ${c.activo ? 'bg-emerald-500' : 'bg-secondary-300'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-base ${c.activo ? 'left-[18px]' : 'left-0.5'}`}></span>
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(c)}
                  aria-label="Editar consultorio"
                  title="Editar"
                  className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-500 hover:text-foreground-800 hover:bg-secondary-100 transition-base cursor-pointer"
                >
                  <i className="ri-pencil-line text-sm"></i>
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDeleteId(c.id)}
                  aria-label="Eliminar consultorio"
                  title="Eliminar"
                  className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-500 hover:text-red-500 hover:bg-red-500/10 transition-base cursor-pointer"
                >
                  <i className="ri-delete-bin-line text-sm"></i>
                </button>
              </div>
            </div>
          );
        })}
        {consultorios.length === 0 && (
          <p className="text-sm text-foreground-400 text-center py-8">No hay consultorios configurados. Agrega uno para organizar la vista del día.</p>
        )}
      </div>
    </div>
  );
}