import { useState, useEffect } from 'react';
import Modal from '@/components/base/Modal';
import Input from '@/components/base/Input';
import Select from '@/components/base/Select';
import type { Medicamento } from '@/mocks/recetas';
import { viasAdministracion } from '@/mocks/recetas';

interface MedicamentoFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (med: Medicamento) => void;
  medicamento: Medicamento | null;
}

export default function MedicamentoFormModal({ open, onClose, onSave, medicamento }: MedicamentoFormModalProps) {
  const isEdit = medicamento !== null;

  const [form, setForm] = useState({
    nombre: '',
    presentacion: '',
    concentracion: '',
    categoria: '',
    viaAdministracion: 'Oral',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (medicamento) {
      setForm({
        nombre: medicamento.nombre,
        presentacion: medicamento.presentacion,
        concentracion: medicamento.concentracion,
        categoria: medicamento.categoria,
        viaAdministracion: medicamento.viaAdministracion,
      });
    } else {
      setForm({ nombre: '', presentacion: '', concentracion: '', categoria: '', viaAdministracion: 'Oral' });
    }
    setErrors({});
  }, [medicamento, open]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.nombre.trim()) errs.nombre = 'El nombre es obligatorio';
    else if (form.nombre.trim().length > 100) errs.nombre = 'El nombre no puede exceder 100 caracteres';
    if (!form.presentacion.trim()) errs.presentacion = 'La presentación es obligatoria';
    else if (form.presentacion.trim().length > 50) errs.presentacion = 'La presentación no puede exceder 50 caracteres';
    if (!form.concentracion.trim()) errs.concentracion = 'La concentración es obligatoria';
    else if (form.concentracion.trim().length > 50) errs.concentracion = 'La concentración no puede exceder 50 caracteres';
    if (!form.categoria.trim()) errs.categoria = 'La categoría es obligatoria';
    else if (form.categoria.trim().length > 60) errs.categoria = 'La categoría no puede exceder 60 caracteres';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const newMed: Medicamento = {
      id: isEdit ? medicamento!.id : `m${Date.now()}`,
      nombre: form.nombre.trim(),
      presentacion: form.presentacion.trim(),
      concentracion: form.concentracion.trim(),
      categoria: form.categoria.trim(),
      viaAdministracion: form.viaAdministracion,
    };
    onSave(newMed);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar medicamento' : 'Nuevo medicamento'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nombre del medicamento"
          placeholder="Ej: Paracetamol"
          value={form.nombre}
          onChange={(e) => { setForm({ ...form, nombre: e.target.value }); setErrors({ ...errors, nombre: '' }); }}
          error={errors.nombre}
          maxLength={100}
          autoComplete="off"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Presentación"
            placeholder="Ej: Tableta"
            value={form.presentacion}
            onChange={(e) => { setForm({ ...form, presentacion: e.target.value }); setErrors({ ...errors, presentacion: '' }); }}
            error={errors.presentacion}
            maxLength={50}
            autoComplete="off"
          />
          <Input
            label="Concentración"
            placeholder="Ej: 500mg"
            value={form.concentracion}
            onChange={(e) => { setForm({ ...form, concentracion: e.target.value }); setErrors({ ...errors, concentracion: '' }); }}
            error={errors.concentracion}
            maxLength={50}
            autoComplete="off"
          />
        </div>

        <Input
          label="Categoría"
          placeholder="Ej: Analgésico / Antipirético"
          value={form.categoria}
          onChange={(e) => { setForm({ ...form, categoria: e.target.value }); setErrors({ ...errors, categoria: '' }); }}
          error={errors.categoria}
          maxLength={60}
          autoComplete="off"
        />

        <Select
          label="Vía de administración"
          value={form.viaAdministracion}
          onChange={(e) => setForm({ ...form, viaAdministracion: e.target.value })}
          options={viasAdministracion.map((via) => ({ value: via, label: via }))}
        />

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-secondary-100 text-foreground-700 hover:bg-secondary-200 transition-base cursor-pointer whitespace-nowrap"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-base cursor-pointer whitespace-nowrap"
          >
            {isEdit ? 'Guardar cambios' : 'Agregar medicamento'}
          </button>
        </div>
      </form>
    </Modal>
  );
}