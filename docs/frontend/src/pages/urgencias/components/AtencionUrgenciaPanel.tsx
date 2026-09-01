import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Urgencia, DestinoAlta, EstadoUrgencia } from '@/mocks/urgencias';
import { urgenciaConfig, estadoUrgenciaConfig, destinoAltaConfig, viaAccesoConfig } from '@/mocks/urgencias';
import { getRecetasByUrgencia, addRecetaUrgenciaGlobal, type Receta } from '@/mocks/recetas';
import { medicalServices } from '@/mocks/services';
import { useCaja } from '@/hooks/useCajaContext';
import Card from '@/components/base/Card';
import UrgenciaRecetaCreator from './UrgenciaRecetaCreator';
import RecetaPrintModal from '@/pages/recetas/components/RecetaPrintModal';
import { validateVital } from '@/utils/vitalValidation';

interface AtencionUrgenciaPanelProps {
  urgencia: Urgencia;
  onUpdate: (updated: Urgencia) => void;
}

function getSignosVitalesErrors(sv: Urgencia['signosVitales']): string[] {
  if (!sv) return [];
  const errs: string[] = [];
  if (sv.temperatura < 30 || sv.temperatura > 44) errs.push(`Temperatura ${sv.temperatura}°C fuera de rango clínico (30–44°C)`);
  if (sv.presionSistolica < 40 || sv.presionSistolica > 250) errs.push(`Presión sistólica ${sv.presionSistolica} fuera de rango (40–250 mmHg)`);
  if (sv.presionDiastolica < 20 || sv.presionDiastolica > 150) errs.push(`Presión diastólica ${sv.presionDiastolica} fuera de rango (20–150 mmHg)`);
  if (sv.presionDiastolica >= sv.presionSistolica) errs.push(`Presión diastólica (${sv.presionDiastolica}) debe ser menor que la sistólica (${sv.presionSistolica})`);
  if (sv.frecuenciaCardiaca < 20 || sv.frecuenciaCardiaca > 220) errs.push(`FC ${sv.frecuenciaCardiaca} lpm fuera de rango (20–220 lpm)`);
  if (sv.frecuenciaRespiratoria < 4 || sv.frecuenciaRespiratoria > 60) errs.push(`FR ${sv.frecuenciaRespiratoria} rpm fuera de rango (4–60 rpm)`);
  if (sv.saturacionOxigeno < 50 || sv.saturacionOxigeno > 100) errs.push(`SpO₂ ${sv.saturacionOxigeno}% fuera de rango (50–100%)`);
  if (sv.imc < 5 || sv.imc > 80) errs.push(`IMC ${sv.imc.toFixed(1)} fuera de rango clínico (5–80 kg/m²)`);
  if (sv.glucosa !== null && (sv.glucosa < 20 || sv.glucosa > 600)) errs.push(`Glucosa ${sv.glucosa} mg/dL fuera de rango (20–600 mg/dL)`);
  return errs;
}

function VitalBadge({ icon, label, value, alert }: { icon: string; label: string; value: string; alert: boolean }) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg border ${alert ? 'bg-red-500/10 border-red-500/20' : 'bg-background-50 border-secondary-100'}`}>
      <span className={`w-7 h-7 flex items-center justify-center rounded ${alert ? 'bg-red-100 text-red-500' : 'bg-secondary-100 text-foreground-500'}`}>
        <i className={`${icon} text-xs`}></i>
      </span>
      <div>
        <p className="text-2xs text-foreground-400">{label}</p>
        <p className={`text-sm font-bold ${alert ? 'text-red-700' : 'text-foreground-900'}`}>{value}</p>
      </div>
    </div>
  );
}

export default function AtencionUrgenciaPanel({ urgencia, onUpdate }: AtencionUrgenciaPanelProps) {
  const navigate = useNavigate();
  const { addTransaction } = useCaja();

  const [notaMedica, setNotaMedica] = useState(urgencia.notaMedica);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [showAlta, setShowAlta] = useState(false);
  const [destinoAlta, setDestinoAlta] = useState<DestinoAlta | ''>('');
  const [showEstadoMenu, setShowEstadoMenu] = useState(false);
  const [showRecetaCreator, setShowRecetaCreator] = useState(false);
  const [recetaParaImprimir, setRecetaParaImprimir] = useState<Receta | null>(null);

  // Advertencia de recetas pendientes al intentar dar alta
  const [showPendientesWarning, setShowPendientesWarning] = useState(false);
  const [destinoAltaTemporal, setDestinoAltaTemporal] = useState<DestinoAlta | ''>('');

  const isEnAtencion = urgencia.estado === 'en_atencion' || urgencia.estado === 'observacion';
  const isFinalizada = urgencia.estado === 'alta';

  const todasLasRecetas = getRecetasByUrgencia(urgencia.id);
  const recetasPendientes = todasLasRecetas.filter(
    (r) => r.estado === 'activa' || r.estado === 'parcial'
  );
  const hasPendientes = recetasPendientes.length > 0;

  const saveNota = () => {
    onUpdate({ ...urgencia, notaMedica });
    setHasUnsaved(false);
  };

  const changeEstado = (nuevoEstado: EstadoUrgencia) => {
    const now = new Date().toTimeString().slice(0, 5);
    const update: Partial<Urgencia> = { estado: nuevoEstado };
    if (nuevoEstado === 'en_atencion') {
      update.horaAtencion = now;
    }
    if (nuevoEstado === 'alta') {
      update.horaAlta = now;
    }
    onUpdate({ ...urgencia, ...update });
    setShowEstadoMenu(false);
  };

  const confirmarAlta = () => {
    if (!destinoAlta) return;

    // Verificar recetas pendientes
    if (hasPendientes) {
      setDestinoAltaTemporal(destinoAlta);
      setShowAlta(false);
      setShowPendientesWarning(true);
      return;
    }

    ejecutarAlta(destinoAlta);
  };

  const ejecutarAlta = (destino: DestinoAlta) => {
    const now = new Date().toTimeString().slice(0, 5);

    // Registrar cobro de la atención de urgencias en Caja
    const servicioUrgencia = medicalServices.find((s) => s.id === 'sv13');
    if (servicioUrgencia) {
      addTransaction({
        pacienteId: urgencia.patientId,
        paciente: urgencia.patientName,
        concepto: `Atención de Urgencias — ${urgenciaConfig[urgencia.nivelUrgencia].label}`,
        subtotal: servicioUrgencia.precio,
        descuento: 0,
        total: servicioUrgencia.precio,
        metodoPago: 'efectivo',
        origen: 'urgencias',
        notas: `${urgencia.areaUrgencia} · Alta: ${destinoAltaConfig[destino].label}`,
        consultaDoctor: urgencia.doctorName,
      });
    }

    onUpdate({ ...urgencia, estado: 'alta', destinoAlta: destino, horaAlta: now });
    setShowAlta(false);
    setShowPendientesWarning(false);
    setDestinoAltaTemporal('');
  };

  const urgenciaConfigLocal = urgenciaConfig[urgencia.nivelUrgencia];
  const viaConfig = viaAccesoConfig[urgencia.viaAcceso];

  const handleRecetaCreada = (receta: Receta) => {
    addRecetaUrgenciaGlobal(receta);
    setShowRecetaCreator(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card padding="md">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <span className={`w-14 h-14 flex items-center justify-center rounded-full text-xl font-bold flex-shrink-0 ${
              urgencia.genero === 'F' ? 'bg-rose-100 text-rose-500' : 'bg-sky-100 text-sky-500'
            }`}>
              {urgencia.patientName.charAt(0)}
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-foreground-900">{urgencia.patientName}</h2>
                <div className="relative">
                  <button
                    onClick={() => !isFinalizada && setShowEstadoMenu(!showEstadoMenu)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-base ${estadoUrgenciaConfig[urgencia.estado].bg} ${estadoUrgenciaConfig[urgencia.estado].color} border ${estadoUrgenciaConfig[urgencia.estado].bg.replace('bg-', 'border-').replace('50', '200')}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${estadoUrgenciaConfig[urgencia.estado].dot} ${urgencia.estado === 'en_atencion' ? 'animate-pulse' : ''}`}></span>
                    {estadoUrgenciaConfig[urgencia.estado].label}
                    {!isFinalizada && <i className="ri-arrow-down-s-line text-[10px]"></i>}
                  </button>
                  {showEstadoMenu && (
                    <div className="absolute top-full left-0 mt-1 bg-background-50 border border-secondary-200 rounded-lg shadow-lg z-30 py-1 min-w-[150px]">
                      {(['esperando', 'en_atencion', 'observacion', 'alta'] as EstadoUrgencia[]).map((e) => (
                        <button
                          key={e}
                          onClick={() => {
                            if (e === 'alta') {
                              setShowEstadoMenu(false);
                              setShowAlta(true);
                            } else {
                              changeEstado(e);
                            }
                          }}
                          className={`w-full text-left px-3 py-2 text-xs cursor-pointer transition-base hover:bg-secondary-50 flex items-center gap-2 ${urgencia.estado === e ? 'bg-primary-50 text-primary-700 font-medium' : 'text-foreground-700'}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${estadoUrgenciaConfig[e].dot}`}></span>
                          {estadoUrgenciaConfig[e].label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${urgenciaConfigLocal.bg} ${urgenciaConfigLocal.text} ${urgenciaConfigLocal.border} border`}>
                  <span className={`w-2 h-2 rounded-full ${urgenciaConfigLocal.color}`}></span>
                  {urgenciaConfigLocal.label}
                </span>
              </div>
              <p className="text-sm text-foreground-500 mt-1">
                {urgencia.patientExpediente} · {urgencia.edad} años · {urgencia.genero === 'F' ? 'Femenino' : 'Masculino'}
              </p>
              <p className="text-xs text-foreground-400 mt-0.5">
                Llegada: {urgencia.horaLlegada} hrs · {urgencia.areaUrgencia}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="inline-flex items-center gap-1.5 text-2xs text-foreground-500">
              <i className={viaConfig.icon}></i>
              {viaConfig.label}
            </span>
            <span className="text-2xs text-foreground-400">
              <i className="ri-phone-line mr-1"></i>
              {urgencia.contactoEmergencia}
            </span>
          </div>
        </div>
      </Card>

      {/* Signos vitales */}
      {urgencia.signosVitales && (
        <Card padding="md">
          <h4 className="text-xs font-semibold text-foreground-700 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 flex items-center justify-center rounded bg-emerald-100 text-emerald-600">
              <i className="ri-heart-pulse-line text-2xs" aria-hidden="true"></i>
            </span>
            Signos vitales
            <span className="text-2xs font-normal text-foreground-400 ml-2">{urgencia.signosVitales.hora} hrs · {urgencia.signosVitales.realizadoPor}</span>
          </h4>

          {(() => {
            const svErrors = getSignosVitalesErrors(urgencia.signosVitales);
            if (svErrors.length === 0) return null;
            return (
              <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg" role="alert">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 flex items-center justify-center text-red-500 flex-shrink-0 mt-0.5">
                    <i className="ri-error-warning-line text-sm" aria-hidden="true"></i>
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-red-700">
                      {svErrors.length} valor{svErrors.length > 1 ? 'es' : ''} fuera de rango clínico
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {svErrors.map((err, i) => (
                        <li key={i} className="text-2xs text-red-600">• {err}</li>
                      ))}
                    </ul>
                    <p className="text-2xs text-red-500 mt-1.5 italic">Estos signos vitales deben ser verificados y corregidos.</p>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            <VitalBadge icon="ri-temp-hot-line" label="Temperatura" value={`${urgencia.signosVitales.temperatura}°C`} alert={urgencia.signosVitales.temperatura > 37.5 || urgencia.signosVitales.temperatura < 36.0} />
            <VitalBadge icon="ri-heart-line" label="Presión" value={`${urgencia.signosVitales.presionSistolica}/${urgencia.signosVitales.presionDiastolica}`} alert={urgencia.signosVitales.presionSistolica > 139 || urgencia.signosVitales.presionSistolica < 90 || urgencia.signosVitales.presionDiastolica > 89 || urgencia.signosVitales.presionDiastolica < 60} />
            <VitalBadge icon="ri-heart-pulse-line" label="FC" value={`${urgencia.signosVitales.frecuenciaCardiaca} lpm`} alert={urgencia.signosVitales.frecuenciaCardiaca > 100 || urgencia.signosVitales.frecuenciaCardiaca < 60} />
            <VitalBadge icon="ri-lungs-line" label="FR" value={`${urgencia.signosVitales.frecuenciaRespiratoria} rpm`} alert={urgencia.signosVitales.frecuenciaRespiratoria > 20 || urgencia.signosVitales.frecuenciaRespiratoria < 12} />
            <VitalBadge icon="ri-drop-line" label="SpO₂" value={`${urgencia.signosVitales.saturacionOxigeno}%`} alert={urgencia.signosVitales.saturacionOxigeno < 95} />
            <VitalBadge icon="ri-body-scan-line" label="IMC" value={urgencia.signosVitales.imc.toFixed(1)} alert={urgencia.signosVitales.imc >= 30 || urgencia.signosVitales.imc < 18.5} />
          </div>
          {urgencia.signosVitales.glucosa && (
            <div className="mt-2 pt-2 border-t border-secondary-100 flex items-center gap-4 text-xs text-foreground-500 flex-wrap">
              <span className="flex items-center gap-1"><i className="ri-test-tube-line"></i> Glucosa: <strong>{urgencia.signosVitales.glucosa} mg/dL</strong></span>
              <span className="flex items-center gap-1"><i className="ri-emotion-line"></i> Dolor (EVA): <strong>{urgencia.signosVitales.dolor}/10</strong></span>
            </div>
          )}
          {urgencia.signosVitales.notas && (
            <p className="mt-2 text-xs text-foreground-500 italic">"{urgencia.signosVitales.notas}"</p>
          )}
        </Card>
      )}

      {/* Motivo */}
      <Card padding="md">
        <h4 className="text-xs font-semibold text-foreground-700 mb-2 flex items-center gap-2">
          <span className="w-5 h-5 flex items-center justify-center rounded bg-amber-100 text-amber-600">
            <i className="ri-alert-line text-2xs"></i>
          </span>
          Motivo de ingreso
        </h4>
        <p className="text-sm text-foreground-700 leading-relaxed">{urgencia.motivo}</p>
      </Card>

      {/* Nota médica */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-foreground-700 flex items-center gap-2">
            <span className="w-5 h-5 flex items-center justify-center rounded bg-sky-100 text-sky-600">
              <i className="ri-stethoscope-line text-2xs"></i>
            </span>
            Nota médica de urgencia
          </h4>
          {hasUnsaved && (
            <span className="inline-flex items-center gap-1.5 text-xs text-amber-600">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              Sin guardar
            </span>
          )}
        </div>
        {isEnAtencion ? (
          <>
            <textarea
              value={notaMedica}
              onChange={(e) => { setNotaMedica(e.target.value); setHasUnsaved(true); }}
              placeholder="Registra la nota médica de urgencia: evolución, tratamiento administrado, indicaciones..."
              aria-label="Nota médica de urgencia"
              rows={6}
              maxLength={1000}
              className="w-full p-3 bg-background-50 border border-secondary-200 rounded-lg text-sm text-foreground-700 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none"
            />
            <p className="text-2xs text-foreground-400 mt-1 text-right" aria-live="polite">{notaMedica.length}/1000</p>
            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                onClick={saveNota}
                disabled={!hasUnsaved}
                className="px-3 py-1.5 text-xs font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-base cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                <span className="flex items-center gap-1.5">
                  <i className="ri-save-line"></i> Guardar nota
                </span>
              </button>
            </div>
          </>
        ) : (
          <div className="p-3 bg-background-50 rounded-lg border border-secondary-100 text-sm text-foreground-700 leading-relaxed whitespace-pre-wrap min-h-[80px]">
            {urgencia.notaMedica || (
              <span className="text-foreground-400 italic">Sin nota médica registrada. Cambia el estado a "En atención" para redactar la nota.</span>
            )}
          </div>
        )}
      </Card>

      {/* Medicamentos de Urgencia */}
      {isEnAtencion && !showRecetaCreator && (
        <Card padding="md">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-foreground-700 flex items-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center rounded bg-red-100 text-red-600">
                <i className="ri-capsule-line text-2xs"></i>
              </span>
              Medicamentos de urgencia
              {todasLasRecetas.length > 0 && (
                <span className="text-2xs font-normal text-foreground-400 ml-1">({todasLasRecetas.length} receta{todasLasRecetas.length !== 1 ? 's' : ''})</span>
              )}
            </h4>
            <button
              onClick={() => setShowRecetaCreator(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-500/100 text-white rounded-lg hover:bg-red-600 transition-base cursor-pointer whitespace-nowrap"
            >
              <i className="ri-add-line"></i>
              Nueva receta de urgencia
            </button>
          </div>

          {todasLasRecetas.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <span className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary-100 text-foreground-400">
                <i className="ri-capsule-line text-lg"></i>
              </span>
              <p className="text-xs text-foreground-500">Sin recetas de urgencia</p>
              <p className="text-2xs text-foreground-400">Genera una receta para que farmacia dispense los medicamentos de inmediato.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todasLasRecetas.map((receta) => {
                const isSurtida = receta.estado === 'surtida';
                const isParcial = receta.estado === 'parcial';
                return (
                  <div
                    key={receta.id}
                    className={`p-3 rounded-lg border ${
                      isSurtida
                        ? 'bg-emerald-50/30 border-emerald-200'
                        : isParcial
                        ? 'bg-amber-50/30 border-amber-200'
                        : 'bg-red-500/10 border-red-500/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-medium border ${
                            isSurtida
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              : isParcial
                              ? 'bg-amber-100 text-amber-700 border-amber-200'
                              : 'bg-red-100 text-red-700 border-red-500/20'
                          }`}>
                            <i className={`${isSurtida ? 'ri-check-double-line' : isParcial ? 'ri-check-line' : 'ri-timer-flash-line'} text-[10px]`}></i>
                            {isSurtida ? 'Dispensada' : isParcial ? 'Dispensada parcial' : 'Pendiente en farmacia'}
                          </span>
                          <span className="text-2xs text-foreground-400">
                            {receta.fecha} · {receta.hora}
                          </span>
                          <span className="text-2xs text-foreground-400">
                            RX-URG-{receta.id.replace(/^ru?/, '').padStart(4, '0')}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {receta.medicamentos.map((med) => (
                            <span
                              key={med.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-background-50 border border-secondary-200 rounded-full text-2xs text-foreground-700"
                            >
                              <i className={`${med.via === 'Intravenosa' || med.via === 'Intramuscular' ? 'ri-syringe-line' : 'ri-capsule-line'} text-foreground-400`}></i>
                              {med.nombre} {med.concentracion}
                              <span className="text-foreground-400">·</span>
                              <span className="font-medium">{med.dosis}</span>
                            </span>
                          ))}
                        </div>
                        {receta.indicacionesGenerales && (
                          <p className="text-2xs text-foreground-500 mt-1.5 line-clamp-2">{receta.indicacionesGenerales}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Botón imprimir receta — igual que en Consultas */}
                        <button
                          type="button"
                          onClick={() => setRecetaParaImprimir(receta)}
                          title="Ver / Imprimir receta"
                          aria-label="Ver e imprimir receta de urgencia"
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-foreground-400 hover:text-primary-600 hover:bg-primary-50 border border-secondary-200 hover:border-primary-200 transition-base cursor-pointer"
                        >
                          <i className="ri-printer-line text-sm" aria-hidden="true"></i>
                        </button>
                        {!isSurtida && (
                          <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 text-red-500">
                            <i className="ri-alert-line animate-pulse text-sm"></i>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Receta Creator */}
      {showRecetaCreator && (
        <UrgenciaRecetaCreator
          urgenciaId={urgencia.id}
          patientId={urgencia.patientId}
          patientName={urgencia.patientName}
          patientExpediente={urgencia.patientExpediente}
          doctorId={urgencia.doctorId || 'd1'}
          doctorName={urgencia.doctorName || 'Dr. Alejandro García'}
          doctorCedula="CED-09876543"
          diagnosticoRelacionado={urgencia.motivo.split('.')[0]}
          onRecetaCreada={handleRecetaCreada}
          onCancel={() => setShowRecetaCreator(false)}
        />
      )}

      {/* Acciones rápidas para atención */}
      {isEnAtencion && !showAlta && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAlta(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-base cursor-pointer whitespace-nowrap"
          >
            <i className="ri-check-double-line"></i> Dar de alta
          </button>
          {/* Navegar a Caja para cobros manuales */}
          <button
            onClick={() => navigate('/app/caja')}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium bg-background-50 border border-secondary-200 text-foreground-600 rounded-lg hover:bg-secondary-100 transition-base cursor-pointer whitespace-nowrap"
          >
            <i className="ri-cash-line"></i> Ir a Caja
          </button>
        </div>
      )}

      {/* Advertencia de recetas pendientes */}
      {showPendientesWarning && (
        <Card padding="md" className="border-amber-200 bg-amber-50/50">
          <div className="flex items-start gap-3 mb-4">
            <span className="w-10 h-10 flex items-center justify-center rounded-full bg-amber-100 text-amber-600 flex-shrink-0">
              <i className="ri-alert-line text-lg"></i>
            </span>
            <div>
              <h4 className="text-sm font-semibold text-amber-800">Recetas pendientes de surtir</h4>
              <p className="text-xs text-amber-700 mt-1">
                Este paciente tiene <strong>{recetasPendientes.length}</strong> receta{recetasPendientes.length > 1 ? 's' : ''} de urgencia sin dispensar. Se recomienda que farmacia surta los medicamentos antes del alta.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {recetasPendientes.map((r) => (
                  <span key={r.id} className="inline-flex items-center gap-1 px-2 py-0.5 text-2xs bg-amber-100 text-amber-700 border border-amber-200 rounded-full">
                    <i className="ri-timer-flash-line text-[10px]"></i>
                    RX-URG-{r.id.replace(/^ru?/, '').padStart(4, '0')} · {r.medicamentos.length} medicamento{r.medicamentos.length !== 1 ? 's' : ''}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => { setShowPendientesWarning(false); setShowAlta(true); }}
              className="px-3 py-1.5 text-xs font-medium text-foreground-600 hover:text-foreground-800 hover:bg-secondary-100 rounded-lg transition-base cursor-pointer whitespace-nowrap"
            >
              Volver
            </button>
            <button
              onClick={() => navigate('/app/farmacia')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-200 rounded-lg transition-base cursor-pointer whitespace-nowrap"
            >
              <i className="ri-store-2-line"></i> Ir a Farmacia
            </button>
            <button
              onClick={() => ejecutarAlta(destinoAltaTemporal as DestinoAlta)}
              disabled={!destinoAltaTemporal}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-base cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              <i className="ri-check-double-line"></i> Alta de todas formas
            </button>
          </div>
        </Card>
      )}

      {/* Panel de alta */}
      {showAlta && (
        <Card padding="md" className="border-emerald-200 bg-emerald-50/50">
          <h4 className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 flex items-center justify-center rounded bg-emerald-100 text-emerald-600">
              <i className="ri-check-double-line text-xs"></i>
            </span>
            Alta de urgencias
          </h4>

          {/* Aviso informativo de cobro automático */}
          <div className="mb-3 p-2.5 bg-primary-50 border border-primary-100 rounded-lg flex items-start gap-2">
            <span className="w-4 h-4 flex items-center justify-center text-primary-500 flex-shrink-0 mt-0.5">
              <i className="ri-information-line text-sm"></i>
            </span>
            <p className="text-2xs text-primary-700">
              Al confirmar el alta se registrará automáticamente el cobro de la <strong>Atención de Urgencias</strong> en Caja para generar la factura correspondiente.
            </p>
          </div>

          <p className="text-xs text-foreground-600 mb-3">Selecciona el destino del paciente tras la atención de urgencias.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-4">
            {(['domicilio', 'hospitalizacion', 'consulta_externa', 'referencia', 'quirofano'] as DestinoAlta[]).map((d) => {
              const dc = destinoAltaConfig[d];
              const isSelected = destinoAlta === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDestinoAlta(d)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border cursor-pointer transition-base ${
                    isSelected ? 'bg-background-50 border-emerald-300 ring-1 ring-emerald-200' : 'bg-background-50 border-secondary-200 hover:border-secondary-300'
                  }`}
                >
                  <i className={`${dc.icon} ${isSelected ? dc.color : 'text-foreground-400'} text-lg`}></i>
                  <span className={`text-xs font-medium ${isSelected ? dc.color : 'text-foreground-600'}`}>{dc.label}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setShowAlta(false)}
              className="px-3 py-1.5 text-xs font-medium text-foreground-600 hover:text-foreground-800 hover:bg-secondary-100 rounded-lg transition-base cursor-pointer whitespace-nowrap"
            >
              Cancelar
            </button>
            <button
              onClick={confirmarAlta}
              disabled={!destinoAlta}
              className="px-4 py-2 text-sm font-semibold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-base cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              Confirmar alta
            </button>
          </div>
        </Card>
      )}

      {/* Info de alta ya dada */}
      {isFinalizada && urgencia.destinoAlta && (
        <Card padding="md" className="border-emerald-200 bg-emerald-50/30">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <i className="ri-check-double-line text-lg"></i>
            </span>
            <div>
              <p className="text-sm font-semibold text-emerald-800">Alta completada</p>
              <p className="text-xs text-foreground-600">
                Destino: <strong className={destinoAltaConfig[urgencia.destinoAlta].color}>{destinoAltaConfig[urgencia.destinoAlta].label}</strong>
                {urgencia.horaAlta && <span className="ml-2 text-foreground-400">· {urgencia.horaAlta} hrs</span>}
              </p>
              <p className="text-2xs text-foreground-400 mt-0.5">
                <i className="ri-cash-line mr-1"></i>
                Cobro de atención registrado en Caja
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Modal imprimir receta */}
      {recetaParaImprimir && (
        <RecetaPrintModal
          receta={recetaParaImprimir}
          isOpen={!!recetaParaImprimir}
          onClose={() => setRecetaParaImprimir(null)}
        />
      )}
    </div>
  );
}