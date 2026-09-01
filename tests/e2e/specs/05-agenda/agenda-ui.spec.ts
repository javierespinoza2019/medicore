import { test, expect } from '@playwright/test';
import { api } from '../../fixtures/api';
import { entorno } from '../../fixtures/tenants';
import { sel } from '../../helpers/selectors';
import { users } from '../../data/users';

/**
 * Agenda UI (Vite + API real): profesionales desde `/api/professionals`, sin `@/mocks/doctors`.
 */

async function servidorDisponible(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(3_000) });
    return res.ok || res.status === 304;
  } catch {
    return false;
  }
}

async function apiDisponible(): Promise<boolean> {
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

async function loginRecepcionUi(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.evaluate(() => {
    try {
      localStorage.setItem('medicore_auth_branch', 'suc1');
    } catch {
      /* ignore */
    }
  });
  await page.locator(sel.login.email).fill(users.recepcion.email);
  await page.locator(sel.login.password).fill(users.recepcion.password);
  await page.locator(sel.login.submit).click();
  await page.waitForURL(/\/app\//, { timeout: 20_000 });
}

test.describe.configure({ mode: 'serial' });

test.describe('05 — Agenda · UI (Vite + API, sin mocks/doctors)', () => {
  test.beforeEach(async () => {
    const upUi = await servidorDisponible(entorno.baseURL);
    const upApi = await apiDisponible();
    test.skip(
      !upUi || !upApi,
      `Requiere Vite (${entorno.baseURL}) + API (${api.url}). upUi=${upUi} upApi=${upApi}`,
    );
  });

  test('lista el día y carga profesionales desde API al abrir nueva cita', async ({ page }) => {
    await loginRecepcionUi(page);

    const professionalsPromise = page.waitForResponse(
      (r) => {
        try {
          const path = new URL(r.url()).pathname;
          return (
            path === '/api/professionals' &&
            r.request().method() === 'GET' &&
            r.ok()
          );
        } catch {
          return false;
        }
      },
      { timeout: 20_000 },
    );

    await page.goto(sel.agenda.path);

    await expect(page.getByTestId('page-agenda')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('page-agenda').getByRole('heading', { name: 'Agenda' })).toBeVisible();

    const profRes = await professionalsPromise;
    const body = await profRes.json();
    expect(body.success).toBe(true);
    const names = (body.data as Array<{ fullName: string }>).map((p) => p.fullName);
    expect(names.length).toBeGreaterThanOrEqual(1);

    await page.getByRole('button', { name: /Nueva cita/i }).click();
    const select = page.getByTestId('agenda-professional-select');
    await expect(select).toBeVisible({ timeout: 10_000 });

    const optionTexts = await select.locator('option').allTextContents();
    for (const name of names) {
      expect(optionTexts.some((t) => t.includes(name))).toBe(true);
    }
    // No deben aparecer médicos solo-mock (ids d3… del prototipo).
    expect(optionTexts.join(' ')).not.toMatch(/Ricardo Olvera|Gabriela Herrera|Fernando Castillo/i);

    await page.getByRole('button', { name: /Actualizar/i }).click();
    await expect(page.getByTestId('page-agenda')).toBeVisible();
  });
});
