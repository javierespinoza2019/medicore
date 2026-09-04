import { test, expect } from '@playwright/test';
import { api } from '../../fixtures/api';
import { entorno } from '../../fixtures/tenants';
import { sel } from '../../helpers/selectors';
import { users } from '../../data/users';

/**
 * Agenda UI (Vite + API real): profesionales y consultorios desde API, sin mocks.
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

    await page.goto(sel.agenda.path);

    await expect(page.getByTestId('page-agenda')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('page-agenda').getByRole('heading', { name: 'Agenda' })).toBeVisible();

    await page.getByRole('button', { name: /Nueva cita/i }).click();
    const dialog = page.getByRole('dialog', { name: /Nueva cita/i });
    await expect(dialog).toBeVisible();

    // Wizard paso 1 → 2: elegir paciente y avanzar a médico/horario.
    await dialog.getByRole('listbox').getByRole('option').first().click();
    await dialog.getByRole('button', { name: 'Siguiente', exact: true }).click();

    const select = dialog
      .getByTestId('agenda-professional-select')
      .or(dialog.getByLabel('Seleccionar médico'));
    await expect(select).toBeVisible({ timeout: 10_000 });

    await expect(async () => {
      const optionTexts = await select.locator('option').allTextContents();
      const realOptions = optionTexts.filter((t) => t.trim() && !/^Seleccionar/i.test(t));
      expect(realOptions.length).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 10_000 });

    const optionTexts = await select.locator('option').allTextContents();
    // No deben aparecer médicos solo-mock del prototipo.
    expect(optionTexts.join(' ')).not.toMatch(/Ricardo Olvera|Gabriela Herrera|Fernando Castillo/i);
    // Seed demo esperado en Dev (API real).
    expect(optionTexts.join(' ')).toMatch(/Alejandro García|Patricia Mendoza/i);

    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialog).not.toBeVisible();

    await page.getByTestId('page-agenda').getByRole('button', { name: 'Actualizar', exact: true }).click();
    await expect(page.getByTestId('page-agenda')).toBeVisible();
  });

  test('configuración de consultorios persiste alta vía API (sin ids locales)', async ({ page }) => {
    await loginRecepcionUi(page);
    await page.goto(sel.agenda.path);
    await expect(page.getByTestId('page-agenda')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: /Configuración/i }).click();
    const config = page.getByRole('dialog', { name: /Configuración de agenda/i });
    await expect(config).toBeVisible();
    await expect(config.getByTestId('agenda-consultorios-tab')).toBeVisible();
    await expect(config.getByText(/Consultorio 101/i)).toBeVisible();

    const suffix = Date.now().toString(36).slice(-6).toUpperCase();
    const code = `E2E-${suffix}`;
    const name = `E2E Consultorio ${suffix}`;

    await config.getByRole('button', { name: /Agregar consultorio/i }).click();
    await config.getByLabel('Nombre').fill(name);
    await config.getByLabel('Código').fill(code);

    const upsertPromise = page.waitForResponse(
      (r) => {
        try {
          const path = new URL(r.url()).pathname;
          return (
            path.startsWith('/api/consulting-rooms/') &&
            r.request().method() === 'PUT'
          );
        } catch {
          return false;
        }
      },
      { timeout: 20_000 },
    );

    await config.getByRole('button', { name: /Guardar/i }).click();
    const upsertRes = await upsertPromise;
    expect(upsertRes.ok(), await upsertRes.text()).toBe(true);

    await expect(config.getByText(name)).toBeVisible({ timeout: 15_000 });
    await expect(config.getByText(code, { exact: true })).toBeVisible();
  });
});
