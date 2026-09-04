import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '@/components/base/Modal';
import Button from '@/components/base/Button';
import Badge from '@/components/base/Badge';
import Avatar from '@/components/base/Avatar';
import { statusConfig, type AgendaAppointment, type Appointment } from '@/pages/agenda/types';
import TicketPrintModal from '@/pages/agenda/components/TicketPrintModal';

interface AppointmentDetailModalProps {
  open: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onStatusChange: (appointmentId: string, newStatus: Appointment['estado']) => void;
  onDuplicate?: () => void;
}

function getNextStatus(current: Appointment['estado']): { status: Appointment['estado']; label: string; variant: 'primary' | 'success' | 'warning' | 'accent' | 'danger' | 'ghost'; icon: string }[] {
  switch (current) {
    case 'reservada':
      return [
        { status: 'confirmada', label: 'Confirmar cita', variant: 'primary', icon: 'ri-check-double-line' },
        { status: 'cancelada', label: 'Cancelar', variant: 'danger', icon: 'ri-close-circle-line' },
      ];
    case 'confirmada':
      return [
        { status: 'llego', label: 'Marcar llegada', variant: 'success', icon: 'ri-user-location-line' },
        { status: 'no_acudio', label: 'No acudió', variant: 'danger', icon: 'ri-user-unfollow-line' },
        { status: 'cancelada', label: 'Cancelar', variant: 'ghost', icon: 'ri-close-circle-line' },
      ];
    case 'llego':
      return [
        { status: 'en_espera', label: 'Enviar a sala de espera', variant: 'warning', icon: 'ri-hourglass-line' },
        { status: 'en_consulta', label: 'Iniciar consulta', variant: 'accent', icon: 'ri-stethoscope-line' },
      ];
    case 'en_espera':
      return [
        { status: 'en_consulta', label: 'Llamar a consulta', variant: 'accent', icon: 'ri-stethoscope-line' },
        { status: 'cancelada', label: 'Cancelar', variant: 'ghost', icon: 'ri-close-circle-line' },
      ];
    case 'en_consulta':
      return [
        { status: 'atendida', label: 'Finalizar consulta', variant: 'success', icon: 'ri-check-line' },
      ];
    case 'disponible':
      return [];
    case 'cancelada':
    case 'no_acudio':
      return [];
    case 'atendida':
      return [];
    default:
      return [];
  }
}

export default function AppointmentDetailModal({ open, onClose, appointment, onStatusChange, onDuplicate }: AppointmentDetailModalProps) {
  const navigate = useNavigate();
  const [confirmAction, setConfirmAction] = useState<{ status: Appointment['estado']; label: string } | null>(null);
  const [printTicketOpen, setPrintTicketOpen] = useState(false);

  if (!appointment) return null;

  const cfg = statusConfig[appointment.estado];
  const nextActions = getNextStatus(appointment.estado);
  const isDisponible = appointment.estado === 'disponible';
  const isFinished = appointment.estado === 'atendida' || appointment.estado === 'cancelada' || appointment.estado === 'no_acudio';

  const handleStatusAction = (status: Appointment['estado'], label: string) => {
    if (status === 'cancelada' || status === 'no_acudio') {
      setConfirmAction({ status, label });
    } else {
      onStatusChange(appointment.id, status);
    }
  };

  const handleConfirm = () => {
    if (confirmAction) {
      onStatusChange(appointment.id, confirmAction.status);
      setConfirmAction(null);
    }
  };

  const handleClose = () => {
    setConfirmAction(null);
    setPrintTicketOpen(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} size="md">
      {confirmAction ? (
        <div className="text-center py-2" role="alertdialog" aria-modal="true" aria-labelledby="confirmar-accion-titulo" aria-describedby="confirmar-accion-desc">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-3">
            <i className="ri-alert-line text-xl text-amber-600" aria-hidden="true"></i>
          </div>
          <p id="confirmar-accion-titulo" className="text-sm font-semibold text-foreground-900 mb-1">¿Confirmar acción?</p>
          <p id="confirmar-accion-desc" className="text-sm text-foreground-500 mb-5">
            ¿Estás seguro de marcar esta cita como <strong>{confirmAction.label}</strong>?
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setConfirmAction(null)}>Cancelar</Button>
            <Button variant={confirmAction.status === 'cancelada' ? 'danger' : 'warning'} size="sm" type="button" onClick={handleConfirm}>
              Sí, {confirmAction.label}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {isDisponible ? (
            <div className="text-center py-4 relative">
              <button
                type="button"
                onClick={handleClose}
                aria-label="Cerrar detalle de cita"
                className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-foreground-700 hover:bg-secondary-100 transition-base cursor-pointer"
              >
                <i className="ri-close-line text-lg" aria-hidden="true"></i>
              </button>
              <div className="w-14 h-14 mx-auto rounded-full bg-secondary-100 flex items-center justify-center mb-3">
                <i className="ri-time-line text-2xl text-foreground-400" aria-hidden="true"></i>
              </div>
              <p className="text-sm font-semibold text-foreground-600">Horario disponible</p>
              <p className="text-sm text-foreground-500 mt-1">{appointment.doctorName}</p>
              <p className="text-xs text-foreground-400 mt-1">
                {appointment.horaInicio} – {appointment.horaFin} · {appointment.consultorio}
              </p>
              <p className="text-xs text-foreground-400 mt-3">Selecciona un paciente para agendar esta cita</p>
            </div>
          ) : (
            <div>
              {/* Patient info header */}
              <div className="flex items-center gap-3 mb-5">
                <Avatar name={appointment.patientName} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-foreground-900">{appointment.patientName}</p>
                  <p className="text-xs text-foreground-500 font-mono">{appointment.patientId.slice(0, 8)}…</p>
                </div>
                <Badge variant={cfg.variant} size="md" dot>{cfg.label}</Badge>
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Cerrar detalle de cita"
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-foreground-700 hover:bg-secondary-100 transition-base cursor-pointer shrink-0"
                >
                  <i className="ri-close-line text-lg" aria-hidden="true"></i>
                </button>
              </div>

              {/* Appointment details grid */}
              <div className="grid grid-cols-2 gap-3 mb-5 p-4 bg-secondary-50 rounded-xl">
                <div>
                  <p className="text-2xs text-foreground-400 uppercase tracking-wide mb-0.5">Fecha</p>
                  <p className="text-sm font-semibold text-foreground-900">{appointment.fecha}</p>
                </div>
                <div>
                  <p className="text-2xs text-foreground-400 uppercase tracking-wide mb-0.5">Horario</p>
                  <p className="text-sm font-semibold text-foreground-900">{appointment.horaInicio} – {appointment.horaFin}</p>
                </div>
                <div>
                  <p className="text-2xs text-foreground-400 uppercase tracking-wide mb-0.5">Médico</p>
                  <p className="text-sm font-semibold text-foreground-900">{appointment.doctorName}</p>
                </div>
                <div>
                  <p className="text-2xs text-foreground-400 uppercase tracking-wide mb-0.5">Especialidad</p>
                  <p className="text-sm font-semibold text-foreground-900">{appointment.especialidad}</p>
                </div>
                <div>
                  <p className="text-2xs text-foreground-400 uppercase tracking-wide mb-0.5">Consultorio</p>
                  <p className="text-sm font-semibold text-foreground-900">{appointment.consultorio}</p>
                </div>
                {appointment.motivo && (
                  <div>
                    <p className="text-2xs text-foreground-400 uppercase tracking-wide mb-0.5">Motivo</p>
                    <p className="text-sm font-semibold text-foreground-900">{appointment.motivo}</p>
                  </div>
                )}
              </div>

              {/* Duplicate + Print actions */}
              {(onDuplicate || !isDisponible) && (
                <div className="border-t border-secondary-200 pt-3 mt-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    {onDuplicate && (
                      <button
                        type="button"
                        aria-label={`Duplicar cita de ${appointment.patientName}`}
                        onClick={() => { onDuplicate(); onClose(); }}
                        className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium cursor-pointer transition-base"
                      >
                        <i className="ri-file-copy-line" aria-hidden="true"></i> Duplicar esta cita
                      </button>
                    )}
                    {!isDisponible && (
                      <button
                        type="button"
                        aria-label={`Imprimir ticket de cita de ${appointment.patientName}`}
                        onClick={() => setPrintTicketOpen(true)}
                        className="flex items-center gap-1.5 text-xs text-secondary-700 hover:text-secondary-800 font-medium cursor-pointer transition-base"
                      >
                        <i className="ri-printer-line" aria-hidden="true"></i> Imprimir ticket
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Status actions */}
              {!isFinished && nextActions.length > 0 && (
                <div className="border-t border-secondary-200 pt-4">
                  <p className="text-xs text-foreground-500 mb-3 font-medium">Acciones disponibles</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(appointment.estado === 'llego' || appointment.estado === 'en_espera' || appointment.estado === 'en_consulta') && (
                      <Button
                        variant="accent"
                        size="sm"
                        type="button"
                        aria-label={`Ir a consulta de ${appointment.patientName}`}
                        onClick={() => {
                          navigate(`/app/consultas?paciente=${appointment.patientId}`);
                          onClose();
                        }}
                      >
                        <i className="ri-stethoscope-line" aria-hidden="true"></i> Ir a consulta
                      </Button>
                    )}
                    {nextActions.map((action) => (
                      <Button
                        key={action.status}
                        variant={action.variant === 'ghost' ? 'ghost' : action.variant}
                        size="sm"
                        type="button"
                        aria-label={`${action.label} cita de ${appointment.patientName}`}
                        onClick={() => handleStatusAction(action.status, action.label)}
                      >
                        <i className={action.icon} aria-hidden="true"></i> {action.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {isFinished && (
                <div className="border-t border-secondary-200 pt-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    {appointment.estado === 'atendida' && (
                      <Button
                        variant="accent"
                        size="sm"
                        type="button"
                        aria-label={`Ver consulta de ${appointment.patientName}`}
                        onClick={() => {
                          navigate(`/app/consultas?paciente=${appointment.patientId}`);
                          onClose();
                        }}
                      >
                        <i className="ri-stethoscope-line" aria-hidden="true"></i> Ver consulta
                      </Button>
                    )}
                    {nextActions.length > 0 && (
                      nextActions.map((action) => (
                        <Button
                          key={action.status}
                          variant={action.variant === 'ghost' ? 'ghost' : action.variant}
                          size="sm"
                          type="button"
                          aria-label={`${action.label} cita de ${appointment.patientName}`}
                          onClick={() => handleStatusAction(action.status, action.label)}
                        >
                          <i className={action.icon} aria-hidden="true"></i> {action.label}
                        </Button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
      <TicketPrintModal
        appointment={appointment}
        isOpen={printTicketOpen}
        onClose={() => setPrintTicketOpen(false)}
      />
    </Modal>
  );
}