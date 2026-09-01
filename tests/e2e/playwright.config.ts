import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración E2E de MediCore.
 * baseURL: MEDICORE_BASE_URL (default http://localhost:5173 → docs/frontend con Vite).
 */
const baseURL = process.env.MEDICORE_BASE_URL?.trim() || 'http://localhost:5173';

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
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  /* No arranca el frontend: el operador debe tener `npm run dev` en docs/frontend. */
});
