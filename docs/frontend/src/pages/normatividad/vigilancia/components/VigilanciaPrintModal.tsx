import { useEffect } from 'react';
import type { CasoVigilancia } from '@/mocks/vigilancia';
import { tipoNotificacionConfig, estadoVigilanciaConfig } from '@/mocks/vigilancia';
import { getPatientById } from '@/mocks/patients';
import { sucursales } from '@/mocks/branches';
import { exportElementToPDF, exportElementToPDFBlob } from '@/utils/exportUtils';
import InstitucionalLogo from '@/components/feature/InstitucionalLogo';

interface VigilanciaPrintModalProps {
  caso: CasoVigilancia;
  isOpen: boolean;
  onClose: () => void;
}

export default function VigilanciaPrintModal({ caso, isOpen, onClose }: VigilanciaPrintModalProps) {
  const patient = getPatientById(caso.patientId);
  const sucursal = sucursales[0];
  const tipoCfg = tipoNotificacionConfig[caso.tipoNotificacion];
  const estCfg = estadoVigilanciaConfig[caso.estado];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('printing-vigilancia');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('printing-vigilancia');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('printing-vigilancia');
    };
  }, [isOpen]);

  const handlePrint = async () => {
    const wrapper = document.getElementById('vigilancia-print-wrapper');
    if (!wrapper) return;
    const blob = await exportElementToPDFBlob(wrapper, {
      title: `Notificación Epidemiológica — ${caso.enfermedad}`,
      orientation: 'portrait',
      margin: 0,
    });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const handleDownloadPDF = async () => {
    const wrapper = document.getElementById('vigilancia-print-wrapper');
    if (!wrapper) return;
    const filename = `Vigilancia_${caso.enfermedad.replace(/\s+/g, '_')}_${caso.patientName.replace(/\s+/g, '_')}_${caso.fechaNotificacion}`;
    await exportElementToPDF(wrapper, filename, {
      title: `Notificación Epidemiológica — ${caso.enfermedad}`,
      orientation: 'portrait',
      margin: 0,
    });
  };

  if (!isOpen) return null;

  const folio = `VE-${caso.id.replace(/-/g, '').toUpperCase().substring(0, 14)}`;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[100] print:hidden" />
      <div className="vigilancia-print-modal-root fixed inset-0 z-[101] flex items-start justify-center overflow-y-auto print:static print:overflow-visible print:z-auto print:block">
        <div className="relative w-full max-w-[210mm] min-h-[297mm] mx-auto my-4 bg-background-50 print:bg-white print:m-0 print:shadow-none print:max-w-none print:w-full print:min-h-0">
          <div id="vigilancia-print-wrapper" className="bg-background-50 print:bg-white print:text-black">
            {/* Header */}
            <div className="px-10 pt-10 pb-6 border-b-2 border-primary-500/20 print:border-gray-300">
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-start gap-4">
                  <InstitucionalLogo
                    fallbackIcon="ri-virus-line"
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
              <h1 className="text-2xl font-bold text-foreground-950 tracking-wide font-heading print:text-black">NOTIFICACIÓN EPIDEMIOLÓGICA</h1>
              <p className="text-xs text-foreground-500 mt-1 font-mono print:text-gray-600">NOM-017-SSA2-2012 · SUIVE · Sistema Único de Vigilancia Epidemiológica</p>
              <p className="text-xs text-foreground-500 print:text-gray-600">Folio: {folio}</p>
            </div>

            {/* Badges */}
            <div className="px-10 pt-5 flex items-center gap-3 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium border ${tipoCfg.bg} ${tipoCfg.text} border-secondary-200 print:bg-gray-100 print:text-black print:border-gray-300`}>
                Tipo: {tipoCfg.label}
              </span>
              <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium border ${estCfg.bg} ${estCfg.text} border-secondary-200 print:bg-gray-100 print:text-black print:border-gray-300`}>
                <i className={`${estCfg.icon} text-[10px]`}></i>
                {estCfg.label}
              </span>
              <span className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium border bg-secondary-50 text-foreground-700 border-secondary-200 print:bg-gray-100 print:text-black print:border-gray-300">
                Semana Epidemiológica {caso.semanaEpidemiologica}
              </span>
            </div>

            {/* Patient & Notification info */}
            <div className="px-10 py-5 grid grid-cols-2 gap-6 print:gap-8">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Paciente</p>
                <p className="text-sm font-semibold text-foreground-900 print:text-black">{caso.patientName}</p>
                <div className="text-xs text-foreground-500 mt-1 space-y-0.5 print:text-gray-600">
                  <p>Expediente: <span className="font-medium text-foreground-700 print:text-black">{caso.patientExpediente}</span></p>
                  {patient && (
                    <>
                      <p>Edad: <span className="font-medium text-foreground-700 print:text-black">{patient.edad} años</span> · Sexo: <span className="font-medium text-foreground-700 print:text-black">{patient.sexo === 'M' ? 'Masculino' : 'Femenino'}</span></p>
                      <p>CURP: <span className="font-medium text-foreground-700 print:text-black">{patient.curp}</span></p>
                    </>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Datos de notificación</p>
                <div className="text-xs text-foreground-500 mt-1 space-y-0.5 print:text-gray-600">
                  <p>Fecha inicio síntomas: <span className="font-medium text-foreground-700 print:text-black">{caso.fechaInicioSintomas}</span></p>
                  <p>Fecha de notificación: <span className="font-medium text-foreground-700 print:text-black">{caso.fechaNotificacion}</span></p>
                  <p>Institución notificante: <span className="font-medium text-foreground-700 print:text-black">{caso.institucionNotificante}</span></p>
                  <p>Jurisdicción sanitaria: <span className="font-medium text-foreground-700 print:text-black">{caso.jurisdiccionSanitaria}</span></p>
                </div>
              </div>
            </div>

            {/* Enfermedad */}
            <div className="px-10 py-4">
              <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Enfermedad / Condición notificada</p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 print:bg-gray-50 print:border-gray-300 print:rounded-none">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-bold text-foreground-900 print:text-black">{caso.enfermedad}</p>
                    <p className="text-xs text-foreground-500 font-mono mt-0.5 print:text-gray-600">CIE-10: {caso.cie10}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Resultado laboratorio */}
            {caso.resultadoLab && (
              <div className="px-10 py-4">
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Resultado de laboratorio</p>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 print:bg-gray-50 print:border-gray-300 print:rounded-none">
                  <p className="text-sm text-emerald-800 print:text-black">{caso.resultadoLab}</p>
                  {caso.fechaResultado && (
                    <p className="text-xs text-emerald-600 mt-1 print:text-gray-500">Fecha del resultado: {caso.fechaResultado}</p>
                  )}
                </div>
              </div>
            )}

            {/* Observaciones */}
            {caso.observaciones && (
              <div className="px-10 py-4">
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Observaciones</p>
                <div className="bg-background-50 border border-secondary-200 rounded-lg p-4 print:bg-gray-50 print:border-gray-300 print:rounded-none">
                  <p className="text-sm text-foreground-700 leading-relaxed print:text-black">{caso.observaciones}</p>
                </div>
              </div>
            )}

            {/* Legal info */}
            <div className="px-10 py-4">
              <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-4 print:bg-gray-50 print:border-gray-300 print:rounded-none">
                <p className="text-xs text-foreground-600 leading-relaxed print:text-black">
                  <strong>Base legal:</strong> La presente notificación se emite en cumplimiento de la NOM-017-SSA2-2012 "Para la Vigilancia Epidemiológica", publicada en el Diario Oficial de la Federación, y de las disposiciones de la Ley General de Salud. La unidad de salud tiene la obligación de notificar los casos de enfermedades de declaración obligatoria al Sistema Único de Vigilancia Epidemiológica (SUIVE) en los plazos establecidos.
                </p>
              </div>
            </div>

            {/* Signature */}
            <div className="px-10 py-8 mt-2">
              <div className="grid grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="w-full border-b border-foreground-400 mb-2 print:border-gray-600"></div>
                  <p className="text-sm font-semibold text-foreground-900 print:text-black">{caso.medicoNotificante}</p>
                  <p className="text-xs text-foreground-500 print:text-gray-600">Médico notificante</p>
                  <p className="text-xs text-foreground-500 print:text-gray-600">Cédula: {caso.cedulaMedico}</p>
                </div>
                <div className="text-center">
                  <div className="w-full border-b border-foreground-400 mb-2 print:border-gray-600"></div>
                  <p className="text-sm font-semibold text-foreground-900 print:text-black">Responsable Epidemiología</p>
                  <p className="text-xs text-foreground-500 print:text-gray-600">{caso.jurisdiccionSanitaria}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-10 py-4 border-t border-secondary-200 print:border-gray-300">
              <div className="flex items-center justify-between text-[10px] text-foreground-400 print:text-gray-500">
                <p>Documento generado conforme a NOM-017-SSA2-2012 · SUIVE</p>
                <p>MediCore · {sucursal.telefono} · {sucursal.email}</p>
              </div>
              <p className="text-[10px] text-foreground-400 mt-1 text-center print:text-gray-500">
                Generado el {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
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
          body.printing-vigilancia #root { display: none !important; }
          .vigilancia-print-modal-root {
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
          .vigilancia-print-modal-root > div {
            max-width: none !important;
            min-height: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
          }
          #vigilancia-print-wrapper {
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
          #vigilancia-print-wrapper, #vigilancia-print-wrapper * { visibility: visible !important; }
          #vigilancia-print-wrapper .flex { display: flex !important; }
          #vigilancia-print-wrapper .grid { display: grid !important; }
          #vigilancia-print-wrapper [class*="print:hidden"] { display: none !important; }
        }
      `}</style>
    </>
  );
}