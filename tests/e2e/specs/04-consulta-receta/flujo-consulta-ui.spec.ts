import { test, expect } from '@playwright/test';
import {
  api,
  contextoLimpio,
} from '../../fixtures/api';
import { entorno } from '../../fixtures/tenants';
import { sel } from '../../helpers/selectors';
import { users } from '../../data/users';

/**
 * Consulta SOAP + receta en UI (Vite + API real). Sin mocks.
 * Complementa SC-01/SC-02 de `flujo-consulta.spec.ts` (contrato-api).
 * No cierra episodio (SC-04 = otro frente).
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

async function crearConsultaExterna(): Promise<{
  subjectId: string;
  encounterId: string;
  label: string;
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

test.describe('04 — Consulta / receta · UI (Vite + API)', () => {
  test.beforeEach(async () => {
    const upUi = await servidorDisponible(entorno.baseURL);
    const upApi = await apiDisponible();
    test.skip(
      !upUi || !upApi,
      `Requiere Vite (${entorno.baseURL}) + API (${api.url}). upUi=${upUi} upApi=${upApi}`,
    );
  });

  test('abre consulta, captura SOAP (borrador) y lista la nota', async ({ page }) => {
    const { encounterId, label } = await crearConsultaExterna();
    expect(label.length).toBeGreaterThan(0);

    await loginMedicoUi(page);
    await page.goto(`/app/consultas?encuentro=${encounterId}`);
    await expect(page.getByTestId('page-consultas')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('identity-header')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('panel-notas-clinicas')).toBeVisible();
    await expect(page.getByTestId('clinical-notes-panel')).toBeVisible();

    const marker = `SOAP-E2E-${Date.now()}`;
    await page.getByTestId('note-subjetivo').fill(`Paciente refiere malestar leve. ${marker}`);
    await page.getByTestId('note-objetivo').fill('Sin signos inventados; campo capturado explícitamente.');
    await page.getByTestId('note-analisis').fill('Impresión pendiente de evolución.');
    await page.getByTestId('note-plan').fill('Observación y control ambulatorio.');
    await page.getByTestId('note-guardar-borrador').click();

    await expect(page.getByText(marker)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Borrador sin firma|nota\(s\)/i).first()).toBeVisible();
  });

  test('emite receta tras captura alérgica explícita (niega)', async ({ page }) => {
    test.setTimeout(90_000);
    const { encounterId, label } = await crearConsultaExterna();
    expect(label.length).toBeGreaterThan(0);

    await loginMedicoUi(page);
    await page.goto(`/app/consultas?encuentro=${encounterId}`);
    await expect(page.getByTestId('page-consultas')).toBeVisible({ timeout: 15_000 });
    // Sujeto activo + cabecera antes de prescritir (SC-05 / no recetar a ciegas).
    await expect(page.getByTestId('identity-header')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('identity-header')).toContainText(label);
    await expect(page.getByRole('button', { name: /Nueva receta/i })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole('button', { name: /Nueva receta/i }).click();
    await expect(page.getByTestId('receta-inline-creator')).toBeVisible();

    // Captura explícita: no se asume alergia; el usuario elige «niega» y confirma.
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

    await expect(page.getByTestId('receta-inline-creator')).toHaveCount(0, { timeout: 25_000 });
    await expect(page.getByText(/medicamento\(s\)/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
