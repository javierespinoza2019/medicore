/**
 * Roles y permisos — UI alineada a Readdy sobre plantillas fijas (doc 06 §19).
 * Sin alta/duplicado/baja de roles personalizados. Catálogo = API real.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Button from '@/components/base/Button';
import Card from '@/components/base/Card';
import Badge from '@/components/base/Badge';
import Modal from '@/components/base/Modal';
import {
  getPermissionMatrix,
  saveRolePermissions,
  type PermissionKey,
  type RolePermissionMatrixDto,
  type RoleTemplateDto,
} from '@/api/roles';

const ROLE_META: Record<string, { icon: string; bar: string; descripcion: string }> = {
  admin: {
    icon: 'ri-shield-user-line',
    bar: 'bg-primary-500',
    descripcion: 'Administración del tenant y configuración operativa.',
  },
  medico: {
    icon: 'ri-stethoscope-line',
    bar: 'bg-accent-500',
    descripcion: 'Consulta, notas, recetas y atención clínica.',
  },
  enfermeria: {
    icon: 'ri-heart-pulse-line',
    bar: 'bg-emerald-500',
    descripcion: 'Triage, signos vitales y apoyo en urgencias.',
  },
  recepcion: {
    icon: 'ri-customer-service-2-line',
    bar: 'bg-sky-500',
    descripcion: 'Agenda, ingreso y atención al paciente.',
  },
  caja: {
    icon: 'ri-cash-line',
    bar: 'bg-amber-500',
    descripcion: 'Cobros y corte de caja (cuando exista módulo).',
  },
  farmacia: {
    icon: 'ri-capsule-line',
    bar: 'bg-violet-500',
    descripcion: 'Dispensado y surtido (Fase 2).',
  },
  laboratorio: {
    icon: 'ri-test-tube-line',
    bar: 'bg-cyan-500',
    descripcion: 'Estudios de laboratorio (Fase 2).',
  },
  directivo: {
    icon: 'ri-bar-chart-box-line',
    bar: 'bg-indigo-500',
    descripcion: 'Indicadores y exportación agregada.',
  },
  trabajo_social: {
    icon: 'ri-hand-heart-line',
    bar: 'bg-rose-500',
    descripcion: 'Apoyo social y seguimiento no clínico.',
  },
};

function metaFor(code: string) {
  return (
    ROLE_META[code] ?? {
      icon: 'ri-user-settings-line',
      bar: 'bg-secondary-400',
      descripcion: 'Plantilla de rol del tenant.',
    }
  );
}

export default function Roles() {
  const [matrix, setMatrix] = useState<RolePermissionMatrixDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [editing, setEditing] = useState<RoleTemplateDto | null>(null);
  const [draft, setDraft] = useState<Record<PermissionKey, boolean> | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getPermissionMatrix();
    if (!res.success || !res.data) {
      setError(res.message ?? 'No se pudo cargar la matriz de permisos.');
      setMatrix(null);
    } else {
      setMatrix(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const catalogSize = matrix?.catalog.length ?? 0;

  const filteredTemplates = useMemo(() => {
    if (!matrix) return [];
    const q = search.trim().toLowerCase();
    if (!q) return matrix.templates;
    return matrix.templates.filter(
      (t) => t.name.toLowerCase().includes(q) || t.roleCode.toLowerCase().includes(q),
    );
  }, [matrix, search]);

  const catalogByModule = useMemo(() => {
    if (!matrix) return [];
    const groups = new Map<string, typeof matrix.catalog>();
    for (const item of matrix.catalog) {
      const list = groups.get(item.module) ?? [];
      list.push(item);
      groups.set(item.module, list);
    }
    return Array.from(groups.entries());
  }, [matrix]);

  const stats = useMemo(() => {
    if (!matrix) return { total: 0, adjusted: 0, users: 0, catalog: 0 };
    return {
      total: matrix.templates.length,
      adjusted: matrix.rolesWithTenantOverrides.length,
      users: matrix.templates.reduce((n, t) => n + t.userCount, 0),
      catalog: matrix.catalog.length,
    };
  }, [matrix]);

  const grantedCount = (roleCode: string) => {
    if (!matrix) return 0;
    return Object.values(matrix.permissionsByRole[roleCode] ?? {}).filter(Boolean).length;
  };

  const coveragePct = (roleCode: string) => {
    if (!catalogSize) return 0;
    return Math.round((grantedCount(roleCode) / catalogSize) * 100);
  };

  const openEdit = (template: RoleTemplateDto) => {
    if (!matrix) return;
    const perms = matrix.permissionsByRole[template.roleCode];
    setEditing(template);
    setDraft({ ...perms });
    setPreviewCode(null);
  };

  const togglePermission = (key: PermissionKey) => {
    if (!draft) return;
    setDraft({ ...draft, [key]: !draft[key] });
  };

  const setModuleAll = (moduleItems: { code: PermissionKey }[], value: boolean) => {
    if (!draft) return;
    const next = { ...draft };
    for (const item of moduleItems) next[item.code] = value;
    setDraft(next);
  };

  const handleSave = async () => {
    if (!editing || !draft) return;
    setSaving(true);
    const res = await saveRolePermissions(editing.roleCode, { permissions: draft });
    setSaving(false);
    if (!res.success || !res.data) {
      setError(res.message ?? 'No se pudieron guardar los permisos.');
      return;
    }
    setMatrix(res.data);
    setDraft(null);
    setEditing(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-foreground-500 text-sm">
        Cargando matriz de permisos…
      </div>
    );
  }

  if (error && !matrix) {
    return (
      <Card>
        <div className="py-10 text-center space-y-3">
          <p className="text-sm text-red-600">{error}</p>
          <Button onClick={() => void load()}>Reintentar</Button>
        </div>
      </Card>
    );
  }

  if (!matrix) return null;

  return (
    <div className="space-y-6" data-testid="page-seguridad-roles">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-foreground-500 max-w-xl">
          Plantillas fijas por tenant (doc 06 §19). Se ajustan permisos; no hay roles
          personalizados ni alta/baja de plantillas.
        </p>
        <Button
          variant="secondary"
          disabled
          title="Plantillas cerradas: no se crean roles personalizados"
          icon={<i className="ri-add-line" />}
        >
          Nuevo Rol
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card padding="md">
          <p className="text-lg font-bold text-foreground-950">{stats.total}</p>
          <p className="text-2xs text-foreground-500">Plantillas</p>
        </Card>
        <Card padding="md">
          <p className="text-lg font-bold text-foreground-950">{stats.adjusted}</p>
          <p className="text-2xs text-foreground-500">Con ajuste de tenant</p>
        </Card>
        <Card padding="md">
          <p className="text-lg font-bold text-foreground-950">{stats.users}</p>
          <p className="text-2xs text-foreground-500">Usuarios asignados</p>
        </Card>
        <Card padding="md">
          <p className="text-lg font-bold text-foreground-950">{stats.catalog}</p>
          <p className="text-2xs text-foreground-500">Permisos en catálogo</p>
        </Card>
      </div>

      <div className="relative w-full sm:w-72">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 pointer-events-none">
          <i className="ri-search-line text-sm" />
        </span>
        <input
          type="search"
          aria-label="Buscar rol"
          placeholder="Buscar rol…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-3 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      {filteredTemplates.length === 0 ? (
        <Card padding="lg">
          <div className="flex flex-col items-center gap-2 py-8 text-foreground-400">
            <i className="ri-key-2-line text-2xl" />
            <p className="text-sm">No se encontraron roles</p>
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-xs text-primary-500 cursor-pointer"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTemplates.map((template) => {
            const meta = metaFor(template.roleCode);
            const open = previewCode === template.roleCode;
            const hasOverride = matrix.rolesWithTenantOverrides.includes(template.roleCode);
            const granted = grantedCount(template.roleCode);
            const pct = coveragePct(template.roleCode);
            const perms = matrix.permissionsByRole[template.roleCode];

            return (
              <Card key={template.roleCode} padding="none" className="overflow-hidden">
                <div className="flex">
                  <div className={`w-1.5 flex-shrink-0 ${meta.bar}`} aria-hidden />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 px-5 py-4">
                      <button
                        type="button"
                        className="flex items-center gap-3 min-w-0 text-left flex-1 cursor-pointer"
                        onClick={() => setPreviewCode(open ? null : template.roleCode)}
                      >
                        <span className="w-10 h-10 rounded-xl bg-secondary-100 text-foreground-700 flex items-center justify-center flex-shrink-0">
                          <i className={`${meta.icon} text-lg`} aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-semibold text-foreground-900">
                              {template.name}
                            </h3>
                            <Badge variant="info" size="sm">
                              Plantilla
                            </Badge>
                            <Badge variant="secondary" size="sm">
                              {template.roleCode}
                            </Badge>
                            {hasOverride && (
                              <Badge variant="warning" size="sm">
                                Ajustado
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-foreground-500 mt-0.5">{meta.descripcion}</p>
                          <div className="flex items-center gap-3 mt-2 text-2xs text-foreground-500">
                            <span>
                              {template.userCount} usuario{template.userCount !== 1 ? 's' : ''}
                            </span>
                            <span>
                              {granted}/{catalogSize} permisos
                            </span>
                            <span className="inline-flex items-center gap-1.5 min-w-[7rem]">
                              <span className="h-1.5 flex-1 rounded-full bg-secondary-200 overflow-hidden">
                                <span
                                  className={`block h-full ${meta.bar}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </span>
                              {pct}%
                            </span>
                          </div>
                        </div>
                      </button>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(template)}>
                          Editar
                        </Button>
                        <button
                          type="button"
                          disabled
                          title="Plantillas cerradas: no se duplican roles"
                          className="w-8 h-8 rounded-lg text-foreground-300 cursor-not-allowed"
                          aria-label="Duplicar (no disponible)"
                        >
                          <i className="ri-file-copy-line text-sm" />
                        </button>
                        <button
                          type="button"
                          disabled
                          title="Plantillas cerradas: no se eliminan roles"
                          className="w-8 h-8 rounded-lg text-foreground-300 cursor-not-allowed"
                          aria-label="Eliminar (no disponible)"
                        >
                          <i className="ri-delete-bin-line text-sm" />
                        </button>
                      </div>
                    </div>

                    {open && perms && (
                      <div className="border-t border-secondary-100 px-5 py-4 bg-background-50/60">
                        <p className="text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-3">
                          Matriz de permisos (vista)
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                          {catalogByModule.map(([module, items]) => (
                            <div
                              key={module}
                              className="rounded-lg border border-secondary-200 bg-white p-3"
                            >
                              <p className="text-xs font-medium text-foreground-800 mb-2">
                                {module}
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {items.map((item) => (
                                  <span
                                    key={item.code}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs border ${
                                      perms[item.code]
                                        ? 'bg-primary-50 text-primary-700 border-primary-200'
                                        : 'bg-secondary-50 text-foreground-400 border-secondary-100'
                                    }`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        perms[item.code] ? 'bg-primary-500' : 'bg-secondary-300'
                                      }`}
                                    />
                                    {item.label}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={!!editing && !!draft}
        onClose={() => {
          if (!saving) {
            setEditing(null);
            setDraft(null);
          }
        }}
        title={editing ? `Permisos · ${editing.name}` : 'Permisos'}
        size="xl"
        footer={
          <div className="flex items-center justify-between gap-3 w-full flex-wrap">
            <p className="text-xs text-foreground-500">
              {draft ? Object.values(draft).filter(Boolean).length : 0} permisos activos ·{' '}
              {catalogByModule.length} módulos
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                disabled={saving}
                onClick={() => {
                  setEditing(null);
                  setDraft(null);
                }}
              >
                Cancelar
              </Button>
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </div>
          </div>
        }
      >
        {editing && draft && (
          <div className="space-y-5" data-testid="modal-rol-permisos">
            <p className="text-xs text-foreground-500">
              Solo se editan flags del catálogo efectivo. Nombre y código de plantilla son fijos.
            </p>
            {catalogByModule.map(([module, items]) => (
              <div key={module} className="rounded-lg border border-secondary-200 p-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h4 className="text-sm font-semibold text-foreground-800">{module}</h4>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-2xs text-primary-600 cursor-pointer"
                      onClick={() => setModuleAll(items, true)}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      className="text-2xs text-foreground-500 cursor-pointer"
                      onClick={() => setModuleAll(items, false)}
                    >
                      Ninguno
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {items.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => togglePermission(item.code)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border cursor-pointer transition-base ${
                        draft[item.code]
                          ? 'bg-primary-100 text-primary-700 border-primary-300'
                          : 'bg-background-50 text-foreground-500 border-secondary-200'
                      }`}
                    >
                      {draft[item.code] && <i className="ri-check-line text-[10px]" />}
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
