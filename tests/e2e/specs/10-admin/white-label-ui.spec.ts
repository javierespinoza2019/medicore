import { test, expect } from '@playwright/test';
import { api } from '../../fixtures/api';
import { entorno } from '../../fixtures/tenants';
import { apiDisponible, loginUi, servidorDisponible } from '../../helpers/auth-ui';
import { sel } from '../../helpers/selectors';
import { users } from '../../data/users';

/**
 * White-label UI: logo (API tenant) + color de marca desde tenant API.
 */

test.describe.configure({ mode: 'serial' });

test.describe('10 — Admin · white-label (logo + color)', () => {
  test.beforeEach(async () => {
    const upUi = await servidorDisponible(entorno.baseURL);
    const upApi = await apiDisponible(api.url);
    test.skip(
      !upUi || !upApi,
      `Requiere Vite (${entorno.baseURL}) + API (${api.url}). upUi=${upUi} upApi=${upApi}`,
    );
  });

  test('sucursales muestra carga de logo y aplica color de marca a --primary-500', async ({
    page,
  }) => {
    await loginUi(page, {
      userName: users.admin.email,
      password: users.admin.password,
    });
    await page.goto(sel.admin.sucursalesPath);

    await expect(page.getByTestId('page-admin-sucursales')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('brand-logo-card')).toBeVisible();
    await expect(page.getByTestId('brand-logo-upload')).toBeVisible();

    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    await page.getByTestId('brand-logo-input').setInputFiles({
      name: 'logo-ui-e2e.png',
      mimeType: 'image/png',
      buffer: png,
    });
    await expect(page.getByTestId('brand-logo-card').locator('img[alt="Logo institucional"]')).toBeVisible({
      timeout: 15_000,
    });
    await page.getByTestId('brand-logo-card').getByRole('button', { name: /^Quitar$/i }).click();
    await expect(page.getByTestId('brand-logo-card').locator('img[alt="Logo institucional"]')).toHaveCount(
      0,
      { timeout: 15_000 },
    );

    await page.getByRole('button', { name: /Editar organización/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const token = '#E11D48';
    await dialog.getByTestId('tenant-color-token').fill(token);
    await dialog.getByRole('button', { name: /^Guardar$/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 15_000 });

    await expect(page.getByText(token)).toBeVisible({ timeout: 10_000 });

    await expect
      .poll(
        async () =>
          page.locator('[data-theme-root]').evaluate((el) =>
            getComputedStyle(el).getPropertyValue('--primary-500').trim(),
          ),
        { timeout: 10_000 },
      )
      .not.toBe('');

    const primary = await page.locator('[data-theme-root]').evaluate((el) =>
      getComputedStyle(el).getPropertyValue('--primary-500').trim(),
    );
    // Escala generada desde #E11D48 (rosa); debe diferir del azul por defecto (~250°).
    expect(primary).toMatch(/^\d/);
    const hue = Number(primary.split(/\s+/)[2]);
    expect(hue).toBeGreaterThan(0);
    expect(Math.abs(hue - 250)).toBeGreaterThan(20);

    // Limpia el token de demo compartida (vacío = paleta por defecto).
    await page.getByRole('button', { name: /Editar organización/i }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByTestId('tenant-color-token').fill('');
    await dialog.getByRole('button', { name: /^Guardar$/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 15_000 });
  });
});
