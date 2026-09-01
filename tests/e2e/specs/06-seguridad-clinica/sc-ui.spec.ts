import { test, expect } from '@playwright/test';
import {
  api,
  contextoLimpio,
} from '../../fixtures/api';
import { entorno } from '../../fixtures/tenants';
import { sel } from '../../helpers/selectors';
import { goOffline, goOnline, abortApi, clearApiAbort } from '../../fixtures/offline';

/**
 * SC de presentación (Vite + API real). Sin mocks.
 * SC-05 pleno · SC-08 UI · SC-09 · SC-10 UI.
 */

const BRANCH_DEMO = '22222222-2222-2222-2222-222222222222';

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

async function loginAdminUi(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.evaluate(() => {
    try {
      // Forzar Clínica Central (BRANCH_DEMO) — evita cola vacía si quedó Norte en storage.
      localStorage.setItem('medicore_auth_branch', 'suc1');
    } catch {
      /* ignore */
    }
  });
  await page.locator(sel.login.email).fill('admin');
  await page.locator(sel.login.password).fill('Demo123!');
  await page.locator(sel.login.submit).click();
  await page.waitForURL(/\/app\//, { timeout: 20_000 });
  await expect(page.getByRole('button', { name: /Central/i })).toBeVisible({ timeout: 10_000 });
}

async function crearSujetoYUrgencia(): Promise<{
  subjectId: string;
  encounterId: string;
  label: string;
}> {
  const ctx = await contextoLimpio();
  try {
    const login = await ctx.post('/api/auth/login', {
      data: { tenantCode: 'demo', userName: 'admin', password: 'Demo123!' },
    });
    expect(login.status(), await login.text()).toBe(200);
    const token = (await login.json()).data.accessToken as string;
    const headers = { Authorization: `Bearer ${token}` };

    const created = await ctx.post('/api/subjects', {
      headers,
      data: { branchId: BRANCH_DEMO },
    });
    expect(created.status(), await created.text()).toBe(200);
    const subject = (await created.json()).data;
    const enc = await ctx.post('/api/encounters', {
      headers,
      data: {
        branchId: BRANCH_DEMO,
        subjectId: subject.subjectId,
        encounterType: 'urgencias',
      },
    });
    expect(enc.status(), await enc.text()).toBe(200);
    return {
      subjectId: subject.subjectId as string,
      encounterId: (await enc.json()).data.encounterId as string,
      label: (subject.activeLabel?.operationalLabel as string) ?? '',
    };
  } finally {
    await ctx.dispose();
  }
}

async function crearSujetoYConsulta(): Promise<{
  subjectId: string;
  encounterId: string;
  label: string;
}> {
  const ctx = await contextoLimpio();
  try {
    const login = await ctx.post('/api/auth/login', {
      data: { tenantCode: 'demo', userName: 'admin', password: 'Demo123!' },
    });
    expect(login.status(), await login.text()).toBe(200);
    const token = (await login.json()).data.accessToken as string;
    const headers = { Authorization: `Bearer ${token}` };

    const created = await ctx.post('/api/subjects', {
      headers,
      data: { branchId: BRANCH_DEMO },
    });
    expect(created.status(), await created.text()).toBe(200);
    const subject = (await created.json()).data;
    const enc = await ctx.post('/api/encounters', {
      headers,
      data: {
        branchId: BRANCH_DEMO,
        subjectId: subject.subjectId,
        encounterType: 'consulta_externa',
      },
    });
    expect(enc.status(), await enc.text()).toBe(200);
    return {
      subjectId: subject.subjectId as string,
      encounterId: (await enc.json()).data.encounterId as string,
      label: (subject.activeLabel?.operationalLabel as string) ?? '',
    };
  } finally {
    await ctx.dispose();
  }
}

test.describe.configure({ mode: 'serial' });

test.describe('06 — Seguridad clínica · UI (Vite + API)', () => {
  test.beforeEach(async () => {
    const upUi = await servidorDisponible(entorno.baseURL);
    const upApi = await apiDisponible();
    test.skip(
      !upUi || !upApi,
      `Requiere Vite (${entorno.baseURL}) + API (${api.url}). upUi=${upUi} upApi=${upApi}`,
    );
  });

  test('SC-05: IdentityHeader visible en detalle, triage, urgencias y consultas con sujeto activo', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const { subjectId, label } = await crearSujetoYUrgencia();
    expect(label.length).toBeGreaterThan(0);
    const consulta = await crearSujetoYConsulta();
    expect(consulta.label.length).toBeGreaterThan(0);

    await loginAdminUi(page);

    await page.goto(`/app/pacientes/${subjectId}`);
    await expect(page.getByTestId('paciente-detalle')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('identity-header')).toBeVisible();
    await expect(page.getByTestId('identity-header')).toContainText(label);

    await page.goto(sel.urgencias.path);
    await expect(page.getByTestId('page-urgencias')).toBeVisible({ timeout: 15_000 });
    // Reintentar carga si el banner de contingencia aparece al montar.
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /Actualizar/i }).click();
      const row = page.getByTestId(/^fila-encuentro-/).filter({ hasText: label }).first();
      if (await row.isVisible().catch(() => false)) break;
      await page.waitForTimeout(1_500);
    }
    const urgRow = page.getByTestId(/^fila-encuentro-/).filter({ hasText: label }).first();
    await expect(urgRow).toBeVisible({ timeout: 20_000 });
    await urgRow.click();
    await expect(page.getByTestId('panel-atencion-urgencia')).toBeVisible();
    await expect(page.getByTestId('identity-header')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('identity-header')).toContainText(label);

    await page.goto(sel.triage.path);
    await expect(page.getByTestId('page-triage')).toBeVisible({ timeout: 15_000 });
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /Actualizar cola/i }).click();
      const row = page.locator('section ul li button').filter({ hasText: label }).first();
      if (await row.isVisible().catch(() => false)) break;
      await page.waitForTimeout(1_500);
    }
    const triageRow = page.locator('section ul li button').filter({ hasText: label }).first();
    await expect(triageRow).toBeVisible({ timeout: 20_000 });
    await triageRow.click();
    await expect(page.getByTestId('identity-header')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('identity-header')).toContainText(label);

    await page.goto(`${sel.consultas.path}?encuentro=${consulta.encounterId}`);
    await expect(page.getByTestId('page-consultas')).toBeVisible({ timeout: 15_000 });
    // Esperar fin de carga del episodio (IdentityHeader solo con sujeto resuelto).
    await expect(page.getByText(/Cargando episodio|Preparando sesión/i)).toHaveCount(0, {
      timeout: 20_000,
    });
    await expect(page.getByTestId('identity-header')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('identity-header')).toContainText(consulta.label);
  });

  test('SC-08 UI: signo fuera de rango se destaca; vacío no se marca normal', async ({ page }) => {
    const { label } = await crearSujetoYUrgencia();
    await loginAdminUi(page);
    await page.goto(sel.triage.path);
    await expect(page.getByTestId('page-triage')).toBeVisible({ timeout: 15_000 });

    const firstRow = page.locator('section ul li button').filter({ hasText: label }).first();
    await expect(firstRow).toBeVisible({ timeout: 20_000 });
    await firstRow.click();

    const tempInput = page.locator('label').filter({ hasText: /Temperatura/i }).locator('input');
    await expect(tempInput).toBeVisible();
    await tempInput.fill('41.5');
    await expect(page.getByText(/Fuera de rango/i).first()).toBeVisible();

    await tempInput.fill('');
    await expect(page.getByText(/Fuera de rango/i)).toHaveCount(0);
    await expect(page.getByText(/valores? normales?/i)).toHaveCount(0);
  });

  test('SC-09: contingencia muestra antigüedad de cola (QueueLiveBanner)', async ({
    page,
    context,
  }) => {
    await loginAdminUi(page);
    await page.goto(sel.urgencias.path);
    await expect(page.getByTestId('page-urgencias')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1_500);

    await goOffline(context);
    await abortApi(page);
    await page.getByRole('button', { name: /Actualizar/i }).click();
    await expect(page.getByTestId('queue-live-banner')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('queue-live-banner')).toContainText(
      /Sin enlace|caché|conocida|consulta periódica|empuje/i,
    );

    await clearApiAbort(page);
    await goOnline(context);
  });

  test('SC-10 UI: niveles de triage con texto + icono (no sólo color)', async ({ page }) => {
    const { label } = await crearSujetoYUrgencia();
    await loginAdminUi(page);
    await page.goto(sel.triage.path);
    await expect(page.getByTestId('page-triage')).toBeVisible({ timeout: 15_000 });
    // Espera fila del episodio recién creado (cola puede tardar un refresh).
    const row = page.locator('section ul li button').filter({ hasText: label }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    await row.click();

    const levelButtons = page
      .locator('fieldset')
      .filter({ hasText: /Nivel de triage/i })
      .locator('button');
    await expect(levelButtons.first()).toBeVisible({ timeout: 10_000 });
    const count = await levelButtons.count();
    expect(count).toBeGreaterThan(1);
    const withIcon = page.locator('fieldset button i[class*="ri-"]');
    await expect(withIcon.first()).toBeVisible();
    await expect(levelButtons.nth(1)).toContainText(/\S+/);
  });
});
