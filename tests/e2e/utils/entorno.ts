/**
 * Adaptador de entorno legacy (utils/). Preferir fixtures/tenants.ts.
 * Lee MEDICORE_* con fallback a APP_* / E2E_* por compatibilidad.
 */

export type ModoE2E = 'mock' | 'backend';

function leer(claves: string[], porOmision: string): string {
  for (const nombre of claves) {
    const valor = process.env[nombre];
    if (valor !== undefined && valor.trim() !== '') return valor.trim();
  }
  return porOmision;
}

export const entorno = {
  baseURL: leer(['MEDICORE_BASE_URL', 'APP_BASE_URL'], 'http://localhost:5173'),
  modo: leer(['MEDICORE_E2E_MODE', 'E2E_MODE'], 'mock') as ModoE2E,
  password: leer(['MEDICORE_E2E_PASSWORD', 'E2E_PASSWORD'], 'Admin123!'),
  tenantA: leer(['MEDICORE_TENANT_A', 'E2E_TENANT_A'], 'tenant-alfa-ficticio'),
  tenantB: leer(['MEDICORE_TENANT_B', 'E2E_TENANT_B'], 'tenant-bravo-ficticio'),
  sucursalA: leer(['E2E_SUCURSAL_A'], 'suc1'),
  sucursalB: leer(['E2E_SUCURSAL_B'], 'suc3'),
  timeout: Number(leer(['MEDICORE_TIMEOUT', 'E2E_TIMEOUT'], '45000')),
} as const;

export const esModoMock = () => entorno.modo === 'mock';
export const esModoBackend = () => entorno.modo === 'backend';
