import { useCallback, useEffect, useMemo, useState } from 'react';
import Button from '@/components/base/Button';
import Card from '@/components/base/Card';
import Badge from '@/components/base/Badge';
import {
  getPermissionMatrix,
  saveRolePermissions,
  type PermissionKey,
  type RolePermissionMatrixDto,
  type RoleTemplateDto,
} from '@/api/roles';

export default function Roles() {
  const [matrix, setMatrix] = useState<RolePermissionMatrixDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
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

  const openEdit = (template: RoleTemplateDto) => {
    if (!matrix) return;
    const perms = matrix.permissionsByRole[template.roleCode];
    setExpandedCode(template.roleCode);
    setDraft({ ...perms });
  };

  const togglePermission = (key: PermissionKey) => {
    if (!draft) return;
    setDraft({ ...draft, [key]: !draft[key] });
  };

  const handleSave = async () => {
    if (!expandedCode || !draft) return;
    setSaving(true);
    const res = await saveRolePermissions(expandedCode, { permissions: draft });
    setSaving(false);
    if (!res.success || !res.data) {
      setError(res.message ?? 'No se pudieron guardar los permisos.');
      return;
    }
    setMatrix(res.data);
    setDraft(null);
    setExpandedCode(null);
  };

  const grantedCount = (roleCode: string) => {
    if (!matrix) return 0;
    return Object.values(matrix.permissionsByRole[roleCode] ?? {}).filter(Boolean).length;
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-foreground-500">
          Plantillas fijas por tenant (doc 06 §19). Sin roles personalizados.
        </p>
        <div className="relative w-full sm:w-72">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 pointer-events-none">
            <i className="ri-search-line text-sm"></i>
          </span>
          <input
            type="text"
            placeholder="Buscar plantilla…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg outline-none focus:border-primary-400"
          />
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>
      )}

      <div className="space-y-3">
        {filteredTemplates.map((template) => {
          const isOpen = expandedCode === template.roleCode;
          const hasOverride = matrix.rolesWithTenantOverrides.includes(template.roleCode);
          const activeDraft = isOpen ? draft : null;
          const perms = activeDraft ?? matrix.permissionsByRole[template.roleCode];

          return (
            <Card key={template.roleCode} padding="none">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-foreground-900">{template.name}</h3>
                    <Badge variant="info" size="sm">{template.roleCode}</Badge>
                    {hasOverride && <Badge variant="warning" size="sm">Ajustado</Badge>}
                  </div>
                  <p className="text-xs text-foreground-500 mt-0.5">
                    {template.userCount} usuario{template.userCount !== 1 ? 's' : ''} · {grantedCount(template.roleCode)} permisos activos
                  </p>
                </div>
                <Button variant="ghost" onClick={() => (isOpen ? (setExpandedCode(null), setDraft(null)) : openEdit(template))}>
                  {isOpen ? 'Cerrar' : 'Editar permisos'}
                </Button>
              </div>

              {isOpen && perms && (
                <div className="border-t border-secondary-200 px-5 py-4 space-y-4">
                  {catalogByModule.map(([module, items]) => (
                    <div key={module}>
                      <h4 className="text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-2">{module}</h4>
                      <div className="flex flex-wrap gap-2">
                        {items.map((item) => (
                          <button
                            key={item.code}
                            type="button"
                            onClick={() => togglePermission(item.code)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border cursor-pointer transition-base ${
                              perms[item.code]
                                ? 'bg-primary-100 text-primary-700 border-primary-300'
                                : 'bg-background-50 text-foreground-500 border-secondary-200'
                            }`}
                          >
                            {perms[item.code] && <i className="ri-check-line text-[10px]"></i>}
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" onClick={() => { setExpandedCode(null); setDraft(null); }}>Cancelar</Button>
                    <Button onClick={() => void handleSave()} disabled={saving}>
                      {saving ? 'Guardando…' : 'Guardar cambios'}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
