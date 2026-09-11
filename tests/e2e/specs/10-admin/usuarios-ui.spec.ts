import { test, expect } from '@playwright/test';
import { api } from '../../fixtures/api';
import { entorno } from '../../fixtures/tenants';
import { apiDisponible, loginUi, servidorDisponible } from '../../helpers/auth-ui';
import { sel } from '../../helpers/selectors';
import { users } from '../../data/users';

/**
 * Admin UI · usuarios (Vite + API real). Complementa `00-smoke/api-users.spec.ts`.
 */

function stampUnico(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

test.describe.configure({ mode: 'serial' });

test.describe('10 — Admin · usuarios UI (Vite + API)', () => {
  test.beforeEach(async () => {
    const upUi = await servidorDisponible(entorno.baseURL);
    const upApi = await apiDisponible(api.url);
    test.skip(
      !upUi || !upApi,
      `Requiere Vite (${entorno.baseURL}) + API (${api.url}). upUi=${upUi} upApi=${upApi}`,
    );
  });

  test('lista desde API, alta y aparece en tabla', async ({ page }) => {
    await loginUi(page, {
      userName: users.admin.email,
      password: users.admin.password,
    });

    const listPromise = page.waitForResponse(
      (r) => {
        try {
          const path = new URL(r.url()).pathname;
          return path === '/api/users' && r.request().method() === 'GET' && r.ok();
        } catch {
          return false;
        }
      },
      { timeout: 20_000 },
    );

    await page.goto(sel.admin.usuariosPath);
    await listPromise;
    await expect(page.getByTestId('page-admin-usuarios')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('usuarios-table')).toBeVisible();

    const stamp = stampUnico().replace(/\d/g, '') || 'xyz';
    const userName = `ui.${stamp}@medicore.mx`;
    const displayFirst = `UI`;
    const displayLast = `User ${stamp}`;

    await page.getByTestId('usuarios-nuevo').click();
    await page.getByTestId('usuarios-nombre').fill(displayFirst);
    await page.getByTestId('usuarios-apellidos').fill(displayLast);
    await page.getByTestId('usuarios-username').fill(userName);
    await page.getByTestId('usuarios-password').fill('Temporal123!');

    await page.getByTestId('usuarios-rol').selectOption('recepcion');

    // Al menos una sucursal (obligatoria en UI)
    const branches = page.getByTestId('usuarios-branches');
    await expect(branches.getByRole('button').first()).toBeVisible();
    await branches.getByRole('button').first().click();

    const createPromise = page.waitForResponse(
      (r) => {
        try {
          const path = new URL(r.url()).pathname.replace(/\/$/, '');
          return path.endsWith('/api/users') && r.request().method() === 'POST';
        } catch {
          return false;
        }
      },
      { timeout: 20_000 },
    );

    await page.getByTestId('usuarios-guardar').click();
    const createRes = await createPromise;
    expect(createRes.ok(), await createRes.text()).toBeTruthy();
    await expect(page.getByText(`${displayFirst} ${displayLast}`)).toBeVisible({ timeout: 10_000 });
  });
});
