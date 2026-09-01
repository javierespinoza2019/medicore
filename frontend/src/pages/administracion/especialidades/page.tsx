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
          Nueva especialidad
        </Button>
      </div>

      <div className="relative w-full sm:w-80">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
          <i className="ri-search-line text-sm" />
        </span>
        <input
          type="search"
          aria-label="Buscar especialidad"
          placeholder="Buscar especialidad…"
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
                <th className="px-5 py-2 text-xs font-semibold text-foreground-500 uppercase tracking-wider text-center">
                  Estado
                </th>
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
                    No se encontraron especialidades
                  </td>
                </tr>
              ) : (
                sortedData.map((s) => (
                  <tr
                    key={s.specialtyId}
                    className="hover:bg-secondary-50/50 transition-base group"
                    data-testid={`admin-especialidad-row-${s.specialtyId}`}
                  >
                    <td className="px-5 py-2 font-medium text-foreground-900">{s.name}</td>
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
        title={editingId ? 'Editar especialidad' : 'Nueva especialidad'}
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
              {editingId ? 'Guardar cambios' : 'Crear especialidad'}
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
        </div>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Baja de especialidad"
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
          <p className="text-sm text-foreground-700" data-testid="modal-baja-especialidad">
            Baja lógica de <strong>{deleteTarget.name}</strong> ({deleteTarget.code}). Los profesionales ligados
            conservan el SpecialtyId; el nombre puede dejar de resolverse en listados.
          </p>
        )}
      </Modal>
    </div>
  );
}
