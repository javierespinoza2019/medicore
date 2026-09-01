import { useState, useMemo } from 'react';
import { useSort } from '@/hooks/useSort';
import SortableTh from '@/components/feature/SortableTh';
import { usuarios, roleLabels, type User, type UserRole, type UserStatus } from '@/mocks/users';
import { specialties } from '@/mocks/doctors';
import { sucursales } from '@/mocks/branches';
import Button from '@/components/base/Button';
import Card from '@/components/base/Card';
import Modal from '@/components/base/Modal';
import Input from '@/components/base/Input';
import Select from '@/components/base/Select';
import Badge from '@/components/base/Badge';

const statusMap: Record<UserStatus, { label: string; variant: 'success' | 'danger' | 'warning' }> = {
  activo: { label: 'Activo', variant: 'success' },
  inactivo: { label: 'Inactivo', variant: 'danger' },
  bloqueado: { label: 'Bloqueado', variant: 'warning' },
};

const roleVariant: Record<UserRole, 'primary' | 'accent' | 'info' | 'warning' | 'secondary' | 'success'> = {
  admin: 'primary',
  medico: 'accent',
  recepcion: 'info',
  enfermeria: 'success',
  caja: 'warning',
  farmacia: 'secondary',
  laboratorio: 'info',
  directivo: 'primary',
};

/**
 * Roles that are restricted to a single branch.
 * When a user has one of these roles, they can only be assigned ONE branch.
 */
const SINGLE_BRANCH_ROLES: UserRole[] = ['recepcion', 'enfermeria', 'farmacia', 'laboratorio', 'caja'];

interface FormData {
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  rol: UserRole;
  sucursalIds: string[];
  cedulaProfesional?: string;
  especialidadId?: string;
  status: UserStatus;
}

const emptyForm: FormData = {
  nombre: '',
  apellidos: '',
  email: '',
  telefono: '',
  rol: 'recepcion',
  sucursalIds: [],
  status: 'activo',
};

export default function Usuarios() {
  const [items, setItems] = useState<User[]>(usuarios);
  const [search, setSearch] = useState('');
  const [filterRol, setFilterRol] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const isSingleBranchRole = SINGLE_BRANCH_ROLES.includes(form.rol);

  const filtered = items.filter((u) => {
    const matchSearch =
      `${u.nombre} ${u.apellidos}`.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.rolLabel.toLowerCase().includes(search.toLowerCase());
    const matchRol = filterRol === 'todos' || u.rol === filterRol;
    const matchStatus = filterStatus === 'todos' || u.status === filterStatus;
    return matchSearch && matchRol && matchStatus;
  });

  const sorters = useMemo(() => ({
    usuario: (a: User, b: User) => `${a.nombre} ${a.apellidos}`.localeCompare(`${b.nombre} ${b.apellidos}`),
    rol: (a: User, b: User) => a.rolLabel.localeCompare(b.rolLabel),
    sucursal: (a: User, b: User) => (a.sucursales[0] || '').localeCompare(b.sucursales[0] || ''),
    cedula: (a: User, b: User) => (a.cedulaProfesional || '').localeCompare(b.cedulaProfesional || ''),
    ultimoAcceso: (a: User, b: User) => a.ultimoAcceso.localeCompare(b.ultimoAcceso),
    estado: (a: User, b: User) => a.status.localeCompare(b.status),
  }), []);

  const { sortedData, sortKey, direction, toggleSort } = useSort(filtered, sorters);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (u: User) => {
    setEditingId(u.id);
    setForm({
      nombre: u.nombre,
      apellidos: u.apellidos,
      email: u.email,
      telefono: u.telefono,
      rol: u.rol,
      sucursalIds: u.sucursalIds || [],
      cedulaProfesional: u.cedulaProfesional,
      especialidadId: u.especialidadId,
      status: u.status,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleRolChange = (newRol: UserRole) => {
    const newIsSingle = SINGLE_BRANCH_ROLES.includes(newRol);
    setForm((prev) => ({
      ...prev,
      rol: newRol,
      // When switching to a single-branch role, keep at most 1 branch
      sucursalIds: newIsSingle ? prev.sucursalIds.slice(0, 1) : prev.sucursalIds,
    }));
  };

  const toggleBranch = (id: string) => {
    setForm((prev) => {
      const already = prev.sucursalIds.includes(id);
      if (already) {
        return { ...prev, sucursalIds: prev.sucursalIds.filter((s) => s !== id) };
      }
      // Single-branch roles can only have one branch
      if (isSingleBranchRole) {
        return { ...prev, sucursalIds: [id] };
      }
      return { ...prev, sucursalIds: [...prev.sucursalIds, id] };
    });
  };

  const validate = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};
    if (!form.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    else if (form.nombre.trim().length > 60) errors.nombre = 'El nombre no puede exceder 60 caracteres';
    else if (/\d/.test(form.nombre)) errors.nombre = 'El nombre no debe contener números';
    if (!form.apellidos.trim()) errors.apellidos = 'Los apellidos son obligatorios';
    else if (form.apellidos.trim().length > 60) errors.apellidos = 'Los apellidos no pueden exceder 60 caracteres';
    else if (/\d/.test(form.apellidos)) errors.apellidos = 'Los apellidos no deben contener números';
    if (!form.email.trim()) errors.email = 'El email es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Formato de email inválido';
    else if (form.email.trim().length > 100) errors.email = 'El email no puede exceder 100 caracteres';
    if (form.telefono.trim() && !/^\d{10}$/.test(form.telefono.replace(/\D/g, ''))) errors.telefono = 'Ingresa 10 dígitos';
    if (form.sucursalIds.length === 0) errors.sucursalIds = 'Selecciona al menos una sucursal';
    if (isSingleBranchRole && form.sucursalIds.length > 1) errors.sucursalIds = 'Este rol solo puede tener una sucursal';
    if (form.email.trim() && items.some((u) => u.email.toLowerCase() === form.email.trim().toLowerCase() && u.id !== editingId)) {
      errors.email = 'Ya existe un usuario con este email';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const assignedSucursales = sucursales
      .filter((s) => form.sucursalIds.includes(s.id))
      .map((s) => s.nombre);
    const esp = form.especialidadId ? specialties.find((s) => s.id === form.especialidadId) : undefined;

    if (editingId) {
      setItems((prev) =>
        prev.map((u) =>
          u.id === editingId
            ? {
                ...u,
                nombre: form.nombre.trim(),
                apellidos: form.apellidos.trim(),
                email: form.email.trim(),
                telefono: form.telefono.trim(),
                rol: form.rol,
                rolLabel: roleLabels[form.rol],
                sucursalIds: form.sucursalIds,
                sucursales: assignedSucursales,
                cedulaProfesional: form.cedulaProfesional,
                especialidadId: form.especialidadId,
                especialidad: esp?.nombre || '',
                status: form.status,
              }
            : u
        )
      );
    } else {
      const newItem: User = {
        id: `u${Date.now()}`,
        nombre: form.nombre.trim(),
        apellidos: form.apellidos.trim(),
        email: form.email.trim(),
        password: 'Temp123!',
        telefono: form.telefono.trim(),
        rol: form.rol,
        rolLabel: roleLabels[form.rol],
        sucursalIds: form.sucursalIds,
        sucursales: assignedSucursales,
        cedulaProfesional: form.cedulaProfesional,
        especialidadId: form.especialidadId,
        especialidad: esp?.nombre || '',
        ultimoAcceso: '—',
        status: form.status,
        fechaCreacion: new Date().toISOString().split('T')[0],
      };
      setItems((prev) => [...prev, newItem]);
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setItems((prev) => prev.filter((u) => u.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button icon={<i className="ri-add-line"></i>} onClick={openCreate}>
          Nuevo Usuario
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <div className="relative w-full sm:w-72">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
            <i className="ri-search-line text-sm"></i>
          </span>
          <input
            type="search"
            aria-label="Buscar usuarios"
            placeholder="Buscar por nombre, email o rol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base"
          />
        </div>
        <select
          value={filterRol}
          onChange={(e) => setFilterRol(e.target.value)}
          className="px-3 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 cursor-pointer"
        >
          <option value="todos">Todos los roles</option>
          {Object.entries(roleLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 cursor-pointer"
        >
          <option value="todos">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
          <option value="bloqueado">Bloqueados</option>
        </select>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-secondary-200 text-left">
                <SortableTh label="Usuario" sortKey="usuario" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTh label="Rol" sortKey="rol" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTh label="Sucursales" sortKey="sucursal" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTh label="Cédula / Esp." sortKey="cedula" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTh label="Último Acceso" sortKey="ultimoAcceso" activeKey={sortKey} direction={direction} onSort={toggleSort} />
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
                        <i className="ri-shield-user-line text-2xl"></i>
                      </span>
                      <p className="text-sm">No se encontraron usuarios</p>
                      {(search || filterRol !== 'todos' || filterStatus !== 'todos') && (
                        <button
                          onClick={() => { setSearch(''); setFilterRol('todos'); setFilterStatus('todos'); }}
                          className="text-xs text-primary-500 hover:text-primary-600 cursor-pointer"
                        >
                          Limpiar filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                sortedData.map((u) => {
                  const st = statusMap[u.status];
                  return (
                    <tr key={u.id} className="hover:bg-secondary-50/50 transition-base group">
                      <td className="px-5 py-2">
                        <div className="flex items-center gap-3">
                          <span className="w-9 h-9 rounded-full bg-secondary-100 text-secondary-700 flex items-center justify-center text-sm font-semibold">
                            {u.nombre.charAt(0)}{u.apellidos.charAt(0)}
                          </span>
                          <div>
                            <p className="font-medium text-foreground-900">{u.nombre} {u.apellidos}</p>
                            <p className="text-xs text-foreground-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-2">
                        <Badge variant={roleVariant[u.rol]} size="sm">{u.rolLabel}</Badge>
                      </td>
                      <td className="px-5 py-2">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {(u.sucursales || []).map((nombre, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-2xs rounded-md bg-secondary-100 text-foreground-600 whitespace-nowrap"
                              title={nombre}
                            >
                              <i className="ri-building-line text-2xs"></i>
                              <span className="max-w-[100px] truncate">{nombre.replace(' - CDMX', '')}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-2">
                        {u.cedulaProfesional ? (
                          <div className="text-xs">
                            <span className="text-foreground-600 font-mono">{u.cedulaProfesional}</span>
                            {u.especialidad && <span className="text-foreground-400 block">{u.especialidad}</span>}
                          </div>
                        ) : (
                          <span className="text-xs text-foreground-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-2 text-foreground-600 text-xs whitespace-nowrap">{u.ultimoAcceso}</td>
                      <td className="px-5 py-2 text-center">
                        <Badge variant={st.variant} size="sm" dot>{st.label}</Badge>
                      </td>
                      <td className="px-5 py-2">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-base">
                          <button
                            onClick={() => openEdit(u)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-foreground-700 hover:bg-secondary-100 transition-base cursor-pointer"
                            aria-label={`Editar usuario ${u.nombre} ${u.apellidos}`}
                            title="Editar"
                          >
                            <i className="ri-pencil-line text-sm" aria-hidden="true"></i>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(u)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-red-600 hover:bg-red-500/10 transition-base cursor-pointer"
                            aria-label={`Eliminar usuario ${u.nombre} ${u.apellidos}`}
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

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? 'Guardar Cambios' : 'Registrar Usuario'}</Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre"
              placeholder="Ej: Alejandro"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              error={formErrors.nombre}
              maxLength={60}
              autoComplete="given-name"
            />
            <Input
              label="Apellidos"
              placeholder="Ej: García Mendoza"
              value={form.apellidos}
              onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
              error={formErrors.apellidos}
              maxLength={60}
              autoComplete="family-name"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Correo electrónico"
              placeholder="usuario@medicore.mx"
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
              label="Rol"
              value={form.rol}
              onChange={(e) => handleRolChange(e.target.value as UserRole)}
              options={Object.entries(roleLabels).map(([key, label]) => ({ value: key, label }))}
            />
            <Select
              label="Estado"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as UserStatus })}
              options={[
                { value: 'activo', label: 'Activo' },
                { value: 'inactivo', label: 'Inactivo' },
                { value: 'bloqueado', label: 'Bloqueado' },
              ]}
            />
          </div>

          {/* Branch Assignment */}
          <div className="border-t border-secondary-200 pt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-foreground-800">
                Sucursales asignadas
                {!isSingleBranchRole && (
                  <span className="ml-1.5 text-xs font-normal text-foreground-500">(puede ser múltiple)</span>
                )}
              </label>
              {isSingleBranchRole && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-2xs rounded-full bg-amber-100 text-amber-700">
                  <i className="ri-information-line text-2xs"></i>
                  Solo 1 sucursal para este rol
                </span>
              )}
            </div>
            {formErrors.sucursalIds && (
              <p className="text-xs text-red-500 mb-2">{formErrors.sucursalIds}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sucursales.map((suc) => {
                const isSelected = form.sucursalIds.includes(suc.id);
                const isDisabled = isSingleBranchRole && !isSelected && form.sucursalIds.length > 0;
                return (
                  <button
                    key={suc.id}
                    type="button"
                    onClick={() => !isDisabled && toggleBranch(suc.id)}
                    disabled={isDisabled}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-sm text-left transition-base cursor-pointer ${
                      isSelected
                        ? 'bg-primary-50 border-primary-300 text-primary-800'
                        : isDisabled
                          ? 'bg-secondary-50/50 border-secondary-200/50 text-foreground-400 cursor-not-allowed opacity-50'
                          : 'bg-background-50 border-secondary-200 text-foreground-700 hover:border-primary-200 hover:bg-primary-50/30'
                    }`}
                  >
                    <span className={`w-5 h-5 flex items-center justify-center flex-shrink-0 rounded-md ${isSelected ? 'bg-primary-100 text-primary-600' : 'bg-secondary-100 text-foreground-400'}`}>
                      <i className={`${isSelected ? 'ri-check-line' : 'ri-building-line'} text-xs`}></i>
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">{suc.nombre}</p>
                      <p className="text-2xs text-foreground-400 truncate">{suc.ciudad} · {suc.estado}</p>
                    </div>
                    {!suc.activo && (
                      <span className="ml-auto flex-shrink-0 text-2xs text-foreground-400 bg-secondary-100 rounded-full px-1.5 py-0.5">Inactiva</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {form.rol === 'medico' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-secondary-200 pt-4">
              <Input
                label="Cédula profesional"
                placeholder="CED-12345678"
                value={form.cedulaProfesional || ''}
                onChange={(e) => setForm({ ...form, cedulaProfesional: e.target.value })}
                maxLength={30}
                autoComplete="off"
              />
              <Select
                label="Especialidad"
                value={form.especialidadId || ''}
                onChange={(e) => setForm({ ...form, especialidadId: e.target.value || undefined })}
                options={specialties.map((s) => ({ value: s.id, label: s.nombre }))}
                placeholder="Seleccionar especialidad"
              />
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar Usuario"
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
                <p className="text-sm font-medium text-red-800">¿Eliminar este usuario?</p>
                <p className="text-xs text-red-600 mt-0.5">El usuario perderá acceso al sistema. Su registro en auditoría se conserva.</p>
              </div>
            </div>
            <div className="p-3 bg-background-50 rounded-lg border border-secondary-200">
              <p className="text-sm font-medium text-foreground-900">{deleteTarget.nombre} {deleteTarget.apellidos}</p>
              <p className="text-xs text-foreground-500">{deleteTarget.rolLabel} · {(deleteTarget.sucursales || []).join(', ')}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}