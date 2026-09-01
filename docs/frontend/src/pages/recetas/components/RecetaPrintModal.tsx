import { useEffect, useMemo } from 'react';
import type { Receta } from '@/mocks/recetas';
import { getPatientById } from '@/mocks/patients';
import { doctors } from '@/mocks/doctors';
import { sucursales } from '@/mocks/branches';
import { exportElementToPDF, exportElementToPDFBlob } from '@/utils/exportUtils';
import InstitucionalLogo from '@/components/feature/InstitucionalLogo';
import FirmaDigital from '@/components/feature/FirmaDigital';

interface RecetaPrintModalProps {
  receta: Receta;
  isOpen: boolean;
  onClose: () => void;
}

export default function RecetaPrintModal({ receta, isOpen, onClose }: RecetaPrintModalProps) {
  const patient = useMemo(() => (receta ? getPatientById(receta.patientId) : null), [receta?.patientId]);
  const doctor = useMemo(() => (receta ? doctors.find((d) => d.id === receta.doctorId) : null), [receta?.doctorId]);
  const sucursal = sucursales[0];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('printing-receta');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('printing-receta');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('printing-receta');
    };
  }, [isOpen]);

  const handlePrint = async () => {
    if (!receta) return;
    const wrapper = document.getElementById('receta-print-wrapper');
    if (!wrapper) return;
    const folio = `RX-${receta.id.replace('r', '').padStart(4, '0')}`;
    const blob = await exportElementToPDFBlob(wrapper, {
      title: `Receta Médica — ${receta.patientName}`,
      orientation: 'portrait',
      margin: 0,
    });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const handleDownloadPDF = async () => {
    if (!receta) return;
    const wrapper = document.getElementById('receta-print-wrapper');
    if (!wrapper) return;

    const folio = `RX-${receta.id.replace('r', '').padStart(4, '0')}`;
    await exportElementToPDF(wrapper, `Receta_${folio}_${receta.patientName.replace(/\s+/g, '_')}`, {
      title: `Receta Médica — ${receta.patientName}`,
      orientation: 'portrait',
      margin: 0,
    });
  };

  if (!isOpen || !receta) return null;

  const folio = `RX-${receta.id.replace('r', '').padStart(4, '0')}`;

  return (
    <>
      {/* Overlay — hidden in print */}
      <div
        className="fixed inset-0 bg-black/60 z-[100] print:hidden"
      />

      {/* Modal root — marked for print targeting */}
      <div className="receta-print-modal-root fixed inset-0 z-[101] flex items-start justify-center overflow-y-auto print:static print:overflow-visible print:z-auto print:block">
        <div className="relative w-full max-w-[210mm] min-h-[297mm] mx-auto my-4 bg-background-50 print:bg-white print:m-0 print:shadow-none print:max-w-none print:w-full print:min-h-0">
          {/* Print-only wrapper for @media print targeting */}
          <div id="receta-print-wrapper" className="bg-background-50 print:bg-white print:text-black">
            {/* Header */}
            <div className="px-10 pt-10 pb-6 border-b-2 border-primary-500/20 print:border-gray-300">
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-start gap-4">
                  <InstitucionalLogo
                    fallbackIcon="ri-capsule-line"
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
                  <p className="text-2xs text-foreground-400 print:text-gray-500">{sucursal.email}</p>
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="px-10 py-5 text-center border-b border-secondary-200 print:border-gray-300">
              <h1 className="text-2xl font-bold text-foreground-950 tracking-wide font-heading print:text-black">RECETA MÉDICA</h1>
              <p className="text-xs text-foreground-500 mt-1 font-mono print:text-gray-600">Folio: {folio}</p>
            </div>

            {/* Patient & Doctor Info */}
            <div className="px-10 py-5 grid grid-cols-2 gap-6 print:gap-8">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Paciente</p>
                <p className="text-sm font-semibold text-foreground-900 print:text-black">{receta.patientName}</p>
                <div className="text-xs text-foreground-500 mt-1 space-y-0.5 print:text-gray-600">
                  <p>Expediente: <span className="font-medium text-foreground-700 print:text-black">{receta.patientExpediente}</span></p>
                  {patient && (
                    <>
                      <p>Edad: <span className="font-medium text-foreground-700 print:text-black">{patient.edad} años</span> · Sexo: <span className="font-medium text-foreground-700 print:text-black">{patient.sexo === 'M' ? 'Masculino' : 'Femenino'}</span></p>
                      <p>CURP: <span className="font-medium text-foreground-700 print:text-black">{patient.curp}</span></p>
                    </>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Médico Prescriptor</p>
                <p className="text-sm font-semibold text-foreground-900 print:text-black">{receta.doctorName}</p>
                <div className="text-xs text-foreground-500 mt-1 space-y-0.5 print:text-gray-600">
                  <p>Cédula Profesional: <span className="font-medium text-foreground-700 print:text-black">{receta.doctorCedula}</span></p>
                  {doctor && <p>Especialidad: <span className="font-medium text-foreground-700 print:text-black">{doctor.especialidad}</span></p>}
                  <p>Fecha de emisión: <span className="font-medium text-foreground-700 print:text-black">{receta.fecha} · {receta.hora} hrs</span></p>
                </div>
              </div>
            </div>

            {/* Diagnosis */}
            <div className="px-10 py-4 mx-10 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold mb-1 print:text-gray-600">Diagnóstico</p>
              <p className="text-sm font-medium text-foreground-800 print:text-black">{receta.diagnosticoRelacionado}</p>
            </div>

            {/* Medications */}
            <div className="px-10 py-6">
              <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-4 print:text-gray-500">Medicamentos Prescritos</p>
              <div className="space-y-4">
                {receta.medicamentos.map((med, idx) => (
                  <div key={med.id} className="border-l-2 border-primary-400 pl-4 py-1 print:border-gray-400">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 flex items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex-shrink-0 print:bg-gray-200 print:text-black">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-foreground-900 print:text-black">{med.nombre} <span className="font-normal text-foreground-500 print:text-gray-600">· {med.concentracion}</span></p>
                          <p className="text-xs text-foreground-500 print:text-gray-600">{med.presentacion} · Vía {med.via}</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-2 ml-9 text-xs print:mt-3 print:ml-10">
                      <div>
                        <p className="text-[10px] text-foreground-400 uppercase print:text-gray-500">Dosis</p>
                        <p className="font-medium text-foreground-700 print:text-black">{med.dosis}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-foreground-400 uppercase print:text-gray-500">Frecuencia</p>
                        <p className="font-medium text-foreground-700 print:text-black">{med.frecuencia}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-foreground-400 uppercase print:text-gray-500">Duración</p>
                        <p className="font-medium text-foreground-700 print:text-black">{med.duracion}</p>
                      </div>
                    </div>
                    {med.indicaciones && (
                      <p className="text-xs text-foreground-600 mt-2 ml-9 italic bg-background-50 p-2 rounded border border-secondary-100 print:bg-gray-50 print:text-black print:border-gray-300 print:ml-10 print:mt-3">
                        {med.indicaciones}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* General Instructions */}
            {receta.indicacionesGenerales && (
              <div className="px-10 py-4">
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Indicaciones Generales</p>
                <div className="bg-background-50 border border-secondary-200 rounded-lg p-4 print:bg-gray-50 print:border-gray-300 print:rounded-none">
                  <p className="text-xs text-foreground-700 leading-relaxed whitespace-pre-wrap print:text-black">{receta.indicacionesGenerales}</p>
                </div>
              </div>
            )}

            {/* Signature */}
            <div className="px-10 py-8 mt-4 print:mt-8">
              <div className="flex justify-end">
                <div className="text-center">
                  <FirmaDigital doctorId={receta.doctorId} nombre={receta.doctorName} cedula={receta.doctorCedula} lineClassName="w-56 border-b border-foreground-400 mb-2 print:border-gray-600" />
                  <p className="text-sm font-semibold text-foreground-900 print:text-black">{receta.doctorName}</p>
                  <p className="text-xs text-foreground-500 print:text-gray-600">{doctor?.especialidad || 'Médico'}</p>
                  <p className="text-xs text-foreground-500 print:text-gray-600">Cédula: {receta.doctorCedula}</p>
                  <p className="text-2xs text-foreground-400 mt-2 print:text-gray-500">
                    Firma electrónica (e.firma) · {receta.fecha} · {receta.hora} hrs
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-10 py-4 border-t border-secondary-200 mt-auto print:border-gray-300 print:mt-4">
              <div className="flex items-center justify-between text-[10px] text-foreground-400 print:text-gray-500">
                <p>Esta receta es válida por 30 días a partir de la fecha de emisión.</p>
                <p>MediCore · {sucursal.telefono} · {sucursal.email}</p>
              </div>
              <p className="text-[10px] text-foreground-400 mt-1 text-center print:text-gray-500">
                No se aceptan cambios en la prescripción sin la autorización del médico tratante.
              </p>
              <p className="text-[10px] text-foreground-400 mt-1 text-center print:text-gray-500">
                Documento firmado electrónicamente conforme a la NOM-004-SSA3-2012 y la LFPDPPP.
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
                <i className="ri-printer-line"></i> Imprimir receta
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles injected via style tag */}
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
          body.printing-receta #root {
            display: none !important;
          }
          .receta-print-modal-root {
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
          .receta-print-modal-root > div {
            max-width: none !important;
            min-height: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
          }
          #receta-print-wrapper {
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
          #receta-print-wrapper,
          #receta-print-wrapper * {
            visibility: visible !important;
          }
          #receta-print-wrapper .flex {
            display: flex !important;
          }
          #receta-print-wrapper .grid {
            display: grid !important;
          }
          #receta-print-wrapper .hidden,
          #receta-print-wrapper [class*="print:hidden"] {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}