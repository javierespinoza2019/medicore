import { useState, useEffect } from 'react';
import Modal from '@/components/base/Modal';
import Input from '@/components/base/Input';
import Select from '@/components/base/Select';
import type { DiagnosticoCIE10 } from '@/mocks/diagnosticos';

const categoriasOptions = [
  'Infecciosas', 'Neoplasias', 'Endocrinas', 'Nervioso', 'Circulatorio',
  'Respiratorio', 'Digestivo', 'Piel', 'Musculoesquelético', 'Genitourinario',
  'Traumatismos', 'Factores de salud', 'Síntomas',
];

interface CIE10FormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (d: DiagnosticoCIE10) => void;
  diagnostico: DiagnosticoCIE10 | null;
}

export default function CIE10FormModal({ open, onClose, onSave, diagnostico }: CIE10FormModalProps) {
  const isEdit = diagnostico !== null;

  const [form, setForm] = useState({
    codigo: '',
    descripcion: '',
    categoria: 'Infecciosas',
    subcategoria: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (diagnostico) {
      setForm({
        codigo: diagnostico.codigo,
        descripcion: diagnostico.descripcion,
        categoria: diagnostico.categoria,
        subcategoria: diagnostico.subcategoria,
      });
    } else {
      setForm({ codigo: '', descripcion: '', categoria: 'Infecciosas', subcategoria: '' });
    }
    setErrors({});
  }, [diagnostico, open]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.codigo.trim()) errs.codigo = 'El código es obligatorio';
    else if (form.codigo.trim().length > 10) errs.codigo = 'El código no puede exceder 10 caracteres';
    if (!form.descripcion.trim()) errs.descripcion = 'La descripción es obligatoria';
    else if (form.descripcion.trim().length > 500) errs.descripcion = 'La descripción no puede exceder 500 caracteres';
    if (!form.subcategoria.trim()) errs.subcategoria = 'La subcategoría es obligatoria';
    else if (form.subcategoria.trim().length > 100) errs.subcategoria = 'La subcategoría no puede exceder 100 caracteres';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const newDiag: DiagnosticoCIE10 = {
      codigo: form.codigo.trim().toUpperCase(),
      descripcion: form.descripcion.trim(),
      categoria: form.categoria,
      subcategoria: form.subcategoria.trim(),
    };
    onSave(newDiag);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar diagnóstico CIE-10' : 'Nuevo diagnóstico CIE-10'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Código CIE-10"
            placeholder="Ej: I10"
            value={form.codigo}
            onChange={(e) => { setForm({ ...form, codigo: e.target.value }); setErrors({ ...errors, codigo: '' }); }}
            error={errors.codigo}
            maxLength={10}
            autoComplete="off"
          />
          <Select
            label="Categoría"
            value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            options={categoriasOptions.map((cat) => ({ value: cat, label: cat }))}
          />
        </div>

        <Input
          label="Subcategoría"
          placeholder="Ej: Enfermedad hipertensiva"
          value={form.subcategoria}
          onChange={(e) => { setForm({ ...form, subcategoria: e.target.value }); setErrors({ ...errors, subcategoria: '' }); }}
          error={errors.subcategoria}
          maxLength={100}
          autoComplete="off"
        />

        <Input
          label="Descripción"
          as="textarea"
          placeholder="Descripción del diagnóstico..."
          value={form.descripcion}
          onChange={(e) => { setForm({ ...form, descripcion: e.target.value }); setErrors({ ...errors, descripcion: '' }); }}
          error={errors.descripcion}
          maxLength={500}
          autoComplete="off"
          rows={3}
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
            {isEdit ? 'Guardar cambios' : 'Agregar diagnóstico'}
          </button>
        </div>
      </form>
    </Modal>
  );
}