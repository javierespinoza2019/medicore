import { test, expect } from '@playwright/test';
import { api } from '../../fixtures/api';
import { entorno } from '../../fixtures/tenants';
import { sel } from '../../helpers/selectors';

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
  await page.locator(sel.login.email).fill('admin');
  await page.locator(sel.login.password).fill('Demo123!');
  await page.locator(sel.login.submit).click();
  await page.waitForURL(/\/app\//, { timeout: 20_000 });
}

test.describe('05 — Farmacia · UI placeholder', () => {
  test.beforeEach(async () => {
    test.skip(!(await viteOk()) || !(await apiOk()), 'Requiere Vite + API');
  });

  test('ruta /app/farmacia sin mocks de dispensación', async ({ page }) => {
    await loginAdmin(page);
    await page.goto('/app/farmacia');
    await expect(page.getByTestId('page-farmacia')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Módulo en preparación/i)).toBeVisible();
    await expect(page.getByText(/sin API|pendiente de contrato/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Ver recetas firmadas/i })).toBeVisible();
  });
});
