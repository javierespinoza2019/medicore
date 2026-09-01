import { useState } from 'react';
import {
  TIPOS_PACIENTE,
  CATEGORIAS_DIAGNOSTICO,
  type PlantillaMedica,
  type TipoPacientePlantilla,
} from '@/mocks/plantillas';
import type { Pronostico } from '@/mocks/notasEvolucion';
import DiagnosticoCIE10Search from './DiagnosticoCIE10Search';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  doctorId: string;
  doctorName: string;
  plantillas: PlantillaMedica[];
  onAdd: (p: PlantillaMedica) => void;
  onUpdate: (p: PlantillaMedica) => void;
  onRemove: (id: string) => void;
  onApply: (p: PlantillaMedica) => void;
}

interface FormState {
  nombre: string;
  tipoPaciente: TipoPacientePlantilla;
  tipoDiagnostico: string;
  diagnosticoPrincipal: string;
  diagnosticosSecundarios: string[];
  evolucionSubjetiva: string;
  evolucionObjetiva: string;
  tratamiento: string;
  pronostico: Pronostico;
  observaciones: string;
}

const emptyForm: FormState = {
  nombre: '',
  tipoPaciente: 'Adulto',
  tipoDiagnostico: 'General',
  diagnosticoPrincipal: '',
  diagnosticosSecundarios: [],
  evolucionSubjetiva: '',
  evolucionObjetiva: '',
  tratamiento: '',
  pronostico: 'bueno',
  observaciones: '',
};

const pronosticoOptions: { value: Pronostico; label: string; active: string }[] = [
  { value: 'bueno', label: 'Bueno', active: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { value: 'reservado', label: 'Reservado', active: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'malo', label: 'Malo', active: 'bg-red-100 text-red-700 border-red-300' },
];

function fieldClass(extra = ''): string {
  return `w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base ${extra}`;
}

export default function PlantillasManagerModal({
  isOpen, onClose, doctorId, doctorName, plantillas, onAdd, onUpdate, onRemove, onApply,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [secundarioInput, setSecundarioInput] = useState('');

  if (!isOpen) return null;

  const misPlantillas = plantillas.filter((p) => p.doctorId === doctorId);
  const isEditing = editingId !== null;

  const startNew = () => {
    setEditingId('__new__');
    setForm(emptyForm);
    setSecundarioInput('');
  };

  const startEdit = (p: PlantillaMedica) => {
    setEditingId(p.id);
    setForm({
      nombre: p.nombre,
      tipoPaciente: p.tipoPaciente,
      tipoDiagnostico: p.tipoDiagnostico,
      diagnosticoPrincipal: p.diagnosticoPrincipal,
      diagnosticosSecundarios: [...p.diagnosticosSecundarios],
      evolucionSubjetiva: p.evolucionSubjetiva,
      evolucionObjetiva: p.evolucionObjetiva,
      tratamiento: p.tratamiento,
      pronostico: p.pronostico,
      observaciones: p.observaciones,
    });
    setSecundarioInput('');
  };

  const backToList = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSecundarioInput('');
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addSecundario = (val: string) => {
    const v = val.trim();
    if (!v) return;
    if (!form.diagnosticosSecundarios.includes(v)) {
      setField('diagnosticosSecundarios', [...form.diagnosticosSecundarios, v]);
    }
  };

  const removeSecundario = (idx: number) => {
    setField('diagnosticosSecundarios', form.diagnosticosSecundarios.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    const nombre = form.nombre.trim();
    if (!nombre) return;
    const base = {
      doctorId,
      nombre,
      tipoPaciente: form.tipoPaciente,
      tipoDiagnostico: form.tipoDiagnostico,
      diagnosticoPrincipal: form.diagnosticoPrincipal.trim(),
      diagnosticosSecundarios: form.diagnosticosSecundarios,
      evolucionSubjetiva: form.evolucionSubjetiva,
      evolucionObjetiva: form.evolucionObjetiva,
      tratamiento: form.tratamiento,
      pronostico: form.pronostico,
      observaciones: form.observaciones,
    };

    if (editingId === '__new__') {
      const nueva: PlantillaMedica = {
        ...base,
        id: `pl-${Date.now()}`,
        createdAt: new Date().toISOString().split('T')[0],
      };
      onAdd(nueva);
    } else if (editingId) {
      const original = misPlantillas.find((p) => p.id === editingId);
      if (original) {
        onUpdate({ ...original, ...base });
      }
    }
    backToList();
  };

  const handleDelete = (id: string) => {
    onRemove(id);
    if (editingId === id) backToList();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-background-50 rounded-2xl border border-secondary-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-200">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary-100 text-primary-600">
              <i className="ri-file-copy-line"></i>
            </span>
            <div>
              <h2 className="text-base font-semibold text-foreground-900 font-heading">
                {isEditing ? (editingId === '__new__' ? 'Nueva plantilla' : 'Editar plantilla') : 'Plantillas de diagnóstico'}
              </h2>
              <p className="text-2xs text-foreground-400">{doctorName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-foreground-700 hover:bg-secondary-100 transition-base cursor-pointer"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        {!isEditing ? (
          <>
            {/* Lista */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-foreground-500">
                  {misPlantillas.length} plantilla{misPlantillas.length !== 1 ? 's' : ''} creada{misPlantillas.length !== 1 ? 's' : ''}. Al aplicar una, se rellenan automáticamente la nota de evolución.
                </p>
                <button
                  onClick={startNew}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-base cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-add-line"></i> Nueva plantilla
                </button>
              </div>

              {misPlantillas.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-foreground-400">
                  <span className="w-14 h-14 flex items-center justify-center rounded-full bg-secondary-100">
                    <i className="ri-file-copy-line text-2xl"></i>
                  </span>
                  <p className="text-sm text-foreground-600">Aún no tienes plantillas</p>
                  <p className="text-xs text-center max-w-xs">
                    Crea una plantilla con los textos que sueles repetir (evolución subjetiva, objetiva, tratamiento y diagnóstico) y aplícala con un clic.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {misPlantillas.map((p) => (
                    <div key={p.id} className="p-4 bg-background-50 rounded-xl border border-secondary-200">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground-900 truncate">{p.nombre}</p>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-secondary-100 text-foreground-600">
                              <i className="ri-user-line"></i> {p.tipoPaciente}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-accent-100 text-accent-700">
                              <i className="ri-stethoscope-line"></i> {p.tipoDiagnostico}
                            </span>
                          </div>
                          {p.diagnosticoPrincipal && (
                            <p className="text-xs text-foreground-500 mt-2 line-clamp-1">
                              <span className="font-medium text-foreground-600">Dx:</span> {p.diagnosticoPrincipal}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => onApply(p)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-base cursor-pointer whitespace-nowrap"
                            title="Aplicar a la nota"
                          >
                            <i className="ri-play-list-add-line"></i> Aplicar
                          </button>
                          <button
                            onClick={() => startEdit(p)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-foreground-700 hover:bg-secondary-100 transition-base cursor-pointer"
                            title="Editar"
                          >
                            <i className="ri-edit-line text-sm"></i>
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-red-500 hover:bg-red-50 transition-base cursor-pointer"
                            title="Eliminar"
                          >
                            <i className="ri-delete-bin-line text-sm"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Formulario */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-foreground-600 mb-1 block">
                    Nombre de la plantilla <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setField('nombre', e.target.value)}
                    placeholder="Ej. Diabetes tipo 2 — Control mensual"
                    className={fieldClass()}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground-600 mb-1 block">Tipo de paciente</label>
                  <select
                    value={form.tipoPaciente}
                    onChange={(e) => setField('tipoPaciente', e.target.value as TipoPacientePlantilla)}
                    className={fieldClass('cursor-pointer')}
                  >
                    {TIPOS_PACIENTE.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground-600 mb-1 block">Tipo de diagnóstico</label>
                  <select
                    value={form.tipoDiagnostico}
                    onChange={(e) => setField('tipoDiagnostico', e.target.value)}
                    className={fieldClass('cursor-pointer')}
                  >
                    {CATEGORIAS_DIAGNOSTICO.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Diagnóstico principal */}
              <div>
                <label className="text-xs font-medium text-foreground-600 mb-1 block">Diagnóstico principal (CIE-10)</label>
                <DiagnosticoCIE10Search
                  onSelect={(codigo, descripcion) => setField('diagnosticoPrincipal', `${descripcion} (${codigo})`)}
                  placeholder="Buscar en catálogo CIE-10..."
                  size="sm"
                />
                {form.diagnosticoPrincipal && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 inline-flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <span className="text-xs font-medium text-foreground-900 break-all">{form.diagnosticoPrincipal}</span>
                    </div>
                    <button
                      onClick={() => setField('diagnosticoPrincipal', '')}
                      className="w-7 h-7 flex items-center justify-center rounded-full text-foreground-400 hover:text-red-500 hover:bg-red-50 transition-base cursor-pointer flex-shrink-0"
                      title="Quitar diagnóstico"
                    >
                      <i className="ri-close-line text-sm"></i>
                    </button>
                  </div>
                )}
              </div>

              {/* Diagnósticos secundarios */}
              <div>
                <label className="text-xs font-medium text-foreground-600 mb-1 block">Diagnósticos secundarios</label>
                {form.diagnosticosSecundarios.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.diagnosticosSecundarios.map((d, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-secondary-50 border border-secondary-200 rounded-lg text-xs text-foreground-700">
                        {d}
                        <button
                          onClick={() => removeSecundario(i)}
                          className="w-4 h-4 flex items-center justify-center rounded-full text-foreground-400 hover:text-red-500 cursor-pointer"
                          aria-label={`Eliminar ${d}`}
                        >
                          <i className="ri-close-line text-xs"></i>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={secundarioInput}
                    onChange={(e) => setSecundarioInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSecundario(secundarioInput);
                        setSecundarioInput('');
                      }
                    }}
                    placeholder="Escribe un diagnóstico y presiona Enter..."
                    className={fieldClass('text-xs')}
                  />
                  <button
                    onClick={() => { addSecundario(secundarioInput); setSecundarioInput(''); }}
                    className="px-3 py-2 text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-100 transition-base cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-add-line"></i> Agregar
                  </button>
                </div>
              </div>

              {/* Evolución subjetiva */}
              <div>
                <label className="text-xs font-medium text-foreground-600 mb-1 block">Evolución subjetiva</label>
                <textarea
                  value={form.evolucionSubjetiva}
                  onChange={(e) => setField('evolucionSubjetiva', e.target.value)}
                  rows={4}
                  placeholder="Texto base de la evolución subjetiva..."
                  className={fieldClass('resize-none')}
                />
              </div>

              {/* Evolución objetiva */}
              <div>
                <label className="text-xs font-medium text-foreground-600 mb-1 block">Evolución objetiva / Exploración física</label>
                <textarea
                  value={form.evolucionObjetiva}
                  onChange={(e) => setField('evolucionObjetiva', e.target.value)}
                  rows={4}
                  placeholder="Texto base de la evolución objetiva..."
                  className={fieldClass('resize-none')}
                />
              </div>

              {/* Tratamiento */}
              <div>
                <label className="text-xs font-medium text-foreground-600 mb-1 block">Tratamiento / Indicaciones</label>
                <textarea
                  value={form.tratamiento}
                  onChange={(e) => setField('tratamiento', e.target.value)}
                  rows={4}
                  placeholder="Esquema de tratamiento e indicaciones..."
                  className={fieldClass('resize-none')}
                />
              </div>

              {/* Pronóstico */}
              <div>
                <label className="text-xs font-medium text-foreground-600 mb-1 block">Pronóstico</label>
                <div className="flex flex-wrap gap-1.5">
                  {pronosticoOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setField('pronostico', opt.value)}
                      className={`px-4 py-2 rounded-full text-xs font-medium border transition-base cursor-pointer whitespace-nowrap ${form.pronostico === opt.value ? opt.active : 'bg-background-50 text-foreground-600 border-secondary-200 hover:border-secondary-300'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="text-xs font-medium text-foreground-600 mb-1 block">Observaciones</label>
                <textarea
                  value={form.observaciones}
                  onChange={(e) => setField('observaciones', e.target.value)}
                  rows={2}
                  placeholder="Observaciones adicionales..."
                  className={fieldClass('resize-none')}
                />
              </div>
            </div>

            {/* Footer del formulario */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-secondary-200">
              <button
                onClick={backToList}
                className="px-4 py-2 text-sm font-medium text-foreground-600 hover:text-foreground-800 hover:bg-secondary-100 rounded-lg transition-base cursor-pointer whitespace-nowrap"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!form.nombre.trim()}
                className="px-5 py-2 text-sm font-semibold bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-base cursor-pointer whitespace-nowrap"
              >
                <i className="ri-save-line mr-1"></i> Guardar plantilla
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}