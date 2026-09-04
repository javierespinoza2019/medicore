import { useDoctorSignature } from '@/hooks/useAppSettings';

interface FirmaDigitalProps {
  /** Id del profesional sanitario (healthcareProfessionalId). */
  doctorId?: string;
  /** Ignorado: las firmas locales se indexan solo por doctorId. */
  nombre?: string;
  cedula?: string;
  className?: string;
  lineClassName?: string;
}

/** Firma digital cargada localmente por el médico; sin id no se resuelve por mocks. */
export default function FirmaDigital({
  doctorId,
  className = 'w-56 h-16 object-contain mx-auto',
  lineClassName = 'w-56 border-b border-foreground-400 mx-auto print:border-gray-600',
}: FirmaDigitalProps) {
  const firma = useDoctorSignature(doctorId);

  if (firma) {
    return <img src={firma} alt="Firma digital" className={className} />;
  }

  return <div className={lineClassName}></div>;
}
