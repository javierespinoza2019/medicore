import { useState, useMemo } from 'react';
import { useSort } from '@/hooks/useSort';
import SortableTh from '@/components/feature/SortableTh';
import { medicalServices, type MedicalService } from '@/mocks/services';
import { specialties } from '@/mocks/doctors';
import Button from '@/components/base/Button';
import Card from '@/components/base/Card';
import Modal from '@/components/base/Modal';
import Input from '@/components/base/Input';
import Select from '@/components/base/Select';
import Badge from '@/components/base/Badge';

const tipoLabels: Record<MedicalService['tipo'], { label: string; variant: 'primary' | 'accent' | 'info' | 'warning' | 'secondary' }> = {
  consulta: { label: 'Consulta', variant: 'primary' },
  procedimiento: { label: 'Procedimiento', variant: 'accent' },
  estudio: { label: 'Estudio', variant: 'info' },
  terapia: { label: 'Terapia', variant: 'warning' },
  otro: { label: 'Otro', variant: 'secondary' },
};

const tipoOptions = [
  { value: 'consulta', label: 'Consulta' },
  { value: 'procedimiento', label: 'Procedimiento' },
  { value: 'estudio', label: 'Estudio' },
  { value: 'terapia', label: 'Terapia' },
  { value: 'otro', label: 'Otro' },
];

interface FormData {
  codigo: string;
  nombre: string;
  especialidadId: string;
  tipo: MedicalService['tipo'];
  precio: string;
  duracionMin: string;
  requiereCita: boolean;
  activo: boolean;
  descripcion: string;
}

const emptyForm: FormData = {
  codigo: '',
  nombre: '',
  especialidadId: '',
  tipo: 'consulta',
  precio: '',
  duracionMin: '20',
  requiereCita: true,
  activo: true,
  descripcion: '',
};

export default function Servicios() {
  const [items, setItems] = useState<MedicalService[]>(medicalServices);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterEspecialidad, setFilterEspecialidad] = useState<string>('todas');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<MedicalService | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const filtered = items.filter((s) => {
    const matchSearch =
      s.nombre.toLowerCase().includes(search.toLowerCase()) ||
      s.codigo.toLowerCase().includes(search.toLowerCase()) ||
      s.especialidad.toLowerCase().includes(search.toLowerCase());
    const matchTipo = filterTipo === 'todos' || s.tipo === filterTipo;
    const matchEsp = filterEspecialidad === 'todas' || s.especialidadId === filterEspecialidad;
    return matchSearch && matchTipo && matchEsp;
  });

  const sorters = useMemo(() => ({
    codigo: (a: MedicalService, b: MedicalService) => a.codigo.localeCompare(b.codigo),
    servicio: (a: MedicalService, b: MedicalService) => a.nombre.localeCompare(b.nombre),
    especialidad: (a: MedicalService, b: MedicalService) => a.especialidad.localeCompare(b.especialidad),
    tipo: (a: MedicalService, b: MedicalService) => a.tipo.localeCompare(b.tipo),
    precio: (a: MedicalService, b: MedicalService) => a.precio - b.precio,
    duracion: (a: MedicalService, b: MedicalService) => a.duracionMin - b.duracionMin,
    estado: (a: MedicalService, b: MedicalService) => Number(a.activo) - Number(b.activo),
  }), []);

  const { sortedData, sortKey, direction, toggleSort } = useSort(filtered, sorters);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (s: MedicalService) => {
    setEditingId(s.id);
    setForm({
      codigo: s.codigo,
      nombre: s.nombre,
      especialidadId: s.especialidadId,
      tipo: s.tipo,
      precio: s.precio.toString(),
      duracionMin: s.duracionMin.toString(),
      requiereCita: s.requiereCita,
      activo: s.activo,
      descripcion: s.descripcion,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};
    if (!form.codigo.trim()) errors.codigo = 'El código es obligatorio';
    else if (form.codigo.trim().length > 30) errors.codigo = 'El código no puede exceder 30 caracteres';
    if (!form.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    else if (form.nombre.trim().length > 100) errors.nombre = 'El nombre no puede exceder 100 caracteres';
    if (!form.especialidadId) errors.especialidadId = 'Selecciona una especialidad';
    if (!form.precio || isNaN(Number(form.precio)) || Number(form.precio) <= 0) errors.precio = 'Ingresa un precio válido';
    else if (Number(form.precio) > 999999) errors.precio = 'El precio no puede exceder $999,999';
    if (!form.duracionMin || isNaN(Number(form.duracionMin)) || Number(form.duracionMin) <= 0) errors.duracionMin = 'Duración inválida';
    else if (Number(form.duracionMin) > 480) errors.duracionMin = 'La duración máxima es 480 minutos (8 horas)';
    if (form.descripcion.trim().length > 500) errors.descripcion = 'La descripción no puede exceder 500 caracteres';
    if (form.codigo.trim() && items.some((i) => i.codigo.toLowerCase() === form.codigo.trim().toLowerCase() && i.id !== editingId)) {
      errors.codigo = 'Ya existe un servicio con este código';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const esp = specialties.find((s) => s.id === form.especialidadId);

    if (editingId) {
      setItems((prev) =>
        prev.map((s) =>
          s.id === editingId
            ? {
                ...s,
                codigo: form.codigo.trim(),
                nombre: form.nombre.trim(),
                especialidadId: form.especialidadId,
                especialidad: esp?.nombre || s.especialidad,
                tipo: form.tipo,
                precio: Number(form.precio),
                duracionMin: Number(form.duracionMin),
                requiereCita: form.requiereCita,
                activo: form.activo,
                descripcion: form.descripcion.trim(),
              }
            : s
        )
      );
    } else {
      const newItem: MedicalService = {
        id: `sv${Date.now()}`,
        codigo: form.codigo.trim(),
        nombre: form.nombre.trim(),
        especialidadId: form.especialidadId,
        especialidad: esp?.nombre || '',
        tipo: form.tipo,
        precio: Number(form.precio),
        duracionMin: Number(form.duracionMin),
        requiereCita: form.requiereCita,
        activo: form.activo,
        descripcion: form.descripcion.trim(),
      };
      setItems((prev) => [...prev, newItem]);
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setItems((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const formatPrecio = (p: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(p);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button icon={<i className="ri-add-line"></i>} onClick={openCreate}>
          Nuevo Servicio
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <div className="relative w-full sm:w-72">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
            <i className="ri-search-line text-sm"></i>
          </span>
          <input
            type="search"
            aria-label="Buscar servicios"
            placeholder="Buscar por nombre, código o especialidad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base"
          />
        </div>
        <select
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value)}
          className="px-3 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 cursor-pointer"
        >
          <option value="todos">Todos los tipos</option>
          {tipoOptions.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select
          value={filterEspecialidad}
          onChange={(e) => setFilterEspecialidad(e.target.value)}
          className="px-3 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 cursor-pointer"
        >
          <option value="todas">Todas las especialidades</option>
          {specialties.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </select>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-secondary-200 text-left">
                <SortableTh label="Código" sortKey="codigo" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTh label="Servicio" sortKey="servicio" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTh label="Especialidad" sortKey="especialidad" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTh label="Tipo" sortKey="tipo" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTh label="Precio" sortKey="precio" activeKey={sortKey} direction={direction} onSort={toggleSort} align="right" />
                <SortableTh label="Duración" sortKey="duracion" activeKey={sortKey} direction={direction} onSort={toggleSort} align="center" />
                <SortableTh label="Estado" sortKey="estado" activeKey={sortKey} direction={direction} onSort={toggleSort} align="center" />
                <th className="px-5 py-2 text-xs font-semibold text-foreground-500 uppercase tracking-wider w-24 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-foreground-400">
                    <div className="flex flex-col items-center gap-2">
                      <span className="w-10 h-10 flex items-center justify-center">
                        <i className="ri-price-tag-3-line text-2xl"></i>
                      </span>
                      <p className="text-sm">No se encontraron servicios</p>
                      {(search || filterTipo !== 'todos' || filterEspecialidad !== 'todas') && (
                        <button
                          onClick={() => { setSearch(''); setFilterTipo('todos'); setFilterEspecialidad('todas'); }}
                          className="text-xs text-primary-500 hover:text-primary-600 cursor-pointer"
                        >
                          Limpiar filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                sortedData.map((sv) => {
                  const tipo = tipoLabels[sv.tipo];
                  return (
                    <tr key={sv.id} className="hover:bg-secondary-50/50 transition-base group">
                      <td className="px-5 py-2">
                        <span className="font-mono text-xs text-foreground-500 bg-secondary-100 px-2 py-0.5 rounded">{sv.codigo}</span>
                      </td>
                      <td className="px-5 py-2">
                        <p className="font-medium text-foreground-900">{sv.nombre}</p>
                        <p className="text-xs text-foreground-500 mt-0.5 line-clamp-1">{sv.descripcion}</p>
                      </td>
                      <td className="px-5 py-2">
                        <Badge variant="secondary" size="sm">{sv.especialidad}</Badge>
                      </td>
                      <td className="px-5 py-2">
                        <Badge variant={tipo.variant} size="sm">{tipo.label}</Badge>
                      </td>
                      <td className="px-5 py-2 text-right font-semibold text-foreground-900 whitespace-nowrap">
                        {formatPrecio(sv.precio)}
                      </td>
                      <td className="px-5 py-2 text-center text-foreground-600 whitespace-nowrap">
                        {sv.duracionMin} min
                      </td>
                      <td className="px-5 py-2 text-center">
                        <Badge variant={sv.activo ? 'success' : 'danger'} size="sm" dot>
                          {sv.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-5 py-2">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-base">
                          <button
                            onClick={() => openEdit(sv)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-foreground-700 hover:bg-secondary-100 transition-base cursor-pointer"
                            aria-label={`Editar servicio ${sv.nombre}`}
                            title="Editar"
                          >
                            <i className="ri-pencil-line text-sm" aria-hidden="true"></i>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(sv)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-red-600 hover:bg-red-500/10 transition-base cursor-pointer"
                            aria-label={`Eliminar servicio ${sv.nombre}`}
                            title="Eliminar"
                          >
                            <i className="ri-delete-bin-line text-sm" aria-hidden="true"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar Servicio' : 'Nuevo Servicio'}
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? 'Guardar Cambios' : 'Registrar Servicio'}</Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Código"
              placeholder="Ej: CONS-MG-001"
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              error={formErrors.codigo}
              maxLength={30}
              autoComplete="off"
            />
            <Select
              label="Especialidad"
              value={form.especialidadId}
              onChange={(e) => setForm({ ...form, especialidadId: e.target.value })}
              options={specialties.map((s) => ({ value: s.id, label: s.nombre }))}
              placeholder="Seleccionar"
              error={formErrors.especialidadId}
            />
            <Select
              label="Tipo de servicio"
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value as MedicalService['tipo'] })}
              options={tipoOptions}
            />
          </div>
          <Input
            label="Nombre del servicio"
            placeholder="Ej: Consulta de Medicina General"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            error={formErrors.nombre}
            maxLength={100}
            autoComplete="off"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Precio (MXN)"
              placeholder="500"
              type="number"
              min="0"
              value={form.precio}
              onChange={(e) => setForm({ ...form, precio: e.target.value })}
              error={formErrors.precio}
            />
            <Input
              label="Duración (minutos)"
              placeholder="20"
              type="number"
              min="5"
              step="5"
              value={form.duracionMin}
              onChange={(e) => setForm({ ...form, duracionMin: e.target.value })}
              error={formErrors.duracionMin}
            />
            <div className="flex flex-col gap-2 justify-end pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.requiereCita}
                  onChange={(e) => setForm({ ...form, requiereCita: e.target.checked })}
                  className="w-4 h-4 rounded border-secondary-300 text-primary-500 focus:ring-primary-400 cursor-pointer"
                />
                <span className="text-sm text-foreground-700">Requiere cita</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  className="w-4 h-4 rounded border-secondary-300 text-primary-500 focus:ring-primary-400 cursor-pointer"
                />
                <span className="text-sm text-foreground-700">Servicio activo</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground-800 mb-1.5">Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Describe el servicio, qué incluye, preparación requerida..."
              rows={3}
              maxLength={500}
              className="w-full px-3.5 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none"
              aria-invalid={!!formErrors.descripcion}
            />
            <p className="text-xs text-foreground-400 mt-1">{form.descripcion.length}/500</p>
            {formErrors.descripcion && <p className="text-2xs text-red-500 mt-1" role="alert">{formErrors.descripcion}</p>}
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar Servicio"
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
                <p className="text-sm font-medium text-red-800">¿Eliminar este servicio?</p>
                <p className="text-xs text-red-600 mt-0.5">No podrá usarse en nuevas consultas. Las citas ya agendadas no se afectan.</p>
              </div>
            </div>
            <div className="p-3 bg-background-50 rounded-lg border border-secondary-200 space-y-1">
              <p className="text-sm font-medium text-foreground-900">{deleteTarget.nombre}</p>
              <p className="text-xs text-foreground-500">
                {deleteTarget.codigo} · {formatPrecio(deleteTarget.precio)} · {deleteTarget.duracionMin} min
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}