import { useState } from 'react';
import { getNotaEvolucionByConsulta, type Pronostico } from '@/mocks/notasEvolucion';
import NotaEvolucionPrintModal from './NotaEvolucionPrintModal';

function formatearFecha(fecha: string): string {
  if (!fecha) return '—';
  const [y, m, d] = fecha.split('-');
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`;
}

function Seccion({ icono, titulo, tono, children }: { icono: string; titulo: string; tono: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl border border-secondary-200 bg-background-50">
      <h4 className="text-sm font-semibold text-foreground-800 flex items-center gap-2 mb-3">
        <span className={`w-6 h-6 flex items-center justify-center rounded-md ${tono}`} aria-hidden="true">
          <i className={`${icono} text-xs`}></i>
        </span>
        {titulo}
      </h4>
      {children}
    </div>
  );
}

function SignoDato({ label, valor, unit }: { label: string; valor: string; unit?: string }) {
  return (
    <div className="text-center p-2.5 rounded-lg bg-secondary-50">
      <p className="text-2xs text-foreground-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-foreground-800">{valor || '—'} {unit && valor ? <span className="text-2xs font-normal text-foreground-400">{unit}</span> : null}</p>
    </div>
  );
}

const pronosticoConfig: Record<Pronostico, { label: string; className: string }> = {
  bueno: { label: 'Bueno', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  reservado: { label: 'Reservado', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  malo: { label: 'Malo', className: 'bg-red-100 text-red-700 border-red-200' },
};

export default function NotaEvolucionReadOnly({ consultaId, patientName, patientExpediente }: { consultaId: string; patientName?: string; patientExpediente?: string }) {
  const nota = getNotaEvolucionByConsulta(consultaId);
  const [showPrintModal, setShowPrintModal] = useState(false);

  if (!nota) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-14 h-14 flex items-center justify-center rounded-full bg-secondary-100 mb-3">
          <i className="ri-file-edit-line text-xl text-foreground-400"></i>
        </div>
        <p className="text-sm font-medium text-foreground-700">Sin Nota de Evolución registrada</p>
        <p className="text-xs text-foreground-500 mt-1 max-w-sm">
          La Nota de Evolución se registra durante la consulta de seguimiento (subsecuente, control o urgencia).
        </p>
      </div>
    );
  }

  const pron = pronosticoConfig[nota.pronostico];

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 bg-background-50 rounded-xl border border-secondary-200">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-100 text-primary-600">
            <i className="ri-file-edit-line"></i>
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground-900">Nota de Evolución</p>
            <p className="text-2xs text-foreground-400">NOM-004-SSA3-2012 · {formatearFecha(nota.fecha)} · {nota.hora} hrs</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground-800">{nota.medico}</p>
            <p className="text-2xs text-foreground-400">Cédula Profesional: {nota.medicoCedula || '—'}</p>
          </div>
          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-background-50 border border-secondary-200 text-foreground-600 rounded-lg hover:bg-secondary-100 transition-base cursor-pointer whitespace-nowrap"
          >
            <i className="ri-printer-line"></i> Imprimir nota
          </button>
        </div>
      </div>

      {/* Signos vitales */}
      <Seccion icono="ri-heart-pulse-line" titulo="Signos Vitales" tono="bg-emerald-100 text-emerald-600">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          <SignoDato label="Temperatura" valor={nota.signosVitales.temperatura} unit="°C" />
          <SignoDato label="Presión arterial" valor={nota.signosVitales.presionSistolica && nota.signosVitales.presionDiastolica ? `${nota.signosVitales.presionSistolica}/${nota.signosVitales.presionDiastolica}` : ''} unit="mmHg" />
          <SignoDato label="F. cardiaca" valor={nota.signosVitales.frecuenciaCardiaca} unit="lpm" />
          <SignoDato label="F. respiratoria" valor={nota.signosVitales.frecuenciaRespiratoria} unit="rpm" />
          <SignoDato label="SpO₂" valor={nota.signosVitales.saturacionOxigeno} unit="%" />
          <SignoDato label="Peso" valor={nota.signosVitales.peso} unit="kg" />
          <SignoDato label="Talla" valor={nota.signosVitales.talla} unit="m" />
          <SignoDato label="Glucosa" valor={nota.signosVitales.glucosa} unit="mg/dL" />
        </div>
      </Seccion>

      {/* Evolución subjetiva */}
      <Seccion icono="ri-chat-3-line" titulo="Evolución Subjetiva" tono="bg-sky-100 text-sky-600">
        <p className="text-sm text-foreground-700 leading-relaxed whitespace-pre-wrap">{nota.evolucionSubjetiva || 'Sin registro'}</p>
      </Seccion>

      {/* Evolución objetiva */}
      <Seccion icono="ri-search-eye-line" titulo="Evolución Objetiva / Exploración Física" tono="bg-emerald-100 text-emerald-600">
        <p className="text-sm text-foreground-700 leading-relaxed whitespace-pre-wrap">{nota.evolucionObjetiva || 'Sin registro'}</p>
      </Seccion>

      {/* Resultados de estudios */}
      <Seccion icono="ri-microscope-line" titulo="Resultados de Estudios Relevantes" tono="bg-amber-100 text-amber-600">
        {nota.resultadosEstudios.length === 0 ? (
          <p className="text-sm text-foreground-500 italic">Sin resultados de estudios registrados.</p>
        ) : (
          <div className="space-y-1.5">
            {nota.resultadosEstudios.map((r) => (
              <div key={r.id} className="flex items-start gap-3 p-2.5 rounded-lg border border-secondary-100 bg-background-50">
                <span className="w-5 h-5 flex items-center justify-center rounded bg-amber-50 text-amber-600 flex-shrink-0 mt-0.5">
                  <i className="ri-test-tube-line text-xs"></i>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground-800">{r.nombre || 'Estudio'}</p>
                  <p className="text-xs text-foreground-600">{r.resultado}</p>
                </div>
                {r.fecha && <span className="text-2xs text-foreground-400 whitespace-nowrap">{formatearFecha(r.fecha)}</span>}
              </div>
            ))}
          </div>
        )}
      </Seccion>

      {/* Diagnóstico */}
      <Seccion icono="ri-award-line" titulo="Diagnósticos" tono="bg-amber-100 text-amber-600">
        <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/10 text-sm font-medium text-foreground-900 break-words">
          {nota.diagnosticoPrincipal || 'Sin diagnóstico registrado'}
        </div>
        {nota.diagnosticosSecundarios.length > 0 && (
          <div className="space-y-1.5 mt-2">
            {nota.diagnosticosSecundarios.map((d, i) => (
              <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg border border-secondary-100 bg-background-50 text-sm text-foreground-700">
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-secondary-100 text-foreground-500 text-2xs font-bold flex-shrink-0">{i + 1}</span>
                {d}
              </div>
            ))}
          </div>
        )}
      </Seccion>

      {/* Tratamiento */}
      <Seccion icono="ri-file-list-line" titulo="Tratamiento / Indicaciones" tono="bg-primary-100 text-primary-600">
        <p className="text-sm text-foreground-700 leading-relaxed whitespace-pre-wrap">{nota.tratamientoIndicaciones || 'Sin registro'}</p>
      </Seccion>

      {/* Pronóstico */}
      <div className="flex items-center gap-2 px-4 py-3 bg-background-50 rounded-xl border border-secondary-200">
        <span className="text-sm font-semibold text-foreground-800 flex items-center gap-2">
          <span className="w-6 h-6 flex items-center justify-center rounded-md bg-rose-100 text-rose-600" aria-hidden="true">
            <i className="ri-bar-chart-box-line text-xs"></i>
          </span>
          Pronóstico
        </span>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${pron.className}`}>
          {pron.label}
        </span>
      </div>

      {/* Observaciones */}
      {nota.observaciones && (
        <Seccion icono="ri-sticky-note-line" titulo="Observaciones" tono="bg-secondary-100 text-foreground-500">
          <p className="text-sm text-foreground-700 leading-relaxed whitespace-pre-wrap">{nota.observaciones}</p>
        </Seccion>
      )}

      {/* Firma */}
      <div className="flex items-end justify-between gap-4 px-4 py-4 bg-background-50 rounded-xl border border-secondary-200">
        <div className="text-xs text-foreground-400 flex items-center gap-1.5">
          <i className="ri-lock-line"></i> Firma electrónica
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-foreground-900">{nota.medico}</p>
          <p className="text-2xs text-foreground-500">Cédula Profesional: {nota.medicoCedula || '—'}</p>
          <p className="text-2xs text-foreground-400 mt-1">{formatearFecha(nota.fecha)} · {nota.hora} hrs</p>
        </div>
      </div>

      {/* Modal de impresión */}
      {showPrintModal && (
        <NotaEvolucionPrintModal
          nota={nota}
          patientName={patientName || ''}
          patientExpediente={patientExpediente || ''}
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
}