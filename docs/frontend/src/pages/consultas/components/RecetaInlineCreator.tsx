import { useState, useMemo } from 'react';
import { searchMedicamentos, catalogoMedicamentos, frecuenciasComunes, viasAdministracion, type Medicamento, type MedicamentoPrescrito, type Receta } from '@/mocks/recetas';
import Badge from '@/components/base/Badge';

const MAX_MED_SEARCH = 100;
const MAX_DOSIS = 50;
const MAX_FRECUENCIA = 50;
const MAX_DURACION = 50;
const MAX_INDICACIONES_ESPECIFICAS = 500;
const MAX_INDICACIONES_GENERALES = 1000;

interface Props {
  consultaId: string;
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

export default function RecetaInlineCreator({
  consultaId, patientId, patientName, patientExpediente,
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
    setFormFrecuencia('c/8h');
    setFormVia(med.viaAdministracion);
    setFormDuracion('7 días');
    setFormIndicaciones('');
    setMedSearch('');
    setMedResults([]);
  };

  const handleAddMed = () => {
    if (!selectedMed || !formDosis || !formFrecuencia || !formVia || !formDuracion) return;
    const newMed: MedicamentoPrescrito = {
      id: `mp-${Date.now()}`,
      medicamentoId: selectedMed.id,
      nombre: selectedMed.nombre,
      presentacion: selectedMed.presentacion,
      concentracion: selectedMed.concentracion,
      dosis: formDosis,
      frecuencia: formFrecuencia,
      via: formVia,
      duracion: formDuracion,
      indicaciones: formIndicaciones,
    };
    setMedicamentosEnReceta((prev) => [...prev, newMed]);
    setSelectedMed(null);
    setShowMedForm(false);
    setFormDosis('');
    setFormFrecuencia('');
    setFormVia('');
    setFormDuracion('');
    setFormIndicaciones('');
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
        id: `r${Date.now()}`,
        patientId,
        patientName,
        patientExpediente,
        doctorId,
        doctorName,
        doctorCedula,
        consultaId,
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
    if (!formFrecuencia) return frecuenciasComunes.slice(0, 6);
    return frecuenciasComunes.filter((f) => f.toLowerCase().includes(formFrecuencia.toLowerCase())).slice(0, 6);
  }, [formFrecuencia]);

  return (
    <div className="bg-background-50 rounded-xl border border-secondary-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-200 bg-background-50">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 flex items-center justify-center rounded bg-primary-100 text-primary-600">
            <i className="ri-capsule-line text-sm"></i>
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground-800">Generar Receta</h3>
            <p className="text-2xs text-foreground-400">{patientName} · {diagnosticoRelacionado || 'Sin diagnóstico'}</p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="w-7 h-7 flex items-center justify-center rounded-full text-foreground-400 hover:text-foreground-600 hover:bg-secondary-100 transition-base cursor-pointer"
        >
          <i className="ri-close-line text-sm"></i>
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Buscar medicamento */}
        <div>
          <label className="text-2xs font-semibold text-foreground-500 uppercase tracking-wide mb-1.5 block" htmlFor="med-search-input">
            Buscar medicamento
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none" aria-hidden="true">
              <i className="ri-search-line text-sm"></i>
            </span>
            <input
              id="med-search-input"
              type="search"
              value={medSearch}
              onChange={(e) => handleMedSearch(e.target.value)}
              placeholder="Escribe el nombre del medicamento..."
              maxLength={MAX_MED_SEARCH}
              aria-label="Buscar medicamento"
              aria-autocomplete="list"
              aria-expanded={medResults.length > 0}
              className="w-full pl-9 pr-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base"
            />
          </div>

          {medResults.length > 0 && (
            <div className="mt-1 bg-background-50 border border-secondary-200 rounded-lg shadow-sm max-h-48 overflow-y-auto">
              {medResults.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleSelectMed(m)}
                  className="w-full text-left px-3 py-2 border-b border-secondary-50 hover:bg-primary-50 transition-base cursor-pointer"
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
          <div className="p-3 bg-background-50 rounded-lg border border-secondary-200 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 flex items-center justify-center rounded bg-primary-100 text-primary-600 text-2xs font-bold">
                {medicamentosEnReceta.length + 1}
              </span>
              <p className="text-sm font-semibold text-foreground-900">{selectedMed.nombre}</p>
              <span className="text-2xs text-foreground-400">{selectedMed.presentacion} · {selectedMed.concentracion}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="text-2xs font-medium text-foreground-500 mb-1 block">Dosis</label>
                <input
                  type="text"
                  value={formDosis}
                  onChange={(e) => setFormDosis(e.target.value)}
                  placeholder="Ej: 500mg"
                  maxLength={MAX_DOSIS}
                  aria-label="Dosis del medicamento"
                  className="w-full px-2.5 py-1.5 text-xs bg-background-50 border border-secondary-200 rounded-md text-foreground-700 outline-none focus:border-primary-400 transition-base"
                />
              </div>
              <div>
                <label className="text-2xs font-medium text-foreground-500 mb-1 block">Frecuencia</label>
                <input
                  type="text"
                  value={formFrecuencia}
                  onChange={(e) => setFormFrecuencia(e.target.value)}
                  placeholder="Ej: c/8h"
                  maxLength={MAX_FRECUENCIA}
                  aria-label="Frecuencia de administración"
                  className="w-full px-2.5 py-1.5 text-xs bg-background-50 border border-secondary-200 rounded-md text-foreground-700 outline-none focus:border-primary-400 transition-base"
                />
                {frecuenciaSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {frecuenciaSuggestions.map((f) => (
                      <button
                        key={f}
                        onClick={() => setFormFrecuencia(f)}
                        className="text-2xs bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded-full hover:bg-primary-100 cursor-pointer transition-base"
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-2xs font-medium text-foreground-500 mb-1 block">Vía</label>
                <select
                  value={formVia}
                  onChange={(e) => setFormVia(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-background-50 border border-secondary-200 rounded-md text-foreground-700 outline-none focus:border-primary-400 transition-base appearance-none"
                >
                  {viasAdministracion.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-2xs font-medium text-foreground-500 mb-1 block">Duración</label>
                <input
                  type="text"
                  value={formDuracion}
                  onChange={(e) => setFormDuracion(e.target.value)}
                  placeholder="Ej: 7 días"
                  maxLength={MAX_DURACION}
                  aria-label="Duración del tratamiento"
                  className="w-full px-2.5 py-1.5 text-xs bg-background-50 border border-secondary-200 rounded-md text-foreground-700 outline-none focus:border-primary-400 transition-base"
                />
              </div>
            </div>

            <div>
              <label className="text-2xs font-medium text-foreground-500 mb-1 block">Indicaciones específicas</label>
              <textarea
                value={formIndicaciones}
                onChange={(e) => setFormIndicaciones(e.target.value)}
                placeholder="Ej: Tomar con alimentos. No combinar con alcohol..."
                rows={2}
                maxLength={MAX_INDICACIONES_ESPECIFICAS}
                aria-label="Indicaciones específicas del medicamento"
                className="w-full px-2.5 py-1.5 text-xs bg-background-50 border border-secondary-200 rounded-md text-foreground-700 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base resize-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleAddMed}
                disabled={!formDosis || !formFrecuencia || !formVia || !formDuracion}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-base cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="ri-add-line"></i> Agregar a receta
              </button>
              <button
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
              Medicamentos en receta ({medicamentosEnReceta.length})
            </label>
            <div className="space-y-2">
              {medicamentosEnReceta.map((med, idx) => (
                <div key={med.id} className="flex items-start gap-3 p-3 bg-background-50 rounded-lg border border-secondary-100">
                  <span className="w-6 h-6 flex items-center justify-center rounded-full bg-primary-100 text-primary-600 text-2xs font-bold flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground-900">{med.nombre}</p>
                      <button
                        onClick={() => handleRemoveMed(med.id)}
                        className="w-5 h-5 flex items-center justify-center rounded text-foreground-400 hover:text-red-500 hover:bg-red-50 transition-base cursor-pointer flex-shrink-0"
                      >
                        <i className="ri-close-line text-xs"></i>
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
                      <p className="text-2xs text-foreground-500 mt-1 italic">{med.indicaciones}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Indicaciones generales */}
        <div>
          <label className="text-2xs font-semibold text-foreground-500 uppercase tracking-wide mb-1.5 block">
            Indicaciones generales
          </label>
          <textarea
            value={indicacionesGenerales}
            onChange={(e) => setIndicacionesGenerales(e.target.value)}
            placeholder="Indicaciones generales para el paciente: dieta, actividad física, seguimiento..."
            rows={3}
            maxLength={MAX_INDICACIONES_GENERALES}
            aria-label="Indicaciones generales de la receta"
            className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none"
          />
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t border-secondary-100">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium text-foreground-500 hover:text-foreground-700 hover:bg-secondary-100 rounded-lg transition-base cursor-pointer whitespace-nowrap"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={medicamentosEnReceta.length === 0 || saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-base cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {saving ? (
              <><i className="ri-loader-4-line animate-spin"></i> Guardando...</>
            ) : (
              <><i className="ri-save-line"></i> Guardar receta</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}