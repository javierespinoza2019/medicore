import { test, expect } from '@playwright/test';
import {
  api,
  contextoLimpio,
} from '../../fixtures/api';
import { entorno } from '../../fixtures/tenants';
import { sel } from '../../helpers/selectors';
import { curpSinteticaUnica } from '../../helpers/curp';

/**
 * Registro ambulatorio UI + CURP (backend ya valida; quita skip de mapa).
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
  await page.locator(sel.login.email).fill('admin');
  await page.locator(sel.login.password).fill('Demo123!');
  await page.locator(sel.login.submit).click();
  await page.waitForURL(/\/app\//, { timeout: 20_000 });
}

test.describe('02 — Pacientes · registro UI', () => {
  test.beforeEach(async () => {
    test.skip(!(await viteOk()) || !(await apiOk()), 'Requiere Vite + API');
  });

  test('registra paciente ambulatorio con CURP válida', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(sel.pacientes.nuevoPath);
    await expect(page.getByTestId('form-nuevo-paciente')).toBeVisible({ timeout: 15_000 });

    const branchSelect = page.getByLabel(/Sucursal/i);
    await expect(branchSelect.locator('option')).not.toHaveCount(1, { timeout: 15_000 });
    await branchSelect.selectOption({ index: 1 });

    const curp = curpSinteticaUnica(Date.now() + Math.floor(Math.random() * 1000));
    expect(curp).toHaveLength(18);
    await page.getByLabel(/^Nombre/i).fill('Ana');
    await page.getByLabel(/Primer apellido/i).fill('Prueba');
    await page.getByLabel(/CURP/i).fill(curp);
    await page.getByRole('button', { name: /Crear sujeto/i }).click();

    await expect(page).toHaveURL(/\/app\/pacientes\/[0-9a-f-]{36}/i, { timeout: 20_000 });
    await expect(page.getByTestId('paciente-detalle')).toBeVisible();
    await expect(page.getByText(curp)).toBeVisible();
  });

  test('rechaza CURP mal formada sin inventar identidad', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(sel.pacientes.nuevoPath);
    await expect(page.getByTestId('form-nuevo-paciente')).toBeVisible({ timeout: 15_000 });

    await page.getByLabel(/Nombre/i).fill('Luis');
    await page.getByLabel(/Primer apellido/i).fill('Malo');
    await page.getByLabel(/CURP/i).fill('CURPINVALIDA123');
    await page.getByRole('button', { name: /Guardar|Crear|Registrar/i }).click();

    await expect(page.getByText(/CURP|formato|válid|caracteres/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page).toHaveURL(/\/pacientes\/nuevo/);
  });
});

test.describe('02 — Pacientes · vinculación UI SC-22', () => {
  test.beforeEach(async () => {
    test.skip(!(await viteOk()) || !(await apiOk()), 'Requiere Vite + API');
  });

  test('vinculación equivocada se corrige en UI (SC-22)', async ({ page }) => {
    const ctx = await contextoLimpio();
    let sobrevivienteId = '';
    let absorbidoId = '';
    try {
      const login = await ctx.post('/api/auth/login', {
        data: { tenantCode: 'demo', userName: 'admin', password: 'Demo123!' },
      });
      expect(login.status(), await login.text()).toBe(200);
      const token = (await login.json()).data.accessToken as string;
      const headers = { Authorization: `Bearer ${token}` };
      const BRANCH = '22222222-2222-2222-2222-222222222222';

      const a = await ctx.post('/api/subjects', { headers, data: { branchId: BRANCH } });
      const b = await ctx.post('/api/subjects', { headers, data: { branchId: BRANCH } });
      expect(a.status()).toBe(200);
      expect(b.status()).toBe(200);
      sobrevivienteId = (await a.json()).data.subjectId as string;
      absorbidoId = (await b.json()).data.subjectId as string;
    } finally {
      await ctx.dispose();
    }

    await loginAdmin(page);
    await page.goto(`/app/pacientes/${sobrevivienteId}`);
    await expect(page.getByTestId('paciente-detalle')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('subject-vinculacion-panel')).toBeVisible();

    await page.getByTestId('input-absorbed-subject-id').fill(absorbidoId);
    await page.getByTestId('input-link-justification').fill('SC-22 UI vínculo equivocado sintético');
    await page.getByTestId('btn-vincular').click();
    await expect(page.getByTestId('vinculacion-ok')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('last-link-id')).toBeVisible();

    await page.getByTestId('input-revert-justification').fill('SC-22 UI corrección de vínculo');
    await page.getByTestId('btn-revertir-vinculo').click();
    await expect(page.getByTestId('vinculacion-ok')).toContainText(/revertida/i, { timeout: 15_000 });
  });
});
