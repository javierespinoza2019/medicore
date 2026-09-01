import { useEffect, useMemo } from 'react';
import { tipoCertificadoConfig, type CertificadoMedico } from '@/mocks/certificados';
import { getPatientById } from '@/mocks/patients';
import { sucursales } from '@/mocks/branches';
import { exportElementToPDF, exportElementToPDFBlob } from '@/utils/exportUtils';
import InstitucionalLogo from '@/components/feature/InstitucionalLogo';
import FirmaDigital from '@/components/feature/FirmaDigital';

interface Props {
  certificado: CertificadoMedico;
  isOpen: boolean;
  onClose: () => void;
}

function formatearFecha(fecha: string): string {
  if (!fecha) return '—';
  const [y, m, d] = fecha.split('-');
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return `${parseInt(d)} de ${meses[parseInt(m) - 1]} de ${y}`;
}

export default function CertificadoMedicoPrintModal({ certificado, isOpen, onClose }: Props) {
  const patient = useMemo(() => (certificado ? getPatientById(certificado.patientId) : null), [certificado?.patientId]);
  const sucursal = sucursales[0];
  const tipoCfg = useMemo(() => (certificado ? tipoCertificadoConfig[certificado.tipo] : null), [certificado?.tipo]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('printing-certificado');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('printing-certificado');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('printing-certificado');
    };
  }, [isOpen]);

  const handlePrint = async () => {
    if (!certificado) return;
    const wrapper = document.getElementById('certificado-print-wrapper');
    if (!wrapper) return;
    const blob = await exportElementToPDFBlob(wrapper, {
      title: `Certificado Médico — ${certificado.patientName}`,
      orientation: 'portrait',
      margin: 0,
    });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const handleDownloadPDF = async () => {
    if (!certificado) return;
    const wrapper = document.getElementById('certificado-print-wrapper');
    if (!wrapper) return;
    await exportElementToPDF(wrapper, `Certificado_${certificado.folio}_${certificado.patientName.replace(/\s+/g, '_')}`, {
      title: `Certificado Médico — ${certificado.patientName}`,
      orientation: 'portrait',
      margin: 0,
    });
  };

  if (!isOpen || !certificado || !tipoCfg) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[100] print:hidden" />

      <div className="certificado-print-modal-root fixed inset-0 z-[101] flex items-start justify-center overflow-y-auto print:static print:overflow-visible print:z-auto print:block">
        <div className="relative w-full max-w-[210mm] min-h-[297mm] mx-auto my-4 bg-background-50 print:bg-white print:m-0 print:shadow-none print:max-w-none print:w-full print:min-h-0">
          <div id="certificado-print-wrapper" className="bg-background-50 print:bg-white print:text-black">

            {/* Header Institucional */}
            <div className="px-10 pt-10 pb-6 border-b-2 border-emerald-500/20 print:border-gray-300">
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-start gap-4">
                  <InstitucionalLogo
                    fallbackIcon="ri-shield-check-line"
                    fallbackClassName="w-14 h-14 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 print:bg-gray-800"
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

            {/* Título */}
            <div className="px-10 py-5 text-center border-b border-secondary-200 print:border-gray-300">
              <h1 className="text-2xl font-bold text-foreground-950 tracking-wide font-heading print:text-black">CERTIFICADO MÉDICO</h1>
              <p className="text-xs text-foreground-500 mt-1 font-mono print:text-gray-600">{tipoCfg.label} · Folio: {certificado.folio}</p>
              <p className="text-xs text-foreground-500 print:text-gray-600">Fecha de emisión: {formatearFecha(certificado.fecha)} · {certificado.hora} hrs</p>
            </div>

            {/* Datos Paciente y Médico */}
            <div className="px-10 py-5 grid grid-cols-2 gap-6 print:gap-8">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Paciente</p>
                <p className="text-sm font-semibold text-foreground-900 print:text-black">{certificado.patientName}</p>
                <div className="text-xs text-foreground-500 mt-1 space-y-0.5 print:text-gray-600">
                  <p>Expediente: <span className="font-medium text-foreground-700 print:text-black">{certificado.patientExpediente}</span></p>
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
                <p className="text-sm font-semibold text-foreground-900 print:text-black">{certificado.doctorName}</p>
                <div className="text-xs text-foreground-500 mt-1 space-y-0.5 print:text-gray-600">
                  <p>Cédula Profesional: <span className="font-medium text-foreground-700 print:text-black">{certificado.doctorCedula}</span></p>
                  <p>Especialidad: <span className="font-medium text-foreground-700 print:text-black">{certificado.doctorEspecialidad}</span></p>
                </div>
              </div>
            </div>

            {/* Diagnóstico */}
            <div className="px-10 py-4">
              <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Diagnóstico</p>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                <p className="text-sm font-medium text-foreground-800 print:text-black">{certificado.diagnostico || 'Sin diagnóstico registrado'}</p>
              </div>
            </div>

            {/* Cuerpo por tipo */}
            {certificado.tipo === 'incapacidad' && (
              <div className="px-10 py-4">
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Periodo de incapacidad</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-background-50 border border-secondary-100 rounded-lg print:bg-gray-50 print:border-gray-300 print:rounded-none">
                    <p className="text-2xs text-foreground-400 print:text-gray-500">Días de reposo</p>
                    <p className="text-base font-bold text-foreground-800 print:text-black">{certificado.diasIncapacidad ?? '—'} día{(certificado.diasIncapacidad ?? 1) !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="p-3 bg-background-50 border border-secondary-100 rounded-lg print:bg-gray-50 print:border-gray-300 print:rounded-none">
                    <p className="text-2xs text-foreground-400 print:text-gray-500">Desde</p>
                    <p className="text-sm font-semibold text-foreground-800 print:text-black">{formatearFecha(certificado.fechaInicio || '')}</p>
                  </div>
                  <div className="p-3 bg-background-50 border border-secondary-100 rounded-lg print:bg-gray-50 print:border-gray-300 print:rounded-none">
                    <p className="text-2xs text-foreground-400 print:text-gray-500">Hasta</p>
                    <p className="text-sm font-semibold text-foreground-800 print:text-black">{formatearFecha(certificado.fechaFin || '')}</p>
                  </div>
                </div>
              </div>
            )}

            {certificado.tipo === 'aptitud' && (
              <div className="px-10 py-4 space-y-3">
                {certificado.actividad && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Actividad / finalidad</p>
                    <div className="bg-background-50 border border-secondary-100 rounded-lg p-3 print:bg-gray-50 print:border-gray-300 print:rounded-none">
                      <p className="text-sm text-foreground-800 print:text-black">{certificado.actividad}</p>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Conclusión</p>
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-bold ${certificado.apto ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'} print:bg-gray-100 print:text-black print:border-gray-300 print:rounded-none`}>
                    <i className={certificado.apto ? 'ri-check-double-line' : 'ri-close-line'}></i>
                    {certificado.apto ? 'APTO' : 'NO APTO'}
                  </div>
                </div>
              </div>
            )}

            {certificado.tipo === 'embarazo' && (
              <div className="px-10 py-4">
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Datos del embarazo</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-background-50 border border-secondary-100 rounded-lg print:bg-gray-50 print:border-gray-300 print:rounded-none">
                    <p className="text-2xs text-foreground-400 print:text-gray-500">Semanas de gestación</p>
                    <p className="text-base font-bold text-foreground-800 print:text-black">{certificado.semanasGestacion ?? '—'} semanas</p>
                  </div>
                  <div className="p-3 bg-background-50 border border-secondary-100 rounded-lg print:bg-gray-50 print:border-gray-300 print:rounded-none">
                    <p className="text-2xs text-foreground-400 print:text-gray-500">Fecha probable de parto</p>
                    <p className="text-sm font-semibold text-foreground-800 print:text-black">{formatearFecha(certificado.fechaProbableParto || '')}</p>
                  </div>
                </div>
              </div>
            )}

            {certificado.tipo === 'general' && certificado.proposito && (
              <div className="px-10 py-4">
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Propósito del certificado</p>
                <div className="bg-background-50 border border-secondary-100 rounded-lg p-3 print:bg-gray-50 print:border-gray-300 print:rounded-none">
                  <p className="text-sm text-foreground-800 print:text-black">{certificado.proposito}</p>
                </div>
              </div>
            )}

            {/* Recomendaciones */}
            {certificado.recomendaciones && (
              <div className="px-10 py-4">
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Recomendaciones</p>
                <div className="bg-background-50 border border-secondary-100 rounded-lg p-4 print:bg-gray-50 print:border-gray-300 print:rounded-none">
                  <p className="text-xs text-foreground-700 leading-relaxed whitespace-pre-wrap print:text-black">{certificado.recomendaciones}</p>
                </div>
              </div>
            )}

            {/* Firma */}
            <div className="px-10 py-8 mt-4 print:mt-8">
              <div className="flex justify-end">
                <div className="text-center">
                  <FirmaDigital doctorId={certificado.doctorId} nombre={certificado.doctorName} cedula={certificado.doctorCedula} lineClassName="w-56 border-b border-foreground-400 mb-2 print:border-gray-600" />
                  <p className="text-sm font-semibold text-foreground-900 print:text-black">{certificado.doctorName}</p>
                  <p className="text-xs text-foreground-500 print:text-gray-600">{certificado.doctorEspecialidad}</p>
                  <p className="text-xs text-foreground-500 print:text-gray-600">Cédula: {certificado.doctorCedula}</p>
                  <p className="text-2xs text-foreground-400 mt-2 print:text-gray-500">
                    Firma electrónica · {formatearFecha(certificado.fecha)} · {certificado.hora} hrs
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-10 py-4 border-t border-secondary-200 mt-auto print:border-gray-300 print:mt-4">
              <div className="flex items-center justify-between text-[10px] text-foreground-400 print:text-gray-500">
                <p>Documento firmado electrónicamente conforme a la NOM-004-SSA3-2012.</p>
                <p>MediCore · {sucursal.telefono} · {sucursal.email}</p>
              </div>
              <p className="text-[10px] text-foreground-400 mt-1 text-center print:text-gray-500">
                Este certificado forma parte del expediente clínico electrónico del paciente.
              </p>
              <p className="text-[10px] text-foreground-400 mt-1 text-center print:text-gray-500">
                Firma electrónica (e.firma) · Folio {certificado.folio} · LFPDPPP.
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
                <i className="ri-printer-line"></i> Imprimir certificado
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
          body.printing-certificado #root {
            display: none !important;
          }
          .certificado-print-modal-root {
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
          .certificado-print-modal-root > div {
            max-width: none !important;
            min-height: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
          }
          #certificado-print-wrapper {
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
          #certificado-print-wrapper,
          #certificado-print-wrapper * {
            visibility: visible !important;
          }
          #certificado-print-wrapper .flex {
            display: flex !important;
          }
          #certificado-print-wrapper .grid {
            display: grid !important;
          }
          #certificado-print-wrapper .hidden,
          #certificado-print-wrapper [class*="print:hidden"] {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}