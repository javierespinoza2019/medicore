import { useState, useMemo } from 'react';
import Button from '@/components/base/Button';
import Card from '@/components/base/Card';
import Modal from '@/components/base/Modal';
import Input from '@/components/base/Input';
import Badge from '@/components/base/Badge';

interface Permission {
  key: string;
  label: string;
}

interface ModuleAccess {
  modulo: string;
  icon: string;
  permisos: Permission[];
}

interface RoleData {
  id: string;
  nombre: string;
  descripcion: string;
  usuarios: number;
  sistema: boolean;
  permisos: Record<string, string[]>;
}

const modulos: ModuleAccess[] = [
  {
    modulo: 'Dashboard', icon: 'ri-dashboard-line',
    permisos: [{ key: 'ver', label: 'Ver dashboard' }],
  },
  {
    modulo: 'Agenda', icon: 'ri-calendar-2-line',
    permisos: [
      { key: 'ver', label: 'Ver agenda' },
      { key: 'crear', label: 'Crear citas' },
      { key: 'editar', label: 'Editar citas' },
      { key: 'cancelar', label: 'Cancelar citas' },
    ],
  },
  {
    modulo: 'Pacientes', icon: 'ri-user-heart-line',
    permisos: [
      { key: 'ver', label: 'Ver pacientes' },
      { key: 'crear', label: 'Crear pacientes' },
      { key: 'editar', label: 'Editar pacientes' },
      { key: 'eliminar', label: 'Eliminar pacientes' },
    ],
  },
  {
    modulo: 'Expediente', icon: 'ri-folder-user-line',
    permisos: [
      { key: 'ver', label: 'Ver expediente' },
      { key: 'editar', label: 'Editar expediente' },
    ],
  },
  {
    modulo: 'Consultas', icon: 'ri-stethoscope-line',
    permisos: [
      { key: 'ver', label: 'Ver consultas' },
      { key: 'crear', label: 'Crear consultas' },
      { key: 'editar', label: 'Editar consultas' },
    ],
  },
  {
    modulo: 'Diagnósticos', icon: 'ri-search-eye-line',
    permisos: [
      { key: 'ver', label: 'Ver diagnósticos' },
      { key: 'crear', label: 'Crear diagnósticos' },
    ],
  },
  {
    modulo: 'Recetas', icon: 'ri-capsule-line',
    permisos: [
      { key: 'ver', label: 'Ver recetas' },
      { key: 'crear', label: 'Crear recetas' },
      { key: 'imprimir', label: 'Imprimir recetas' },
    ],
  },
  {
    modulo: 'Estudios', icon: 'ri-microscope-line',
    permisos: [
      { key: 'ver', label: 'Ver estudios' },
      { key: 'solicitar', label: 'Solicitar estudios' },
      { key: 'subir_resultados', label: 'Subir resultados' },
    ],
  },
  {
    modulo: 'Caja', icon: 'ri-cash-line',
    permisos: [
      { key: 'ver', label: 'Ver caja' },
      { key: 'cobrar', label: 'Realizar cobros' },
      { key: 'corte', label: 'Corte de caja' },
    ],
  },
  {
    modulo: 'Recepción', icon: 'ri-user-received-line',
    permisos: [
      { key: 'ver', label: 'Ver recepción' },
      { key: 'registrar_llegada', label: 'Registrar llegada' },
    ],
  },
  {
    modulo: 'Sala de Espera', icon: 'ri-time-line',
    permisos: [{ key: 'ver', label: 'Ver sala de espera' }],
  },
  {
    modulo: 'Triage', icon: 'ri-heart-pulse-line',
    permisos: [
      { key: 'ver', label: 'Ver triage' },
      { key: 'registrar', label: 'Registrar signos' },
    ],
  },
  {
    modulo: 'Urgencias', icon: 'ri-alert-line',
    permisos: [
      { key: 'ver', label: 'Ver urgencias' },
      { key: 'atender', label: 'Atender urgencias' },
    ],
  },
  {
    modulo: 'Administración', icon: 'ri-settings-3-line',
    permisos: [
      { key: 'ver', label: 'Ver administración' },
      { key: 'gestionar', label: 'Gestionar catálogos' },
    ],
  },
  {
    modulo: 'Reportes', icon: 'ri-bar-chart-2-line',
    permisos: [
      { key: 'ver', label: 'Ver reportes' },
      { key: 'exportar', label: 'Exportar reportes' },
    ],
  },
  {
    modulo: 'Seguridad', icon: 'ri-shield-check-line',
    permisos: [
      { key: 'ver', label: 'Ver seguridad' },
      { key: 'gestionar', label: 'Gestionar roles' },
      { key: 'auditar', label: 'Ver auditoría' },
    ],
  },
];

const initialRoles: RoleData[] = [
  {
    id: 'r1', nombre: 'Administrador', descripcion: 'Acceso total al sistema', usuarios: 1, sistema: true,
    permisos: Object.fromEntries(modulos.map((m) => [m.modulo, m.permisos.map((p) => p.key)])),
  },
  {
    id: 'r2', nombre: 'Médico', descripcion: 'Acceso clínico completo para consulta y diagnóstico', usuarios: 5, sistema: true,
    permisos: {
      'Dashboard': ['ver'],
      'Agenda': ['ver'],
      'Pacientes': ['ver'],
      'Expediente': ['ver', 'editar'],
      'Consultas': ['ver', 'crear', 'editar'],
      'Diagnósticos': ['ver', 'crear'],
      'Recetas': ['ver', 'crear', 'imprimir'],
      'Estudios': ['ver', 'solicitar'],
      'Sala de Espera': ['ver'],
      'Triage': ['ver', 'registrar'],
      'Urgencias': ['ver', 'atender'],
    },
  },
  {
    id: 'r3', nombre: 'Enfermería', descripcion: 'Atención al paciente, signos vitales y triage', usuarios: 2, sistema: true,
    permisos: {
      'Dashboard': ['ver'],
      'Agenda': ['ver'],
      'Pacientes': ['ver'],
      'Expediente': ['ver'],
      'Sala de Espera': ['ver'],
      'Triage': ['ver', 'registrar'],
      'Urgencias': ['ver'],
    },
  },
  {
    id: 'r4', nombre: 'Recepción', descripcion: 'Gestión de citas, llegadas y cobros básicos', usuarios: 3, sistema: true,
    permisos: {
      'Dashboard': ['ver'],
      'Agenda': ['ver', 'crear', 'editar', 'cancelar'],
      'Pacientes': ['ver', 'crear', 'editar'],
      'Recepción': ['ver', 'registrar_llegada'],
      'Sala de Espera': ['ver'],
      'Caja': ['ver', 'cobrar'],
    },
  },
  {
    id: 'r5', nombre: 'Caja', descripcion: 'Cobros y corte de caja', usuarios: 1, sistema: true,
    permisos: {
      'Caja': ['ver', 'cobrar', 'corte'],
      'Pacientes': ['ver'],
      'Agenda': ['ver'],
    },
  },
  {
    id: 'r6', nombre: 'Directivo', descripcion: 'Supervisión, reportes y auditoría', usuarios: 1, sistema: true,
    permisos: {
      'Dashboard': ['ver'],
      'Reportes': ['ver', 'exportar'],
      'Administración': ['ver'],
      'Seguridad': ['ver', 'auditar'],
    },
  },
];

const roleColorPalette = [
  'bg-rose-500', 'bg-emerald-500', 'bg-amber-500', 'bg-cyan-500',
  'bg-violet-500', 'bg-orange-500', 'bg-teal-500', 'bg-pink-500',
];

const roleIcons = [
  'ri-shield-user-line', 'ri-stethoscope-line', 'ri-heart-pulse-line',
  'ri-user-received-line', 'ri-cash-line', 'ri-bar-chart-2-line',
];

interface RoleFormData {
  nombre: string;
  descripcion: string;
  permisos: Record<string, string[]>;
}

export default function Roles() {
  const [roles, setRoles] = useState<RoleData[]>(initialRoles);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RoleFormData>({ nombre: '', descripcion: '', permisos: {} });
  const [deleteTarget, setDeleteTarget] = useState<RoleData | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof RoleFormData, string>>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [modalSearch, setModalSearch] = useState('');

  const filtered = roles.filter((r) => r.nombre.toLowerCase().includes(search.toLowerCase()));

  const filteredModules = useMemo(() => {
    if (!modalSearch.trim()) return modulos;
    const q = modalSearch.toLowerCase();
    return modulos.filter((m) => m.modulo.toLowerCase().includes(q));
  }, [modalSearch]);

  const stats = useMemo(() => {
    const total = roles.length;
    const sistema = roles.filter((r) => r.sistema).length;
    const personalizados = total - sistema;
    const usuariosAsignados = roles.reduce((acc, r) => acc + r.usuarios, 0);
    return { total, sistema, personalizados, usuariosAsignados };
  }, [roles]);

  const getRoleColor = (index: number) => roleColorPalette[index % roleColorPalette.length];
  const getRoleIcon = (index: number) => roleIcons[index % roleIcons.length];

  const countModules = (r: RoleData) => Object.keys(r.permisos).length;
  const countPermisos = (r: RoleData) => Object.values(r.permisos).reduce((acc, p) => acc + p.length, 0);
  const moduleCoverage = (r: RoleData) => Math.round((countModules(r) / modulos.length) * 100);

  const openCreate = () => {
    setEditingId(null);
    setForm({ nombre: '', descripcion: '', permisos: {} });
    setFormErrors({});
    setModalSearch('');
    setModalOpen(true);
  };

  const openEdit = (r: RoleData) => {
    setEditingId(r.id);
    setForm({ nombre: r.nombre, descripcion: r.descripcion, permisos: { ...r.permisos } });
    setFormErrors({});
    setModalSearch('');
    setModalOpen(true);
  };

  const openDuplicate = (r: RoleData) => {
    setEditingId(null);
    setForm({
      nombre: `${r.nombre} (Copia)`,
      descripcion: r.descripcion,
      permisos: { ...r.permisos },
    });
    setFormErrors({});
    setModalSearch('');
    setModalOpen(true);
  };

  const togglePermiso = (modulo: string, permiso: string) => {
    setForm((prev) => {
      const current = prev.permisos[modulo] || [];
      const updated = current.includes(permiso)
        ? current.filter((p) => p !== permiso)
        : [...current, permiso];
      return {
        ...prev,
        permisos: { ...prev.permisos, [modulo]: updated },
      };
    });
  };

  const selectAllModule = (modulo: string, allKeys: string[]) => {
    setForm((prev) => ({
      ...prev,
      permisos: { ...prev.permisos, [modulo]: [...allKeys] },
    }));
  };

  const clearModule = (modulo: string) => {
    setForm((prev) => {
      const next = { ...prev.permisos };
      delete next[modulo];
      return { ...prev, permisos: next };
    });
  };

  const formModulesCount = Object.keys(form.permisos).length;
  const formPermisosCount = Object.values(form.permisos).reduce((acc, p) => acc + p.length, 0);

  const validate = (): boolean => {
    const errors: Partial<Record<keyof RoleFormData, string>> = {};
    if (!form.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    if (form.nombre.trim() && roles.some((r) => r.nombre.toLowerCase() === form.nombre.trim().toLowerCase() && r.id !== editingId)) {
      errors.nombre = 'Ya existe un rol con este nombre';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    if (editingId) {
      setRoles((prev) =>
        prev.map((r) =>
          r.id === editingId
            ? { ...r, nombre: form.nombre.trim(), descripcion: form.descripcion.trim(), permisos: { ...form.permisos } }
            : r
        )
      );
    } else {
      const newRole: RoleData = {
        id: `r${Date.now()}`,
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim(),
        usuarios: 0,
        sistema: false,
        permisos: { ...form.permisos },
      };
      setRoles((prev) => [...prev, newRole]);
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setRoles((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button icon={<i className="ri-add-line"></i>} onClick={openCreate}>
          Nuevo Rol
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary-100 text-primary-600">
              <i className="ri-shield-keyhole-line"></i>
            </span>
            <div>
              <p className="text-lg font-bold text-foreground-950">{stats.total}</p>
              <p className="text-2xs text-foreground-500">Roles totales</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-sky-100 text-sky-600">
              <i className="ri-shield-check-line"></i>
            </span>
            <div>
              <p className="text-lg font-bold text-foreground-950">{stats.sistema}</p>
              <p className="text-2xs text-foreground-500">De sistema</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <i className="ri-user-settings-line"></i>
            </span>
            <div>
              <p className="text-lg font-bold text-foreground-950">{stats.personalizados}</p>
              <p className="text-2xs text-foreground-500">Personalizados</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <i className="ri-group-line"></i>
            </span>
            <div>
              <p className="text-lg font-bold text-foreground-950">{stats.usuariosAsignados}</p>
              <p className="text-2xs text-foreground-500">Usuarios asignados</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-72">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
          <i className="ri-search-line text-sm"></i>
        </span>
        <input
          type="text"
          placeholder="Buscar rol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-3 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base"
        />
      </div>

      {/* Role List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center gap-3 py-10 text-foreground-400">
              <span className="w-12 h-12 flex items-center justify-center rounded-full bg-secondary-100">
                <i className="ri-key-2-line text-xl"></i>
              </span>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground-600">No se encontraron roles</p>
                {search && (
                  <button onClick={() => setSearch('')} className="text-xs text-primary-500 hover:text-primary-600 cursor-pointer mt-1">
                    Limpiar búsqueda
                  </button>
                )}
              </div>
            </div>
          </Card>
        ) : (
          filtered.map((r, idx) => {
            const colorClass = getRoleColor(idx);
            const iconClass = getRoleIcon(idx);
            const modCount = countModules(r);
            const permCount = countPermisos(r);
            const coverage = moduleCoverage(r);
            const isExpanded = expandedId === r.id;

            return (
              <Card key={r.id} padding="none">
                <div className="flex">
                  {/* Color accent bar */}
                  <div className={`w-1.5 flex-shrink-0 rounded-l-lg ${colorClass}`}></div>

                  <div className="flex-1 min-w-0">
                    {/* Header row */}
                    <div
                      className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-secondary-50/50 transition-base"
                      onClick={() => setExpandedId(isExpanded ? null : r.id)}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <span className={`w-9 h-9 flex items-center justify-center rounded-lg ${colorClass} text-white flex-shrink-0`}>
                          <i className={`${iconClass} text-sm`}></i>
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-semibold text-foreground-900 truncate">{r.nombre}</h3>
                            {r.sistema && <Badge variant="info" size="sm">Sistema</Badge>}
                          </div>
                          <p className="text-xs text-foreground-500 mt-0.5 truncate">{r.descripcion}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-shrink-0">
                        {/* Coverage bar */}
                        <div className="hidden md:flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-secondary-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${coverage === 100 ? 'bg-emerald-500' : coverage >= 50 ? 'bg-amber-500' : 'bg-rose-400'}`}
                              style={{ width: `${Math.max(coverage, 5)}%` }}
                            ></div>
                          </div>
                          <span className="text-2xs text-foreground-400 w-8 text-right">{coverage}%</span>
                        </div>

                        <div className="hidden sm:flex items-center gap-3 text-xs text-foreground-500">
                          <span className="inline-flex items-center gap-1">
                            <i className="ri-group-line text-foreground-400"></i>
                            {r.usuarios}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <i className="ri-folder-line text-foreground-400"></i>
                            {modCount}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <i className="ri-checkbox-multiple-line text-foreground-400"></i>
                            {permCount}
                          </span>
                        </div>

                        <span className={`w-5 h-5 flex items-center justify-center transition-base flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}>
                          <i className="ri-arrow-right-s-line text-foreground-400"></i>
                        </span>

                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openEdit(r)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-foreground-700 hover:bg-secondary-100 transition-base cursor-pointer"
                            title="Editar rol"
                          >
                            <i className="ri-pencil-line text-sm"></i>
                          </button>
                          <button
                            onClick={() => openDuplicate(r)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-foreground-700 hover:bg-secondary-100 transition-base cursor-pointer"
                            title="Duplicar rol"
                          >
                            <i className="ri-file-copy-line text-sm"></i>
                          </button>
                          {!r.sistema && (
                            <button
                              onClick={() => setDeleteTarget(r)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-red-600 hover:bg-red-500/10 transition-base cursor-pointer"
                              title="Eliminar rol"
                            >
                              <i className="ri-delete-bin-line text-sm"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Matrix */}
                    {isExpanded && (
                      <div className="border-t border-secondary-200">
                        <div className="px-5 py-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-xs font-semibold text-foreground-500 uppercase tracking-wider">
                              Matriz de Permisos
                            </h4>
                            <span className="text-2xs text-foreground-400">
                              {modCount} de {modulos.length} módulos · {permCount} permisos
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                            {modulos.map((m) => {
                              const modPerms = r.permisos[m.modulo] || [];
                              const hasAny = modPerms.length > 0;
                              const hasAll = m.permisos.every((p) => modPerms.includes(p.key));
                              return (
                                <div
                                  key={m.modulo}
                                  className={`p-3 rounded-lg border transition-base ${
                                    hasAny
                                      ? 'bg-emerald-50/50 border-emerald-200'
                                      : 'bg-secondary-50/50 border-secondary-100'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className={`w-6 h-6 flex items-center justify-center rounded-md ${hasAny ? 'bg-emerald-100 text-emerald-600' : 'bg-secondary-200 text-foreground-400'}`}>
                                      <i className={`${m.icon} text-xs`}></i>
                                    </span>
                                    <span className={`text-xs font-medium ${hasAny ? 'text-foreground-800' : 'text-foreground-400'}`}>
                                      {m.modulo}
                                    </span>
                                    {hasAll && m.permisos.length > 1 && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" title="Acceso completo"></span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {m.permisos.map((p) => {
                                      const tiene = modPerms.includes(p.key);
                                      return (
                                        <span
                                          key={p.key}
                                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                            tiene ? 'bg-emerald-500' : 'bg-secondary-300'
                                          }`}
                                          title={`${p.label}: ${tiene ? 'Sí' : 'No'}`}
                                        ></span>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Create/Edit Role Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar Rol' : 'Nuevo Rol'}
        size="xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3 text-xs text-foreground-500">
              <span className="inline-flex items-center gap-1">
                <i className="ri-folder-line"></i>
                {formModulesCount} módulo{formModulesCount !== 1 ? 's' : ''}
              </span>
              <span className="inline-flex items-center gap-1">
                <i className="ri-checkbox-multiple-line"></i>
                {formPermisosCount} permiso{formPermisosCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave}>{editingId ? 'Guardar Cambios' : 'Crear Rol'}</Button>
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre del rol"
              placeholder="Ej: Médico"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              error={formErrors.nombre}
            />
            <Input
              label="Descripción"
              placeholder="Ej: Acceso clínico completo"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground-800">Permisos por Módulo</h4>
              <div className="relative w-48">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 flex items-center justify-center text-foreground-400 pointer-events-none">
                  <i className="ri-search-line text-xs"></i>
                </span>
                <input
                  type="text"
                  placeholder="Filtrar módulos..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base"
                />
              </div>
            </div>

            {filteredModules.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-foreground-400">
                <span className="w-8 h-8 flex items-center justify-center">
                  <i className="ri-search-line"></i>
                </span>
                <p className="text-xs">No se encontraron módulos con "{modalSearch}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {filteredModules.map((m) => {
                  const modPerms = form.permisos[m.modulo] || [];
                  const allSelected = m.permisos.every((p) => modPerms.includes(p.key));
                  const someSelected = modPerms.length > 0 && !allSelected;
                  return (
                    <div
                      key={m.modulo}
                      className={`p-3.5 rounded-lg border transition-base ${
                        someSelected
                          ? 'bg-amber-500/10 border-amber-500/20'
                          : allSelected
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : modPerms.length > 0
                          ? 'bg-secondary-50/50 border-secondary-200'
                          : 'bg-background-50 border-secondary-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground-800">
                          <span className={`w-6 h-6 flex items-center justify-center rounded-md ${allSelected ? 'bg-emerald-100 text-emerald-600' : someSelected ? 'bg-amber-100 text-amber-600' : modPerms.length > 0 ? 'bg-secondary-100 text-foreground-500' : 'bg-secondary-100 text-foreground-400'}`}>
                            <i className={`${m.icon} text-xs`}></i>
                          </span>
                          {m.modulo}
                          {allSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></span>}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => selectAllModule(m.modulo, m.permisos.map((p) => p.key))}
                            className={`text-2xs px-2 py-0.5 rounded-full cursor-pointer transition-base ${
                              allSelected
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-secondary-200 text-foreground-600 hover:bg-secondary-300'
                            }`}
                          >
                            Todos
                          </button>
                          <button
                            onClick={() => clearModule(m.modulo)}
                            className={`text-2xs px-2 py-0.5 rounded-full cursor-pointer transition-base ${
                              modPerms.length === 0
                                ? 'bg-secondary-100 text-foreground-300'
                                : 'bg-red-100 text-red-600 hover:bg-red-200'
                            }`}
                          >
                            Ninguno
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {m.permisos.map((p) => (
                          <button
                            key={p.key}
                            onClick={() => togglePermiso(m.modulo, p.key)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full cursor-pointer transition-base ${
                              modPerms.includes(p.key)
                                ? 'bg-primary-100 text-primary-700 border border-primary-300'
                                : 'bg-background-50 text-foreground-500 border border-secondary-200 hover:border-secondary-300'
                            }`}
                          >
                            {modPerms.includes(p.key) && <i className="ri-check-line text-[10px]"></i>}
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar Rol"
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
                <p className="text-sm font-medium text-red-800">¿Eliminar este rol?</p>
                <p className="text-xs text-red-600 mt-0.5">
                  {deleteTarget.usuarios > 0
                    ? `${deleteTarget.usuarios} usuario${deleteTarget.usuarios !== 1 ? 's' : ''} con este rol se quedarán sin asignación.`
                    : 'Los usuarios con este rol conservarán sus permisos actuales hasta que se les reasigne.'}
                </p>
              </div>
            </div>
            <div className="p-3 bg-background-50 rounded-lg border border-secondary-200">
              <p className="text-sm font-medium text-foreground-900">{deleteTarget.nombre}</p>
              <p className="text-xs text-foreground-500">{deleteTarget.descripcion} · {countPermisos(deleteTarget)} permisos en {countModules(deleteTarget)} módulos</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}