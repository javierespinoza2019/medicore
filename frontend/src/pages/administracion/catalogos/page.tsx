/**
 * Catálogos admin — Medicamentos (API M8). CIE-10 / estudios: placeholder (F2 / decisión abierta).
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
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((m) => {
      const matchQ =
        !q ||
        m.genericName.toLowerCase().includes(q) ||
        (m.brandName ?? '').toLowerCase().includes(q);
      const matchStatus =
        filterStatus === 'todos' ||
        (filterStatus === 'activo' && m.isActive) ||
        (filterStatus === 'inactivo' && !m.isActive);
      return matchQ && matchStatus;
    });
  }, [items, search, filterStatus]);

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

  const toggleActive = async (m: MedicationDto) => {
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
    if (!res.success) {
      setError(res.message ?? mensajeDeFalla(res.failure).titulo);
      return;
    }
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
          { key: 'medicamentos', label: 'Medicamentos', icon: 'ri-capsule-line' },
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
            <Input
              placeholder="Buscar genérico o marca…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
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
            <Button variant="primary" size="sm" onClick={openCreate} className="ml-auto">
              <i className="ri-add-line" /> Nuevo medicamento
            </Button>
          </div>

          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary-50 border-b border-secondary-200">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-foreground-600">Genérico</th>
                    <th className="text-left px-4 py-2 font-medium text-foreground-600">Marca</th>
                    <th className="text-left px-4 py-2 font-medium text-foreground-600">Fracción</th>
                    <th className="text-left px-4 py-2 font-medium text-foreground-600">Estado</th>
                    <th className="text-right px-4 py-2 font-medium text-foreground-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr key={m.medicationId} className="border-b border-secondary-100 hover:bg-secondary-50/50">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-foreground-900">{m.genericName}</p>
                        <p className="text-2xs text-foreground-500">
                          {[m.presentation, m.concentration, m.defaultRoute].filter(Boolean).join(' · ')}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 text-foreground-700">{m.brandName || '—'}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="secondary" size="sm">
                            {m.saleClassification}
                          </Badge>
                          {m.isControlledSubstance && (
                            <Badge variant="warning" size="sm">
                              Controlado
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={m.isActive ? 'success' : 'secondary'} size="sm">
                          {m.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="text-xs text-primary-600 hover:underline mr-3"
                          onClick={() => openEdit(m)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="text-xs text-foreground-600 hover:underline"
                          onClick={() => void toggleActive(m)}
                        >
                          {m.isActive ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-foreground-400">
                        No hay medicamentos con ese filtro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {tab === 'cie10' && (
        <Card padding="md" className="border-dashed">
          <p className="text-sm font-semibold text-foreground-900">CIE-10</p>
          <p className="text-xs text-foreground-500 mt-2 leading-relaxed">
            Versión de CIE / SNOMED pendiente de decisión (doc 06). Los diagnósticos en consulta
            siguen como texto libre; no se inventa un catálogo oficial.
          </p>
        </Card>
      )}

      {tab === 'estudios' && (
        <Card padding="md" className="border-dashed">
          <p className="text-sm font-semibold text-foreground-900">Estudios</p>
          <p className="text-xs text-foreground-500 mt-2 leading-relaxed">
            Catálogo de estudios y resultados está en Fase 2 (doc 13). Sin formularios mock.
          </p>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} size="md">
        <div className="space-y-4" data-testid="catalogo-medicamento-modal">
          <h2 className="text-lg font-semibold text-foreground-900">
            {editingId ? 'Editar medicamento' : 'Nuevo medicamento'}
          </h2>
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
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={() => void save()} disabled={saving}>
              Guardar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
