/**
 * Perfil de ambiente del cliente. La fuente de verdad es la API (`/api/health`);
 * esto sólo define el build y la señalización visual.
 */

export type EnvironmentName = 'development' | 'qa' | 'production';

function flag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1';
}

const rawName = (import.meta.env.VITE_ENVIRONMENT ?? 'development').toLowerCase();

export const environmentName: EnvironmentName =
  rawName === 'qa' || rawName === 'production' ? rawName : 'development';

export const isProduction = environmentName === 'production';

/** Ambiente sin PHI: sólo datos sintéticos. */
export const isDemo = flag(import.meta.env.VITE_IS_DEMO, !isProduction);

export const showEnvironmentBanner = flag(
  import.meta.env.VITE_SHOW_ENV_BANNER,
  !isProduction,
);

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * Tenant con el que se autentica el cliente.
 * Provisional para Dev/QA: la resolución definitiva (por subdominio o selector)
 * sigue sin definirse; ver `docs/analisis/06-decisiones-abiertas.md`.
 */
export const tenantCode = import.meta.env.VITE_TENANT_CODE ?? 'demo';

export const environmentLabels: Record<EnvironmentName, string> = {
  development: 'Desarrollo',
  qa: 'QA',
  production: 'Producción',
};
