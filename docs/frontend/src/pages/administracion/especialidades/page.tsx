import { useState, useMemo } from 'react';
import { useSort } from '@/hooks/useSort';
import SortableTh from '@/components/feature/SortableTh';
import { specialties, type Speciality } from '@/mocks/doctors';
import Button from '@/components/base/Button';
import Card from '@/components/base/Card';
import Modal from '@/components/base/Modal';
import Input from '@/components/base/Input';
import Select from '@/components/base/Select';
import Badge from '@/components/base/Badge';

const colorOptions = [
  { value: 'primary', label: 'Azul' },
  { value: 'accent', label: 'Rosa' },
  { value: 'emerald', label: 'Verde' },
  { value: 'amber', label: 'Ámbar' },
  { value: 'violet', label: 'Violeta' },
  { value: 'rose', label: 'Rosado' },
  { value: 'cyan', label: 'Cian' },
  { value: 'orange', label: 'Naranja' },
];

const iconOptions = [
  { value: 'ri-stethoscope-line', label: 'Estetoscopio' },
  { value: 'ri-heart-pulse-line', label: 'Corazón' },
  { value: 'ri-emotion-happy-line', label: 'Felicidad' },
  { value: 'ri-tooth-line', label: 'Diente' },
  { value: 'ri-sun-line', label: 'Sol' },
  { value: 'ri-women-line', label: 'Mujer' },
  { value: 'ri-brain-line', label: 'Cerebro' },
  { value: 'ri-psychotherapy-line', label: 'Terapia' },
  { value: 'ri-eye-line', label: 'Ojo' },
  { value: 'ri-lungs-line', label: 'Pulmones' },
  { value: 'ri-capsule-line', label: 'Cápsula' },
  { value: 'ri-syringe-line', label: 'Jeringa' },
  { value: 'ri-first-aid-kit-line', label: 'Botiquín' },
  { value: 'ri-microscope-line', label: 'Microscopio' },
  { value: 'ri-mental-health-line', label: 'Salud Mental' },
  { value: 'ri-hospital-line', label: 'Hospital' },
];

interface FormData {
  nombre: string;
  descripcion: string;
  icono: string;
  color: string;
}

const emptyForm: FormData = { nombre: '', descripcion: '', icono: 'ri-stethoscope-line', color: 'primary' };

export default function Especialidades() {
  const [items, setItems] = useState<Speciality[]>(specialties);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Speciality | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const filtered = items.filter(
    (s) =>
      s.nombre.toLowerCase().includes(search.toLowerCase()) ||
      s.descripcion.toLowerCase().includes(search.toLowerCase())
  );

  const sorters = useMemo(() => ({
    especialidad: (a: Speciality, b: Speciality) => a.nombre.localeCompare(b.nombre),
    descripcion: (a: Speciality, b: Speciality) => a.descripcion.localeCompare(b.descripcion),
  }), []);

  const { sortedData, sortKey, direction, toggleSort } = useSort(filtered, sorters);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (s: Speciality) => {
    setEditingId(s.id);
    setForm({ nombre: s.nombre, descripcion: s.descripcion, icono: s.icono, color: s.color });
    setFormErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};
    if (!form.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    else if (form.nombre.trim().length > 80) errors.nombre = 'El nombre no puede exceder 80 caracteres';
    if (!form.descripcion.trim()) errors.descripcion = 'La descripción es obligatoria';
    else if (form.descripcion.trim().length > 300) errors.descripcion = 'La descripción no puede exceder 300 caracteres';
    if (form.nombre.trim() && items.some((i) => i.nombre.toLowerCase() === form.nombre.trim().toLowerCase() && i.id !== editingId)) {
      errors.nombre = 'Ya existe una especialidad con este nombre';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    if (editingId) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === editingId ? { ...i, nombre: form.nombre.trim(), descripcion: form.descripcion.trim(), icono: form.icono, color: form.color } : i
        )
      );
    } else {
      const newItem: Speciality = {
        id: `s${Date.now()}`,
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim(),
        icono: form.icono,
        color: form.color,
      };
      setItems((prev) => [...prev, newItem]);
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const colorMap: Record<string, string> = {
    primary: 'bg-primary-100 text-primary-800',
    accent: 'bg-accent-100 text-accent-800',
    emerald: 'bg-emerald-100 text-emerald-800',
    amber: 'bg-amber-100 text-amber-800',
    violet: 'bg-violet-100 text-violet-800',
    rose: 'bg-rose-100 text-rose-800',
    cyan: 'bg-cyan-100 text-cyan-800',
    orange: 'bg-orange-100 text-orange-800',
  };

  const colorDot: Record<string, string> = {
    primary: 'bg-primary-500',
    accent: 'bg-accent-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    violet: 'bg-violet-500',
    rose: 'bg-rose-500',
    cyan: 'bg-cyan-500',
    orange: 'bg-orange-500',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button icon={<i className="ri-add-line"></i>} onClick={openCreate}>
          Nueva Especialidad
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative w-full sm:w-80">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
            <i className="ri-search-line text-sm"></i>
          </span>
          <input
            type="search"
            aria-label="Buscar especialidad"
            placeholder="Buscar especialidad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base"
          />
        </div>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-secondary-200 text-left">
                <SortableTh label="Especialidad" sortKey="especialidad" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTh label="Descripción" sortKey="descripcion" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <th className="px-5 py-2 text-xs font-semibold text-foreground-500 uppercase tracking-wider w-24 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-12 text-center text-foreground-400">
                    <div className="flex flex-col items-center gap-2">
                      <span className="w-10 h-10 flex items-center justify-center">
                        <i className="ri-hospital-line text-2xl"></i>
                      </span>
                      <p className="text-sm">No se encontraron especialidades</p>
                      {search && (
                        <button
                          onClick={() => setSearch('')}
                          className="text-xs text-primary-500 hover:text-primary-600 cursor-pointer"
                        >
                          Limpiar búsqueda
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                sortedData.map((s) => (
                  <tr key={s.id} className="hover:bg-secondary-50/50 transition-base group">
                    <td className="px-5 py-2">
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 flex items-center justify-center rounded-lg ${colorMap[s.color] || 'bg-secondary-100 text-secondary-800'}`}>
                          <i className={`${s.icono} text-sm`}></i>
                        </span>
                        <span className="font-medium text-foreground-900">{s.nombre}</span>
                      </div>
                    </td>
                    <td className="px-5 py-2 text-foreground-600">{s.descripcion}</td>
                    <td className="px-5 py-2">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-base">
                        <button
                          onClick={() => openEdit(s)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-foreground-700 hover:bg-secondary-100 transition-base cursor-pointer"
                          aria-label={`Editar especialidad ${s.nombre}`}
                          title="Editar"
                        >
                          <i className="ri-pencil-line text-sm" aria-hidden="true"></i>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(s)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-red-600 hover:bg-red-500/10 transition-base cursor-pointer"
                          aria-label={`Eliminar especialidad ${s.nombre}`}
                          title="Eliminar"
                        >
                          <i className="ri-delete-bin-line text-sm" aria-hidden="true"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar Especialidad' : 'Nueva Especialidad'}
        size="md"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? 'Guardar Cambios' : 'Crear Especialidad'}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nombre de la especialidad"
            placeholder="Ej: Cardiología"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            error={formErrors.nombre}
            maxLength={80}
            autoComplete="off"
          />
          <Input
            label="Descripción"
            placeholder="Ej: Atención integral del sistema cardiovascular"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            error={formErrors.descripcion}
            maxLength={300}
            autoComplete="off"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Icono"
              value={form.icono}
              onChange={(e) => setForm({ ...form, icono: e.target.value })}
              options={iconOptions}
            />
            <div>
              <label className="block text-sm font-medium text-foreground-800 mb-1.5">Color</label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setForm({ ...form, color: c.value })}
                    className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-base ${colorDot[c.value]} ${form.color === c.value ? 'ring-2 ring-offset-2 ring-foreground-300 scale-110' : ''}`}
                    title={c.label}
                    aria-label={`Color ${c.label}`}
                    aria-pressed={form.color === c.value}
                    type="button"
                  >
                    {form.color === c.value && <i className="ri-check-line text-white text-xs" aria-hidden="true"></i>}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {form.color && form.icono && (
            <div className="flex items-center gap-3 p-3 bg-secondary-50 rounded-lg">
              <span className="text-xs text-foreground-500">Vista previa:</span>
              <span className={`w-8 h-8 flex items-center justify-center rounded-lg ${colorMap[form.color] || 'bg-secondary-100 text-secondary-800'}`}>
                <i className={`${form.icono} text-sm`}></i>
              </span>
              <span className="text-sm font-medium text-foreground-900">{form.nombre || 'Nueva especialidad'}</span>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar Especialidad"
        size="sm"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete}>Eliminar</Button>
          </div>
        }
      >
        {deleteTarget && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
              <span className="w-10 h-10 flex items-center justify-center rounded-full bg-red-100 text-red-600">
                <i className="ri-error-warning-line text-lg"></i>
              </span>
              <div>
                <p className="text-sm font-medium text-red-800">¿Estás seguro de eliminar esta especialidad?</p>
                <p className="text-xs text-red-600 mt-0.5">Esta acción no se puede deshacer. Los médicos y servicios asociados podrían quedar sin especialidad.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-background-50 rounded-lg border border-secondary-200">
              <span className={`w-8 h-8 flex items-center justify-center rounded-lg ${colorMap[deleteTarget.color] || 'bg-secondary-100 text-secondary-800'}`}>
                <i className={`${deleteTarget.icono} text-sm`}></i>
              </span>
              <div>
                <p className="text-sm font-medium text-foreground-900">{deleteTarget.nombre}</p>
                <p className="text-xs text-foreground-500">{deleteTarget.descripcion}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}