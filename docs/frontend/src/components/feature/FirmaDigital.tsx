import { doctors } from '@/mocks/doctors';
import { useDoctorSignature } from '@/hooks/useAppSettings';

interface FirmaDigitalProps {
  doctorId?: string;
  nombre?: string;
  cedula?: string;
  className?: string;
  lineClassName?: string;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function resolveDoctorId(doctorId?: string, nombre?: string, cedula?: string): string | undefined {
  if (doctorId && doctors.some((d) => d.id === doctorId)) return doctorId;

  if (nombre) {
    const n = normalize(nombre);
    const match = doctors.find((d) => normalize(d.nombre) === n);
    if (match) return match.id;
  }

  if (cedula) {
    const c = normalize(cedula);
    const match = doctors.find((d) => normalize(d.cedula) === c);
    if (match) return match.id;
  }

  return doctorId;
}

// Muestra la firma digital cargada por el médico si existe; de lo contrario
// dibuja la línea de firma tradicional en los reportes.
export default function FirmaDigital({
  doctorId,
  nombre,
  cedula,
  className = 'w-56 h-16 object-contain mx-auto',
  lineClassName = 'w-56 border-b border-foreground-400 mx-auto print:border-gray-600',
}: FirmaDigitalProps) {
  const resolvedId = resolveDoctorId(doctorId, nombre, cedula);
  const firma = useDoctorSignature(resolvedId);

  if (firma) {
    return <img src={firma} alt="Firma digital" className={className} />;
  }

  return <div className={lineClassName}></div>;
}