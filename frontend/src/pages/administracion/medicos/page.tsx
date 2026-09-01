import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSort } from '@/hooks/useSort';
import SortableTh from '@/components/feature/SortableTh';
import {
  createProfessional,
  listProfessionals,
  listSpecialties,
  softDeleteProfessional,
  updateProfessional,
  type ProfessionalDto,
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

const NO_CAPTURADO = 'No capturado';

interface FormData {
  fullName: string;
  specialtyId: string;
  professionalLicense: string;
  isActive: boolean;
}

const emptyForm: FormData = {
  fullName: '',
  specialtyId: '',
  professionalLicense: '',
  isActive: true,
};

export default function Medicos() {
  const [items, setItems] = useState<ProfessionalDto[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'activo' | 'inactivo'>('todos');
  const [filterEspecialidad, setFilterEspecialidad] = useState('todas');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<ProfessionalDto | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [profs, specs] = await Promise.all([
      listProfessionals(false),
      listSpecialties(true),
    ]);
    if (!profs.success || !profs.data) {
      const msg = mensajeDeFalla(profs.failure);
      setError(profs.message ?? msg.titulo);
      setLoading(false);
      return;
    }
    if (!specs.success || !specs.data) {
      const msg = mensajeDeFalla(specs.failure);
      setError(specs.message ?? msg.titulo);
      setLoading(false);
      return;
    }
    setItems(profs.data);
    setSpecialties(specs.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const filtered = items.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      d.fullName.toLowerCase().includes(q) ||
      (d.professionalLicense ?? '').toLowerCase().includes(q) ||
      (d.specialtyName ?? '').toLowerCase().includes(q);
    const matchStatus =
      filterStatus === 'todos' ||
      (filterStatus === 'activo' && d.isActive) ||
      (filterStatus === 'inactivo' && !d.isActive);
    const matchEsp =
      filterEspecialidad === 'todas' || d.specialtyId === filterEspecialidad;
    return matchSearch && matchStatus && matchEsp;
  });

  const sorters = useMemo(
    () => ({
      medico: (a: ProfessionalDto, b: ProfessionalDto) => a.fullName.localeCompare(b.fullName),
      especialidad: (a: ProfessionalDto, b: ProfessionalDto) =>
        (a.specialtyName ?? '').localeCompare(b.specialtyName ?? ''),
      cedula: (a: ProfessionalDto, b: ProfessionalDto) =>
        (a.professionalLicense ?? '').localeCompare(b.professionalLicense ?? ''),
      estado: (a: ProfessionalDto, b: ProfessionalDto) => Number(b.isActive) - Number(a.isActive),
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

  const openEdit = (d: ProfessionalDto) => {
    setEditingId(d.healthcareProfessionalId);
    setForm({
      fullName: d.fullName,
      specialtyId: d.specialtyId ?? '',
      professionalLicense: d.professionalLicense ?? '',
      isActive: d.isActive,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};
    if (!form.fullName.trim()) errors.fullName = 'El nombre es obligatorio';
    else if (form.fullName.trim().length > 200) errors.fullName = 'Máximo 200 caracteres';
    if (form.professionalLicense.trim().length > 64) errors.professionalLicense = 'Máximo 64 caracteres';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setError(null);

    const license = form.professionalLicense.trim();
    const specialtyId = form.specialtyId || null;

    if (editingId) {
      const res = await updateProfessional(editingId, {
        fullName: form.fullName.trim(),
        professionalLicense: license || null,
        clearProfessionalLicense: license.length === 0,
        specialtyId,
        clearSpecialtyId: !specialtyId,
        isActive: form.isActive,
      });
      setSaving(false);
      if (!res.success) {
        const msg = mensajeDeFalla(res.failure);
        setError(res.message ?? msg.titulo);
        return;
      }
    } else {
      const res = await createProfessional({
        fullName: form.fullName.trim(),
        professionalLicense: license || null,
        specialtyId,
        isActive: form.isActive,
      });
      setSaving(false);
      if (!res.success) {
        const msg = mensajeDeFalla(res.failure);
        setError(res.message ?? msg.titulo);
        return;
      }
    }

    setModalOpen(false);
    await cargar();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    const res = await softDeleteProfessional(deleteTarget.healthcareProfessionalId);
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
    <div className="space-y-6" data-testid="page-admin-medicos">
      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
          data-testid="admin-medicos-error"
        >
          {error}
        </div>
      )}

      <div className="flex items-center justify-end">
        <Button icon={<i className="ri-add-line" />} onClick={openCreate} data-testid="btn-nuevo-medico">
          Nuevo médico
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <div className="relative w-full sm:w-72">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
            <i className="ri-search-line text-sm" />
          </span>
          <input
            type="search"
            aria-label="Buscar médicos"
            placeholder="Buscar por nombre, cédula o especialidad…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="search-medicos"
            className="w-full pl-10 pr-3 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          className="px-3 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 cursor-pointer"
        >
          <option value="todos">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
        <select
          value={filterEspecialidad}
          onChange={(e) => setFilterEspecialidad(e.target.value)}
          className="px-3 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 cursor-pointer"
        >
          <option value="todas">Todas las especialidades</option>
          {specialties.map((s) => (
            <option key={s.specialtyId} value={s.specialtyId}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="tabla-medicos">
            <thead>
              <tr className="border-b border-secondary-200 text-left">
                <SortableTh label="Médico" sortKey="medico" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTh label="Especialidad" sortKey="especialidad" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTh label="Cédula" sortKey="cedula" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTh label="Estado" sortKey="estado" activeKey={sortKey} direction={direction} onSort={toggleSort} align="center" />
                <th className="px-5 py-2 text-xs font-semibold text-foreground-500 uppercase tracking-wider w-24 text-center">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-foreground-400" data-testid="tabla-medicos-vacia">
                    No se encontraron médicos
                  </td>
                </tr>
              ) : (
                sortedData.map((d) => (
                  <tr
                    key={d.healthcareProfessionalId}
                    className="hover:bg-secondary-50/50 transition-base group"
                    data-testid={`admin-medico-row-${d.healthcareProfessionalId}`}
                  >
                    <td className="px-5 py-2">
                      <p className="font-medium text-foreground-900">{d.fullName}</p>
                    </td>
                    <td className="px-5 py-2">
                      <Badge variant="secondary">{d.specialtyName ?? NO_CAPTURADO}</Badge>
                    </td>
                    <td className="px-5 py-2 text-foreground-600 font-mono text-xs">
                      {d.professionalLicense ?? NO_CAPTURADO}
                    </td>
                    <td className="px-5 py-2 text-center">
                      <Badge variant={d.isActive ? 'success' : 'danger'} dot>
                        {d.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-5 py-2">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-base">
                        <button
                          type="button"
                          onClick={() => openEdit(d)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-foreground-700 hover:bg-secondary-100 transition-base cursor-pointer"
                          aria-label={`Editar médico ${d.fullName}`}
                          title="Editar"
                          data-testid={`admin-medico-editar-${d.healthcareProfessionalId}`}
                        >
                          <i className="ri-pencil-line text-sm" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(d)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-red-600 hover:bg-red-500/10 transition-base cursor-pointer"
                          aria-label={`Dar de baja a ${d.fullName}`}
                          title="Baja lógica"
                          data-testid={`admin-medico-baja-${d.healthcareProfessionalId}`}
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
        title={editingId ? 'Editar médico' : 'Nuevo médico'}
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving} data-testid="btn-guardar-medico">
              {editingId ? 'Guardar cambios' : 'Registrar médico'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5" data-testid="modal-medico">
          <Input
            label="Nombre completo"
            placeholder="Ej: Dr. Alejandro García Mendoza"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            error={formErrors.fullName}
            maxLength={200}
            autoComplete="name"
            data-testid="input-medico-nombre"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Especialidad"
              value={form.specialtyId}
              onChange={(e) => setForm({ ...form, specialtyId: e.target.value })}
              options={[
                { value: '', label: 'No capturada' },
                ...specialties.map((s) => ({ value: s.specialtyId, label: s.name })),
              ]}
              placeholder="Seleccionar especialidad"
              data-testid="select-medico-especialidad"
            />
            <Input
              label="Cédula profesional"
              placeholder="Opcional — no se inventa"
              value={form.professionalLicense}
              onChange={(e) => setForm({ ...form, professionalLicense: e.target.value })}
              error={formErrors.professionalLicense}
              maxLength={64}
              autoComplete="off"
              data-testid="input-medico-cedula"
            />
          </div>
          <Select
            label="Estado"
            value={form.isActive ? 'activo' : 'inactivo'}
            onChange={(e) => setForm({ ...form, isActive: e.target.value === 'activo' })}
            options={[
              { value: 'activo', label: 'Activo' },
              { value: 'inactivo', label: 'Inactivo' },
            ]}
          />
          <p className="text-xs text-foreground-500">
            Sin cédula capturada el profesional no puede firmar documentos (fail closed). La cédula no se rellena por
            omisión.
          </p>
        </div>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Baja de médico"
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
              data-testid="btn-confirmar-baja-medico"
            >
              Confirmar baja
            </Button>
          </div>
        }
      >
        {deleteTarget && (
          <div className="space-y-3" data-testid="modal-baja-medico">
            <p className="text-sm text-foreground-700">
              Baja lógica de <strong>{deleteTarget.fullName}</strong>. No se borra el registro; queda inactivo y fuera
              de listados vigentes.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
