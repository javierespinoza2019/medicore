/**
 * Modo y credenciales compartidos por la suite.
 * Único punto que lee process.env (además de playwright.config.ts).
 */

export type ModoE2E = 'mock' | 'backend';

function leer(nombre: string, porOmision: string): string {
  const valor = process.env[nombre];
  return valor === undefined || valor.trim() === '' ? porOmision : valor.trim();
}

export const entorno = {
  baseURL: leer('MEDICORE_BASE_URL', 'http://127.0.0.1:5173'),
  modo: leer('MEDICORE_E2E_MODE', 'mock') as ModoE2E,
  password: leer('MEDICORE_E2E_PASSWORD', 'Admin123!'),
  tenantA: leer('MEDICORE_TENANT_A', 'tenant-alfa-ficticio'),
  tenantB: leer('MEDICORE_TENANT_B', 'tenant-bravo-ficticio'),
} as const;

export const esModoMock = (): boolean => entorno.modo === 'mock';
export const esModoBackend = (): boolean => entorno.modo === 'backend';

/** Motivo estándar para casos que requieren API / Edge / sincronización. */
export const SKIP_HASTA_BACKEND =
  'Requiere backend MediCore (cola, idempotencia, tenant o SC completo). Prototipo mock en docs/frontend.';
