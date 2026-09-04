import { test, expect } from '@playwright/test';
import { api, contextoLimpio } from '../../fixtures/api';
import { entorno } from '../../fixtures/tenants';
import { sel } from '../../helpers/selectors';
import { users } from '../../data/users';

/**
 * Impresión de hoja de triage con datos API (M5). Sin mocks.
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

async function loginMedicoUi(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.evaluate(() => {
    try {
      localStorage.setItem('medicore_auth_branch', 'suc1');
    } catch {
      /* ignore */
    }
  });
  await page.locator(sel.login.email).fill(users.medico.email);
  await page.locator(sel.login.password).fill(users.medico.password);
  await page.locator(sel.login.submit).click();
  await page.waitForURL(/\/app\//, { timeout: 20_000 });
}

async function crearUrgenciaConTriage(): Promise<{
  encounterId: string;
  label: string;
  levelLabel: string;
}> {
  const ctx = await contextoLimpio();
  try {
    const login = await ctx.post('/api/auth/login', {
      data: {
        tenantCode: 'demo',
        userName: users.medico.email,
        password: users.medico.password,
      },
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
    const encBody = (await enc.json()).data;

    const scale = await ctx.get(`/api/branches/${BRANCH_DEMO}/triage-scale`, { headers });
    expect(scale.status(), await scale.text()).toBe(200);
    const scaleBody = (await scale.json()).data;
    const levelCode = scaleBody.levels[0].code as string;
    const levelLabel = scaleBody.levels[0].label as string;

    const triage = await ctx.post(`/api/encounters/${encBody.encounterId}/triage`, {
      headers,
      data: {
        level: levelCode,
        chiefComplaint: 'Dolor torácico atípico E2E print',
        vitals: [
          {
            signCode: 'temperatura',
            value: 36.8,
            unit: 'C',
            state: 'medido',
            source: 'medido',
          },
        ],
      },
    });
    expect(triage.status(), await triage.text()).toBe(200);

    return {
      encounterId: encBody.encounterId as string,
      label: (subject.activeLabel?.operationalLabel as string) ?? '',
      levelLabel,
    };
  } finally {
    await ctx.dispose();
  }
}

test.describe('03 — Triage · impresión UI', () => {
  test.beforeEach(async () => {
    const upUi = await servidorDisponible(entorno.baseURL);
    const upApi = await apiDisponible();
    test.skip(
      !upUi || !upApi,
      `Requiere Vite (${entorno.baseURL}) + API (${api.url}). upUi=${upUi} upApi=${upApi}`,
    );
  });

  test('abre modal de impresión con datos API y escala configurable', async ({ page }) => {
    test.setTimeout(90_000);
    const { encounterId, label, levelLabel } = await crearUrgenciaConTriage();
    expect(label.length).toBeGreaterThan(0);

    await loginMedicoUi(page);
    await page.goto(`/app/triage?encuentro=${encounterId}`);
    await expect(page.getByTestId('page-triage')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('identity-header')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('identity-header')).toContainText(label);

    await expect(page.getByTestId('btn-imprimir-triage')).toBeEnabled({ timeout: 10_000 });
    await page.getByTestId('btn-imprimir-triage').click();

    await expect(page.getByTestId('triage-print-modal')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('triage-print-patient')).toContainText(label);
    await expect(page.getByTestId('triage-print-level')).toContainText(levelLabel, {
      ignoreCase: true,
    });
    await expect(page.getByTestId('triage-print-modal')).toContainText(
      'Dolor torácico atípico E2E print',
    );
    await expect(page.getByTestId('triage-print-imprimir')).toBeVisible();
  });
});
