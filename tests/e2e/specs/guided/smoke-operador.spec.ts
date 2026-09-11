import { test, expect } from '@playwright/test';
import { api } from '../../fixtures/api';
import { isGuidedEnabled } from '../../fixtures/guided-overlay';
import { runGuidedPaso } from '../../fixtures/guided-runner';
import { entorno } from '../../fixtures/tenants';
import { apiDisponible, loginUi, servidorDisponible } from '../../helpers/auth-ui';
import { sel } from '../../helpers/selectors';
import { CICLO_SMOKE, PASOS_SMOKE } from '../../guided/ciclos/smoke-operador';

/**
 * Ciclo guiado QA — Smoke operador (CP-MC-SMOKE 1/6).
 * Solo corre con MEDICORE_E2E_GUIDED=1 (tools/run-guided-qa.ps1).
 */

test.describe.configure({ mode: 'serial' });

test.describe('Guided QA · CP-MC-SMOKE operador', () => {
  test.beforeEach(async () => {
    test.skip(!isGuidedEnabled(), 'Activa con MEDICORE_E2E_GUIDED=1 (tools/run-guided-qa.ps1)');
    const upUi = await servidorDisponible(entorno.baseURL);
    const upApi = await apiDisponible(api.url);
    test.skip(!upUi || !upApi, `Requiere Vite (${entorno.baseURL}) + API (${api.url})`);
  });

  test('ciclo Smoke 1/6 — estacion clinica enciende', async ({ page }) => {
    test.setTimeout(120_000);

    await runGuidedPaso(page, CICLO_SMOKE, PASOS_SMOKE[0]!, async () => {
      await loginUi(page, { userName: 'admin', password: 'Demo123!' });
      await expect(page).toHaveURL(/\/app\//);
      return 'Sesion admin seed en /app/';
    });

    await runGuidedPaso(page, CICLO_SMOKE, PASOS_SMOKE[1]!, async () => {
      await page.goto('/app/dashboard');
      await expect(page.getByTestId('page-dashboard')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(/Panel operativo/i)).toBeVisible();
      await expect(page.getByText(/pendiente de API|BI \/ ingresos/i).first()).toBeVisible();
      return 'Dashboard sin KPIs inventados';
    });

    await runGuidedPaso(page, CICLO_SMOKE, PASOS_SMOKE[2]!, async () => {
      await page.goto(sel.pacientes.path);
      await expect(page.getByTestId('page-pacientes')).toBeVisible({ timeout: 15_000 });
      return 'Padron pacientes (API) visible';
    });

    await runGuidedPaso(page, CICLO_SMOKE, PASOS_SMOKE[3]!, async () => {
      await page.goto(sel.urgencias.path);
      await expect(page.getByTestId('page-urgencias')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId('btn-nuevo-ingreso')).toBeVisible();
      return 'Urgencias: Nuevo ingreso disponible';
    });

    await runGuidedPaso(page, CICLO_SMOKE, PASOS_SMOKE[4]!, async () => {
      await page.goto('/app/monitor-turnos');
      await expect(page.getByTestId('page-monitor-turnos')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(/sin datos personales|#21|solo n[uú]mero/i).first()).toBeVisible();
      const cards = page.locator('[data-testid^="monitor-turno-"]');
      const n = await cards.count();
      for (let i = 0; i < n; i++) {
        const text = (await cards.nth(i).innerText()).toLowerCase();
        expect(text).toMatch(/turno\s*\d+/);
        expect(text).not.toMatch(/\bcurp\b/);
        expect(text).not.toContain('@');
      }
      return n > 0
        ? `${n} tarjeta(s); sin CURP/email (#21)`
        : 'Monitor cargo (sin tarjetas en viewport)';
    });

    await runGuidedPaso(page, CICLO_SMOKE, PASOS_SMOKE[5]!, async () => {
      await page.goto('/app/sala-espera');
      const root = page.getByTestId('page-sala-espera');
      await expect(root).toBeVisible({ timeout: 15_000 });
      await expect(root.getByText(/prototipo Readdy/i)).toBeVisible();
      await expect(root.getByText(/Pacientes en sala \(urgencias\)/i)).toBeVisible();
      return 'Sala de espera: honestidad urgencias OK';
    });
  });
});
