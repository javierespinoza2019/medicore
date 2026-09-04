import { test, expect } from '@playwright/test';
import { api, contextoLimpio } from '../../fixtures/api';
import { entorno } from '../../fixtures/tenants';
import { sel } from '../../helpers/selectors';
import { users } from '../../data/users';

/**
 * Urgencias: receta M8 en UI + SC-04 cierre con Rx pendientes.
 * Vite + API real; sin mocks.
 */

const BRANCH_DEMO = '22222222-2222-2222-2222-222222222222';
const MED_PARACETAMOL = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001';

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

function itemParacetamol() {
  return {
    medicationId: MED_PARACETAMOL,
    dose: { valor: 500, unidad: 'mg', estado: 'medido', origen: 'medido' },
    route: 'oral',
    frequency: { kind: 'every_n_hours', n: 8 },
    durationDays: 5,
    quantity: 15,
    refillsAllowed: 0,
  };
}

async function crearUrgenciaConTriage(): Promise<{
  subjectId: string;
  encounterId: string;
  label: string;
  turnNumber: number;
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
    const levelCode = (await scale.json()).data.levels[0].code as string;

    const triage = await ctx.post(`/api/encounters/${encBody.encounterId}/triage`, {
      headers,
      data: { level: levelCode, vitals: [] },
    });
    expect(triage.status(), await triage.text()).toBe(200);

    return {
      subjectId: subject.subjectId as string,
      encounterId: encBody.encounterId as string,
      label: (subject.activeLabel?.operationalLabel as string) ?? '',
      turnNumber: encBody.turnNumber as number,
    };
  } finally {
    await ctx.dispose();
  }
}

async function crearUrgenciaConRxSinFirmar(): Promise<{
  encounterId: string;
  turnNumber: number;
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
    const subjectId = (await created.json()).data.subjectId as string;

    const enc = await ctx.post('/api/encounters', {
      headers,
      data: { branchId: BRANCH_DEMO, subjectId, encounterType: 'urgencias' },
    });
    expect(enc.status(), await enc.text()).toBe(200);
    const encBody = (await enc.json()).data;

    const scale = await ctx.get(`/api/branches/${BRANCH_DEMO}/triage-scale`, { headers });
    const levelCode = (await scale.json()).data.levels[0].code as string;
    await ctx.post(`/api/encounters/${encBody.encounterId}/triage`, {
      headers,
      data: { level: levelCode, vitals: [] },
    });

    const setStatus = await ctx.put(`/api/subjects/${subjectId}/allergy-status`, {
      headers,
      data: { status: 'no_interrogado' },
    });
    expect(setStatus.status(), await setStatus.text()).toBe(200);
    const captureEventId = (await setStatus.json()).data.statusEventId as string;

    const rx = await ctx.post(`/api/encounters/${encBody.encounterId}/prescriptions`, {
      headers,
      data: {
        allergyStatusCaptureEventId: captureEventId,
        items: [itemParacetamol()],
      },
    });
    expect(rx.status(), await rx.text()).toBe(200);
    expect((await rx.json()).data.signedAtUtc).toBeFalsy();

    return {
      encounterId: encBody.encounterId as string,
      turnNumber: encBody.turnNumber as number,
    };
  } finally {
    await ctx.dispose();
  }
}

test.describe.configure({ mode: 'serial' });

test.describe('03 — Urgencias · receta y SC-04 UI', () => {
  test.beforeEach(async () => {
    const upUi = await servidorDisponible(entorno.baseURL);
    const upApi = await apiDisponible();
    test.skip(
      !upUi || !upApi,
      `Requiere Vite (${entorno.baseURL}) + API (${api.url}). upUi=${upUi} upApi=${upApi}`,
    );
  });

  test('emite receta de urgencias tras captura alérgica', async ({ page }) => {
    test.setTimeout(90_000);
    const { encounterId, label } = await crearUrgenciaConTriage();
    expect(label.length).toBeGreaterThan(0);

    await loginMedicoUi(page);
    await page.goto(`/app/urgencias?encuentro=${encounterId}`);
    await expect(page.getByTestId('page-urgencias')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('panel-atencion-urgencia')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('identity-header')).toBeVisible();
    await expect(page.getByTestId('identity-header')).toContainText(label);

    await page.getByTestId('btn-nueva-receta-urgencia').click();
    await expect(page.getByTestId('urgencia-receta-creator')).toBeVisible();

    await page.getByRole('button', { name: /Niega alergias conocidas/i }).click();
    await page.getByTestId('receta-confirmar-alergia').click();
    await expect(page.getByText(/Estado alérgico capturado/i)).toBeVisible({ timeout: 15_000 });

    await page.getByTestId('receta-buscar-med').fill('Paracetamol');
    await expect(page.getByRole('button', { name: /Paracetamol/i }).first()).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole('button', { name: /Paracetamol/i }).first().click();
    await page.getByRole('button', { name: /Agregar a la receta/i }).click();
    await expect(page.getByTestId('receta-crear-firmar')).toBeEnabled();
    await page.getByTestId('receta-crear-firmar').click();

    await expect(page.getByTestId('urgencia-receta-creator')).toHaveCount(0, { timeout: 25_000 });
    await expect(page.getByTestId('encounter-prescription-list')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/medicamento\(s\)/i).first()).toBeVisible();
  });

  test('SC-04 UI: bloquea cierre con Rx sin firmar y permite override', async ({ page }) => {
    test.setTimeout(90_000);
    const { encounterId } = await crearUrgenciaConRxSinFirmar();

    await loginMedicoUi(page);
    await page.goto(`/app/urgencias?encuentro=${encounterId}`);
    await expect(page.getByTestId('panel-atencion-urgencia')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('sc04-pending-warning')).toBeVisible({ timeout: 10_000 });

    await page.locator('select').filter({ has: page.locator('option[value="alta_domicilio"]') }).selectOption('alta_domicilio');
    await page.getByRole('textbox', { name: /Justificación del cierre/i }).fill(
      'SC-04 UI: egreso con receta borrador pendiente de firma.',
    );
    await page.getByTestId('btn-cerrar-episodio').click();

    await expect(page.getByTestId('urgencia-panel-error')).toContainText(/receta|firmar|pendiente|SC-04/i, {
      timeout: 10_000,
    });
    await expect(page.getByTestId('sc04-override-reason')).toBeVisible();

    const override =
      'Paciente egresa; receta queda borrador para firma en turno siguiente (SC-04 UI E2E)';
    await page.getByTestId('sc04-override-reason').fill(override);
    await page.getByTestId('btn-forzar-cierre-sc04').click();

    await expect(page.getByTestId('encounter-state-cerrado')).toBeVisible({ timeout: 15_000 });
  });
});
