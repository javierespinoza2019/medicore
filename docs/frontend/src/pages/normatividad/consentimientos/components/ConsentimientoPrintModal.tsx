import { useEffect, useMemo } from 'react';
import type { ConsentimientoInformado } from '@/mocks/consentimientos';
import { tipoConsentimientoConfig, plantillasConsentimiento } from '@/mocks/consentimientos';
import { getPatientById } from '@/mocks/patients';
import { sucursales } from '@/mocks/branches';
import { exportElementToPDF, exportElementToPDFBlob } from '@/utils/exportUtils';
import InstitucionalLogo from '@/components/feature/InstitucionalLogo';

interface ConsentimientoPrintModalProps {
  consentimiento: ConsentimientoInformado;
  isOpen: boolean;
  onClose: () => void;
}

export default function ConsentimientoPrintModal({ consentimiento, isOpen, onClose }: ConsentimientoPrintModalProps) {
  const patient = useMemo(() => getPatientById(consentimiento.patientId), [consentimiento.patientId]);
  const sucursal = sucursales[0];
  const tipoCfg = tipoConsentimientoConfig[consentimiento.tipo];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('printing-consentimiento');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('printing-consentimiento');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('printing-consentimiento');
    };
  }, [isOpen]);

  const handlePrint = async () => {
    const wrapper = document.getElementById('consentimiento-print-wrapper');
    if (!wrapper) return;
    const blob = await exportElementToPDFBlob(wrapper, {
      title: `Consentimiento Informado — ${consentimiento.patientName}`,
      orientation: 'portrait',
      margin: 0,
    });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const handleDownloadPDF = async () => {
    const wrapper = document.getElementById('consentimiento-print-wrapper');
    if (!wrapper) return;
    const filename = `Consentimiento_${consentimiento.patientName.replace(/\s+/g, '_')}_${consentimiento.fechaFirma || 'pendiente'}`;
    await exportElementToPDF(wrapper, filename, {
      title: `Consentimiento Informado — ${consentimiento.patientName}`,
      orientation: 'portrait',
      margin: 0,
    });
  };

  if (!isOpen) return null;

  const folio = `CI-${consentimiento.id.replace(/-/g, '').toUpperCase()}`;

  const plantilla = plantillasConsentimiento[consentimiento.tipo] || consentimiento.descripcion;
  const documentoTexto = plantilla
    .replace('{paciente}', consentimiento.patientName)
    .replace('{expediente}', consentimiento.patientExpediente)
    .replace('{fecha}', consentimiento.fechaFirma || '____/____/______')
    .replace('{hora}', consentimiento.horaFirma || '____:____')
    .replace('{tutor}', consentimiento.firmadoPor || '________________________')
    .replace('{menor}', consentimiento.patientName)
    .replace('{procedimiento}', consentimiento.descripcion.substring(0, 80));

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[100] print:hidden" />
      <div className="consentimiento-print-modal-root fixed inset-0 z-[101] flex items-start justify-center overflow-y-auto print:static print:overflow-visible print:z-auto print:block">
        <div className="relative w-full max-w-[210mm] min-h-[297mm] mx-auto my-4 bg-background-50 print:bg-white print:m-0 print:shadow-none print:max-w-none print:w-full print:min-h-0">
          <div id="consentimiento-print-wrapper" className="bg-background-50 print:bg-white print:text-black">
            {/* Header */}
            <div className="px-10 pt-10 pb-6 border-b-2 border-primary-500/20 print:border-gray-300">
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-start gap-4">
                  <InstitucionalLogo
                    fallbackIcon="ri-file-shield-line"
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
              <h1 className="text-2xl font-bold text-foreground-950 tracking-wide font-heading print:text-black">CONSENTIMIENTO INFORMADO</h1>
              <p className="text-xs text-foreground-500 mt-1 font-mono print:text-gray-600">NOM-004-SSA3-2012 · LFPDPPP</p>
              <p className="text-xs text-foreground-500 print:text-gray-600">Folio: {folio}</p>
            </div>

            {/* Type badge */}
            <div className="px-10 pt-5">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border ${tipoCfg.bg} ${tipoCfg.text} border-secondary-200 print:bg-gray-100 print:text-black print:border-gray-300`}>
                <i className={`${tipoCfg.icon} text-[10px]`}></i>
                {tipoCfg.label}
              </span>
            </div>

            {/* Patient info */}
            <div className="px-10 py-5 grid grid-cols-2 gap-6 print:gap-8">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Paciente</p>
                <p className="text-sm font-semibold text-foreground-900 print:text-black">{consentimiento.patientName}</p>
                <div className="text-xs text-foreground-500 mt-1 space-y-0.5 print:text-gray-600">
                  <p>Expediente: <span className="font-medium text-foreground-700 print:text-black">{consentimiento.patientExpediente}</span></p>
                  {patient && (
                    <>
                      <p>Edad: <span className="font-medium text-foreground-700 print:text-black">{patient.edad} años</span> · Sexo: <span className="font-medium text-foreground-700 print:text-black">{patient.sexo === 'M' ? 'Masculino' : 'Femenino'}</span></p>
                      <p>CURP: <span className="font-medium text-foreground-700 print:text-black">{patient.curp}</span></p>
                    </>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Información del documento</p>
                <div className="text-xs text-foreground-500 mt-1 space-y-0.5 print:text-gray-600">
                  <p>Fecha de firma: <span className="font-medium text-foreground-700 print:text-black">{consentimiento.fechaFirma || 'Pendiente'}</span></p>
                  <p>Hora: <span className="font-medium text-foreground-700 print:text-black">{consentimiento.horaFirma || '—'}</span></p>
                  <p>Estado: <span className="font-medium text-foreground-700 print:text-black">{consentimiento.estado === 'firmado' ? 'Firmado' : consentimiento.estado === 'pendiente' ? 'Pendiente de firma' : consentimiento.estado === 'revocado' ? 'Revocado' : 'Vencido'}</span></p>
                </div>
              </div>
            </div>

            {/* Document body */}
            <div className="px-10 py-4">
              <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-3 print:text-gray-500">Título</p>
              <p className="text-base font-semibold text-foreground-900 print:text-black mb-6">{consentimiento.titulo}</p>

              <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Descripción y alcance</p>
              <div className="bg-background-50 border border-secondary-200 rounded-lg p-4 print:bg-gray-50 print:border-gray-300 print:rounded-none">
                <p className="text-sm text-foreground-700 leading-relaxed whitespace-pre-wrap print:text-black">{consentimiento.descripcion}</p>
              </div>

              {consentimiento.riesgos && (
                <div className="mt-4">
                  <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Riesgos</p>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 print:bg-red-50 print:border-red-200 print:rounded-none">
                    <p className="text-sm text-foreground-700 leading-relaxed whitespace-pre-wrap print:text-black">{consentimiento.riesgos}</p>
                  </div>
                </div>
              )}

              {consentimiento.beneficios && (
                <div className="mt-4">
                  <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Beneficios</p>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 print:bg-emerald-50 print:border-emerald-200 print:rounded-none">
                    <p className="text-sm text-foreground-700 leading-relaxed whitespace-pre-wrap print:text-black">{consentimiento.beneficios}</p>
                  </div>
                </div>
              )}

              {consentimiento.alternativas && (
                <div className="mt-4">
                  <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Alternativas</p>
                  <div className="bg-background-50 border border-secondary-200 rounded-lg p-4 print:bg-gray-50 print:border-gray-300 print:rounded-none">
                    <p className="text-sm text-foreground-700 leading-relaxed whitespace-pre-wrap print:text-black">{consentimiento.alternativas}</p>
                  </div>
                </div>
              )}

              {/* Plantilla legal completa */}
              <div className="mt-6">
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Documento legal completo</p>
                <div className="bg-background-50 border border-secondary-200 rounded-lg p-6 print:bg-gray-50 print:border-gray-300 print:rounded-none">
                  <p className="text-sm text-foreground-700 leading-relaxed whitespace-pre-line print:text-black">{documentoTexto}</p>
                </div>
              </div>
            </div>

            {/* Signature area */}
            <div className="px-10 py-8 mt-4 print:mt-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="w-full border-b border-foreground-400 mb-2 print:border-gray-600"></div>
                  <p className="text-sm font-semibold text-foreground-900 print:text-black">{consentimiento.firmadoPor || '________________________'}</p>
                  <p className="text-xs text-foreground-500 print:text-gray-600">Firma del paciente o tutor legal</p>
                  {consentimiento.fechaFirma && <p className="text-2xs text-foreground-400 mt-1 print:text-gray-500">{consentimiento.fechaFirma} · {consentimiento.horaFirma}</p>}
                </div>
                {consentimiento.testigo && (
                  <div className="text-center">
                    <div className="w-full border-b border-foreground-400 mb-2 print:border-gray-600"></div>
                    <p className="text-sm font-semibold text-foreground-900 print:text-black">{consentimiento.testigo}</p>
                    <p className="text-xs text-foreground-500 print:text-gray-600">Testigo</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-10 py-4 border-t border-secondary-200 mt-auto print:border-gray-300 print:mt-4">
              <div className="flex items-center justify-between text-[10px] text-foreground-400 print:text-gray-500">
                <p>Este documento forma parte del expediente clínico conforme a la NOM-004-SSA3-2012 y LFPDPPP.</p>
                <p>MediCore · {sucursal.telefono} · {sucursal.email}</p>
              </div>
              <p className="text-[10px] text-foreground-400 mt-1 text-center print:text-gray-500">
                El paciente declara haber sido informado y haber comprendido la información proporcionada. Puede revocar este consentimiento en cualquier momento.
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
          body.printing-consentimiento #root { display: none !important; }
          .consentimiento-print-modal-root {
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
          .consentimiento-print-modal-root > div {
            max-width: none !important;
            min-height: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
          }
          #consentimiento-print-wrapper {
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
          #consentimiento-print-wrapper, #consentimiento-print-wrapper * { visibility: visible !important; }
          #consentimiento-print-wrapper .flex { display: flex !important; }
          #consentimiento-print-wrapper .grid { display: grid !important; }
          #consentimiento-print-wrapper .hidden,
          #consentimiento-print-wrapper [class*="print:hidden"] { display: none !important; }
        }
      `}</style>
    </>
  );
}