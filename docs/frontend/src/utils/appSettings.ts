// Configuración visual de MediCore persistida en el navegador (sin backend).
// Almacena el logo institucional y las firmas digitales de los médicos como
// data URLs (base64) en localStorage. Para una app multi-usuario se recomienda
// conectar Readdy Backend o SaaS Supabase para almacenamiento compartido.

const LOGO_KEY = 'medicore_settings_logo';
const FIRMA_PREFIX = 'medicore_settings_firma_';
const EVENT_NAME = 'medicore:settings-changed';

export function getLogo(): string | null {
  try {
    return localStorage.getItem(LOGO_KEY);
  } catch {
    return null;
  }
}

export function setLogo(dataUrl: string): void {
  try {
    localStorage.setItem(LOGO_KEY, dataUrl);
    notify();
  } catch {
    // localStorage lleno o no disponible
  }
}

export function removeLogo(): void {
  try {
    localStorage.removeItem(LOGO_KEY);
    notify();
  } catch {
    // noop
  }
}

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

// Permite que los componentes reaccionen a cambios de logo/firma en tiempo real.
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