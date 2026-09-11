/**
 * Especialidades — UI alineada a Readdy / docs/frontend.
 * Persistido: code, name, isActive. Descripción / icono / color: sin columna en BD (honestos).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSort } from '@/hooks/useSort';
import SortableTh from '@/components/feature/SortableTh';
import {
  listSpecialties,
  softDeleteSpecialty,
  upsertSpecialty,
  type SpecialtyDto,
} from '@/api/professionals';
import { mensajeDeFalla } from '@/api/errors';
import Button from '@/components/base/Button';
import Card from '@/components/base/Card';
import Modal from '@/components/base/Modal';
import Input from '@/components/base/Input';
import Select from '@/components/base/Select';
import Badge from '@/components/base/Badge';
import CargandoPantalla from '@/components/feature/CargandoPantalla';

interface FormData {
  code: string;
  name: string;
  isActive: boolean;
}

const emptyForm: FormData = { code: '', name: '', isActive: true };

function codeFromName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 64);
}

export default function Especialidades() {
  const [items, setItems] = useState<SpecialtyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<SpecialtyDto | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listSpecialties(false);
    if (!res.success || !res.data) {
      const msg = mensajeDeFalla(res.failure);
      setError(res.message ?? msg.titulo);
      setLoading(false);
      return;
    }
    setItems(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const filtered = items.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()),
  );

  const sorters = useMemo(
    () => ({
      especialidad: (a: SpecialtyDto, b: SpecialtyDto) => a.name.localeCompare(b.name),
      codigo: (a: SpecialtyDto, b: SpecialtyDto) => a.code.localeCompare(b.code),
      estado: (a: SpecialtyDto, b: SpecialtyDto) => Number(b.isActive) - Number(a.isActive),
    }),
    [],
  );

  const { sortedData, sortKey, direction, toggleSort } = useSort(filtered, sorters);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (s: SpecialtyDto) => {
    setEditingId(s.specialtyId);
    setForm({ code: s.code, name: s.name, isActive: s.isActive });
    setFormErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) errors.name = 'El nombre es obligatorio';
    else if (form.name.trim().length > 200) errors.name = 'Máximo 200 caracteres';
    const code = form.code.trim() || codeFromName(form.name);
    if (!code) errors.code = 'El código es obligatorio';
    else if (code.length > 64) errors.code = 'Máximo 64 caracteres';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setError(null);
    const id = editingId ?? crypto.randomUUID();
    const code = (form.code.trim() || codeFromName(form.name)).toUpperCase();
    const res = await upsertSpecialty(id, {
      code,
      name: form.name.trim(),
      isActive: form.isActive,
    });
    setSaving(false);
    if (!res.success) {
      const msg = mensajeDeFalla(res.failure);
      setError(res.message ?? msg.titulo);
      return;
    }
    setModalOpen(false);
    await cargar();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    const res = await softDeleteSpecialty(deleteTarget.specialtyId);
    setSaving(false);
    if (!res.success) {
      const msg = mensajeDeFalla(res.failure);
      setError(res.message ?? msg.titulo);
      return;
    }
    setDeleteTarget(null);
    await cargar();
  };

  if (loading) return <CargandoPantalla />;

  return (
    <div className="space-y-6" data-testid="page-admin-especialidades">
      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
          data-testid="admin-especialidades-error"
        >
          {error}
        </div>
      )}

      <div className="flex items-center justify-end">
        <Button icon={<i className="ri-add-line" />} onClick={openCreate} data-testid="btn-nueva-especialidad">
          Nueva Especialidad
        </Button>
      </div>

      <div className="relative w-full sm:w-80">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
          <i className="ri-search-line text-sm" />
        </span>
        <input
          type="search"
          aria-label="Buscar especialidad"
          placeholder="Buscar especialidad..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="search-especialidades"
          className="w-full pl-10 pr-3 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base"
        />
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="tabla-especialidades">
            <thead>
              <tr className="border-b border-secondary-200 text-left">
                <SortableTh
                  label="Especialidad"
                  sortKey="especialidad"
                  activeKey={sortKey}
                  direction={direction}
                  onSort={toggleSort}
                />
                <SortableTh label="Código" sortKey="codigo" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTh
                  label="Estado"
                  sortKey="estado"
                  activeKey={sortKey}
                  direction={direction}
                  onSort={toggleSort}
                  align="center"
                />
                <th className="px-5 py-2 text-xs font-semibold text-foreground-500 uppercase tracking-wider w-24 text-center">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {sortedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-12 text-center text-foreground-400"
                    data-testid="tabla-especialidades-vacia"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span className="w-10 h-10 flex items-center justify-center">
                        <i className="ri-hospital-line text-2xl" />
                      </span>
                      <p className="text-sm">No se encontraron especialidades</p>
                      {search && (
                        <button
                          type="button"
                          onClick={() => setSearch('')}
                          className="text-xs text-primary-500 hover:text-primary-600 cursor-pointer"
                        >
                          Limpiar búsqueda
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                sortedData.map((s) => (
                  <tr
                    key={s.specialtyId}
                    className="hover:bg-secondary-50/50 transition-base group"
                    data-testid={`admin-especialidad-row-${s.specialtyId}`}
                  >
                    <td className="px-5 py-2">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0">
                          <i className="ri-stethoscope-line text-base" aria-hidden />
                        </span>
                        <p className="font-medium text-foreground-900">{s.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-2 font-mono text-xs text-foreground-600">{s.code}</td>
                    <td className="px-5 py-2 text-center">
                      <Badge variant={s.isActive ? 'success' : 'danger'} dot>
                        {s.isActive ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </td>
                    <td className="px-5 py-2">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-base">
                        <button
                          type="button"
                          onClick={() => openEdit(s)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-foreground-700 hover:bg-secondary-100 cursor-pointer"
                          aria-label={`Editar especialidad ${s.name}`}
                          title="Editar"
                          data-testid={`admin-especialidad-editar-${s.specialtyId}`}
                        >
                          <i className="ri-pencil-line text-sm" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(s)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-red-600 hover:bg-red-500/10 cursor-pointer"
                          aria-label={`Dar de baja ${s.name}`}
                          title="Baja lógica"
                          data-testid={`admin-especialidad-baja-${s.specialtyId}`}
                        >
                          <i className="ri-delete-bin-line text-sm" aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar Especialidad' : 'Nueva Especialidad'}
        size="md"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={saving}
              data-testid="btn-guardar-especialidad"
            >
              {editingId ? 'Guardar Cambios' : 'Crear Especialidad'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4" data-testid="modal-especialidad">
          <Input
            label="Nombre"
            placeholder="Ej: Cardiología"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={formErrors.name}
            maxLength={200}
            autoComplete="off"
            data-testid="input-especialidad-nombre"
          />
          <Input
            label="Código"
            placeholder="Se deriva del nombre si se deja vacío"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            error={formErrors.code}
            maxLength={64}
            autoComplete="off"
            data-testid="input-especialidad-codigo"
          />
          <Select
            label="Estado"
            value={form.isActive ? 'activo' : 'inactivo'}
            onChange={(e) => setForm({ ...form, isActive: e.target.value === 'activo' })}
            options={[
              { value: 'activo', label: 'Activa' },
              { value: 'inactivo', label: 'Inactiva' },
            ]}
            data-testid="select-especialidad-estado"
          />

          <div className="rounded-lg border border-dashed border-secondary-200 bg-background-50 p-3 space-y-3">
            <p className="text-xs text-foreground-500">
              Descripción, icono y color del prototipo aún no tienen columna en el catálogo; no se
              inventan.
            </p>
            <Input label="Descripción" placeholder="Sin campo en API" value="" disabled />
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center">
                <i className="ri-stethoscope-line" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground-800">
                  {form.name.trim() || 'Vista previa'}
                </p>
                <p className="text-2xs text-foreground-400">Icono/color decorativos fijos</p>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar Especialidad"
        size="sm"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => void handleDelete()}
              disabled={saving}
              data-testid="btn-confirmar-baja-especialidad"
            >
              Confirmar baja
            </Button>
          </div>
        }
      >
        {deleteTarget && (
          <div className="space-y-4" data-testid="modal-baja-especialidad">
            <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
              <span className="w-10 h-10 flex items-center justify-center rounded-full bg-red-100 text-red-600">
                <i className="ri-error-warning-line text-lg" />
              </span>
              <div>
                <p className="text-sm font-medium text-red-800">¿Dar de baja esta especialidad?</p>
                <p className="text-xs text-red-600 mt-0.5">
                  Baja lógica: no se borra el registro. Los profesionales ligados conservan el
                  SpecialtyId.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-background-50 rounded-lg border border-secondary-200">
              <span className="w-9 h-9 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center">
                <i className="ri-stethoscope-line" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground-900">{deleteTarget.name}</p>
                <p className="text-xs text-foreground-500 font-mono">{deleteTarget.code}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
