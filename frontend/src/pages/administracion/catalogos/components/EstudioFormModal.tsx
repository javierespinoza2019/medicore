import { useState, useEffect } from 'react';
import Modal from '@/components/base/Modal';
import Input from '@/components/base/Input';
import Textarea from '@/components/base/Textarea';
import Select from '@/components/base/Select';
import type { EstudioCatalogo } from '@/mocks/estudios';

const tiposEstudio: { value: EstudioCatalogo['tipo']; label: string }[] = [
  { value: 'laboratorio', label: 'Laboratorio' },
  { value: 'imagen', label: 'Imagen' },
  { value: 'gabinete', label: 'Gabinete' },
  { value: 'patologia', label: 'Patología' },
  { value: 'otro', label: 'Otro' },
];

interface EstudioFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (e: EstudioCatalogo) => void;
  estudio: EstudioCatalogo | null;
}

export default function EstudioFormModal({ open, onClose, onSave, estudio }: EstudioFormModalProps) {
  const isEdit = estudio !== null;

  const [form, setForm] = useState({
    nombre: '',
    tipo: 'laboratorio' as EstudioCatalogo['tipo'],
    categoria: '',
    descripcion: '',
    requiereAyuno: false,
    tiempoResultado: '',
    precio: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (estudio) {
      setForm({
        nombre: estudio.nombre,
        tipo: estudio.tipo,
        categoria: estudio.categoria,
        descripcion: estudio.descripcion,
        requiereAyuno: estudio.requiereAyuno,
        tiempoResultado: estudio.tiempoResultado,
        precio: String(estudio.precio),
      });
    } else {
      setForm({ nombre: '', tipo: 'laboratorio', categoria: '', descripcion: '', requiereAyuno: false, tiempoResultado: '', precio: '' });
    }
    setErrors({});
  }, [estudio, open]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.nombre.trim()) errs.nombre = 'El nombre es obligatorio';
    else if (form.nombre.trim().length > 150) errs.nombre = 'El nombre no puede exceder 150 caracteres';
    if (!form.categoria.trim()) errs.categoria = 'La categoría es obligatoria';
    else if (form.categoria.trim().length > 60) errs.categoria = 'La categoría no puede exceder 60 caracteres';
    if (!form.descripcion.trim()) errs.descripcion = 'La descripción es obligatoria';
    else if (form.descripcion.trim().length > 500) errs.descripcion = 'La descripción no puede exceder 500 caracteres';
    if (!form.tiempoResultado.trim()) errs.tiempoResultado = 'El tiempo de resultado es obligatorio';
    else if (form.tiempoResultado.trim().length > 50) errs.tiempoResultado = 'El tiempo no puede exceder 50 caracteres';
    if (!form.precio.trim() || isNaN(Number(form.precio)) || Number(form.precio) < 0) errs.precio = 'Ingresa un precio válido';
    else if (Number(form.precio) > 999999) errs.precio = 'El precio no puede exceder $999,999';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const newEstudio: EstudioCatalogo = {
      id: isEdit ? estudio!.id : `e${Date.now()}`,
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      categoria: form.categoria.trim(),
      descripcion: form.descripcion.trim(),
      requiereAyuno: form.requiereAyuno,
      tiempoResultado: form.tiempoResultado.trim(),
      precio: Number(form.precio),
    };
    onSave(newEstudio);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar estudio' : 'Nuevo estudio'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nombre del estudio"
          placeholder="Ej: Biometría hemática completa"
          value={form.nombre}
          onChange={(e) => { setForm({ ...form, nombre: e.target.value }); setErrors({ ...errors, nombre: '' }); }}
          error={errors.nombre}
          maxLength={150}
          autoComplete="off"
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Tipo de estudio"
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value as EstudioCatalogo['tipo'] })}
            options={tiposEstudio.map((t) => ({ value: t.value, label: t.label }))}
          />
          <Input
            label="Tiempo de resultado"
            placeholder="Ej: 2-4 horas"
            value={form.tiempoResultado}
            onChange={(e) => { setForm({ ...form, tiempoResultado: e.target.value }); setErrors({ ...errors, tiempoResultado: '' }); }}
            error={errors.tiempoResultado}
            maxLength={50}
            autoComplete="off"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Categoría"
            placeholder="Ej: Hematología"
            value={form.categoria}
            onChange={(e) => { setForm({ ...form, categoria: e.target.value }); setErrors({ ...errors, categoria: '' }); }}
            error={errors.categoria}
            maxLength={60}
            autoComplete="off"
          />
          <Input
            label="Precio (MXN)"
            placeholder="500"
            type="number"
            min="0"
            value={form.precio}
            onChange={(e) => { setForm({ ...form, precio: e.target.value }); setErrors({ ...errors, precio: '' }); }}
            error={errors.precio}
          />
        </div>

        <Textarea
          label="Descripción"
          placeholder="Descripción del estudio..."
          value={form.descripcion}
          onChange={(e) => { setForm({ ...form, descripcion: e.target.value }); setErrors({ ...errors, descripcion: '' }); }}
          error={errors.descripcion}
          maxLength={500}
          autoComplete="off"
          rows={3}
        />

        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={form.requiereAyuno}
              onChange={(e) => setForm({ ...form, requiereAyuno: e.target.checked })}
              className="sr-only peer"
              aria-label="Requiere ayuno"
            />
            <div className="w-9 h-5 bg-secondary-200 peer-checked:bg-amber-400 rounded-full peer transition-base after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-base peer-checked:after:translate-x-full"></div>
          </label>
          <span className="text-sm text-foreground-700">Requiere ayuno</span>
        </div>

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
            {isEdit ? 'Guardar cambios' : 'Agregar estudio'}
          </button>
        </div>
      </form>
    </Modal>
  );
}