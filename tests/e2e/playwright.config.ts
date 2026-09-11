import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración E2E de MediCore.
 * baseURL: MEDICORE_BASE_URL (default http://localhost:5173 → docs/frontend con Vite).
 * MEDICORE_API_URL: API real para la suite de contrato (default http://localhost:5080).
 */
const baseURL = process.env.MEDICORE_BASE_URL?.trim() || 'http://127.0.0.1:5173';
const apiURL = process.env.MEDICORE_API_URL?.trim() || 'http://localhost:5080';
const environment = process.env.MEDICORE_ENVIRONMENT?.trim() || 'development';
const slowMo = Number(process.env.MEDICORE_SLOW_MO ?? '0') || undefined;

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

/** Ciclos guiados QA (overlay); solo con MEDICORE_E2E_GUIDED=1. */
const GUIDED = /[/\\]guided[/\\].*\.spec\.ts$/;
const guidedEnabled = process.env.MEDICORE_E2E_GUIDED === '1';

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
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
      // Después del contrato: logout/revoke/break-glass no deben tumbar la UI en paralelo.
      name: 'chromium',
      dependencies: ['contrato-api'],
      testIgnore: [CONTRATO_API, GUIDED],
      use: {
        ...devices['Desktop Chrome'],
        ...(slowMo ? { launchOptions: { slowMo } } : {}),
      },
    },
    ...(guidedEnabled
      ? [
          {
            name: 'guided-qa',
            testMatch: GUIDED,
            fullyParallel: false,
            workers: 1,
            use: {
              ...devices['Desktop Chrome'],
              headless: process.env.MEDICORE_E2E_GUIDED_HEADLESS === '1',
              launchOptions: {
                slowMo: Number(process.env.MEDICORE_SLOW_MO ?? '250') || 250,
              },
              video: 'on' as const,
              screenshot: 'on' as const,
            },
          },
        ]
      : []),
  ],
  /* No arranca el frontend: el operador debe tener `npm run dev` en docs/frontend. */
});
