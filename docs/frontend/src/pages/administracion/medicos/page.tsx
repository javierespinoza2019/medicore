import { useState, useMemo, useRef, useEffect } from 'react';
import { useSort } from '@/hooks/useSort';
import SortableTh from '@/components/feature/SortableTh';
import { doctors, specialties, type Doctor } from '@/mocks/doctors';
import { sucursales } from '@/mocks/branches';
import Button from '@/components/base/Button';
import Card from '@/components/base/Card';
import Modal from '@/components/base/Modal';
import Input from '@/components/base/Input';
import Select from '@/components/base/Select';
import Badge from '@/components/base/Badge';
import { getDoctorSignature, setDoctorSignature, removeDoctorSignature } from '@/utils/appSettings';
import { useDoctorSignature } from '@/hooks/useAppSettings';
import { fileToResizedDataUrl } from '@/utils/imageUtils';

interface DoctorExtended extends Doctor {
  sucursalId: string;
  sucursal: string;
  especialidadId: string;
  horarioInicio: string;
  horarioFin: string;
}

const initialDoctors: DoctorExtended[] = doctors.map((d, i) => ({
  ...d,
  sucursalId: i < 4 ? 'suc1' : 'suc2',
  sucursal: i < 4 ? 'Clínica Central - CDMX' : 'Sucursal Norte - CDMX',
  especialidadId: ['s1', 's2', 's3', 's4', 's1'][i] || 's1',
  horarioInicio: '08:00',
  horarioFin: '16:00',
}));

const statusMap: Record<Doctor['status'], { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  activo: { label: 'Activo', variant: 'success' },
  inactivo: { label: 'Inactivo', variant: 'danger' },
  vacaciones: { label: 'Vacaciones', variant: 'warning' },
};

interface FormData {
  nombre: string;
  especialidadId: string;
  cedula: string;
  email: string;
  telefono: string;
  consultorio: string;
  sucursalId: string;
  horarioInicio: string;
  horarioFin: string;
  status: Doctor['status'];
}

const emptyForm: FormData = {
  nombre: '',
  especialidadId: '',
  cedula: '',
  email: '',
  telefono: '',
  consultorio: '',
  sucursalId: '',
  horarioInicio: '08:00',
  horarioFin: '16:00',
  status: 'activo',
};

function FirmaIndicador({ doctorId }: { doctorId: string }) {
  const firma = useDoctorSignature(doctorId);
  if (!firma) return null;
  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-600"
      title="Firma digital cargada"
    >
      <i className="ri-pen-nib-line text-[10px]"></i>
    </span>
  );
}

export default function Medicos() {
  const [items, setItems] = useState<DoctorExtended[]>(initialDoctors);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterEspecialidad, setFilterEspecialidad] = useState<string>('todas');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<DoctorExtended | null>(null);
  const [firma, setFirma] = useState<string | null>(null);
  const [firmaError, setFirmaError] = useState('');
  const firmaInputRef = useRef<HTMLInputElement>(null);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const filtered = items.filter((d) => {
    const matchSearch =
      d.nombre.toLowerCase().includes(search.toLowerCase()) ||
      d.cedula.toLowerCase().includes(search.toLowerCase()) ||
      d.especialidad.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'todos' || d.status === filterStatus;
    const matchEsp = filterEspecialidad === 'todas' || d.especialidadId === filterEspecialidad;
    return matchSearch && matchStatus && matchEsp;
  });

  const sorters = useMemo(() => ({
    medico: (a: DoctorExtended, b: DoctorExtended) => a.nombre.localeCompare(b.nombre),
    especialidad: (a: DoctorExtended, b: DoctorExtended) => a.especialidad.localeCompare(b.especialidad),
    cedula: (a: DoctorExtended, b: DoctorExtended) => a.cedula.localeCompare(b.cedula),
    sucursal: (a: DoctorExtended, b: DoctorExtended) => a.sucursal.localeCompare(b.sucursal),
    consultorio: (a: DoctorExtended, b: DoctorExtended) => a.consultorio.localeCompare(b.consultorio),
    estado: (a: DoctorExtended, b: DoctorExtended) => a.status.localeCompare(b.status),
  }), []);

  const { sortedData, sortKey, direction, toggleSort } = useSort(filtered, sorters);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormErrors({});
    setFirma(null);
    setFirmaError('');
    setModalOpen(true);
  };

  const openEdit = (d: DoctorExtended) => {
    setEditingId(d.id);
    setForm({
      nombre: d.nombre,
      especialidadId: d.especialidadId,
      cedula: d.cedula,
      email: d.email,
      telefono: d.telefono,
      consultorio: d.consultorio,
      sucursalId: d.sucursalId,
      horarioInicio: d.horarioInicio,
      horarioFin: d.horarioFin,
      status: d.status,
    });
    setFormErrors({});
    setFirma(getDoctorSignature(d.id));
    setFirmaError('');
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};
    if (!form.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    else if (form.nombre.trim().length > 100) errors.nombre = 'El nombre no puede exceder 100 caracteres';
    if (!form.especialidadId) errors.especialidadId = 'Selecciona una especialidad';
    if (!form.cedula.trim()) errors.cedula = 'La cédula profesional es obligatoria';
    else if (form.cedula.trim().length > 30) errors.cedula = 'La cédula no puede exceder 30 caracteres';
    if (!form.email.trim()) errors.email = 'El email es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Formato de email inválido';
    else if (form.email.trim().length > 100) errors.email = 'El email no puede exceder 100 caracteres';
    if (!form.telefono.trim()) errors.telefono = 'El teléfono es obligatorio';
    else if (!/^\d{10}$/.test(form.telefono.replace(/\D/g, ''))) errors.telefono = 'Ingresa 10 dígitos';
    if (!form.consultorio.trim()) errors.consultorio = 'El consultorio es obligatorio';
    else if (form.consultorio.trim().length > 50) errors.consultorio = 'El consultorio no puede exceder 50 caracteres';
    if (!form.sucursalId) errors.sucursalId = 'Selecciona una sucursal';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFirmaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToResizedDataUrl(file, 400);
      setFirma(dataUrl);
      setFirmaError('');
    } catch (err) {
      setFirmaError(err instanceof Error ? err.message : 'No se pudo cargar la firma.');
    } finally {
      if (firmaInputRef.current) firmaInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    if (!validate()) return;

    const esp = specialties.find((s) => s.id === form.especialidadId);
    const suc = sucursales.find((s) => s.id === form.sucursalId);

    if (editingId) {
      setItems((prev) =>
        prev.map((d) =>
          d.id === editingId
            ? {
                ...d,
                nombre: form.nombre.trim(),
                especialidad: esp?.nombre || d.especialidad,
                especialidadId: form.especialidadId,
                cedula: form.cedula.trim(),
                email: form.email.trim(),
                telefono: form.telefono.trim(),
                consultorio: form.consultorio.trim(),
                sucursalId: form.sucursalId,
                sucursal: suc?.nombre || d.sucursal,
                horarioInicio: form.horarioInicio,
                horarioFin: form.horarioFin,
                status: form.status,
              }
            : d
        )
      );
      if (firma) setDoctorSignature(editingId, firma);
      else removeDoctorSignature(editingId);
    } else {
      const newId = `d${Date.now()}`;
      const newItem: DoctorExtended = {
        id: newId,
        nombre: form.nombre.trim(),
        especialidad: esp?.nombre || '',
        especialidadId: form.especialidadId,
        cedula: form.cedula.trim(),
        email: form.email.trim(),
        telefono: form.telefono.trim(),
        consultorio: form.consultorio.trim(),
        sucursalId: form.sucursalId,
        sucursal: suc?.nombre || '',
        horarioInicio: form.horarioInicio,
        horarioFin: form.horarioFin,
        status: form.status,
        color: 'primary',
      };
      setItems((prev) => [...prev, newItem]);
      if (firma) setDoctorSignature(newId, firma);
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setItems((prev) => prev.filter((d) => d.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const sucursalOptions = sucursales.map((s) => ({ value: s.id, label: s.nombre }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button icon={<i className="ri-add-line"></i>} onClick={openCreate}>
          Nuevo Médico
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <div className="relative w-full sm:w-72">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
            <i className="ri-search-line text-sm"></i>
          </span>
          <input
            type="search"
            aria-label="Buscar médicos"
            placeholder="Buscar por nombre, cédula o especialidad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 cursor-pointer"
        >
          <option value="todos">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
          <option value="vacaciones">Vacaciones</option>
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
                <SortableTh label="Médico" sortKey="medico" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTh label="Especialidad" sortKey="especialidad" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTh label="Cédula" sortKey="cedula" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTh label="Sucursal" sortKey="sucursal" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTh label="Consultorio" sortKey="consultorio" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTh label="Estado" sortKey="estado" activeKey={sortKey} direction={direction} onSort={toggleSort} align="center" />
                <th className="px-5 py-2 text-xs font-semibold text-foreground-500 uppercase tracking-wider w-24 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-foreground-400">
                    <div className="flex flex-col items-center gap-2">
                      <span className="w-10 h-10 flex items-center justify-center">
                        <i className="ri-user-star-line text-2xl"></i>
                      </span>
                      <p className="text-sm">No se encontraron médicos</p>
                      {(search || filterStatus !== 'todos' || filterEspecialidad !== 'todas') && (
                        <button
                          onClick={() => { setSearch(''); setFilterStatus('todos'); setFilterEspecialidad('todas'); }}
                          className="text-xs text-primary-500 hover:text-primary-600 cursor-pointer"
                        >
                          Limpiar filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                sortedData.map((d) => {
                  const st = statusMap[d.status];
                  return (
                    <tr key={d.id} className="hover:bg-secondary-50/50 transition-base group">
                      <td className="px-5 py-2">
                        <div className="flex items-center gap-3">
                          <span className="w-9 h-9 rounded-full bg-secondary-100 text-secondary-700 flex items-center justify-center text-sm font-semibold">
                            {d.nombre.charAt(0)}
                          </span>
                          <div>
                            <p className="font-medium text-foreground-900 flex items-center gap-1.5">{d.nombre}<FirmaIndicador doctorId={d.id} /></p>
                            <p className="text-xs text-foreground-500">{d.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-2">
                        <Badge variant="secondary">{d.especialidad}</Badge>
                      </td>
                      <td className="px-5 py-2 text-foreground-600 font-mono text-xs">{d.cedula}</td>
                      <td className="px-5 py-2 text-foreground-600 text-xs">{d.sucursal}</td>
                      <td className="px-5 py-2 text-foreground-600">{d.consultorio}</td>
                      <td className="px-5 py-2 text-center">
                        <Badge variant={st.variant} dot>{st.label}</Badge>
                      </td>
                      <td className="px-5 py-2">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-base">
                          <button
                            onClick={() => openEdit(d)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-foreground-700 hover:bg-secondary-100 transition-base cursor-pointer"
                            aria-label={`Editar médico ${d.nombre}`}
                            title="Editar"
                          >
                            <i className="ri-pencil-line text-sm" aria-hidden="true"></i>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(d)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-red-600 hover:bg-red-500/10 transition-base cursor-pointer"
                            aria-label={`Eliminar médico ${d.nombre}`}
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
        title={editingId ? 'Editar Médico' : 'Nuevo Médico'}
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? 'Guardar Cambios' : 'Registrar Médico'}</Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre completo"
              placeholder="Ej: Dr. Alejandro García Mendoza"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              error={formErrors.nombre}
              maxLength={100}
              autoComplete="name"
            />
            <Select
              label="Especialidad"
              value={form.especialidadId}
              onChange={(e) => setForm({ ...form, especialidadId: e.target.value })}
              options={specialties.map((s) => ({ value: s.id, label: s.nombre }))}
              placeholder="Seleccionar especialidad"
              error={formErrors.especialidadId}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Cédula profesional"
              placeholder="Ej: CED-12345678"
              value={form.cedula}
              onChange={(e) => setForm({ ...form, cedula: e.target.value })}
              error={formErrors.cedula}
              maxLength={30}
              autoComplete="off"
            />
            <Input
              label="Correo electrónico"
              placeholder="doctor@medicore.mx"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={formErrors.email}
              maxLength={100}
              autoComplete="email"
            />
            <Input
              label="Teléfono"
              placeholder="55-1234-5678"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              error={formErrors.telefono}
              maxLength={20}
              autoComplete="tel"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Sucursal"
              value={form.sucursalId}
              onChange={(e) => setForm({ ...form, sucursalId: e.target.value })}
              options={sucursalOptions}
              placeholder="Seleccionar sucursal"
              error={formErrors.sucursalId}
            />
            <Input
              label="Consultorio"
              placeholder="Ej: Consultorio 101"
              value={form.consultorio}
              onChange={(e) => setForm({ ...form, consultorio: e.target.value })}
              error={formErrors.consultorio}
              maxLength={50}
              autoComplete="off"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Horario inicio"
              type="time"
              value={form.horarioInicio}
              onChange={(e) => setForm({ ...form, horarioInicio: e.target.value })}
            />
            <Input
              label="Horario fin"
              type="time"
              value={form.horarioFin}
              onChange={(e) => setForm({ ...form, horarioFin: e.target.value })}
            />
            <Select
              label="Estado"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as Doctor['status'] })}
              options={[
                { value: 'activo', label: 'Activo' },
                { value: 'inactivo', label: 'Inactivo' },
                { value: 'vacaciones', label: 'Vacaciones' },
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground-800 mb-2">Firma digital</label>
            <div className="flex items-center gap-4">
              <div className="w-32 h-20 rounded-lg border border-secondary-200 bg-secondary-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                {firma ? (
                  <img src={firma} alt="Firma digital" className="w-full h-full object-contain" />
                ) : (
                  <i className="ri-pen-nib-line text-xl text-foreground-400"></i>
                )}
              </div>
              <div className="space-y-2">
                <input
                  ref={firmaInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFirmaSelect}
                  className="hidden"
                />
                <Button size="sm" variant="secondary" icon={<i className="ri-upload-cloud-line"></i>} onClick={() => firmaInputRef.current?.click()}>
                  {firma ? 'Cambiar firma' : 'Subir firma'}
                </Button>
                {firma && (
                  <Button size="sm" variant="ghost" onClick={() => setFirma(null)}>
                    Quitar
                  </Button>
                )}
              </div>
            </div>
            <p className="text-2xs text-foreground-400 mt-2">Se mostrará en los reportes que lleven la firma del médico.</p>
            {firmaError && <p className="text-xs text-red-500 mt-1">{firmaError}</p>}
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar Médico"
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
                <p className="text-sm font-medium text-red-800">¿Eliminar este médico?</p>
                <p className="text-xs text-red-600 mt-0.5">Sus citas programadas no se eliminarán, pero quedarán sin médico asignado.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-background-50 rounded-lg border border-secondary-200">
              <span className="w-9 h-9 rounded-full bg-secondary-100 text-secondary-700 flex items-center justify-center text-sm font-semibold">
                {deleteTarget.nombre.charAt(0)}
              </span>
              <div>
                <p className="text-sm font-medium text-foreground-900">{deleteTarget.nombre}</p>
                <p className="text-xs text-foreground-500">{deleteTarget.especialidad} — {deleteTarget.cedula}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}