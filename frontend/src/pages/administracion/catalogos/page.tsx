/**
 * Catálogos admin — Medicamentos (API M8) alineado a densidad Readdy.
 * CIE-10 / estudios: placeholder (F2 / decisión abierta). Sin mocks.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listMedicationsAdmin,
  upsertMedication,
  type MedicationDto,
  type SaleClassification,
  type UpsertMedicationPayload,
} from '@/api/prescriptions';
import { mensajeDeFalla } from '@/api/errors';
import Button from '@/components/base/Button';
import Card from '@/components/base/Card';
import Modal from '@/components/base/Modal';
import Input from '@/components/base/Input';
import Select from '@/components/base/Select';
import Badge from '@/components/base/Badge';
import Tabs from '@/components/base/Tabs';
import CargandoPantalla from '@/components/feature/CargandoPantalla';

const VIAS = [
  'Oral',
  'Sublingual',
  'Intravenosa',
  'Intramuscular',
  'Subcutánea',
  'Inhalatoria',
  'Tópica',
  'Oftálmica',
  'Ótica',
  'Rectal',
  'Vaginal',
];

const FRACCIONES: { value: SaleClassification; label: string }[] = [
  { value: 'I', label: 'I — Estupefacientes' },
  { value: 'II', label: 'II — Psicotrópicos' },
  { value: 'III', label: 'III' },
  { value: 'IV', label: 'IV — Venta libre controlada' },
  { value: 'V', label: 'V' },
  { value: 'VI', label: 'VI — Libre' },
];

type TabKey = 'medicamentos' | 'cie10' | 'estudios';

type FormState = UpsertMedicationPayload;

const emptyForm: FormState = {
  genericName: '',
  brandName: '',
  presentation: '',
  concentration: '',
  defaultRoute: 'Oral',
  saleClassification: 'IV',
  isControlledSubstance: false,
  isActive: true,
};

export default function AdminCatalogos() {
  const [tab, setTab] = useState<TabKey>('medicamentos');
  const [items, setItems] = useState<MedicationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'activo' | 'inactivo'>('todos');
  const [filterVia, setFilterVia] = useState('todas');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<MedicationDto | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listMedicationsAdmin();
    if (!res.success || !res.data) {
      setError(res.message ?? mensajeDeFalla(res.failure).titulo);
      setItems([]);
      setLoading(false);
      return;
    }
    setItems(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const viasDisponibles = useMemo(() => {
    const set = new Set<string>();
    for (const m of items) {
      if (m.defaultRoute?.trim()) set.add(m.defaultRoute.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((m) => {
      const matchQ =
        !q ||
        m.genericName.toLowerCase().includes(q) ||
        (m.brandName ?? '').toLowerCase().includes(q) ||
        (m.presentation ?? '').toLowerCase().includes(q);
      const matchStatus =
        filterStatus === 'todos' ||
        (filterStatus === 'activo' && m.isActive) ||
        (filterStatus === 'inactivo' && !m.isActive);
      const matchVia =
        filterVia === 'todas' ||
        (m.defaultRoute ?? '').toLowerCase() === filterVia.toLowerCase();
      return matchQ && matchStatus && matchVia;
    });
  }, [items, search, filterStatus, filterVia]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (m: MedicationDto) => {
    setEditingId(m.medicationId);
    setForm({
      genericName: m.genericName,
      brandName: m.brandName ?? '',
      presentation: m.presentation ?? '',
      concentration: m.concentration ?? '',
      defaultRoute: m.defaultRoute ?? 'Oral',
      saleClassification: (m.saleClassification as SaleClassification) || 'IV',
      isControlledSubstance: m.isControlledSubstance,
      isActive: m.isActive,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.genericName.trim()) {
      setFormError('La denominación genérica es obligatoria (LGS art. 225).');
      return;
    }
    if (form.saleClassification === 'I' && !form.isControlledSubstance) {
      setFormError('Fracción I exige marcar como sustancia controlada.');
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload: UpsertMedicationPayload = {
      genericName: form.genericName.trim(),
      brandName: form.brandName?.trim() || null,
      presentation: form.presentation?.trim() || null,
      concentration: form.concentration?.trim() || null,
      defaultRoute: form.defaultRoute?.trim() || null,
      saleClassification: form.saleClassification,
      isControlledSubstance: form.isControlledSubstance,
      isActive: form.isActive,
    };
    const res = await upsertMedication(payload, editingId);
    setSaving(false);
    if (!res.success) {
      setFormError(res.message ?? mensajeDeFalla(res.failure).titulo);
      return;
    }
    setModalOpen(false);
    await cargar();
  };

  const confirmToggleActive = async () => {
    if (!deactivateTarget) return;
    setSaving(true);
    const m = deactivateTarget;
    const res = await upsertMedication(
      {
        genericName: m.genericName,
        brandName: m.brandName,
        presentation: m.presentation,
        concentration: m.concentration,
        defaultRoute: m.defaultRoute,
        saleClassification: (m.saleClassification as SaleClassification) || 'IV',
        isControlledSubstance: m.isControlledSubstance,
        isActive: !m.isActive,
      },
      m.medicationId,
    );
    setSaving(false);
    if (!res.success) {
      setError(res.message ?? mensajeDeFalla(res.failure).titulo);
      return;
    }
    setDeactivateTarget(null);
    await cargar();
  };

  if (loading && tab === 'medicamentos') return <CargandoPantalla />;

  return (
    <div className="space-y-5" data-testid="page-admin-catalogos">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-foreground-900 font-heading">Catálogos</h1>
          <p className="text-sm text-foreground-500 mt-1">
            Medicamentos contra API (M8). CIE-10 y estudios pendientes de contrato.
          </p>
        </div>
      </div>

      <Tabs
        tabs={[
          {
            key: 'medicamentos',
            label: `Medicamentos (${items.length})`,
            icon: 'ri-capsule-line',
          },
          { key: 'cie10', label: 'CIE-10', icon: 'ri-book-open-line' },
          { key: 'estudios', label: 'Estudios', icon: 'ri-test-tube-line' },
        ]}
        activeTab={tab}
        onChange={(k) => setTab(k as TabKey)}
        ariaLabel="Catálogos"
      />

      {tab === 'medicamentos' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card padding="md">
              <p className="text-lg font-bold text-foreground-950">{items.length}</p>
              <p className="text-2xs text-foreground-500">En catálogo</p>
            </Card>
            <Card padding="md">
              <p className="text-lg font-bold text-foreground-950">
                {items.filter((m) => m.isActive).length}
              </p>
              <p className="text-2xs text-foreground-500">Activos</p>
            </Card>
            <Card padding="md">
              <p className="text-lg font-bold text-amber-800">
                {items.filter((m) => m.isControlledSubstance).length}
              </p>
              <p className="text-2xs text-foreground-500">Controlados (no prescritibles)</p>
            </Card>
          </div>

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[12rem] max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 pointer-events-none">
                <i className="ri-search-line text-sm" />
              </span>
              <input
                type="search"
                aria-label="Buscar medicamento"
                placeholder="Buscar genérico o marca…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <Select
              options={[
                { value: 'todos', label: 'Todos' },
                { value: 'activo', label: 'Activos' },
                { value: 'inactivo', label: 'Inactivos' },
              ]}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              className="w-36"
            />
            <Button variant="primary" size="sm" onClick={openCreate} className="ml-auto" icon={<i className="ri-add-line" />}>
              Nuevo medicamento
            </Button>
          </div>

          {viasDisponibles.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-2xs text-foreground-500 uppercase tracking-wide">Vía</span>
              <button
                type="button"
                onClick={() => setFilterVia('todas')}
                className={`px-2.5 py-1 rounded-full text-xs cursor-pointer transition-base ${
                  filterVia === 'todas'
                    ? 'bg-primary-100 text-primary-800'
                    : 'bg-secondary-100 text-foreground-600 hover:bg-secondary-200'
                }`}
              >
                Todas
              </button>
              {viasDisponibles.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setFilterVia(v)}
                  className={`px-2.5 py-1 rounded-full text-xs cursor-pointer transition-base ${
                    filterVia === v
                      ? 'bg-primary-100 text-primary-800'
                      : 'bg-secondary-100 text-foreground-600 hover:bg-secondary-200'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <Card padding="lg">
              <div className="flex flex-col items-center gap-2 py-6 text-foreground-400">
                <i className="ri-capsule-line text-2xl" />
                <p className="text-sm">No hay medicamentos con ese filtro</p>
                {(search || filterStatus !== 'todos' || filterVia !== 'todas') && (
                  <button
                    type="button"
                    className="text-xs text-primary-500 cursor-pointer"
                    onClick={() => {
                      setSearch('');
                      setFilterStatus('todos');
                      setFilterVia('todas');
                    }}
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((m) => {
                const open = expandedId === m.medicationId;
                return (
                  <Card
                    key={m.medicationId}
                    padding="md"
                    className={`cursor-pointer transition-base hover:border-primary-200 ${
                      open ? 'ring-1 ring-primary-200' : ''
                    }`}
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => setExpandedId(open ? null : m.medicationId)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground-900 truncate">{m.genericName}</p>
                          <p className="text-xs text-foreground-500 mt-0.5">
                            {[m.concentration, m.presentation].filter(Boolean).join(' · ') ||
                              'Sin presentación'}
                          </p>
                          <p className="text-2xs text-foreground-400 mt-1">
                            {m.defaultRoute ?? 'Vía no capturada'}
                            {m.brandName ? ` · ${m.brandName}` : ''}
                          </p>
                        </div>
                        <Badge variant={m.isActive ? 'success' : 'secondary'} size="sm">
                          {m.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                    </button>
                    {open && (
                      <div className="mt-3 pt-3 border-t border-secondary-100 space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="secondary" size="sm">
                            Fracción {m.saleClassification}
                          </Badge>
                          {m.isControlledSubstance && (
                            <Badge variant="warning" size="sm">
                              Controlado
                            </Badge>
                          )}
                        </div>
                        <p className="text-2xs text-foreground-400">
                          Categoría del prototipo: sin campo en API (no se inventa).
                        </p>
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" variant="secondary" onClick={() => openEdit(m)}>
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeactivateTarget(m)}
                          >
                            {m.isActive ? 'Desactivar' : 'Activar'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'cie10' && (
        <Card padding="md" className="border-dashed">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-lg bg-secondary-100 text-foreground-500 flex items-center justify-center flex-shrink-0">
              <i className="ri-book-open-line text-lg" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground-900">CIE-10</p>
              <p className="text-xs text-foreground-500 mt-2 leading-relaxed">
                El prototipo mostraba lista + detalle (código, categoría, subcategoría). Versión
                CIE/SNOMED pendiente (doc 06). Diagnósticos en consulta = texto libre; no se inventa
                catálogo oficial.
              </p>
            </div>
          </div>
        </Card>
      )}

      {tab === 'estudios' && (
        <Card padding="md" className="border-dashed">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-lg bg-secondary-100 text-foreground-500 flex items-center justify-center flex-shrink-0">
              <i className="ri-test-tube-line text-lg" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground-900">Estudios</p>
              <p className="text-xs text-foreground-500 mt-2 leading-relaxed">
                Catálogo lab/imagen/gabinete + ayuno está en Fase 2 (doc 13). Sin formularios mock.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar medicamento' : 'Nuevo medicamento'}
        size="md"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={() => void save()} disabled={saving}>
              Guardar
            </Button>
          </div>
        }
      >
        <div className="space-y-4" data-testid="catalogo-medicamento-modal">
          {formError && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}
          <Input
            label="Denominación genérica *"
            value={form.genericName}
            onChange={(e) => setForm((f) => ({ ...f, genericName: e.target.value }))}
          />
          <Input
            label="Marca"
            value={form.brandName ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, brandName: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Presentación"
              value={form.presentation ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, presentation: e.target.value }))}
            />
            <Input
              label="Concentración"
              value={form.concentration ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, concentration: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Vía por omisión"
              options={VIAS.map((v) => ({ value: v, label: v }))}
              value={form.defaultRoute ?? 'Oral'}
              onChange={(e) => setForm((f) => ({ ...f, defaultRoute: e.target.value }))}
            />
            <Select
              label="Fracción LGS 226"
              options={FRACCIONES}
              value={form.saleClassification}
              onChange={(e) => {
                const saleClassification = e.target.value as SaleClassification;
                setForm((f) => ({
                  ...f,
                  saleClassification,
                  isControlledSubstance:
                    saleClassification === 'I' ? true : f.isControlledSubstance,
                }));
              }}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground-800 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isControlledSubstance}
              onChange={(e) =>
                setForm((f) => ({ ...f, isControlledSubstance: e.target.checked }))
              }
            />
            Sustancia controlada (fuera de alcance de prescritir en F1–4)
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground-800 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            Activo en catálogo
          </label>
        </div>
      </Modal>

      <Modal
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        title={deactivateTarget?.isActive ? 'Desactivar medicamento' : 'Activar medicamento'}
        size="sm"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setDeactivateTarget(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              variant={deactivateTarget?.isActive ? 'danger' : 'primary'}
              onClick={() => void confirmToggleActive()}
              disabled={saving}
            >
              {deactivateTarget?.isActive ? 'Sí, desactivar' : 'Sí, activar'}
            </Button>
          </div>
        }
      >
        {deactivateTarget && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <span className="w-10 h-10 flex items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <i className="ri-error-warning-line text-lg" />
              </span>
              <p className="text-sm text-foreground-800">
                {deactivateTarget.isActive
                  ? 'Quedará fuera del listado de prescritir (baja lógica vía isActive).'
                  : 'Volverá a estar disponible en el catálogo activo.'}
              </p>
            </div>
            <p className="text-sm font-medium text-foreground-900">{deactivateTarget.genericName}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
