/** Identidad estable del dispositivo en esta estación (IndexedDB no; localStorage OK). */

const STORAGE_KEY = 'medicore_device_public_id';

export function getOrCreateDevicePublicId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing && existing.length >= 8) return existing;
  } catch {
    // almacenamiento no disponible
  }
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? `dev_${crypto.randomUUID()}`
      : `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // sin persistencia: la estación re-registrará en cada carga
  }
  return id;
}

export function guessPlatformLabel(): string {
  if (typeof navigator === 'undefined') return 'web';
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'android-web';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios-web';
  if (/Windows/i.test(ua)) return 'windows-web';
  if (/Mac OS/i.test(ua)) return 'macos-web';
  return 'web';
}

export function defaultDeviceDisplayName(): string {
  const host = typeof location !== 'undefined' ? location.hostname : 'estacion';
  return `Estación ${host}`;
}
