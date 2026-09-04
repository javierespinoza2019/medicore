import { test, expect } from '@playwright/test';
import { api, contextoLimpio } from '../../fixtures/api';
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

const BRANCH_DEMO = '22222222-2222-2222-2222-222222222222';

test.describe('02 — Pacientes · expediente UI', () => {
  test.beforeEach(async () => {
    test.skip(!(await viteOk()) || !(await apiOk()), 'Requiere Vite + API');
  });

  test('tab expediente muestra timeline API sin mocks', async ({ page }) => {
    const ctx = await contextoLimpio();
    let subjectId = '';
    try {
      const login = await ctx.post('/api/auth/login', {
        data: { tenantCode: 'demo', userName: 'admin', password: 'Demo123!' },
      });
      expect(login.status()).toBe(200);
      const token = (await login.json()).data.accessToken as string;
      const created = await ctx.post('/api/subjects', {
        headers: { Authorization: `Bearer ${token}` },
        data: { branchId: BRANCH_DEMO },
      });
      expect(created.status()).toBe(200);
      subjectId = (await created.json()).data.subjectId as string;
    } finally {
      await ctx.dispose();
    }

    await loginAdmin(page);
    await page.goto(`/app/pacientes/${subjectId}`);
    await expect(page.getByTestId('paciente-detalle')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('tab', { name: /Expediente/i }).click();
    await expect(page.getByTestId('expediente-unificado')).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/Sin episodios clínicos|Expediente clínico unificado/i).first(),
    ).toBeVisible();
  });

  test('tab estudios muestra placeholder honesto', async ({ page }) => {
    const ctx = await contextoLimpio();
    let subjectId = '';
    try {
      const login = await ctx.post('/api/auth/login', {
        data: { tenantCode: 'demo', userName: 'admin', password: 'Demo123!' },
      });
      expect(login.status()).toBe(200);
      const token = (await login.json()).data.accessToken as string;
      const created = await ctx.post('/api/subjects', {
        headers: { Authorization: `Bearer ${token}` },
        data: { branchId: BRANCH_DEMO },
      });
      expect(created.status()).toBe(200);
      subjectId = (await created.json()).data.subjectId as string;
    } finally {
      await ctx.dispose();
    }

    await loginAdmin(page);
    await page.goto(`/app/pacientes/${subjectId}`);
    await page.getByRole('tab', { name: /Estudios/i }).click();
    await expect(page.getByTestId('subject-estudios-tab')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Módulo en preparación|sin API/i).first()).toBeVisible();
  });

  test('ruta /app/estudios sin mocks', async ({ page }) => {
    await loginAdmin(page);
    await page.goto('/app/estudios');
    await expect(page.getByTestId('page-estudios')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Módulo en preparación/i)).toBeVisible();
  });

  test('tabs consultas y recetas cargan listados API', async ({ page }) => {
    const ctx = await contextoLimpio();
    let subjectId = '';
    try {
      const login = await ctx.post('/api/auth/login', {
        data: { tenantCode: 'demo', userName: 'admin', password: 'Demo123!' },
      });
      expect(login.status()).toBe(200);
      const token = (await login.json()).data.accessToken as string;
      const created = await ctx.post('/api/subjects', {
        headers: { Authorization: `Bearer ${token}` },
        data: { branchId: BRANCH_DEMO },
      });
      expect(created.status()).toBe(200);
      subjectId = (await created.json()).data.subjectId as string;
    } finally {
      await ctx.dispose();
    }

    await loginAdmin(page);
    await page.goto(`/app/pacientes/${subjectId}`);

    await page.getByRole('tab', { name: /Consultas/i }).click();
    await expect(page.getByTestId('subject-consultas-tab')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('tab', { name: /Recetas/i }).click();
    await expect(page.getByTestId('subject-recetas-tab')).toBeVisible({ timeout: 10_000 });
  });
});
