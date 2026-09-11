import { test, expect } from '@playwright/test';
import { api } from '../../fixtures/api';
import { entorno } from '../../fixtures/tenants';
import { sel } from '../../helpers/selectors';

/**
 * Sala de espera — cola urgencias API (M4/M10).
 * Honestidad: no inventa citas ambulatorias del prototipo Readdy.
 */

async function viteOk(): Promise<boolean> {
  try {
    const res = await fetch(entorno.baseURL, { method: 'GET', signal: AbortSignal.timeout(3_000) });
    return res.ok || res.status === 304;
  } catch {
    return false;
  }
}

async function apiOk(): Promise<boolean> {
  try {
    const res = await fetch(`${api.url}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function loginAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.evaluate(() => {
    try {
      localStorage.setItem('medicore_auth_branch', 'suc1');
    } catch {
      /* ignore */
    }
  });
  await page.locator(sel.login.email).fill('admin');
  await page.locator(sel.login.password).fill('Demo123!');
  await page.locator(sel.login.submit).click();
  await page.waitForURL(/\/app\//, { timeout: 20_000 });
}

test.describe('03 — Sala de espera · UI', () => {
  test.beforeEach(async () => {
    test.skip(!(await viteOk()) || !(await apiOk()), 'Requiere Vite + API');
  });

  test('carga cola de urgencias con ribbon y nota de honestidad (sin citas inventadas)', async ({
    page,
  }) => {
    await loginAdmin(page);
    await page.goto('/app/sala-espera');

    const root = page.getByTestId('page-sala-espera');
    await expect(root).toBeVisible({ timeout: 15_000 });
    await expect(root.getByRole('heading', { name: 'Sala de espera', exact: true })).toBeVisible();
    await expect(root.getByText('En sala', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Actualizar/i })).toBeVisible();

    await expect(root.getByText(/prototipo Readdy/i)).toBeVisible();
    await expect(root.getByText(/Pacientes en sala \(urgencias\)/i)).toBeVisible();
  });
});
