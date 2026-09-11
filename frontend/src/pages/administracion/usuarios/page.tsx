/**
 * Usuarios del tenant — UI alineada al prototipo Readdy / docs/frontend.
 * Contrato: /api/users (canAdminUsers). Matriz de roles: Seguridad → Roles.
 * Cédula/especialidad: solo si hay profesional ligado (Administración → Médicos).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSort } from '@/hooks/useSort';
import SortableTh from '@/components/feature/SortableTh';
import {
  createUser,
  formatLastAccess,
  listUsers,
  setUserPassword,
  softDeleteUser,
  updateUser,
  userInitials,
  type TenantUserDto,
  type TenantUserStatus,
} from '@/api/users';
import { listBranches, type BranchDto } from '@/api/branches';
import { getPermissionMatrix } from '@/api/roles';
import { mensajeDeFalla } from '@/api/errors';
import Button from '@/components/base/Button';
import Card from '@/components/base/Card';
import Modal from '@/components/base/Modal';
import Input from '@/components/base/Input';
import Select from '@/components/base/Select';
import Badge from '@/components/base/Badge';
import CargandoPantalla from '@/components/feature/CargandoPantalla';

type BadgeVariant = 'primary' | 'accent' | 'info' | 'warning' | 'secondary' | 'success' | 'danger';

const STATUS_MAP: Record<
  TenantUserStatus,
  { label: string; variant: 'success' | 'danger' | 'warning' }
> = {
  activo: { label: 'Activo', variant: 'success' },
  inactivo: { label: 'Inactivo', variant: 'danger' },
  bloqueado: { label: 'Bloqueado', variant: 'warning' },
};

const ROLE_VARIANT: Record<string, BadgeVariant> = {
  admin: 'primary',
  medico: 'accent',
  recepcion: 'info',
  enfermeria: 'success',
  caja: 'warning',
  farmacia: 'secondary',
  laboratorio: 'info',
  directivo: 'primary',
  trabajo_social: 'info',
};

/** Roles con una sola sucursal (prototipo). */
const SINGLE_BRANCH_ROLES = new Set([
  'recepcion',
  'enfermeria',
  'farmacia',
  'laboratorio',
  'caja',
]);

interface FormData {
  nombre: string;
  apellidos: string;
  /** Acceso / correo → UserName en API. */
  email: string;
  password: string;
  status: TenantUserStatus;
  /** Rol principal (prototipo = un select; se envía como roleCodes de un elemento). */
  rol: string;
  branchIds: string[];
}

const emptyForm: FormData = {
  nombre: '',
  apellidos: '',
  email: '',
  password: '',
  status: 'activo',
  rol: 'recepcion',
  branchIds: [],
};

function resolveStatus(u: TenantUserDto): TenantUserStatus {
  if (u.status === 'activo' || u.status === 'inactivo' || u.status === 'bloqueado') return u.status;
  if (u.isLockedOut) return 'bloqueado';
  return u.isActive ? 'activo' : 'inactivo';
}

function splitDisplayName(displayName: string): { nombre: string; apellidos: string } {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { nombre: '', apellidos: '' };
  if (parts.length === 1) return { nombre: parts[0], apellidos: '' };
  return { nombre: parts[0], apellidos: parts.slice(1).join(' ') };
}

function composeDisplayName(nombre: string, apellidos: string): string {
  return `${nombre.trim()} ${apellidos.trim()}`.trim();
}

export default function AdminUsuarios() {
  const [items, setItems] = useState<TenantUserDto[]>([]);
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [roleOptions, setRoleOptions] = useState<{ code: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterRol, setFilterRol] = useState('todos');
  const [filterStatus, setFilterStatus] = useState<'todos' | TenantUserStatus>('todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<TenantUserDto | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [formFieldErrors, setFormFieldErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TenantUserDto | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<TenantUserDto | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const editingId = editingUser?.userId ?? null;

  const roleName = useCallback(
    (code: string) => roleOptions.find((r) => r.code.toLowerCase() === code.toLowerCase())?.name ?? code,
    [roleOptions],
  );

  const branchName = useCallback(
    (id: string) => {
      const b = branches.find((x) => x.branchId.toLowerCase() === id.toLowerCase());
      return b?.name || b?.code || id.slice(0, 8);
    },
    [branches],
  );

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [usersRes, branchesRes, matrixRes] = await Promise.all([
      listUsers(false),
      listBranches(true),
      getPermissionMatrix(),
    ]);
    if (!usersRes.success || !usersRes.data) {
      setError(usersRes.message ?? mensajeDeFalla(usersRes.failure).titulo);
      setLoading(false);
      return;
    }
    if (!branchesRes.success || !branchesRes.data) {
      setError(branchesRes.message ?? mensajeDeFalla(branchesRes.failure).titulo);
      setLoading(false);
      return;
    }
    if (!matrixRes.success || !matrixRes.data) {
      setError(matrixRes.message ?? mensajeDeFalla(matrixRes.failure).titulo);
      setLoading(false);
      return;
    }
    setItems(usersRes.data);
    setBranches(branchesRes.data);
    setRoleOptions(
      matrixRes.data.templates
        .filter((t) => t.roleCode.toLowerCase() !== 'superadmin')
        .map((t) => ({ code: t.roleCode, name: t.name })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const filtered = items.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      u.userName.toLowerCase().includes(q) ||
      u.displayName.toLowerCase().includes(q) ||
      u.roleCodes.some((r) => r.toLowerCase().includes(q) || roleName(r).toLowerCase().includes(q));
    const st = resolveStatus(u);
    const matchRol = filterRol === 'todos' || u.roleCodes.some((r) => r.toLowerCase() === filterRol.toLowerCase());
    const matchStatus = filterStatus === 'todos' || st === filterStatus;
    return matchSearch && matchRol && matchStatus;
  });

  const sorters = useMemo(
    () => ({
      usuario: (a: TenantUserDto, b: TenantUserDto) => a.displayName.localeCompare(b.displayName),
      rol: (a: TenantUserDto, b: TenantUserDto) =>
        (a.roleCodes[0] || '').localeCompare(b.roleCodes[0] || ''),
      sucursal: (a: TenantUserDto, b: TenantUserDto) =>
        branchName(a.branchIds[0] || '').localeCompare(branchName(b.branchIds[0] || '')),
      cedula: (a: TenantUserDto, b: TenantUserDto) =>
        (a.professionalLicense || '').localeCompare(b.professionalLicense || ''),
      ultimoAcceso: (a: TenantUserDto, b: TenantUserDto) =>
        (a.lastAccessUtc || '').localeCompare(b.lastAccessUtc || ''),
      estado: (a: TenantUserDto, b: TenantUserDto) => resolveStatus(a).localeCompare(resolveStatus(b)),
    }),
    [branchName],
  );
  const { sortedData, sortKey, direction, toggleSort } = useSort(filtered, sorters, 'usuario');

  const isSingleBranchRole = SINGLE_BRANCH_ROLES.has(form.rol.toLowerCase());

  const openCreate = () => {
    setEditingUser(null);
    setForm({
      ...emptyForm,
      rol: roleOptions.find((r) => r.code.toLowerCase() === 'recepcion')?.code ?? roleOptions[0]?.code ?? 'recepcion',
    });
    setFormError(null);
    setFormFieldErrors({});
    setModalOpen(true);
  };

  const openEdit = (u: TenantUserDto) => {
    const { nombre, apellidos } = splitDisplayName(u.displayName);
    setEditingUser(u);
    setForm({
      nombre,
      apellidos,
      email: u.userName,
      password: '',
      status: resolveStatus(u),
      rol: u.roleCodes[0] || roleOptions[0]?.code || 'recepcion',
      branchIds: [...u.branchIds],
    });
    setFormError(null);
    setFormFieldErrors({});
    setModalOpen(true);
  };

  const handleRolChange = (newRol: string) => {
    const single = SINGLE_BRANCH_ROLES.has(newRol.toLowerCase());
    setForm((prev) => ({
      ...prev,
      rol: newRol,
      branchIds: single ? prev.branchIds.slice(0, 1) : prev.branchIds,
    }));
  };

  const toggleBranch = (id: string) => {
    setForm((prev) => {
      const already = prev.branchIds.some((b) => b.toLowerCase() === id.toLowerCase());
      if (already) {
        return { ...prev, branchIds: prev.branchIds.filter((b) => b.toLowerCase() !== id.toLowerCase()) };
      }
      if (SINGLE_BRANCH_ROLES.has(prev.rol.toLowerCase())) return { ...prev, branchIds: [id] };
      return { ...prev, branchIds: [...prev.branchIds, id] };
    });
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};
    if (!form.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    else if (/\d/.test(form.nombre)) errors.nombre = 'El nombre no debe contener números';
    if (!form.apellidos.trim()) errors.apellidos = 'Los apellidos son obligatorios';
    else if (/\d/.test(form.apellidos)) errors.apellidos = 'Los apellidos no deben contener números';
    if (!form.email.trim()) errors.email = 'El correo / acceso es obligatorio';
    else if (form.email.trim().length < 3) errors.email = 'Mínimo 3 caracteres';
    if (!editingId && (!form.password || form.password.length < 8)) {
      errors.password = 'La contraseña debe tener al menos 8 caracteres';
    }
    if (!form.rol) errors.rol = 'Seleccione un rol';
    if (form.branchIds.length === 0) errors.branchIds = 'Selecciona al menos una sucursal';
    if (isSingleBranchRole && form.branchIds.length > 1) {
      errors.branchIds = 'Este rol solo puede tener una sucursal';
    }
    setFormFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const save = async () => {
    setFormError(null);
    if (!validateForm()) return;

    const displayName = composeDisplayName(form.nombre, form.apellidos);
    const roleCodes = [form.rol];
    setSaving(true);
    if (editingId) {
      const res = await updateUser(editingId, {
        displayName,
        status: form.status,
        isActive: form.status !== 'inactivo',
        roleCodes,
        branchIds: form.branchIds,
      });
      setSaving(false);
      if (!res.success) {
        setFormError(res.message ?? mensajeDeFalla(res.failure).titulo);
        return;
      }
    } else {
      const res = await createUser({
        userName: form.email.trim(),
        displayName,
        password: form.password,
        isActive: form.status !== 'inactivo',
        roleCodes,
        branchIds: form.branchIds,
      });
      setSaving(false);
      if (!res.success) {
        setFormError(res.message ?? mensajeDeFalla(res.failure).titulo);
        return;
      }
      if (form.status === 'bloqueado' && res.data) {
        await updateUser(res.data.userId, {
          displayName,
          status: 'bloqueado',
          isActive: true,
          roleCodes,
          branchIds: form.branchIds,
        });
      }
    }
    setModalOpen(false);
    await cargar();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    const res = await softDeleteUser(deleteTarget.userId);
    setSaving(false);
    if (!res.success) {
      setError(res.message ?? mensajeDeFalla(res.failure).titulo);
      setDeleteTarget(null);
      return;
    }
    setDeleteTarget(null);
    await cargar();
  };

  const confirmPassword = async () => {
    if (!passwordTarget) return;
    if (!newPassword || newPassword.length < 8) {
      setFormError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setSaving(true);
    const res = await setUserPassword(passwordTarget.userId, newPassword);
    setSaving(false);
    if (!res.success) {
      setFormError(res.message ?? mensajeDeFalla(res.failure).titulo);
      return;
    }
    setPasswordTarget(null);
    setNewPassword('');
    setFormError(null);
  };

  if (loading) return <CargandoPantalla />;

  return (
    <div className="space-y-6" data-testid="page-admin-usuarios">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground-900 font-heading">Usuarios</h1>
          <p className="text-sm text-foreground-500 mt-0.5">Usuarios y permisos del sistema</p>
        </div>
        <Button
          variant="primary"
          icon={<i className="ri-add-line" aria-hidden />}
          onClick={openCreate}
          data-testid="usuarios-nuevo"
        >
          Nuevo Usuario
        </Button>
      </div>

      {error && (
        <Card padding="md" className="border-danger-200 bg-danger-50/40">
          <p className="text-sm text-danger-800">{error}</p>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-wrap">
        <div className="relative w-full sm:w-72 min-w-0">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 pointer-events-none">
            <i className="ri-search-line text-sm" aria-hidden />
          </span>
          <input
            type="search"
            aria-label="Buscar usuarios"
            placeholder="Buscar por nombre, email o rol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            data-testid="usuarios-search"
          />
        </div>
        <select
          value={filterRol}
          onChange={(e) => setFilterRol(e.target.value)}
          aria-label="Filtrar por rol"
          className="px-3 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg outline-none focus:border-primary-400 cursor-pointer"
        >
          <option value="todos">Todos los roles</option>
          {roleOptions.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          aria-label="Filtrar por estado"
          className="px-3 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg outline-none focus:border-primary-400 cursor-pointer"
        >
          <option value="todos">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
          <option value="bloqueado">Bloqueados</option>
        </select>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="usuarios-table">
            <thead>
              <tr className="border-b border-secondary-200 text-left">
                <SortableTh label="Usuario" sortKey="usuario" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTh label="Rol" sortKey="rol" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTh label="Sucursales" sortKey="sucursal" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTh label="Cédula / Esp." sortKey="cedula" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTh label="Último Acceso" sortKey="ultimoAcceso" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTh label="Estado" sortKey="estado" activeKey={sortKey} direction={direction} onSort={toggleSort} align="center" />
                <th className="px-5 py-2 text-xs font-semibold text-foreground-500 uppercase tracking-wider w-28 text-center">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-foreground-400">
                    <div className="flex flex-col items-center gap-2">
                      <i className="ri-shield-user-line text-2xl" aria-hidden />
                      <p className="text-sm">No se encontraron usuarios</p>
                      {(search || filterRol !== 'todos' || filterStatus !== 'todos') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearch('');
                            setFilterRol('todos');
                            setFilterStatus('todos');
                          }}
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
                  const st = STATUS_MAP[resolveStatus(u)];
                  return (
                    <tr key={u.userId} className="hover:bg-secondary-50/50 transition-base group">
                      <td className="px-5 py-2">
                        <div className="flex items-center gap-3">
                          <span className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                            {userInitials(u.displayName)}
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground-900 truncate">{u.displayName}</p>
                            <p className="text-xs text-foreground-500 truncate">{u.userName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-2">
                        <div className="flex flex-wrap gap-1">
                          {u.roleCodes.map((code) => (
                            <Badge
                              key={code}
                              size="sm"
                              variant={ROLE_VARIANT[code.toLowerCase()] ?? 'secondary'}
                            >
                              {roleName(code)}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-2">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {u.branchIds.length === 0 ? (
                            <span className="text-xs text-foreground-400">—</span>
                          ) : (
                            u.branchIds.map((id) => (
                              <span
                                key={id}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-2xs rounded-md bg-secondary-100 text-foreground-600 whitespace-nowrap"
                                title={branchName(id)}
                              >
                                <i className="ri-building-line text-2xs" aria-hidden />
                                <span className="max-w-[110px] truncate">{branchName(id)}</span>
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-2">
                        {u.professionalLicense ? (
                          <div className="text-xs">
                            <span className="text-foreground-600 font-mono">{u.professionalLicense}</span>
                            {u.specialtyName && (
                              <span className="text-foreground-400 block">{u.specialtyName}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-foreground-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-2 text-foreground-600 text-xs whitespace-nowrap">
                        {formatLastAccess(u.lastAccessUtc)}
                      </td>
                      <td className="px-5 py-2 text-center">
                        <Badge variant={st.variant} size="sm" dot>
                          {st.label}
                        </Badge>
                      </td>
                      <td className="px-5 py-2">
                        <div className="flex items-center justify-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-base">
                          <button
                            type="button"
                            onClick={() => openEdit(u)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-foreground-700 hover:bg-secondary-100 cursor-pointer"
                            aria-label={`Editar usuario ${u.displayName}`}
                            title="Editar"
                          >
                            <i className="ri-pencil-line text-sm" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPasswordTarget(u);
                              setNewPassword('');
                              setFormError(null);
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-primary-700 hover:bg-primary-50 cursor-pointer"
                            aria-label={`Contraseña de ${u.displayName}`}
                            title="Contraseña"
                          >
                            <i className="ri-lock-password-line text-sm" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(u)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-red-600 hover:bg-red-500/10 cursor-pointer"
                            aria-label={`Dar de baja a ${u.displayName}`}
                            title="Baja"
                          >
                            <i className="ri-delete-bin-line text-sm" aria-hidden />
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
        title={editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
        size="lg"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => void save()} disabled={saving} data-testid="usuarios-guardar">
              {saving ? 'Guardando…' : editingId ? 'Guardar Cambios' : 'Registrar Usuario'}
            </Button>
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
              error={formFieldErrors.nombre}
              maxLength={60}
              autoComplete="given-name"
              data-testid="usuarios-nombre"
            />
            <Input
              label="Apellidos"
              placeholder="Ej: García Mendoza"
              value={form.apellidos}
              onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
              error={formFieldErrors.apellidos}
              maxLength={60}
              autoComplete="family-name"
              data-testid="usuarios-apellidos"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Correo electrónico"
              placeholder="usuario@medicore.mx"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={formFieldErrors.email}
              disabled={!!editingId}
              maxLength={128}
              autoComplete="email"
              data-testid="usuarios-username"
            />
            <Input
              label="Teléfono"
              placeholder="55-1234-5678"
              value=""
              disabled
              hint="Aún no se almacena en la cuenta de acceso (no se inventa)."
            />
          </div>
          {!editingId && (
            <Input
              label="Contraseña inicial"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              error={formFieldErrors.password}
              data-testid="usuarios-password"
            />
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Rol"
              value={form.rol}
              onChange={(e) => handleRolChange(e.target.value)}
              options={roleOptions.map((r) => ({ value: r.code, label: r.name }))}
              error={formFieldErrors.rol}
              data-testid="usuarios-rol"
            />
            <Select
              label="Estado"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as TenantUserStatus })}
              options={[
                { value: 'activo', label: 'Activo' },
                { value: 'inactivo', label: 'Inactivo' },
                { value: 'bloqueado', label: 'Bloqueado' },
              ]}
              data-testid="usuarios-estado"
            />
          </div>

          <div className="border-t border-secondary-200 pt-4">
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
              <label className="text-sm font-medium text-foreground-800">
                Sucursales asignadas
                {!isSingleBranchRole && (
                  <span className="ml-1.5 text-xs font-normal text-foreground-500">(puede ser múltiple)</span>
                )}
              </label>
              {isSingleBranchRole && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-2xs rounded-full bg-amber-100 text-amber-700">
                  <i className="ri-information-line text-2xs" aria-hidden />
                  Solo 1 sucursal para este rol
                </span>
              )}
            </div>
            {formFieldErrors.branchIds && (
              <p className="text-xs text-red-500 mb-2">{formFieldErrors.branchIds}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-testid="usuarios-branches">
              {branches.map((b) => {
                const isSelected = form.branchIds.some(
                  (id) => id.toLowerCase() === b.branchId.toLowerCase(),
                );
                const isDisabled = isSingleBranchRole && !isSelected && form.branchIds.length > 0;
                const place = [b.addressMunicipality, b.addressState].filter(Boolean).join(' · ');
                return (
                  <button
                    key={b.branchId}
                    type="button"
                    onClick={() => !isDisabled && toggleBranch(b.branchId)}
                    disabled={isDisabled}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-sm text-left transition-base cursor-pointer ${
                      isSelected
                        ? 'bg-primary-50 border-primary-300 text-primary-800'
                        : isDisabled
                          ? 'bg-secondary-50/50 border-secondary-200/50 text-foreground-400 cursor-not-allowed opacity-50'
                          : 'bg-background-50 border-secondary-200 text-foreground-700 hover:border-primary-200 hover:bg-primary-50/30'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 flex items-center justify-center flex-shrink-0 rounded-md ${
                        isSelected ? 'bg-primary-100 text-primary-600' : 'bg-secondary-100 text-foreground-400'
                      }`}
                    >
                      <i className={`${isSelected ? 'ri-check-line' : 'ri-building-line'} text-xs`} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">{b.name || b.code}</p>
                      <p className="text-2xs text-foreground-400 truncate">
                        {place || b.code || '—'}
                      </p>
                    </div>
                    {!b.isActive && (
                      <span className="ml-auto flex-shrink-0 text-2xs text-foreground-400 bg-secondary-100 rounded-full px-1.5 py-0.5">
                        Inactiva
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {form.rol.toLowerCase() === 'medico' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-secondary-200 pt-4">
              <Input
                label="Cédula profesional"
                value={editingUser?.professionalLicense || ''}
                disabled
                placeholder="Se captura en Administración → Médicos"
                hint="No se edita aquí; liga usuario↔profesional en Médicos."
              />
              <Input
                label="Especialidad"
                value={editingUser?.specialtyName || ''}
                disabled
                placeholder="Se captura en Administración → Médicos"
              />
            </div>
          )}

          {formError && <p className="text-sm text-danger-700">{formError}</p>}
        </div>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        size="sm"
        title="Eliminar Usuario"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()} disabled={saving}>
              Eliminar
            </Button>
          </div>
        }
      >
        {deleteTarget && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
              <span className="w-10 h-10 flex items-center justify-center rounded-full bg-red-100 text-red-600 flex-shrink-0">
                <i className="ri-error-warning-line text-lg" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-medium text-red-800">¿Eliminar este usuario?</p>
                <p className="text-xs text-red-600 mt-0.5">
                  El usuario perderá acceso al sistema. Su registro en auditoría se conserva (baja lógica).
                </p>
              </div>
            </div>
            <div className="p-3 bg-background-50 rounded-lg border border-secondary-200">
              <p className="text-sm font-medium text-foreground-900">{deleteTarget.displayName}</p>
              <p className="text-xs text-foreground-500">
                {deleteTarget.roleCodes.map(roleName).join(', ') || '—'}
                {deleteTarget.branchIds.length > 0
                  ? ` · ${deleteTarget.branchIds.map(branchName).join(', ')}`
                  : ''}
              </p>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!passwordTarget}
        onClose={() => {
          setPasswordTarget(null);
          setFormError(null);
        }}
        size="sm"
        title="Restablecer contraseña"
      >
        <p className="text-xs text-foreground-500 mb-3">{passwordTarget?.displayName}</p>
        <Input
          label="Nueva contraseña"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          data-testid="usuarios-new-password"
        />
        {formError && <p className="text-sm text-danger-700 mt-2">{formError}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => setPasswordTarget(null)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => void confirmPassword()} disabled={saving}>
            Guardar
          </Button>
        </div>
      </Modal>
    </div>
  );
}
