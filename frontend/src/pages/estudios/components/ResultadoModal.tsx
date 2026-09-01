import { useState } from 'react';
import type { EstudioSolicitado, ParametroResultado } from '@/mocks/estudios';

const plantillasParametros: Record<string, ParametroResultado[]> = {
  'Biometr\u00eda hem\u00e1tica completa': [
    { nombre: 'Eritrocitos', valor: '', unidad: 'x10\u00b2/\u03bcL', rangoReferencia: 'H: 4.5-5.9 | M: 4.0-5.2' },
    { nombre: 'Hemoglobina', valor: '', unidad: 'g/dL', rangoReferencia: 'H: 13.5-18.0 | M: 12.0-16.0' },
    { nombre: 'Hematocrito', valor: '', unidad: '%', rangoReferencia: 'H: 40-54 | M: 36-48' },
    { nombre: 'VCM', valor: '', unidad: 'fL', rangoReferencia: '80-100' },
    { nombre: 'HCM', valor: '', unidad: 'pg', rangoReferencia: '27-34' },
    { nombre: 'CHCM', valor: '', unidad: 'g/dL', rangoReferencia: '32-36' },
    { nombre: 'Leucocitos', valor: '', unidad: 'x10\u00b3/\u03bcL', rangoReferencia: '4.5-11.0' },
    { nombre: 'Neutrofilos', valor: '', unidad: '%', rangoReferencia: '45-70' },
    { nombre: 'Linfocitos', valor: '', unidad: '%', rangoReferencia: '20-45' },
    { nombre: 'Plaquetas', valor: '', unidad: 'x10\u00b3/\u03bcL', rangoReferencia: '150-400' },
  ],
  'Qu\u00edmica sangu\u00ednea de 6 elementos': [
    { nombre: 'Glucosa', valor: '', unidad: 'mg/dL', rangoReferencia: '70-100 (ayuno)' },
    { nombre: 'Urea', valor: '', unidad: 'mg/dL', rangoReferencia: '15-40' },
    { nombre: 'Creatinina', valor: '', unidad: 'mg/dL', rangoReferencia: 'H: 0.7-1.2 | M: 0.5-1.0' },
    { nombre: '\u00c1cido \u00farico', valor: '', unidad: 'mg/dL', rangoReferencia: 'H: 3.5-7.2 | M: 2.4-6.0' },
    { nombre: 'Colesterol total', valor: '', unidad: 'mg/dL', rangoReferencia: '<200' },
    { nombre: 'Triglic\u00e9ridos', valor: '', unidad: 'mg/dL', rangoReferencia: '<150' },
  ],
  'Perfil de l\u00edpidos': [
    { nombre: 'Colesterol total', valor: '', unidad: 'mg/dL', rangoReferencia: '<200' },
    { nombre: 'HDL', valor: '', unidad: 'mg/dL', rangoReferencia: 'H: >40 | M: >50' },
    { nombre: 'LDL', valor: '', unidad: 'mg/dL', rangoReferencia: '<130' },
    { nombre: 'Triglic\u00e9ridos', valor: '', unidad: 'mg/dL', rangoReferencia: '<150' },
    { nombre: 'VLDL', valor: '', unidad: 'mg/dL', rangoReferencia: '5-40' },
  ],
  'Hemoglobina glicosilada (HbA1c)': [
    { nombre: 'HbA1c', valor: '', unidad: '%', rangoReferencia: '<5.7 (normal) | 5.7-6.4 (prediabetes) | >=6.5 (diabetes)' },
    { nombre: 'Glucosa estimada promedio', valor: '', unidad: 'mg/dL', rangoReferencia: 'Calculado' },
  ],
  'Pruebas de funci\u00f3n hep\u00e1tica': [
    { nombre: 'AST (TGO)', valor: '', unidad: 'U/L', rangoReferencia: '10-40' },
    { nombre: 'ALT (TGP)', valor: '', unidad: 'U/L', rangoReferencia: '7-56' },
    { nombre: 'GGT', valor: '', unidad: 'U/L', rangoReferencia: 'H: 8-61 | M: 5-36' },
    { nombre: 'Fosfatasa alcalina', valor: '', unidad: 'U/L', rangoReferencia: '40-130' },
    { nombre: 'Bilirrubina total', valor: '', unidad: 'mg/dL', rangoReferencia: '0.3-1.2' },
    { nombre: 'Bilirrubina directa', valor: '', unidad: 'mg/dL', rangoReferencia: '<0.3' },
    { nombre: 'Albumina', valor: '', unidad: 'g/dL', rangoReferencia: '3.5-5.5' },
    { nombre: 'Proteinas totales', valor: '', unidad: 'g/dL', rangoReferencia: '6.4-8.3' },
  ],
  'Perfil tiroideo': [
    { nombre: 'TSH', valor: '', unidad: 'mUI/L', rangoReferencia: '0.4-4.0' },
    { nombre: 'T3 libre', valor: '', unidad: 'pmol/L', rangoReferencia: '3.1-6.8' },
    { nombre: 'T4 libre', valor: '', unidad: 'pmol/L', rangoReferencia: '12-22' },
  ],
};

interface ResultadoModalProps {
  estudio: EstudioSolicitado;
  onGuardar: (resultado: string, parametros: ParametroResultado[]) => void;
  onClose: () => void;
}

export default function ResultadoModal({ estudio, onGuardar, onClose }: ResultadoModalProps) {
  const parametrosIniciales: ParametroResultado[] = estudio.parametros.length > 0
    ? estudio.parametros
    : (plantillasParametros[estudio.nombre] ?? [{ nombre: '', valor: '', unidad: '', rangoReferencia: '' }]);

  const [parametros, setParametros] = useState<ParametroResultado[]>(parametrosIniciales);
  const [resultadoLibre, setResultadoLibre] = useState(estudio.resultado || '');
  const [modo, setModo] = useState<'parametros' | 'libre'>(parametrosIniciales.length > 0 ? 'parametros' : 'libre');

  const addParam = () => setParametros((prev) => [...prev, { nombre: '', valor: '', unidad: '', rangoReferencia: '' }]);
  const removeParam = (idx: number) => setParametros((prev) => prev.filter((_, i) => i !== idx));
  const updateParam = (idx: number, field: keyof ParametroResultado, value: string | boolean) => {
    setParametros((prev) => prev.map((p, i) => {
      if (i !== idx) return p;
      return { ...p, [field]: value };
    }));
  };

  const handleGuardar = () => {
    const params = modo === 'parametros' ? parametros.filter((p) => p.nombre.trim() || p.valor.trim()) : [];
    const resumen = modo === 'parametros'
      ? params.map((p) => `${p.nombre}: ${p.valor} ${p.unidad} (Ref: ${p.rangoReferencia})${p.fueraRango ? ' [FUERA DE RANGO]' : ''}`).join('\n')
      : resultadoLibre;
    onGuardar(resumen, params);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resultado-modal-title"
    >
      <div className="bg-background-50 rounded-xl shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-secondary-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 flex-shrink-0">
              <i className="ri-test-tube-line text-base"></i>
            </span>
            <div>
              <h3 id="resultado-modal-title" className="text-sm font-semibold text-foreground-900">
                Capturar resultados
              </h3>
              <p className="text-2xs text-foreground-400 mt-0.5 truncate max-w-xs">{estudio.nombre} &mdash; {estudio.patientName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary-100 text-foreground-400 hover:bg-secondary-200 cursor-pointer transition-base"
          >
            <i className="ri-close-line"></i>
          </button>
        </div>

        {/* Mode toggle */}
        <div className="px-5 pt-4 flex-shrink-0">
          <div className="flex gap-1 bg-secondary-100 rounded-lg p-1 w-fit">
            <button
              onClick={() => setModo('parametros')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-base ${modo === 'parametros' ? 'bg-background-50 text-foreground-900 shadow-sm' : 'text-foreground-500 hover:text-foreground-700'}`}
            >
              <i className="ri-table-line mr-1"></i> Valores por par\u00e1metro
            </button>
            <button
              onClick={() => setModo('libre')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-base ${modo === 'libre' ? 'bg-background-50 text-foreground-900 shadow-sm' : 'text-foreground-500 hover:text-foreground-700'}`}
            >
              <i className="ri-file-text-line mr-1"></i> Texto libre
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {modo === 'parametros' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-[1.5fr_1fr_0.8fr_1.5fr_auto] gap-1.5 text-2xs font-semibold text-foreground-500 uppercase tracking-wide pb-1 border-b border-secondary-100">
                <span>Par\u00e1metro</span>
                <span>Valor</span>
                <span>Unidad</span>
                <span>Rango referencia</span>
                <span></span>
              </div>
              {parametros.map((p, idx) => (
                <div key={idx} className={`grid grid-cols-[1.5fr_1fr_0.8fr_1.5fr_auto] gap-1.5 items-center p-2 rounded-lg border ${p.fueraRango ? 'bg-red-50 border-red-200' : 'bg-background-50 border-secondary-100'}`}>
                  <input
                    type="text"
                    value={p.nombre}
                    onChange={(e) => updateParam(idx, 'nombre', e.target.value)}
                    placeholder="Nombre del par\u00e1metro"
                    className="px-2 py-1.5 text-xs bg-white border border-secondary-200 rounded-md text-foreground-800 outline-none focus:border-primary-400 transition-base"
                  />
                  <input
                    type="text"
                    value={p.valor}
                    onChange={(e) => updateParam(idx, 'valor', e.target.value)}
                    placeholder="Ej: 7.5"
                    className="px-2 py-1.5 text-xs bg-white border border-secondary-200 rounded-md text-foreground-800 font-semibold outline-none focus:border-primary-400 transition-base"
                  />
                  <input
                    type="text"
                    value={p.unidad}
                    onChange={(e) => updateParam(idx, 'unidad', e.target.value)}
                    placeholder="Ej: g/dL"
                    className="px-2 py-1.5 text-xs bg-white border border-secondary-200 rounded-md text-foreground-700 outline-none focus:border-primary-400 transition-base"
                  />
                  <input
                    type="text"
                    value={p.rangoReferencia}
                    onChange={(e) => updateParam(idx, 'rangoReferencia', e.target.value)}
                    placeholder="Ej: 13.5-18.0"
                    className="px-2 py-1.5 text-xs bg-white border border-secondary-200 rounded-md text-foreground-500 outline-none focus:border-primary-400 transition-base"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Fuera de rango"
                      onClick={() => updateParam(idx, 'fueraRango', !p.fueraRango)}
                      className={`w-6 h-6 flex items-center justify-center rounded cursor-pointer transition-base ${p.fueraRango ? 'bg-red-500 text-white' : 'bg-secondary-100 text-foreground-400 hover:bg-secondary-200'}`}
                    >
                      <i className="ri-alert-line text-xs"></i>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeParam(idx)}
                      className="w-6 h-6 flex items-center justify-center rounded bg-secondary-100 text-foreground-400 hover:bg-red-100 hover:text-red-500 cursor-pointer transition-base"
                    >
                      <i className="ri-close-line text-xs"></i>
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addParam}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-primary-600 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 cursor-pointer transition-base"
              >
                <i className="ri-add-line"></i> Agregar par\u00e1metro
              </button>
              <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                <i className="ri-information-line text-amber-500 flex-shrink-0 mt-0.5"></i>
                <p className="text-2xs text-amber-700">
                  Activa el bot\u00f3n <i className="ri-alert-line"></i> para marcar un par\u00e1metro como fuera de rango. Aparecer\u00e1 resaltado en rojo en el expediente.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-foreground-700">Resultado / Interpretaci\u00f3n</label>
              <textarea
                value={resultadoLibre}
                onChange={(e) => setResultadoLibre(e.target.value)}
                placeholder="Escribe aqu\u00ed la interpretaci\u00f3n cl\u00ednica, hallazgos, conclusiones o cualquier nota de resultado..."
                rows={10}
                className="w-full px-3 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-800 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 resize-none transition-base font-mono"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-secondary-200 flex-shrink-0">
          <p className="text-2xs text-foreground-400">
            <i className="ri-information-line"></i> Al guardar, el estudio quedar\u00e1 como <strong>Completado</strong> y los resultados quedar\u00e1n disponibles en el expediente.
          </p>
          <div className="flex gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium bg-secondary-100 text-foreground-700 rounded-lg hover:bg-secondary-200 cursor-pointer transition-base whitespace-nowrap"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleGuardar}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 cursor-pointer transition-base whitespace-nowrap"
            >
              <i className="ri-check-double-line"></i> Guardar resultados
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}