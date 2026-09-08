/**
 * Usuarios del tenant — CRUD contra /api/users (canAdminUsers).
 * Matriz de permisos: Seguridad → Roles. Liga a profesional: Administración → Médicos.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSort } from '@/hooks/useSort';
import SortableTh from '@/components/feature/SortableTh';
import {
  createUser,
  listUsers,
  setUserPassword,
  softDeleteUser,
  updateUser,
  type TenantUserDto,
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

interface FormData {
  userName: string;
  displayName: string;
  password: string;
  isActive: boolean;
  roleCodes: string[];
  branchIds: string[];
}

const emptyForm: FormData = {
  userName: '',
  displayName: '',
  password: '',
  isActive: true,
  roleCodes: [],
  branchIds: [],
};

export default function AdminUsuarios() {
  const [items, setItems] = useState<TenantUserDto[]>([]);
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [roleOptions, setRoleOptions] = useState<{ code: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'activo' | 'inactivo'>('todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TenantUserDto | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<TenantUserDto | null>(null);
  const [newPassword, setNewPassword] = useState('');

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
      u.roleCodes.some((r) => r.toLowerCase().includes(q));
    const matchStatus =
      filterStatus === 'todos' ||
      (filterStatus === 'activo' && u.isActive) ||
      (filterStatus === 'inactivo' && !u.isActive);
    return matchSearch && matchStatus;
  });

  const sorters = useMemo(
    () => ({
      nombre: (a: TenantUserDto, b: TenantUserDto) => a.displayName.localeCompare(b.displayName),
      acceso: (a: TenantUserDto, b: TenantUserDto) => a.userName.localeCompare(b.userName),
    }),
    [],
  );
  const { sortedData, sortKey, direction, toggleSort } = useSort(filtered, sorters, 'nombre');

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (u: TenantUserDto) => {
    setEditingId(u.userId);
    setForm({
      userName: u.userName,
      displayName: u.displayName,
      password: '',
      isActive: u.isActive,
      roleCodes: [...u.roleCodes].filter((c) => c.toLowerCase() !== 'superadmin'),
      branchIds: [...u.branchIds],
    });
    setFormError(null);
    setModalOpen(true);
  };

  const toggleRole = (code: string) => {
    setForm((prev) => ({
      ...prev,
      roleCodes: prev.roleCodes.includes(code)
        ? prev.roleCodes.filter((c) => c !== code)
        : [...prev.roleCodes, code],
    }));
  };

  const toggleBranch = (id: string) => {
    setForm((prev) => ({
      ...prev,
      branchIds: prev.branchIds.includes(id)
        ? prev.branchIds.filter((b) => b !== id)
        : [...prev.branchIds, id],
    }));
  };

  const save = async () => {
    setFormError(null);
    if (!form.displayName.trim() || form.displayName.trim().length < 2) {
      setFormError('Indique el nombre para mostrar.');
      return;
    }
    if (form.roleCodes.length === 0) {
      setFormError('Asigne al menos un rol.');
      return;
    }
    if (!editingId) {
      if (form.userName.trim().length < 3) {
        setFormError('El nombre de acceso debe tener al menos 3 caracteres.');
        return;
      }
      if (form.password.length < 8) {
        setFormError('La contraseña debe tener al menos 8 caracteres.');
        return;
      }
    }

    setSaving(true);
    const res = editingId
      ? await updateUser(editingId, {
          displayName: form.displayName.trim(),
          isActive: form.isActive,
          roleCodes: form.roleCodes,
          branchIds: form.branchIds,
        })
      : await createUser({
          userName: form.userName.trim(),
          displayName: form.displayName.trim(),
          password: form.password,
          isActive: form.isActive,
          roleCodes: form.roleCodes,
          branchIds: form.branchIds,
        });
    setSaving(false);

    if (!res.success) {
      setFormError(res.message ?? mensajeDeFalla(res.failure).titulo);
      return;
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
    if (newPassword.length < 8) {
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
    <div className="p-4 md:p-6 space-y-4" data-testid="page-admin-usuarios">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground-900 font-heading">Usuarios</h1>
          <p className="text-sm text-foreground-500 mt-0.5">
            Alta y edición de cuentas del tenant. Permisos por rol en Seguridad → Roles.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<i className="ri-user-add-line" aria-hidden />}
          onClick={openCreate}
          data-testid="usuarios-nuevo"
        >
          Nuevo usuario
        </Button>
      </div>

      {error && (
        <Card padding="md" className="border-danger-200 bg-danger-50/40">
          <p className="text-sm text-danger-800">{error}</p>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o acceso…"
          className="w-64"
          aria-label="Buscar usuarios"
        />
        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          options={[
            { value: 'todos', label: 'Todos' },
            { value: 'activo', label: 'Activos' },
            { value: 'inactivo', label: 'Inactivos' },
          ]}
          className="w-36"
          aria-label="Filtrar por estado"
        />
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="usuarios-table">
            <thead className="bg-secondary-50 border-b border-secondary-200">
              <tr>
                <SortableTh label="Nombre" sortKey="nombre" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTh label="Acceso" sortKey="acceso" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <th className="text-left px-3 py-2 font-medium text-foreground-600">Roles</th>
                <th className="text-left px-3 py-2 font-medium text-foreground-600">Estado</th>
                <th className="text-right px-3 py-2 font-medium text-foreground-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((u) => (
                <tr key={u.userId} className="border-b border-secondary-100 hover:bg-secondary-50/50">
                  <td className="px-3 py-2">
                    <p className="font-medium text-foreground-900">{u.displayName}</p>
                    {u.professionalDisplayName && (
                      <p className="text-2xs text-foreground-400">Prof.: {u.professionalDisplayName}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-foreground-700">{u.userName}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {u.roleCodes.map((r) => (
                        <Badge key={r} size="sm" variant="secondary">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Badge size="sm" variant={u.isActive ? 'success' : 'warning'} dot>
                      {u.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      className="text-primary-600 hover:underline text-xs mr-2"
                      onClick={() => openEdit(u)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="text-secondary-700 hover:underline text-xs mr-2"
                      onClick={() => {
                        setPasswordTarget(u);
                        setNewPassword('');
                        setFormError(null);
                      }}
                    >
                      Contraseña
                    </button>
                    <button
                      type="button"
                      className="text-danger-600 hover:underline text-xs"
                      onClick={() => setDeleteTarget(u)}
                    >
                      Baja
                    </button>
                  </td>
                </tr>
              ))}
              {sortedData.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-foreground-500">
                    No hay usuarios con esos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} size="lg">
        <h2 className="text-lg font-semibold mb-4">{editingId ? 'Editar usuario' : 'Nuevo usuario'}</h2>
        <div className="space-y-3">
          {!editingId && (
            <Input
              label="Nombre de acceso"
              value={form.userName}
              onChange={(e) => setForm((f) => ({ ...f, userName: e.target.value }))}
              data-testid="usuarios-username"
            />
          )}
          <Input
            label="Nombre para mostrar"
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            data-testid="usuarios-displayname"
          />
          {!editingId && (
            <Input
              label="Contraseña inicial"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              data-testid="usuarios-password"
            />
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            Activo
          </label>
          <div>
            <p className="text-xs font-medium text-foreground-600 mb-1.5">Roles</p>
            <div className="flex flex-wrap gap-2" data-testid="usuarios-roles">
              {roleOptions.map((r) => (
                <button
                  key={r.code}
                  type="button"
                  onClick={() => toggleRole(r.code)}
                  className={`px-2.5 py-1 rounded-lg text-xs border transition-base ${
                    form.roleCodes.includes(r.code)
                      ? 'bg-primary-100 border-primary-300 text-primary-800'
                      : 'bg-secondary-50 border-secondary-200 text-foreground-600'
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-foreground-600 mb-1.5">Sucursales</p>
            <div className="flex flex-wrap gap-2" data-testid="usuarios-branches">
              {branches.map((b) => (
                <button
                  key={b.branchId}
                  type="button"
                  onClick={() => toggleBranch(b.branchId)}
                  className={`px-2.5 py-1 rounded-lg text-xs border transition-base ${
                    form.branchIds.includes(b.branchId)
                      ? 'bg-accent-100 border-accent-300 text-accent-800'
                      : 'bg-secondary-50 border-secondary-200 text-foreground-600'
                  }`}
                >
                  {b.name || b.code}
                </button>
              ))}
            </div>
          </div>
          {formError && <p className="text-sm text-danger-700">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => void save()} disabled={saving} data-testid="usuarios-guardar">
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} size="sm">
        <p className="text-sm text-foreground-800 mb-4">
          ¿Dar de baja a <strong>{deleteTarget?.displayName}</strong>? Se cierran sus sesiones.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => void confirmDelete()} disabled={saving}>
            Confirmar baja
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!passwordTarget}
        onClose={() => {
          setPasswordTarget(null);
          setFormError(null);
        }}
        size="sm"
      >
        <h2 className="text-base font-semibold mb-3">Restablecer contraseña</h2>
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
