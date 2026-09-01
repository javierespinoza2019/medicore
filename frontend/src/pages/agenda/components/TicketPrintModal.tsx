import { useEffect, useMemo } from 'react';
import type { Appointment } from '@/mocks/appointments';
import { getPatientById } from '@/mocks/patients';
import { sucursales } from '@/mocks/branches';
import { exportElementToPDF, exportElementToThermalPDFBlob } from '@/utils/exportUtils';
import InstitucionalLogo from '@/components/feature/InstitucionalLogo';
import { useAgendaProfessionalsCatalog } from '@/pages/agenda/hooks/useAgendaProfessionalsCatalog';

interface TicketPrintModalProps {
  appointment: Appointment;
  isOpen: boolean;
  onClose: () => void;
}

export default function TicketPrintModal({ appointment, isOpen, onClose }: TicketPrintModalProps) {
  const patient = useMemo(() => getPatientById(appointment.patientId), [appointment.patientId]);
  const { professionals } = useAgendaProfessionalsCatalog(true);
  const professional = useMemo(
    () => professionals.find((p) => p.healthcareProfessionalId === appointment.doctorId),
    [professionals, appointment.doctorId],
  );
  const sucursal = sucursales[0];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('printing-ticket');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('printing-ticket');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('printing-ticket');
    };
  }, [isOpen]);

  const handlePrint = async () => {
    const wrapper = document.getElementById('ticket-print-wrapper');
    if (!wrapper) return;
    const folio = `TK-${appointment.fecha.replace(/-/g, '')}-${appointment.id.toUpperCase().replace('APP-', '')}`;
    const blob = await exportElementToThermalPDFBlob(wrapper, {
      title: `Ticket de Cita — ${appointment.patientName}`,
      widthMm: 80,
      marginMm: 2,
    });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const handleDownloadPDF = async () => {
    const wrapper = document.getElementById('ticket-print-wrapper');
    if (!wrapper) return;
    const folio = `TK-${appointment.fecha.replace(/-/g, '')}-${appointment.id.toUpperCase().replace('APP-', '')}`;
    await exportElementToPDF(wrapper, `Ticket_${folio}_${appointment.patientName.replace(/\s+/g, '_')}`, {
      title: `Ticket de Cita — ${appointment.patientName}`,
      orientation: 'portrait',
      margin: 4,
    });
  };

  if (!isOpen) return null;

  const folio = `TK-${appointment.fecha.replace(/-/g, '')}-${appointment.id.toUpperCase().replace('APP-', '')}`;
  const fechaFormateada = (() => {
    const [y, m, d] = appointment.fecha.split('-').map(Number);
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${d} de ${meses[m - 1]} de ${y}`;
  })();

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 z-[100] print:hidden" />

      {/* Modal root */}
      <div className="ticket-print-modal-root fixed inset-0 z-[101] flex items-start justify-center overflow-y-auto print:static print:overflow-visible print:z-auto print:block">
        <div className="relative w-full max-w-[360px] min-h-0 mx-auto my-4 bg-background-50 print:bg-white print:m-0 print:shadow-none print:max-w-none print:w-full print:min-h-0">
          <div id="ticket-print-wrapper" className="bg-background-50 print:bg-white print:text-black">
            {/* Ticket Body */}
            <div className="px-6 py-6">
              {/* Header */}
              <div className="text-center border-b-2 border-dashed border-secondary-300 pb-4 mb-4">
                <InstitucionalLogo
                  fallbackClassName="w-12 h-12 mx-auto rounded-xl bg-primary-500 text-white flex items-center justify-center mb-2"
                  iconClassName="text-xl"
                  imgClassName="w-12 h-12 mx-auto object-contain mb-2"
                />
                <h2 className="text-lg font-bold text-foreground-900 font-heading print:text-black">MediCore</h2>
                <p className="text-2xs text-foreground-500 print:text-gray-600">{sucursal.nombre}</p>
                <p className="text-2xs text-foreground-400 print:text-gray-500">{sucursal.direccion}</p>
                <p className="text-2xs text-foreground-400 print:text-gray-500">Tel: {sucursal.telefono}</p>
              </div>

              {/* Title */}
              <div className="text-center mb-4">
                <h1 className="text-sm font-bold text-foreground-950 tracking-widest uppercase font-heading print:text-black">Ticket de Cita</h1>
                <p className="text-2xs text-foreground-400 font-mono mt-1 print:text-gray-600">Folio: {folio}</p>
              </div>

              {/* Patient */}
              <div className="mb-3">
                <p className="text-2xs uppercase tracking-wider text-foreground-400 font-semibold mb-1 print:text-gray-500">Paciente</p>
                <p className="text-sm font-bold text-foreground-900 print:text-black">{appointment.patientName}</p>
                {patient && (
                  <p className="text-2xs text-foreground-500 print:text-gray-600">
                    Exp. {patient.expediente} · {patient.edad} años · {patient.sexo === 'M' ? 'Masculino' : 'Femenino'}
                  </p>
                )}
              </div>

              {/* Date & Time — prominent */}
              <div className="bg-primary-50 border border-primary-200/50 rounded-lg p-3 mb-3 print:bg-gray-100 print:border-gray-300 print:rounded-none">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xs text-primary-600 font-semibold uppercase tracking-wider print:text-gray-600">Fecha</p>
                    <p className="text-sm font-bold text-foreground-900 print:text-black">{fechaFormateada}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xs text-primary-600 font-semibold uppercase tracking-wider print:text-gray-600">Horario</p>
                    <p className="text-sm font-bold text-foreground-900 print:text-black">{appointment.horaInicio} – {appointment.horaFin}</p>
                  </div>
                </div>
              </div>

              {/* Doctor & Specialty */}
              <div className="mb-3">
                <p className="text-2xs uppercase tracking-wider text-foreground-400 font-semibold mb-1 print:text-gray-500">Médico</p>
                <p className="text-sm font-bold text-foreground-900 print:text-black">{appointment.doctorName}</p>
                <p className="text-2xs text-foreground-500 print:text-gray-600">{appointment.especialidad}</p>
                {professional?.professionalLicense ? (
                  <p className="text-2xs text-foreground-400 print:text-gray-500">
                    Cédula: {professional.professionalLicense}
                  </p>
                ) : null}
              </div>

              {/* Consultorio */}
              <div className="mb-3">
                <p className="text-2xs uppercase tracking-wider text-foreground-400 font-semibold mb-1 print:text-gray-500">Ubicación</p>
                <p className="text-sm font-bold text-foreground-900 print:text-black">{appointment.consultorio}</p>
              </div>

              {/* Motivo */}
              {appointment.motivo && (
                <div className="mb-3">
                  <p className="text-2xs uppercase tracking-wider text-foreground-400 font-semibold mb-1 print:text-gray-500">Motivo</p>
                  <p className="text-xs text-foreground-700 print:text-black">{appointment.motivo}</p>
                </div>
              )}

              {/* Divider */}
              <div className="border-t-2 border-dashed border-secondary-300 my-4 print:border-gray-300"></div>

              {/* Folio barcode-like */}
              <div className="text-center mb-3">
                <p className="text-xs font-mono font-bold text-foreground-800 tracking-widest print:text-black">{folio}</p>
                <p className="text-2xs text-foreground-400 mt-1 print:text-gray-500">Escanea o presenta este ticket en recepción</p>
              </div>

              {/* Footer instructions */}
              <div className="bg-amber-50 border border-amber-200/50 rounded-lg p-3 text-center print:bg-gray-50 print:border-gray-300 print:rounded-none">
                <p className="text-2xs text-amber-700 font-semibold print:text-gray-700">
                  <i className="ri-time-line mr-1"></i>
                  Favor de llegar 15 minutos antes de su cita
                </p>
                <p className="text-2xs text-amber-600 mt-1 print:text-gray-600">
                  Presente este ticket impreso o digital en recepción
                </p>
              </div>

              {/* Generated timestamp */}
              <p className="text-2xs text-foreground-300 text-center mt-4 print:text-gray-400">
                Generado el {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
                <i className="ri-file-pdf-line"></i> PDF
              </button>
              <button
                onClick={handlePrint}
                className="px-6 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-base cursor-pointer whitespace-nowrap flex items-center gap-2"
              >
                <i className="ri-printer-line"></i> Imprimir ticket
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          html, body {
            background: #ffffff !important;
            overflow: visible !important;
            height: auto !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body.printing-ticket #root {
            display: none !important;
          }
          .ticket-print-modal-root {
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
          .ticket-print-modal-root > div {
            max-width: none !important;
            min-height: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
          }
          #ticket-print-wrapper {
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
          #ticket-print-wrapper,
          #ticket-print-wrapper * {
            visibility: visible !important;
          }
          #ticket-print-wrapper .flex {
            display: flex !important;
          }
          #ticket-print-wrapper .hidden,
          #ticket-print-wrapper [class*="print:hidden"] {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}