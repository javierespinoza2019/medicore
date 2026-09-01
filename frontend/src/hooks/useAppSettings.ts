import { useState, useEffect } from 'react';
import {
  getLogo,
  getDoctorSignature,
  subscribeSettings,
} from '@/utils/appSettings';

// Hook reactivo para el logo institucional.
export function useLogo(): string | null {
  const [logo, setLogo] = useState<string | null>(() => getLogo());

  useEffect(() => {
    setLogo(getLogo());
    return subscribeSettings(() => setLogo(getLogo()));
  }, []);

  return logo;
}

// Hook reactivo para la firma digital de un médico.
export function useDoctorSignature(doctorId?: string): string | null {
  const [sig, setSig] = useState<string | null>(() => getDoctorSignature(doctorId || ''));

  useEffect(() => {
    setSig(getDoctorSignature(doctorId || ''));
    return subscribeSettings(() => setSig(getDoctorSignature(doctorId || '')));
  }, [doctorId]);

  return sig;
}