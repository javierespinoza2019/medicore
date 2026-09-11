import { test, expect } from '@playwright/test';
import { users } from '../../data/users';
import { expectAuthenticatedApp, expectLoginError, expectLoginScreen } from '../../helpers/assertions';
import { sel } from '../../helpers/selectors';
import { entorno } from '../../fixtures/tenants';

/**
 * Smoke de autenticación contra el prototipo docs/frontend.
 * Requiere `npm run dev` en docs/frontend (MEDICORE_BASE_URL).
 */

async function servidorDisponible(requestBase: string): Promise<boolean> {
  try {
    const res = await fetch(requestBase, { method: 'GET', signal: AbortSignal.timeout(3_000) });
    return res.ok || res.status === 304;
  } catch {
    return false;
  }
}

test.describe('00 — Smoke · Login', () => {
  test.beforeEach(async () => {
    const up = await servidorDisponible(entorno.baseURL);
    test.skip(!up, `Servidor no disponible en ${entorno.baseURL}. Arranca docs/frontend con npm run dev.`);
  });

  test('muestra la pantalla de inicio de sesión', async ({ page }) => {
    await page.goto('/login');
    await expectLoginScreen(page);
    await expect(page.getByText('MediCore').first()).toBeVisible();
  });

  test('rechaza credenciales inválidas', async ({ page }) => {
    await page.goto('/login');
    await page.locator(sel.login.email).fill('nobody@medicore.mx');
    await page.locator(sel.login.password).fill('wrong-password');
    await page.locator(sel.login.submit).click();
    await expectLoginError(page);
    await expect(page).toHaveURL(/\/login/);
  });

  test('inicia sesión con administrador del seed y llega al dashboard', async ({ page }) => {
    // Tenant `demo`: admin de rol (laura) usa Admin123!; no confundir con admin/Demo123!.
    const admin = users.admin;
    await page.goto('/login');
    await page.locator(sel.login.email).fill(admin.email);
    await page.locator(sel.login.password).fill(admin.password);
    await page.locator(sel.login.submit).click();
    await expectAuthenticatedApp(page);
    await expect(page).toHaveURL(sel.app.dashboardPath);
  });
});
