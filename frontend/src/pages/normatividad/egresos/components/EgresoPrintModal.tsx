import { useEffect, useMemo } from 'react';
import type { HojaEgreso } from '@/mocks/egresos';
import { estadoAltaConfig, destinoAltaConfigEgreso } from '@/mocks/egresos';
import { getPatientById } from '@/mocks/patients';
import { sucursales } from '@/mocks/branches';
import { exportElementToPDF, exportElementToPDFBlob } from '@/utils/exportUtils';
import InstitucionalLogo from '@/components/feature/InstitucionalLogo';
import FirmaDigital from '@/components/feature/FirmaDigital';

interface EgresoPrintModalProps {
  egreso: HojaEgreso;
  isOpen: boolean;
  onClose: () => void;
}

export default function EgresoPrintModal({ egreso, isOpen, onClose }: EgresoPrintModalProps) {
  const patient = useMemo(() => getPatientById(egreso.patientId), [egreso.patientId]);
  const sucursal = sucursales[0];
  const estCfg = estadoAltaConfig[egreso.estadoAlta];
  const destCfg = destinoAltaConfigEgreso[egreso.destinoAlta];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('printing-egreso');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('printing-egreso');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('printing-egreso');
    };
  }, [isOpen]);

  const handlePrint = async () => {
    const wrapper = document.getElementById('egreso-print-wrapper');
    if (!wrapper) return;
    const blob = await exportElementToPDFBlob(wrapper, {
      title: `Hoja de Egreso — ${egreso.patientName}`,
      orientation: 'portrait',
      margin: 0,
    });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const handleDownloadPDF = async () => {
    const wrapper = document.getElementById('egreso-print-wrapper');
    if (!wrapper) return;
    const filename = `Egreso_${egreso.patientName.replace(/\s+/g, '_')}_${egreso.fechaEgreso}`;
    await exportElementToPDF(wrapper, filename, {
      title: `Hoja de Egreso — ${egreso.patientName}`,
      orientation: 'portrait',
      margin: 0,
    });
  };

  if (!isOpen) return null;

  const folio = `EG-${egreso.id.replace(/-/g, '').toUpperCase()}`;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[100] print:hidden" />
      <div className="egreso-print-modal-root fixed inset-0 z-[101] flex items-start justify-center overflow-y-auto print:static print:overflow-visible print:z-auto print:block">
        <div className="relative w-full max-w-[210mm] min-h-[297mm] mx-auto my-4 bg-background-50 print:bg-white print:m-0 print:shadow-none print:max-w-none print:w-full print:min-h-0">
          <div id="egreso-print-wrapper" className="bg-background-50 print:bg-white print:text-black">
            {/* Header */}
            <div className="px-10 pt-10 pb-6 border-b-2 border-primary-500/20 print:border-gray-300">
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-start gap-4">
                  <InstitucionalLogo
                    fallbackIcon="ri-file-list-3-line"
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

            {/* Title */}
            <div className="px-10 py-5 text-center border-b border-secondary-200 print:border-gray-300">
              <h1 className="text-2xl font-bold text-foreground-950 tracking-wide font-heading print:text-black">HOJA DE EGRESO HOSPITALARIO</h1>
              <p className="text-xs text-foreground-500 mt-1 font-mono print:text-gray-600">NOM-004-SSA3-2012 · Art. 6.3.7</p>
              <p className="text-xs text-foreground-500 print:text-gray-600">Folio: {folio}</p>
            </div>

            {/* Estado & destino */}
            <div className="px-10 pt-5 flex items-center gap-3">
              <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium border ${estCfg.bg} ${estCfg.text} border-secondary-200 print:bg-gray-100 print:text-black print:border-gray-300`}>
                <i className={`${estCfg.icon} text-[10px]`}></i>
                Estado de alta: {estCfg.label}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium border bg-secondary-50 text-foreground-700 border-secondary-200 print:bg-gray-100 print:text-black print:border-gray-300">
                <i className={`${destCfg.icon} text-[10px]`}></i>
                Destino: {destCfg.label}
              </span>
            </div>

            {/* Patient info */}
            <div className="px-10 py-5 grid grid-cols-2 gap-6 print:gap-8">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Paciente</p>
                <p className="text-sm font-semibold text-foreground-900 print:text-black">{egreso.patientName}</p>
                <div className="text-xs text-foreground-500 mt-1 space-y-0.5 print:text-gray-600">
                  <p>Expediente: <span className="font-medium text-foreground-700 print:text-black">{egreso.patientExpediente}</span></p>
                  {patient && (
                    <>
                      <p>Edad: <span className="font-medium text-foreground-700 print:text-black">{patient.edad} años</span> · Sexo: <span className="font-medium text-foreground-700 print:text-black">{patient.sexo === 'M' ? 'Masculino' : 'Femenino'}</span></p>
                      <p>CURP: <span className="font-medium text-foreground-700 print:text-black">{patient.curp}</span></p>
                    </>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Periodo de estancia</p>
                <div className="text-xs text-foreground-500 mt-1 space-y-0.5 print:text-gray-600">
                  <p>Ingreso: <span className="font-medium text-foreground-700 print:text-black">{egreso.fechaIngreso} · {egreso.horaIngreso}</span></p>
                  <p>Egreso: <span className="font-medium text-foreground-700 print:text-black">{egreso.fechaEgreso} · {egreso.horaEgreso}</span></p>
                </div>
                <div className="mt-3">
                  <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-1 print:text-gray-500">Médico tratante</p>
                  <p className="text-sm font-semibold text-foreground-900 print:text-black">{egreso.medicoTratante}</p>
                  <p className="text-xs text-foreground-500 print:text-gray-600">{egreso.especialidad} · Cédula: {egreso.cedulaTratante}</p>
                </div>
              </div>
            </div>

            {/* Motivo & Diagnósticos */}
            <div className="px-10 py-4 space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Motivo de ingreso</p>
                <div className="bg-background-50 border border-secondary-200 rounded-lg p-4 print:bg-gray-50 print:border-gray-300 print:rounded-none">
                  <p className="text-sm text-foreground-700 leading-relaxed print:text-black">{egreso.motivoIngreso}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Diagnóstico de ingreso</p>
                <div className="bg-background-50 border border-secondary-200 rounded-lg p-4 print:bg-gray-50 print:border-gray-300 print:rounded-none">
                  <p className="text-sm text-foreground-700 leading-relaxed print:text-black">{egreso.diagnosticoIngreso}</p>
                </div>
              </div>
              {egreso.diagnosticosSecundarios.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Diagnósticos secundarios</p>
                  <div className="flex flex-wrap gap-2">
                    {egreso.diagnosticosSecundarios.map((d, i) => (
                      <span key={i} className="px-2 py-1 rounded-md bg-secondary-100 text-foreground-700 text-xs print:bg-gray-200 print:text-black">{d}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Resumen evolución */}
            <div className="px-10 py-4">
              <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Resumen de evolución</p>
              <div className="bg-background-50 border border-secondary-200 rounded-lg p-4 print:bg-gray-50 print:border-gray-300 print:rounded-none">
                <p className="text-sm text-foreground-700 leading-relaxed whitespace-pre-line print:text-black">{egreso.resumenEvolucion}</p>
              </div>
            </div>

            {/* Tratamiento recibido */}
            <div className="px-10 py-4">
              <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Tratamiento recibido</p>
              <ul className="list-disc list-inside text-sm text-foreground-700 space-y-1 pl-1 print:text-black">
                {egreso.tratamientoRecibido.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>

            {/* Estudios */}
            {egreso.estudiosRealizados.length > 0 && (
              <div className="px-10 py-4">
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Estudios realizados</p>
                <ul className="list-disc list-inside text-sm text-foreground-700 space-y-1 pl-1 print:text-black">
                  {egreso.estudiosRealizados.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Diagnóstico egreso */}
            <div className="px-10 py-4">
              <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Diagnóstico de egreso</p>
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 print:bg-gray-100 print:border-gray-300 print:rounded-none">
                <p className="text-sm font-semibold text-foreground-900 print:text-black">{egreso.diagnosticoEgreso}</p>
              </div>
            </div>

            {/* Recomendaciones */}
            <div className="px-10 py-4">
              <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Recomendaciones al alta</p>
              <div className="bg-background-50 border border-secondary-200 rounded-lg p-4 print:bg-gray-50 print:border-gray-300 print:rounded-none">
                <p className="text-sm text-foreground-700 leading-relaxed whitespace-pre-line print:text-black">{egreso.recomendaciones}</p>
              </div>
            </div>

            {/* Medicamentos al alta */}
            {egreso.medicamentosAlta.length > 0 && (
              <div className="px-10 py-4">
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-3 print:text-gray-500">Medicamentos al alta</p>
                <div className="space-y-3">
                  {egreso.medicamentosAlta.map((m, i) => (
                    <div key={i} className="flex items-start gap-3 border-l-2 border-primary-400 pl-4 py-1 print:border-gray-400">
                      <span className="w-6 h-6 flex items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex-shrink-0 print:bg-gray-200 print:text-black">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-foreground-900 print:text-black">{m.nombre}</p>
                        <p className="text-xs text-foreground-600 print:text-gray-600">{m.dosis} · {m.frecuencia} · {m.duracion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cita control */}
            {egreso.citaControl && (
              <div className="px-10 py-4">
                <div className="p-3 bg-accent-50 border border-accent-200 rounded-lg print:bg-gray-100 print:border-gray-300 print:rounded-none">
                  <p className="text-xs text-accent-800 print:text-black"><strong>Cita de control programada:</strong> {egreso.citaControl}</p>
                </div>
              </div>
            )}

            {/* Firmas */}
            <div className="px-10 py-8 mt-4 print:mt-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="w-full border-b border-foreground-400 mb-2 print:border-gray-600"></div>
                  <p className="text-sm font-semibold text-foreground-900 print:text-black">{egreso.patientName}</p>
                  <p className="text-xs text-foreground-500 print:text-gray-600">Firma del paciente o tutor</p>
                  {egreso.firmaPaciente && <p className="text-2xs text-emerald-600 mt-1 print:text-gray-500"><i className="ri-check-line"></i> Firmado</p>}
                </div>
                <div className="text-center">
                  <FirmaDigital nombre={egreso.medicoTratante} cedula={egreso.cedulaTratante} lineClassName="w-full border-b border-foreground-400 mb-2 print:border-gray-600" />
                  <p className="text-sm font-semibold text-foreground-900 print:text-black">{egreso.medicoTratante}</p>
                  <p className="text-xs text-foreground-500 print:text-gray-600">{egreso.especialidad}</p>
                  <p className="text-xs text-foreground-500 print:text-gray-600">Cédula: {egreso.cedulaTratante}</p>
                  {egreso.firmaMedico && <p className="text-2xs text-emerald-600 mt-1 print:text-gray-500"><i className="ri-check-line"></i> Firmado digitalmente</p>}
                  <p className="text-2xs text-foreground-400 mt-2 print:text-gray-500 max-w-xs mx-auto">
                    Firma electrónica del sistema con cadena de integridad. No se afirma equivalencia con e.firma SAT ni cumplimiento del numeral 5.10 (dictamen pendiente).
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-10 py-4 border-t border-secondary-200 mt-auto print:border-gray-300 print:mt-4">
              <div className="flex items-center justify-between text-[10px] text-foreground-400 print:text-gray-500">
                <p>Este documento forma parte del expediente clínico conforme a la NOM-004-SSA3-2012 Art. 6.3.7.</p>
                <p>MediCore · {sucursal.telefono} · {sucursal.email}</p>
              </div>
              <p className="text-[10px] text-foreground-400 mt-1 text-center print:text-gray-500">
                La hoja de egreso certifica la conclusión de la atención y las recomendaciones para continuidad del cuidado.
              </p>
            </div>
          </div>

          {/* Actions */}
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
                <i className="ri-printer-line"></i> Imprimir
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          html, body {
            background: #ffffff !important;
            overflow: visible !important;
            height: auto !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body.printing-egreso #root { display: none !important; }
          .egreso-print-modal-root {
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
          .egreso-print-modal-root > div {
            max-width: none !important;
            min-height: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
          }
          #egreso-print-wrapper {
            display: block !important;
            position: static !important;
            width: 100% !important;
            min-height: 0 !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            box-shadow: none !important;
          }
          #egreso-print-wrapper, #egreso-print-wrapper * { visibility: visible !important; }
          #egreso-print-wrapper .flex { display: flex !important; }
          #egreso-print-wrapper .grid { display: grid !important; }
          #egreso-print-wrapper .hidden,
          #egreso-print-wrapper [class*="print:hidden"] { display: none !important; }
        }
      `}</style>
    </>
  );
}