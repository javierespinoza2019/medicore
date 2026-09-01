import { useState, useMemo } from 'react';
import { searchMedicamentos, frecuenciasComunes, viasAdministracion, type Medicamento, type MedicamentoPrescrito, type Receta } from '@/mocks/recetas';

interface Props {
  urgenciaId: string;
  patientId: string;
  patientName: string;
  patientExpediente: string;
  doctorId: string;
  doctorName: string;
  doctorCedula: string;
  diagnosticoRelacionado: string;
  onRecetaCreada: (receta: Receta) => void;
  onCancel: () => void;
}

type FormErrors = Record<string, string>;

export default function UrgenciaRecetaCreator({
  urgenciaId, patientId, patientName, patientExpediente,
  doctorId, doctorName, doctorCedula, diagnosticoRelacionado,
  onRecetaCreada, onCancel,
}: Props) {
  const [medSearch, setMedSearch] = useState('');
  const [medResults, setMedResults] = useState<Medicamento[]>([]);
  const [selectedMed, setSelectedMed] = useState<Medicamento | null>(null);
  const [showMedForm, setShowMedForm] = useState(false);

  const [formDosis, setFormDosis] = useState('');
  const [formFrecuencia, setFormFrecuencia] = useState('');
  const [formVia, setFormVia] = useState('');
  const [formDuracion, setFormDuracion] = useState('');
  const [formIndicaciones, setFormIndicaciones] = useState('');

  const [medicamentosEnReceta, setMedicamentosEnReceta] = useState<MedicamentoPrescrito[]>([]);
  const [indicacionesGenerales, setIndicacionesGenerales] = useState('');
  const [saving, setSaving] = useState(false);
  const [prioridad, setPrioridad] = useState<'inmediata' | 'urgente' | 'normal'>('inmediata');
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleMedSearch = (value: string) => {
    setMedSearch(value);
    if (value.trim().length >= 2) {
      setMedResults(searchMedicamentos(value));
    } else {
      setMedResults([]);
    }
  };

  const handleSelectMed = (med: Medicamento) => {
    setSelectedMed(med);
    setShowMedForm(true);
    setFormDosis(med.concentracion);
    setFormFrecuencia('Dosis única inmediata');
    setFormVia(med.viaAdministracion);
    setFormDuracion('Dosis única');
    setFormIndicaciones('');
    setMedSearch('');
    setMedResults([]);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.dosis;
      delete next.frecuencia;
      delete next.via;
      delete next.duracion;
      return next;
    });
  };

  const validateMedField = (field: string, value: string): boolean => {
    let msg = '';
    switch (field) {
      case 'dosis':
        if (!value.trim()) msg = 'La dosis es obligatoria';
        else if (value.trim().length > 50) msg = 'Máximo 50 caracteres';
        break;
      case 'frecuencia':
        if (!value.trim()) msg = 'La frecuencia es obligatoria';
        else if (value.trim().length > 50) msg = 'Máximo 50 caracteres';
        break;
      case 'via':
        if (!value.trim()) msg = 'La vía de administración es obligatoria';
        break;
      case 'duracion':
        if (!value.trim()) msg = 'La duración es obligatoria';
        else if (value.trim().length > 50) msg = 'Máximo 50 caracteres';
        break;
      case 'indicaciones':
        if (value.trim().length > 500) msg = 'Máximo 500 caracteres';
        break;
      default:
        break;
    }

    setErrors((prev) => {
      const next = { ...prev };
      if (msg) next[field] = msg;
      else delete next[field];
      return next;
    });

    return !msg;
  };

  const validateAllMedFields = (): boolean => {
    const ok =
      validateMedField('dosis', formDosis) &&
      validateMedField('frecuencia', formFrecuencia) &&
      validateMedField('via', formVia) &&
      validateMedField('duracion', formDuracion) &&
      validateMedField('indicaciones', formIndicaciones);
    setTouched({ dosis: true, frecuencia: true, via: true, duracion: true, indicaciones: true });
    return ok;
  };

  const handleAddMed = () => {
    if (!validateAllMedFields() || !selectedMed) return;
    const newMed: MedicamentoPrescrito = {
      id: `mp-ru-${Date.now()}`,
      medicamentoId: selectedMed.id,
      nombre: selectedMed.nombre,
      presentacion: selectedMed.presentacion,
      concentracion: selectedMed.concentracion,
      dosis: formDosis.trim(),
      frecuencia: formFrecuencia.trim(),
      via: formVia.trim(),
      duracion: formDuracion.trim(),
      indicaciones: formIndicaciones.trim(),
    };
    setMedicamentosEnReceta((prev) => [...prev, newMed]);
    setSelectedMed(null);
    setShowMedForm(false);
    setFormDosis('');
    setFormFrecuencia('');
    setFormVia('');
    setFormDuracion('');
    setFormIndicaciones('');
    setErrors((prev) => {
      const next = { ...prev };
      delete next.dosis;
      delete next.frecuencia;
      delete next.via;
      delete next.duracion;
      delete next.indicaciones;
      return next;
    });
  };

  const handleRemoveMed = (id: string) => {
    setMedicamentosEnReceta((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSave = () => {
    if (medicamentosEnReceta.length === 0) return;
    setSaving(true);
    setTimeout(() => {
      const now = new Date();
      const fecha = now.toISOString().split('T')[0];
      const hora = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const newReceta: Receta = {
        id: `ru${Date.now()}`,
        patientId,
        patientName,
        patientExpediente,
        doctorId,
        doctorName,
        doctorCedula,
        consultaId: '',
        urgenciaId,
        fecha,
        hora,
        medicamentos: [...medicamentosEnReceta],
        indicacionesGenerales: indicacionesGenerales.trim(),
        estado: 'activa',
        diagnosticoRelacionado,
      };
      onRecetaCreada(newReceta);
      setSaving(false);
    }, 400);
  };

  const frecuenciaSuggestions = useMemo(() => {
    if (formFrecuencia && frecuenciasComunes.some((f) => f === formFrecuencia)) return [];
    if (!formFrecuencia) return ['Dosis única inmediata', 'Dosis única', 'c/6h PRN', 'c/8h', 'c/12h', 'c/24h'];
    return frecuenciasComunes.filter((f) => f.toLowerCase().includes(formFrecuencia.toLowerCase())).slice(0, 6);
  }, [formFrecuencia]);

  const prioridadConfig = {
    inmediata: { label: 'Inmediata', color: 'bg-red-100 text-red-700 border-red-500/20', icon: 'ri-alert-fill' },
    urgente: { label: 'Urgente', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: 'ri-timer-flash-line' },
    normal: { label: 'Normal', color: 'bg-sky-100 text-sky-700 border-sky-200', icon: 'ri-time-line' },
  };

  const inputErrorClass = (field: string) => {
    const hasErr = touched[field] && errors[field];
    return hasErr
      ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
      : 'border-secondary-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100';
  };

  const renderError = (field: string) => {
    if (!touched[field] || !errors[field]) return null;
    return <p className="text-2xs text-red-500 mt-1" role="alert">{errors[field]}</p>;
  };

  return (
    <div className="bg-background-50 rounded-xl border border-red-500/20 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-red-500/25 bg-red-500/10">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 flex items-center justify-center rounded bg-red-100 text-red-600">
            <i className="ri-heart-pulse-line text-sm" aria-hidden="true"></i>
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground-800">Receta de Urgencia</h3>
            <p className="text-2xs text-foreground-400">{patientName} · {diagnosticoRelacionado || 'Sin diagnóstico'}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancelar receta de urgencia"
          className="w-7 h-7 flex items-center justify-center rounded-full text-foreground-400 hover:text-foreground-600 hover:bg-secondary-100 transition-base cursor-pointer"
        >
          <i className="ri-close-line text-sm" aria-hidden="true"></i>
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Prioridad */}
        <div>
          <label className="text-2xs font-semibold text-foreground-500 uppercase tracking-wide mb-1.5 block">
            Prioridad de dispensación
          </label>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Prioridad de dispensación">
            {(['inmediata', 'urgente', 'normal'] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={prioridad === p}
                onClick={() => setPrioridad(p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-base whitespace-nowrap border ${
                  prioridad === p
                    ? prioridadConfig[p].color
                    : 'bg-secondary-100 text-foreground-500 border-secondary-200 hover:border-secondary-300'
                }`}
              >
                <i className={`${prioridadConfig[p].icon} text-2xs`} aria-hidden="true"></i>
                {prioridadConfig[p].label}
              </button>
            ))}
          </div>
        </div>

        {/* Buscar medicamento */}
        <div>
          <label htmlFor="receta-med-search" className="text-2xs font-semibold text-foreground-500 uppercase tracking-wide mb-1.5 block">
            Buscar medicamento
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
              <i className="ri-search-line text-sm" aria-hidden="true"></i>
            </span>
            <input
              id="receta-med-search"
              type="search"
              value={medSearch}
              onChange={(e) => handleMedSearch(e.target.value)}
              aria-label="Buscar medicamento por nombre"
              maxLength={100}
              placeholder="Escribe el nombre del medicamento..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-base"
            />
          </div>

          {medResults.length > 0 && (
            <div className="mt-1 bg-background-50 border border-secondary-200 rounded-lg shadow-sm max-h-48 overflow-y-auto" role="listbox" aria-label="Resultados de búsqueda de medicamentos">
              {medResults.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="option"
                  onClick={() => handleSelectMed(m)}
                  className="w-full text-left px-3 py-2 border-b border-secondary-50 hover:bg-red-500/10 transition-base cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground-900">{m.nombre}</span>
                    <span className="text-2xs text-foreground-400">{m.presentacion} · {m.concentracion}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-2xs bg-secondary-100 text-foreground-500 px-1.5 py-0.5 rounded-full">{m.categoria}</span>
                    <span className="text-2xs text-foreground-400">{m.viaAdministracion}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Formulario de medicamento seleccionado */}
        {showMedForm && selectedMed && (
          <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/25 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 flex items-center justify-center rounded bg-red-100 text-red-600 text-2xs font-bold">
                {medicamentosEnReceta.length + 1}
              </span>
              <p className="text-sm font-semibold text-foreground-900">{selectedMed.nombre}</p>
              <span className="text-2xs text-foreground-400">{selectedMed.presentacion} · {selectedMed.concentracion}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label htmlFor="med-dosis" className="text-2xs font-medium text-foreground-500 mb-1 block">Dosis <span className="text-red-500">*</span></label>
                <input
                  id="med-dosis"
                  type="text"
                  value={formDosis}
                  onChange={(e) => { setFormDosis(e.target.value); validateMedField('dosis', e.target.value); }}
                  onBlur={(e) => { setTouched((p) => ({ ...p, dosis: true })); validateMedField('dosis', e.target.value); }}
                  aria-label="Dosis del medicamento"
                  aria-invalid={touched['dosis'] && !!errors['dosis']}
                  aria-describedby={errors['dosis'] ? 'err-dosis' : undefined}
                  maxLength={50}
                  placeholder="Ej: 300mg"
                  className={`w-full px-2.5 py-1.5 text-xs bg-background-50 border rounded-md text-foreground-700 outline-none transition-base ${inputErrorClass('dosis')}`}
                />
                {renderError('dosis')}
              </div>
              <div>
                <label htmlFor="med-frecuencia" className="text-2xs font-medium text-foreground-500 mb-1 block">Frecuencia <span className="text-red-500">*</span></label>
                <input
                  id="med-frecuencia"
                  type="text"
                  value={formFrecuencia}
                  onChange={(e) => { setFormFrecuencia(e.target.value); validateMedField('frecuencia', e.target.value); }}
                  onBlur={(e) => { setTouched((p) => ({ ...p, frecuencia: true })); validateMedField('frecuencia', e.target.value); }}
                  aria-label="Frecuencia de administración"
                  aria-invalid={touched['frecuencia'] && !!errors['frecuencia']}
                  aria-describedby={errors['frecuencia'] ? 'err-frecuencia' : undefined}
                  maxLength={50}
                  placeholder="Ej: Dosis única"
                  className={`w-full px-2.5 py-1.5 text-xs bg-background-50 border rounded-md text-foreground-700 outline-none transition-base ${inputErrorClass('frecuencia')}`}
                />
                {renderError('frecuencia')}
                {frecuenciaSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {frecuenciaSuggestions.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => { setFormFrecuencia(f); validateMedField('frecuencia', f); }}
                        className="text-2xs bg-red-500/10 text-red-700 px-1.5 py-0.5 rounded-full hover:bg-red-100 cursor-pointer transition-base"
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="med-via" className="text-2xs font-medium text-foreground-500 mb-1 block">Vía <span className="text-red-500">*</span></label>
                <select
                  id="med-via"
                  value={formVia}
                  onChange={(e) => { setFormVia(e.target.value); validateMedField('via', e.target.value); }}
                  aria-label="Vía de administración"
                  aria-invalid={touched['via'] && !!errors['via']}
                  className={`w-full px-2.5 py-1.5 text-xs bg-background-50 border rounded-md text-foreground-700 outline-none transition-base appearance-none ${inputErrorClass('via')}`}
                >
                  {viasAdministracion.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
                {renderError('via')}
              </div>
              <div>
                <label htmlFor="med-duracion" className="text-2xs font-medium text-foreground-500 mb-1 block">Duración <span className="text-red-500">*</span></label>
                <input
                  id="med-duracion"
                  type="text"
                  value={formDuracion}
                  onChange={(e) => { setFormDuracion(e.target.value); validateMedField('duracion', e.target.value); }}
                  onBlur={(e) => { setTouched((p) => ({ ...p, duracion: true })); validateMedField('duracion', e.target.value); }}
                  aria-label="Duración del tratamiento"
                  aria-invalid={touched['duracion'] && !!errors['duracion']}
                  aria-describedby={errors['duracion'] ? 'err-duracion' : undefined}
                  maxLength={50}
                  placeholder="Ej: Dosis única"
                  className={`w-full px-2.5 py-1.5 text-xs bg-background-50 border rounded-md text-foreground-700 outline-none transition-base ${inputErrorClass('duracion')}`}
                />
                {renderError('duracion')}
              </div>
            </div>

            <div>
              <label htmlFor="med-indicaciones" className="text-2xs font-medium text-foreground-500 mb-1 block">Indicaciones (urgencia)</label>
              <textarea
                id="med-indicaciones"
                value={formIndicaciones}
                onChange={(e) => { setFormIndicaciones(e.target.value); validateMedField('indicaciones', e.target.value); }}
                aria-label="Indicaciones específicas para el medicamento"
                aria-invalid={touched['indicaciones'] && !!errors['indicaciones']}
                placeholder="Ej: Administrar de inmediato. Monitorear signos vitales cada 15 min..."
                rows={2}
                maxLength={500}
                className={`w-full px-2.5 py-1.5 text-xs bg-background-50 border rounded-md text-foreground-700 placeholder:text-foreground-400 outline-none transition-base resize-none ${inputErrorClass('indicaciones')}`}
              />
              {renderError('indicaciones')}
              <p className="text-2xs text-foreground-400 mt-1 text-right" aria-live="polite">{formIndicaciones.length}/500</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddMed}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-base cursor-pointer whitespace-nowrap"
              >
                <i className="ri-add-line" aria-hidden="true"></i> Agregar
              </button>
              <button
                type="button"
                onClick={() => { setSelectedMed(null); setShowMedForm(false); }}
                className="px-3 py-1.5 text-xs font-medium text-foreground-500 hover:text-foreground-700 transition-base cursor-pointer whitespace-nowrap"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Medicamentos agregados */}
        {medicamentosEnReceta.length > 0 && (
          <div>
            <label className="text-2xs font-semibold text-foreground-500 uppercase tracking-wide mb-2 block">
              Medicamentos ({medicamentosEnReceta.length})
            </label>
            <div className="space-y-2">
              {medicamentosEnReceta.map((med, idx) => (
                <div key={med.id} className="flex items-start gap-3 p-3 bg-background-50 rounded-lg border border-secondary-100">
                  <span className="w-6 h-6 flex items-center justify-center rounded-full bg-red-100 text-red-600 text-2xs font-bold flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground-900">{med.nombre}</p>
                      <button
                        type="button"
                        aria-label={`Eliminar ${med.nombre} de la receta`}
                        onClick={() => handleRemoveMed(med.id)}
                        className="w-5 h-5 flex items-center justify-center rounded text-foreground-400 hover:text-red-500 hover:bg-red-500/10 transition-base cursor-pointer flex-shrink-0"
                      >
                        <i className="ri-close-line text-xs" aria-hidden="true"></i>
                      </button>
                    </div>
                    <p className="text-2xs text-foreground-400">{med.presentacion} · {med.concentracion}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-foreground-600">
                      <span><strong className="text-foreground-800">{med.dosis}</strong> <span className="text-foreground-400">dosis</span></span>
                      <span><strong className="text-foreground-800">{med.frecuencia}</strong> <span className="text-foreground-400">frec.</span></span>
                      <span><strong className="text-foreground-800">{med.via}</strong> <span className="text-foreground-400">vía</span></span>
                      <span><strong className="text-foreground-800">{med.duracion}</strong> <span className="text-foreground-400">dur.</span></span>
                    </div>
                    {med.indicaciones && (
                      <p className="text-2xs text-red-600 mt-1 italic font-medium">{med.indicaciones}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Indicaciones generales */}
        <div>
          <label htmlFor="rec-indicaciones-gen" className="text-2xs font-semibold text-foreground-500 uppercase tracking-wide mb-1.5 block">
            Indicaciones generales
          </label>
          <textarea
            id="rec-indicaciones-gen"
            value={indicacionesGenerales}
            onChange={(e) => setIndicacionesGenerales(e.target.value)}
            aria-label="Indicaciones generales de la receta de urgencia"
            placeholder="Instrucciones generales para el paciente, plan de seguimiento..."
            rows={3}
            maxLength={1000}
            className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 placeholder:text-foreground-400 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-base resize-none"
          />
          <p className="text-2xs text-foreground-400 mt-1 text-right" aria-live="polite">{indicacionesGenerales.length}/1000</p>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t border-secondary-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium text-foreground-500 hover:text-foreground-700 hover:bg-secondary-100 rounded-lg transition-base cursor-pointer whitespace-nowrap"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={medicamentosEnReceta.length === 0 || saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-base cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {saving ? (
              <><i className="ri-loader-4-line animate-spin" aria-hidden="true"></i> Guardando...</>
            ) : (
              <><i className="ri-heart-pulse-line" aria-hidden="true"></i> Emitir receta de urgencia</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}