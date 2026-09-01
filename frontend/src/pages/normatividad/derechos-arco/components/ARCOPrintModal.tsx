import { useEffect, useMemo } from 'react';
import type { SolicitudARCO } from '@/mocks/derechosARCO';
import { tipoARCOConfig, estadoARCOConfig } from '@/mocks/derechosARCO';
import { getPatientById } from '@/mocks/patients';
import { sucursales } from '@/mocks/branches';
import { exportElementToPDF, exportElementToPDFBlob } from '@/utils/exportUtils';
import InstitucionalLogo from '@/components/feature/InstitucionalLogo';

interface ARCOPrintModalProps {
  solicitud: SolicitudARCO;
  isOpen: boolean;
  onClose: () => void;
}

export default function ARCOPrintModal({ solicitud, isOpen, onClose }: ARCOPrintModalProps) {
  const patient = useMemo(() => getPatientById(solicitud.patientId), [solicitud.patientId]);
  const sucursal = sucursales[0];
  const tipoCfg = tipoARCOConfig[solicitud.tipo];
  const estadoCfg = estadoARCOConfig[solicitud.estado];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('printing-arco');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('printing-arco');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('printing-arco');
    };
  }, [isOpen]);

  const handlePrint = async () => {
    const wrapper = document.getElementById('arco-print-wrapper');
    if (!wrapper) return;
    const blob = await exportElementToPDFBlob(wrapper, {
      title: `Solicitud Derechos ARCO — ${solicitud.patientName}`,
      orientation: 'portrait',
      margin: 0,
    });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const handleDownloadPDF = async () => {
    const wrapper = document.getElementById('arco-print-wrapper');
    if (!wrapper) return;
    const filename = `ARCO_${solicitud.tipo}_${solicitud.patientName.replace(/\s+/g, '_')}_${solicitud.fechaSolicitud}`;
    await exportElementToPDF(wrapper, filename, {
      title: `Solicitud Derechos ARCO — ${solicitud.patientName}`,
      orientation: 'portrait',
      margin: 0,
    });
  };

  if (!isOpen) return null;

  const folio = `ARCO-${solicitud.id.replace(/-/g, '').toUpperCase()}`;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[100] print:hidden" />
      <div className="arco-print-modal-root fixed inset-0 z-[101] flex items-start justify-center overflow-y-auto print:static print:overflow-visible print:z-auto print:block">
        <div className="relative w-full max-w-[210mm] min-h-[297mm] mx-auto my-4 bg-background-50 print:bg-white print:m-0 print:shadow-none print:max-w-none print:w-full print:min-h-0">
          <div id="arco-print-wrapper" className="bg-background-50 print:bg-white print:text-black">
            {/* Header */}
            <div className="px-10 pt-10 pb-6 border-b-2 border-primary-500/20 print:border-gray-300">
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-start gap-4">
                  <InstitucionalLogo
                    fallbackIcon="ri-mail-open-line"
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
              <h1 className="text-2xl font-bold text-foreground-950 tracking-wide font-heading print:text-black">SOLICITUD DE DERECHOS ARCO</h1>
              <p className="text-xs text-foreground-500 mt-1 font-mono print:text-gray-600">LFPDPPP · Ley Federal de Protección de Datos</p>
              <p className="text-xs text-foreground-500 print:text-gray-600">Folio: {folio}</p>
            </div>

            {/* Type & status */}
            <div className="px-10 pt-5 flex items-center gap-3">
              <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium border ${tipoCfg.bg} ${tipoCfg.text} border-secondary-200 print:bg-gray-100 print:text-black print:border-gray-300`}>
                <i className={`${tipoCfg.icon} text-[10px]`}></i>
                {tipoCfg.label}
              </span>
              <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium border ${estadoCfg.bg} ${estadoCfg.text} border-secondary-200 print:bg-gray-100 print:text-black print:border-gray-300`}>
                Estado: {estadoCfg.label}
              </span>
            </div>

            {/* Patient info */}
            <div className="px-10 py-5 grid grid-cols-2 gap-6 print:gap-8">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Solicitante</p>
                <p className="text-sm font-semibold text-foreground-900 print:text-black">{solicitud.patientName}</p>
                <div className="text-xs text-foreground-500 mt-1 space-y-0.5 print:text-gray-600">
                  <p>Expediente: <span className="font-medium text-foreground-700 print:text-black">{solicitud.patientExpediente}</span></p>
                  {patient && (
                    <>
                      <p>Edad: <span className="font-medium text-foreground-700 print:text-black">{patient.edad} años</span> · Sexo: <span className="font-medium text-foreground-700 print:text-black">{patient.sexo === 'M' ? 'Masculino' : 'Femenino'}</span></p>
                      <p>CURP: <span className="font-medium text-foreground-700 print:text-black">{patient.curp}</span></p>
                    </>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Información de la solicitud</p>
                <div className="text-xs text-foreground-500 mt-1 space-y-0.5 print:text-gray-600">
                  <p>Fecha de solicitud: <span className="font-medium text-foreground-700 print:text-black">{solicitud.fechaSolicitud}</span></p>
                  <p>Plazo legal: <span className="font-medium text-foreground-700 print:text-black">{solicitud.plazoDias} días hábiles</span></p>
                  {solicitud.fechaRespuesta && <p>Fecha de respuesta: <span className="font-medium text-foreground-700 print:text-black">{solicitud.fechaRespuesta}</span></p>}
                  {solicitud.atendidoPor && <p>Atendido por: <span className="font-medium text-foreground-700 print:text-black">{solicitud.atendidoPor}</span></p>}
                </div>
              </div>
            </div>

            {/* Descripción */}
            <div className="px-10 py-4">
              <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Descripción de la solicitud</p>
              <div className="bg-background-50 border border-secondary-200 rounded-lg p-4 print:bg-gray-50 print:border-gray-300 print:rounded-none">
                <p className="text-sm text-foreground-700 leading-relaxed print:text-black">{solicitud.descripcion}</p>
              </div>
            </div>

            {solicitud.motivo && (
              <div className="px-10 py-4">
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Motivo</p>
                <div className="bg-background-50 border border-secondary-200 rounded-lg p-4 print:bg-gray-50 print:border-gray-300 print:rounded-none">
                  <p className="text-sm text-foreground-700 leading-relaxed print:text-black">{solicitud.motivo}</p>
                </div>
              </div>
            )}

            {/* Respuesta */}
            {(solicitud.respuesta || solicitud.fechaRespuesta) && (
              <div className="px-10 py-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg print:bg-emerald-50 print:border-emerald-200 print:rounded-none">
                  <p className="text-[10px] uppercase tracking-wider text-emerald-700 font-semibold mb-2 print:text-gray-600">
                    Respuesta de la unidad {solicitud.fechaRespuesta ? `· ${solicitud.fechaRespuesta}` : ''}
                  </p>
                  <p className="text-sm text-emerald-800 print:text-black">{solicitud.respuesta || 'Solicitud atendida conforme a la LFPDPPP.'}</p>
                </div>
              </div>
            )}

            {/* Documento adjunto */}
            {solicitud.documentoAdjunto && (
              <div className="px-10 py-4">
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Documento adjunto</p>
                <p className="text-sm text-primary-700 print:text-black">{solicitud.documentoAdjunto}</p>
              </div>
            )}

            {/* Footer legal */}
            <div className="px-10 py-6">
              <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-4 print:bg-gray-50 print:border-gray-300 print:rounded-none">
                <p className="text-xs text-foreground-600 leading-relaxed print:text-black">
                  <strong>Base legal:</strong> Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), publicada en el Diario Oficial de la Federación el 5 de julio de 2010. Los derechos ARCO (Acceso, Rectificación, Cancelación y Oposición) pueden ejercerse ante la Unidad de Protección de Datos de MediCore Clínica mediante solicitud por escrito o a través de este sistema.
                </p>
                <p className="text-xs text-foreground-600 leading-relaxed mt-3 print:text-black">
                  <strong>Plazo de respuesta:</strong> Conforme al artículo 29 de la LFPDPPP, el responsable dispondrá de un plazo máximo de 20 días hábiles, contados desde el día siguiente a la fecha de recepción de la solicitud, para dar respuesta. En caso de no dar respuesta en dicho plazo, se tendrá por desahogada la solicitud en sentido negativo.
                </p>
              </div>
            </div>

            {/* Signatures */}
            <div className="px-10 py-8 mt-4 print:mt-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="w-full border-b border-foreground-400 mb-2 print:border-gray-600"></div>
                  <p className="text-sm font-semibold text-foreground-900 print:text-black">{solicitud.patientName}</p>
                  <p className="text-xs text-foreground-500 print:text-gray-600">Solicitante / Titular de los datos</p>
                </div>
                <div className="text-center">
                  <div className="w-full border-b border-foreground-400 mb-2 print:border-gray-600"></div>
                  <p className="text-sm font-semibold text-foreground-900 print:text-black">{solicitud.atendidoPor || 'Responsable de Datos'}</p>
                  <p className="text-xs text-foreground-500 print:text-gray-600">Unidad de Protección de Datos</p>
                  <p className="text-xs text-foreground-500 print:text-gray-600">MediCore Clínica</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-10 py-4 border-t border-secondary-200 mt-auto print:border-gray-300 print:mt-4">
              <div className="flex items-center justify-between text-[10px] text-foreground-400 print:text-gray-500">
                <p>Documento generado conforme a la LFPDPPP y NOM-024-SSA3-2012.</p>
                <p>MediCore · {sucursal.telefono} · {sucursal.email}</p>
              </div>
              <p className="text-[10px] text-foreground-400 mt-1 text-center print:text-gray-500">
                El titular puede presentar queja ante el INAI si considera que sus derechos ARCO no han sido respetados.
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
          body.printing-arco #root { display: none !important; }
          .arco-print-modal-root {
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
          .arco-print-modal-root > div {
            max-width: none !important;
            min-height: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
          }
          #arco-print-wrapper {
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
          #arco-print-wrapper, #arco-print-wrapper * { visibility: visible !important; }
          #arco-print-wrapper .flex { display: flex !important; }
          #arco-print-wrapper .grid { display: grid !important; }
          #arco-print-wrapper .hidden,
          #arco-print-wrapper [class*="print:hidden"] { display: none !important; }
        }
      `}</style>
    </>
  );
}