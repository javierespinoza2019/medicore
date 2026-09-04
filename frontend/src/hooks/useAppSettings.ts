import { useState, useEffect } from 'react';
import {
  getDoctorSignature,
  subscribeSettings,
} from '@/utils/appSettings';

// Hook reactivo para la firma digital de un médico.
export function useDoctorSignature(doctorId?: string): string | null {
  const [sig, setSig] = useState<string | null>(() => getDoctorSignature(doctorId || ''));

  useEffect(() => {
    setSig(getDoctorSignature(doctorId || ''));
    return subscribeSettings(() => setSig(getDoctorSignature(doctorId || '')));
  }, [doctorId]);

  return sig;
}
