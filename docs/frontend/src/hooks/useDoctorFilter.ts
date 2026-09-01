import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function useDoctorFilter<T extends { doctorId?: string; doctorName?: string }>(
  data: T[],
  field: 'doctorId' | 'doctorName' = 'doctorId'
): { filtered: T[]; isDoctorView: boolean; doctorLabel: string } {
  const { user } = useAuth();
  const isDoctor = user?.rol === 'medico';
  const doctorId = user?.doctorId;
  const doctorName = `${user?.nombre} ${user?.apellidos}`;

  const filtered = useMemo(() => {
    if (!isDoctor || !doctorId) return data;
    if (field === 'doctorId') {
      return data.filter((item) => item.doctorId === doctorId);
    }
    return data.filter((item) => item.doctorName === doctorName);
  }, [data, isDoctor, doctorId, doctorName, field]);

  const especialidad = user?.especialidad || '';
  const doctorLabel = isDoctor ? `Pacientes de ${especialidad}` : '';

  return { filtered, isDoctorView: isDoctor && !!doctorId, doctorLabel };
}