import { useEffect, useMemo } from 'react';
import type { ReferenciaMedica } from '@/mocks/referencias';
import { urgenciaConfigRef, estadoRefConfig } from '@/mocks/referencias';
import { getPatientById } from '@/mocks/patients';
import { sucursales } from '@/mocks/branches';
import { exportElementToPDF, exportElementToPDFBlob } from '@/utils/exportUtils';
import InstitucionalLogo from '@/components/feature/InstitucionalLogo';
import FirmaDigital from '@/components/feature/FirmaDigital';

interface ReferenciaPrintModalProps {
  referencia: ReferenciaMedica;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReferenciaPrintModal({ referencia, isOpen, onClose }: ReferenciaPrintModalProps) {
  const patient = useMemo(() => getPatientById(referencia.patientId), [referencia.patientId]);
  const sucursal = sucursales[0];
  const urgCfg = urgenciaConfigRef[referencia.urgencia];
  const estCfg = estadoRefConfig[referencia.estado];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('printing-referencia');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('printing-referencia');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('printing-referencia');
    };
  }, [isOpen]);

  const handlePrint = async () => {
    const wrapper = document.getElementById('referencia-print-wrapper');
    if (!wrapper) return;
    const blob = await exportElementToPDFBlob(wrapper, {
      title: `${referencia.tipo === 'referencia' ? 'Referencia' : 'Contrarreferencia'} Médica — ${referencia.patientName}`,
      orientation: 'portrait',
      margin: 0,
    });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const handleDownloadPDF = async () => {
    const wrapper = document.getElementById('referencia-print-wrapper');
    if (!wrapper) return;
    const tipoLabel = referencia.tipo === 'referencia' ? 'Referencia' : 'Contrarreferencia';
    const filename = `${tipoLabel}_${referencia.patientName.replace(/\s+/g, '_')}_${referencia.fecha}`;
    await exportElementToPDF(wrapper, filename, {
      title: `${tipoLabel} Médica — ${referencia.patientName}`,
      orientation: 'portrait',
      margin: 0,
    });
  };

  if (!isOpen) return null;

  const folio = `${referencia.tipo === 'referencia' ? 'REF' : 'CONTRA'}-${referencia.id.replace(/-/g, '').toUpperCase()}`;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[100] print:hidden" />
      <div className="referencia-print-modal-root fixed inset-0 z-[101] flex items-start justify-center overflow-y-auto print:static print:overflow-visible print:z-auto print:block">
        <div className="relative w-full max-w-[210mm] min-h-[297mm] mx-auto my-4 bg-background-50 print:bg-white print:m-0 print:shadow-none print:max-w-none print:w-full print:min-h-0">
          <div id="referencia-print-wrapper" className="bg-background-50 print:bg-white print:text-black">
            {/* Header */}
            <div className="px-10 pt-10 pb-6 border-b-2 border-primary-500/20 print:border-gray-300">
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-start gap-4">
                  <InstitucionalLogo
                    fallbackIcon="ri-arrow-left-right-line"
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
              <h1 className="text-2xl font-bold text-foreground-950 tracking-wide font-heading print:text-black">
                {referencia.tipo === 'referencia' ? 'NOTA DE REFERENCIA MÉDICA' : 'NOTA DE CONTRARREFERENCIA'}
              </h1>
              <p className="text-xs text-foreground-500 mt-1 font-mono print:text-gray-600">NOM-004-SSA3-2012 · Art. 6.5</p>
              <p className="text-xs text-foreground-500 print:text-gray-600">Folio: {folio}</p>
            </div>

            {/* Urgency & status */}
            <div className="px-10 pt-5 flex items-center gap-3">
              <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium border ${urgCfg.bg} ${urgCfg.text} border-secondary-200 print:bg-gray-100 print:text-black print:border-gray-300`}>
                <i className={`${urgCfg.icon} text-[10px]`}></i>
                Urgencia: {urgCfg.label}
              </span>
              <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium border ${estCfg.bg} ${estCfg.text} border-secondary-200 print:bg-gray-100 print:text-black print:border-gray-300`}>
                Estado: {estCfg.label}
              </span>
            </div>

            {/* Patient info */}
            <div className="px-10 py-5 grid grid-cols-2 gap-6 print:gap-8">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Paciente</p>
                <p className="text-sm font-semibold text-foreground-900 print:text-black">{referencia.patientName}</p>
                <div className="text-xs text-foreground-500 mt-1 space-y-0.5 print:text-gray-600">
                  <p>Expediente: <span className="font-medium text-foreground-700 print:text-black">{referencia.patientExpediente}</span></p>
                  {patient && (
                    <>
                      <p>Edad: <span className="font-medium text-foreground-700 print:text-black">{patient.edad} años</span> · Sexo: <span className="font-medium text-foreground-700 print:text-black">{patient.sexo === 'M' ? 'Masculino' : 'Femenino'}</span></p>
                      <p>CURP: <span className="font-medium text-foreground-700 print:text-black">{patient.curp}</span></p>
                    </>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Información de traslado</p>
                <div className="text-xs text-foreground-500 mt-1 space-y-0.5 print:text-gray-600">
                  <p>Fecha: <span className="font-medium text-foreground-700 print:text-black">{referencia.fecha}</span></p>
                  <p>Hora: <span className="font-medium text-foreground-700 print:text-black">{referencia.hora}</span></p>
                  <p>Transporte: <span className="font-medium text-foreground-700 print:text-black">{referencia.transporte === 'ambulancia' ? 'Ambulancia' : referencia.transporte === 'particular' ? 'Particular' : 'Transporte público'}</span></p>
                  <p>Acompañante: <span className="font-medium text-foreground-700 print:text-black">{referencia.acompanante}</span></p>
                </div>
              </div>
            </div>

            {/* Origen → Destino */}
            <div className="px-10 py-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="p-4 bg-background-50 border border-secondary-200 rounded-lg print:bg-gray-50 print:border-gray-300 print:rounded-none">
                  <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-1 print:text-gray-500">Unidad de origen</p>
                  <p className="text-sm font-semibold text-foreground-900 print:text-black">{referencia.origen}</p>
                  <p className="text-xs text-foreground-600 mt-1">Médico remitente: <strong>{referencia.medicoRemitente}</strong></p>
                  <p className="text-xs text-foreground-500">Cédula: {referencia.cedulaRemitente}</p>
                </div>
                <div className="p-4 bg-background-50 border border-secondary-200 rounded-lg print:bg-gray-50 print:border-gray-300 print:rounded-none">
                  <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-1 print:text-gray-500">Unidad de destino</p>
                  <p className="text-sm font-semibold text-foreground-900 print:text-black">{referencia.destino}</p>
                  <p className="text-xs text-foreground-600 mt-1">Contacto: <strong>{referencia.contactoDestino}</strong></p>
                  {referencia.medicoReceptor && (
                    <>
                      <p className="text-xs text-foreground-600 mt-0.5">Médico receptor: <strong>{referencia.medicoReceptor}</strong></p>
                      <p className="text-xs text-foreground-500">Cédula: {referencia.cedulaReceptor}</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Motivo & Diagnóstico */}
            <div className="px-10 py-4 space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Motivo de {referencia.tipo === 'referencia' ? 'referencia' : 'contrarreferencia'}</p>
                <div className="bg-background-50 border border-secondary-200 rounded-lg p-4 print:bg-gray-50 print:border-gray-300 print:rounded-none">
                  <p className="text-sm text-foreground-700 leading-relaxed print:text-black">{referencia.motivo}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Diagnóstico resumen</p>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 print:bg-amber-50 print:border-amber-200 print:rounded-none">
                  <p className="text-sm font-semibold text-foreground-800 print:text-black">{referencia.diagnosticoResumen}</p>
                </div>
              </div>
            </div>

            {/* Tratamiento previo */}
            <div className="px-10 py-4">
              <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Tratamiento previo / recibido</p>
              <div className="bg-background-50 border border-secondary-200 rounded-lg p-4 print:bg-gray-50 print:border-gray-300 print:rounded-none">
                <p className="text-sm text-foreground-700 leading-relaxed print:text-black">{referencia.tratamientoPrevio}</p>
              </div>
            </div>

            {/* Estudios */}
            {referencia.estudiosRealizados.length > 0 && (
              <div className="px-10 py-4">
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Estudios realizados</p>
                <ul className="list-disc list-inside text-sm text-foreground-700 space-y-1 pl-1 print:text-black">
                  {referencia.estudiosRealizados.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            {referencia.estudiosPendientes.length > 0 && (
              <div className="px-10 py-4">
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Estudios pendientes</p>
                <ul className="list-disc list-inside text-sm text-foreground-700 space-y-1 pl-1 print:text-black">
                  {referencia.estudiosPendientes.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recomendaciones */}
            <div className="px-10 py-4">
              <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Recomendaciones</p>
              <div className="bg-background-50 border border-secondary-200 rounded-lg p-4 print:bg-gray-50 print:border-gray-300 print:rounded-none">
                <p className="text-sm text-foreground-700 leading-relaxed whitespace-pre-line print:text-black">{referencia.recomendaciones}</p>
              </div>
            </div>

            {/* Respuesta (contrarreferencia) */}
            {referencia.resumenRespuesta && (
              <div className="px-10 py-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg print:bg-emerald-50 print:border-emerald-200 print:rounded-none">
                  <p className="text-[10px] uppercase tracking-wider text-emerald-700 font-semibold mb-2 print:text-gray-600">Respuesta de unidad receptora {referencia.fechaRespuesta ? `· ${referencia.fechaRespuesta}` : ''}</p>
                  <p className="text-sm text-emerald-800 print:text-black">{referencia.resumenRespuesta}</p>
                </div>
              </div>
            )}

            {/* Signatures */}
            <div className="px-10 py-8 mt-4 print:mt-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="text-center">
                  <FirmaDigital nombre={referencia.medicoRemitente} cedula={referencia.cedulaRemitente} lineClassName="w-full border-b border-foreground-400 mb-2 print:border-gray-600" />
                  <p className="text-sm font-semibold text-foreground-900 print:text-black">{referencia.medicoRemitente}</p>
                  <p className="text-xs text-foreground-500 print:text-gray-600">Médico {referencia.tipo === 'referencia' ? 'remitente' : 'que responde'}</p>
                  <p className="text-xs text-foreground-500 print:text-gray-600">Cédula: {referencia.cedulaRemitente}</p>
                </div>
                {referencia.medicoReceptor && (
                  <div className="text-center">
                    <div className="w-full border-b border-foreground-400 mb-2 print:border-gray-600"></div>
                    <p className="text-sm font-semibold text-foreground-900 print:text-black">{referencia.medicoReceptor}</p>
                    <p className="text-xs text-foreground-500 print:text-gray-600">Médico receptor</p>
                    <p className="text-xs text-foreground-500 print:text-gray-600">Cédula: {referencia.cedulaReceptor}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-10 py-4 border-t border-secondary-200 mt-auto print:border-gray-300 print:mt-4">
              <div className="flex items-center justify-between text-[10px] text-foreground-400 print:text-gray-500">
                <p>Este documento forma parte del expediente clínico conforme a la NOM-004-SSA3-2012 Art. 6.5.</p>
                <p>MediCore · {sucursal.telefono} · {sucursal.email}</p>
              </div>
              <p className="text-[10px] text-foreground-400 mt-1 text-center print:text-gray-500">
                La referencia médica garantiza la continuidad de la atención entre unidades de salud.
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
          body.printing-referencia #root { display: none !important; }
          .referencia-print-modal-root {
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
          .referencia-print-modal-root > div {
            max-width: none !important;
            min-height: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
          }
          #referencia-print-wrapper {
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
          #referencia-print-wrapper, #referencia-print-wrapper * { visibility: visible !important; }
          #referencia-print-wrapper .flex { display: flex !important; }
          #referencia-print-wrapper .grid { display: grid !important; }
          #referencia-print-wrapper .hidden,
          #referencia-print-wrapper [class*="print:hidden"] { display: none !important; }
        }
      `}</style>
    </>
  );
}