import { useEffect, useMemo } from 'react';
import type { NotaEvolucion, Pronostico } from '@/mocks/notasEvolucion';
import { getPatientById } from '@/mocks/patients';
import { doctors } from '@/mocks/doctors';
import { sucursales } from '@/mocks/branches';
import { exportElementToPDF } from '@/utils/exportUtils';
import InstitucionalLogo from '@/components/feature/InstitucionalLogo';
import FirmaDigital from '@/components/feature/FirmaDigital';

interface NotaEvolucionPrintModalProps {
  nota: NotaEvolucion;
  patientName: string;
  patientExpediente: string;
  isOpen: boolean;
  onClose: () => void;
}

const pronosticoConfig: Record<Pronostico, { label: string; printClass: string }> = {
  bueno: { label: 'Bueno', printClass: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  reservado: { label: 'Reservado', printClass: 'bg-amber-100 text-amber-700 border-amber-200' },
  malo: { label: 'Malo', printClass: 'bg-red-100 text-red-700 border-red-200' },
};

function formatearFecha(fecha: string): string {
  if (!fecha) return '—';
  const [y, m, d] = fecha.split('-');
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return `${parseInt(d)} de ${meses[parseInt(m) - 1]} de ${y}`;
}

export default function NotaEvolucionPrintModal({
  nota, patientName, patientExpediente, isOpen, onClose,
}: NotaEvolucionPrintModalProps) {
  const patient = useMemo(() => getPatientById(nota.patientId), [nota.patientId]);
  const doctor = useMemo(() => doctors.find((d) => d.nombre === nota.medico), [nota.medico]);
  const sucursal = sucursales[0];
  const pron = pronosticoConfig[nota.pronostico];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('printing-nota');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('printing-nota');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('printing-nota');
    };
  }, [isOpen]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const wrapper = document.getElementById('nota-evolucion-print-wrapper');
    if (!wrapper) return;
    await exportElementToPDF(wrapper, `NotaEvolucion_${patientName.replace(/\s+/g, '_')}_${nota.fecha}`, {
      title: `Nota de Evolución — ${patientName}`,
      orientation: 'portrait',
      margin: 0,
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay — hidden in print */}
      <div className="fixed inset-0 bg-black/60 z-[100] print:hidden" />

      {/* Modal root */}
      <div className="nota-evolucion-print-modal-root fixed inset-0 z-[101] flex items-start justify-center overflow-y-auto print:static print:overflow-visible print:z-auto print:block">
        <div className="relative w-full max-w-[210mm] min-h-[297mm] mx-auto my-4 bg-background-50 print:bg-white print:m-0 print:shadow-none print:max-w-none print:w-full print:min-h-0">
          <div id="nota-evolucion-print-wrapper" className="bg-background-50 print:bg-white print:text-black">

            {/* Header Institucional */}
            <div className="px-10 pt-10 pb-6 border-b-2 border-primary-500/20 print:border-gray-300">
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-start gap-4">
                  <InstitucionalLogo
                    fallbackIcon="ri-file-edit-line"
                    fallbackClassName="w-14 h-14 rounded-xl bg-primary-500 text-white flex items-center justify-center flex-shrink-0 print:bg-gray-800"
                    imgClassName="w-14 h-14 object-contain flex-shrink-0"
                  />
                  <div>
                    <h2 className="text-xl font-bold text-foreground-900 font-heading print:text-black">MediCore</h2>
                    <p className="text-xs text-foreground-500 mt-0.5 print:text-gray-600">Sistema Integral de Gestión Médica</p>
                    <p className="text-xs text-foreground-500 print:text-gray-600">{sucursal.nombre}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xs text-foreground-400 print:text-gray-500">{sucursal.direccion}</p>
                  <p className="text-2xs text-foreground-400 print:text-gray-500">{sucursal.ciudad}, {sucursal.estado} {sucursal.codigoPostal}</p>
                  <p className="text-2xs text-foreground-400 mt-1 print:text-gray-500">Tel: {sucursal.telefono}</p>
                </div>
              </div>
            </div>

            {/* Título NOM-004 */}
            <div className="px-10 py-5 text-center border-b border-secondary-200 print:border-gray-300">
              <h1 className="text-2xl font-bold text-foreground-950 tracking-wide font-heading print:text-black">NOTA DE EVOLUCIÓN</h1>
              <p className="text-xs text-foreground-500 mt-1 font-mono print:text-gray-600">NOM-004-SSA3-2012 · Documento de seguimiento clínico</p>
              <p className="text-xs text-foreground-500 print:text-gray-600">Fecha: {formatearFecha(nota.fecha)} · Hora: {nota.hora} hrs</p>
            </div>

            {/* Datos Paciente y Médico */}
            <div className="px-10 py-5 grid grid-cols-2 gap-6 print:gap-8">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Paciente</p>
                <p className="text-sm font-semibold text-foreground-900 print:text-black">{patientName}</p>
                <div className="text-xs text-foreground-500 mt-1 space-y-0.5 print:text-gray-600">
                  <p>Expediente: <span className="font-medium text-foreground-700 print:text-black">{patientExpediente}</span></p>
                  {patient && (
                    <>
                      <p>Edad: <span className="font-medium text-foreground-700 print:text-black">{patient.edad} años</span> · Sexo: <span className="font-medium text-foreground-700 print:text-black">{patient.sexo === 'M' ? 'Masculino' : 'Femenino'}</span></p>
                      <p>CURP: <span className="font-medium text-foreground-700 print:text-black">{patient.curp}</span></p>
                    </>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Médico tratante</p>
                <p className="text-sm font-semibold text-foreground-900 print:text-black">{nota.medico}</p>
                <div className="text-xs text-foreground-500 mt-1 space-y-0.5 print:text-gray-600">
                  <p>Cédula Profesional: <span className="font-medium text-foreground-700 print:text-black">{nota.medicoCedula || '—'}</span></p>
                  {doctor && <p>Especialidad: <span className="font-medium text-foreground-700 print:text-black">{doctor.especialidad}</span></p>}
                </div>
              </div>
            </div>

            {/* Signos Vitales */}
            <div className="px-10 py-4">
              <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-3 print:text-gray-500">Signos Vitales</p>
              <div className="grid grid-cols-3 gap-3 print:grid-cols-3 print:gap-4">
                <div className="p-2.5 bg-background-50 border border-secondary-100 rounded-lg print:bg-gray-50 print:border-gray-300 print:rounded-none">
                  <p className="text-2xs text-foreground-400 print:text-gray-500">Temperatura</p>
                  <p className="text-sm font-semibold text-foreground-800 print:text-black">{nota.signosVitales.temperatura || '—'} °C</p>
                </div>
                <div className="p-2.5 bg-background-50 border border-secondary-100 rounded-lg print:bg-gray-50 print:border-gray-300 print:rounded-none">
                  <p className="text-2xs text-foreground-400 print:text-gray-500">Presión Arterial</p>
                  <p className="text-sm font-semibold text-foreground-800 print:text-black">{nota.signosVitales.presionSistolica && nota.signosVitales.presionDiastolica ? `${nota.signosVitales.presionSistolica}/${nota.signosVitales.presionDiastolica}` : '—'} mmHg</p>
                </div>
                <div className="p-2.5 bg-background-50 border border-secondary-100 rounded-lg print:bg-gray-50 print:border-gray-300 print:rounded-none">
                  <p className="text-2xs text-foreground-400 print:text-gray-500">Frecuencia Cardiaca</p>
                  <p className="text-sm font-semibold text-foreground-800 print:text-black">{nota.signosVitales.frecuenciaCardiaca || '—'} lpm</p>
                </div>
                <div className="p-2.5 bg-background-50 border border-secondary-100 rounded-lg print:bg-gray-50 print:border-gray-300 print:rounded-none">
                  <p className="text-2xs text-foreground-400 print:text-gray-500">Frecuencia Respiratoria</p>
                  <p className="text-sm font-semibold text-foreground-800 print:text-black">{nota.signosVitales.frecuenciaRespiratoria || '—'} rpm</p>
                </div>
                <div className="p-2.5 bg-background-50 border border-secondary-100 rounded-lg print:bg-gray-50 print:border-gray-300 print:rounded-none">
                  <p className="text-2xs text-foreground-400 print:text-gray-500">SpO₂</p>
                  <p className="text-sm font-semibold text-foreground-800 print:text-black">{nota.signosVitales.saturacionOxigeno || '—'} %</p>
                </div>
                <div className="p-2.5 bg-background-50 border border-secondary-100 rounded-lg print:bg-gray-50 print:border-gray-300 print:rounded-none">
                  <p className="text-2xs text-foreground-400 print:text-gray-500">IMC</p>
                  <p className="text-sm font-semibold text-foreground-800 print:text-black">
                    {nota.signosVitales.peso && nota.signosVitales.talla
                      ? (parseFloat(nota.signosVitales.peso) / (parseFloat(nota.signosVitales.talla) ** 2)).toFixed(1)
                      : '—'} kg/m²
                  </p>
                </div>
                <div className="p-2.5 bg-background-50 border border-secondary-100 rounded-lg print:bg-gray-50 print:border-gray-300 print:rounded-none">
                  <p className="text-2xs text-foreground-400 print:text-gray-500">Peso</p>
                  <p className="text-sm font-semibold text-foreground-800 print:text-black">{nota.signosVitales.peso || '—'} kg</p>
                </div>
                <div className="p-2.5 bg-background-50 border border-secondary-100 rounded-lg print:bg-gray-50 print:border-gray-300 print:rounded-none">
                  <p className="text-2xs text-foreground-400 print:text-gray-500">Talla</p>
                  <p className="text-sm font-semibold text-foreground-800 print:text-black">{nota.signosVitales.talla || '—'} m</p>
                </div>
                <div className="p-2.5 bg-background-50 border border-secondary-100 rounded-lg print:bg-gray-50 print:border-gray-300 print:rounded-none">
                  <p className="text-2xs text-foreground-400 print:text-gray-500">Glucosa</p>
                  <p className="text-sm font-semibold text-foreground-800 print:text-black">{nota.signosVitales.glucosa || '—'} mg/dL</p>
                </div>
              </div>
            </div>

            {/* Evolución Subjetiva */}
            <div className="px-10 py-4">
              <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Evolución Subjetiva</p>
              <div className="bg-background-50 border border-secondary-100 rounded-lg p-4 print:bg-gray-50 print:border-gray-300 print:rounded-none">
                <p className="text-xs text-foreground-700 leading-relaxed whitespace-pre-wrap print:text-black">{nota.evolucionSubjetiva || 'Sin registro'}</p>
              </div>
            </div>

            {/* Evolución Objetiva */}
            <div className="px-10 py-4">
              <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Evolución Objetiva / Exploración Física</p>
              <div className="bg-background-50 border border-secondary-100 rounded-lg p-4 print:bg-gray-50 print:border-gray-300 print:rounded-none">
                <p className="text-xs text-foreground-700 leading-relaxed whitespace-pre-wrap print:text-black">{nota.evolucionObjetiva || 'Sin registro'}</p>
              </div>
            </div>

            {/* Resultados de Estudios */}
            {nota.resultadosEstudios.length > 0 && (
              <div className="px-10 py-4">
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Resultados de Estudios Relevantes</p>
                <div className="space-y-2">
                  {nota.resultadosEstudios.map((r) => (
                    <div key={r.id} className="bg-background-50 border border-secondary-100 rounded-lg p-3 print:bg-gray-50 print:border-gray-300 print:rounded-none">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground-800 print:text-black">{r.nombre || 'Estudio'}</p>
                          <p className="text-xs text-foreground-600 mt-0.5 print:text-gray-600">{r.resultado}</p>
                        </div>
                        {r.fecha && <span className="text-2xs text-foreground-400 whitespace-nowrap print:text-gray-500">{formatearFecha(r.fecha)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Diagnósticos */}
            <div className="px-10 py-4">
              <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Diagnósticos</p>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                <p className="text-2xs text-amber-600 font-medium mb-1 print:text-gray-600">Principal</p>
                <p className="text-sm font-semibold text-foreground-800 print:text-black">{nota.diagnosticoPrincipal || 'Sin diagnóstico registrado'}</p>
              </div>
              {nota.diagnosticosSecundarios.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {nota.diagnosticosSecundarios.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 bg-background-50 border border-secondary-100 rounded-lg p-2.5">
                      <span className="w-5 h-5 flex items-center justify-center rounded-full bg-secondary-100 text-foreground-500 text-2xs font-bold flex-shrink-0">{i + 1}</span>
                      <p className="text-xs text-foreground-700 print:text-black">{d}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tratamiento */}
            <div className="px-10 py-4">
              <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Tratamiento / Indicaciones</p>
              <div className="bg-background-50 border border-secondary-100 rounded-lg p-4 print:bg-gray-50 print:border-gray-300 print:rounded-none">
                <p className="text-xs text-foreground-700 leading-relaxed whitespace-pre-wrap print:text-black">{nota.tratamientoIndicaciones || 'Sin registro'}</p>
              </div>
            </div>

            {/* Pronóstico */}
            <div className="px-10 py-4">
              <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Pronóstico</p>
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${pron.printClass} print:bg-gray-100 print:text-black print:border-gray-300 print:rounded-none`}>
                {pron.label}
              </div>
            </div>

            {/* Observaciones */}
            {nota.observaciones && (
              <div className="px-10 py-4">
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Observaciones</p>
                <div className="bg-background-50 border border-secondary-100 rounded-lg p-4 print:bg-gray-50 print:border-gray-300 print:rounded-none">
                  <p className="text-xs text-foreground-700 leading-relaxed whitespace-pre-wrap print:text-black">{nota.observaciones}</p>
                </div>
              </div>
            )}

            {/* Firma */}
            <div className="px-10 py-8 mt-4 print:mt-8">
              <div className="flex justify-end">
                <div className="text-center">
                  <FirmaDigital doctorId={doctor?.id} nombre={nota.medico} cedula={nota.medicoCedula} lineClassName="w-56 border-b border-foreground-400 mb-2 print:border-gray-600" />
                  <p className="text-sm font-semibold text-foreground-900 print:text-black">{nota.medico}</p>
                  {doctor && <p className="text-xs text-foreground-500 print:text-gray-600">{doctor.especialidad}</p>}
                  <p className="text-xs text-foreground-500 print:text-gray-600">Cédula: {nota.medicoCedula || '—'}</p>
                  <p className="text-2xs text-foreground-400 mt-2 print:text-gray-500">
                    Firma electrónica · {formatearFecha(nota.fecha)} · {nota.hora} hrs
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-10 py-4 border-t border-secondary-200 mt-auto print:border-gray-300 print:mt-4">
              <div className="flex items-center justify-between text-[10px] text-foreground-400 print:text-gray-500">
                <p>Documento generado conforme a la NOM-004-SSA3-2012.</p>
                <p>MediCore · {sucursal.telefono} · {sucursal.email}</p>
              </div>
              <p className="text-[10px] text-foreground-400 mt-1 text-center print:text-gray-500">
                Esta nota forma parte del expediente clínico electrónico del paciente.
              </p>
            </div>
          </div>

          {/* Actions - hidden on print */}
          <div className="sticky bottom-0 left-0 right-0 bg-background-50/95 backdrop-blur border-t border-secondary-200 p-4 flex items-center justify-between gap-3 print:hidden">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-foreground-600 hover:text-foreground-800 hover:bg-secondary-100 rounded-lg transition-base cursor-pointer whitespace-nowrap"
            >
              Cerrar
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPDF}
                className="px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg transition-base cursor-pointer whitespace-nowrap flex items-center gap-2"
              >
                <i className="ri-file-pdf-line"></i> Descargar PDF
              </button>
              <button
                onClick={handlePrint}
                className="px-6 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-base cursor-pointer whitespace-nowrap flex items-center gap-2"
              >
                <i className="ri-printer-line"></i> Imprimir nota
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          html, body {
            background: #ffffff !important;
            overflow: visible !important;
            height: auto !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body.printing-nota #root {
            display: none !important;
          }
          .nota-evolucion-print-modal-root {
            display: block !important;
            position: static !important;
            inset: auto !important;
            overflow: visible !important;
            background: none !important;
            z-index: auto !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .nota-evolucion-print-modal-root > div {
            max-width: none !important;
            min-height: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
          }
          #nota-evolucion-print-wrapper {
            display: block !important;
            position: static !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            min-height: 0 !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            box-shadow: none !important;
          }
          #nota-evolucion-print-wrapper,
          #nota-evolucion-print-wrapper * {
            visibility: visible !important;
          }
          #nota-evolucion-print-wrapper .flex {
            display: flex !important;
          }
          #nota-evolucion-print-wrapper .grid {
            display: grid !important;
          }
          #nota-evolucion-print-wrapper .hidden,
          #nota-evolucion-print-wrapper [class*="print:hidden"] {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}