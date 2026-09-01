import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración E2E de MediCore.
 * baseURL: MEDICORE_BASE_URL (default http://localhost:5173 → docs/frontend con Vite).
 * MEDICORE_API_URL: API real para la suite de contrato (default http://localhost:5080).
 */
const baseURL = process.env.MEDICORE_BASE_URL?.trim() || 'http://127.0.0.1:5173';
const apiURL = process.env.MEDICORE_API_URL?.trim() || 'http://localhost:5080';
const environment = process.env.MEDICORE_ENVIRONMENT?.trim() || 'development';

// La suite escribe datos: no se ejecuta contra un ambiente con pacientes reales.
if (
  environment === 'production' ||
  /\/\/(app|api)\.medicore\.mx/.test(baseURL) ||
  /\/\/(app|api)\.medicore\.mx/.test(apiURL)
) {
  throw new Error(
    'E2E bloqueado contra producción. Use development o qa (MEDICORE_ENVIRONMENT / MEDICORE_BASE_URL / MEDICORE_API_URL).',
  );
}

/** Specs de contrato / SC contra API real (sin navegador). */
const CONTRATO_API =
  /\/(api-.*|06-seguridad-clinica[/\\]sc-mapa|01-auth-seguridad[/\\]permisos-por-rol|01-auth-seguridad[/\\]api-break-glass|02-pacientes[/\\]no-identificado|03-triage-urgencias[/\\]triage-sin-bloqueo|04-consulta-receta[/\\]flujo-consulta|08-multi-tenant[/\\]aislamiento|09-offline[/\\]cola-idempotencia)\.spec\.ts$/;

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: Number(process.env.MEDICORE_TIMEOUT ?? '45000'),
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'es-MX',
    timezoneId: 'America/Mexico_City',
  },
  projects: [
    {
      // Contrato del API real + mapa SC (M12). No usa navegador.
      // Un worker: Dev es BD compartida; alta de sujetos/etiquetas no tolera carrera entre workers.
      name: 'contrato-api',
      testMatch: CONTRATO_API,
      fullyParallel: false,
      workers: 1,
      use: { baseURL: apiURL },
    },
    {
      name: 'chromium',
      testIgnore: CONTRATO_API,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  /* No arranca el frontend: el operador debe tener `npm run dev` en docs/frontend. */
});
