// Firmas digitales de médicos en el navegador (data URL / localStorage).
// No sustituye el sello de integridad del servidor. Logo institucional: API (useBrandLogo).

const FIRMA_PREFIX = 'medicore_settings_firma_';
const EVENT_NAME = 'medicore:settings-changed';

export function getDoctorSignature(doctorId: string): string | null {
  if (!doctorId) return null;
  try {
    return localStorage.getItem(`${FIRMA_PREFIX}${doctorId}`);
  } catch {
    return null;
  }
}

export function setDoctorSignature(doctorId: string, dataUrl: string): void {
  if (!doctorId) return;
  try {
    localStorage.setItem(`${FIRMA_PREFIX}${doctorId}`, dataUrl);
    notify();
  } catch {
    // noop
  }
}

export function removeDoctorSignature(doctorId: string): void {
  if (!doctorId) return;
  try {
    localStorage.removeItem(`${FIRMA_PREFIX}${doctorId}`);
    notify();
  } catch {
    // noop
  }
}

export function subscribeSettings(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener('storage', handler);
  };
}

function notify(): void {
  window.dispatchEvent(new Event(EVENT_NAME));
}
