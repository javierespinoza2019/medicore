import { test, expect } from '@playwright/test';
import { api, contextoLimpio } from '../../fixtures/api';
import { isGuidedEnabled } from '../../fixtures/guided-overlay';
import { runGuidedPaso } from '../../fixtures/guided-runner';
import { entorno } from '../../fixtures/tenants';
import { apiDisponible, servidorDisponible } from '../../helpers/auth-ui';
import { sel } from '../../helpers/selectors';
import { users } from '../../data/users';
import { CICLO_SC_RX, PASOS_SC_RX } from '../../guided/ciclos/sc-rx';

/**
 * Ciclo guiado QA — Seguridad clinica Rx (CP-MC-SC-RX 1/6).
 * MEDICORE_E2E_GUIDED=1 · tools/run-guided-qa.ps1 -Cycle sc-rx
 */

const BRANCH_DEMO = '22222222-2222-2222-2222-222222222222';
const MED_PARACETAMOL = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001';

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

async function apiHeaders() {
  const ctx = await contextoLimpio();
  const login = await ctx.post('/api/auth/login', {
    data: {
      tenantCode: 'demo',
      userName: users.medico.email,
      password: users.medico.password,
    },
  });
  expect(login.status(), await login.text()).toBe(200);
  const token = (await login.json()).data.accessToken as string;
  return {
    ctx,
    headers: { Authorization: `Bearer ${token}` } as Record<string, string>,
  };
}

async function crearConsultaExterna(): Promise<{
  subjectId: string;
  encounterId: string;
  label: string;
}> {
  const { ctx, headers } = await apiHeaders();
  try {
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

async function crearConsultaConAlergiaParacetamol(): Promise<string> {
  const { ctx, headers } = await apiHeaders();
  try {
    const created = await ctx.post('/api/subjects', {
      headers,
      data: { branchId: BRANCH_DEMO },
    });
    const subjectId = (await created.json()).data.subjectId as string;

    await ctx.put(`/api/subjects/${subjectId}/allergy-status`, {
      headers,
      data: { status: 'refiere' },
    });
    await ctx.post(`/api/subjects/${subjectId}/allergies`, {
      headers,
      data: { substance: 'Paracetamol', reactionType: 'alergia', severity: 'moderada' },
    });

    const enc = await ctx.post('/api/encounters', {
      headers,
      data: { branchId: BRANCH_DEMO, subjectId, encounterType: 'consulta_externa' },
    });
    return (await enc.json()).data.encounterId as string;
  } finally {
    await ctx.dispose();
  }
}

async function crearUrgenciaConTriage(): Promise<{
  encounterId: string;
  label: string;
}> {
  const { ctx, headers } = await apiHeaders();
  try {
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
      encounterId: encBody.encounterId as string,
      label: (subject.activeLabel?.operationalLabel as string) ?? '',
    };
  } finally {
    await ctx.dispose();
  }
}

async function crearUrgenciaConRxSinFirmar(): Promise<string> {
  const { ctx, headers } = await apiHeaders();
  try {
    const created = await ctx.post('/api/subjects', {
      headers,
      data: { branchId: BRANCH_DEMO },
    });
    const subjectId = (await created.json()).data.subjectId as string;

    const enc = await ctx.post('/api/encounters', {
      headers,
      data: { branchId: BRANCH_DEMO, subjectId, encounterType: 'urgencias' },
    });
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
        items: [
          {
            medicationId: MED_PARACETAMOL,
            dose: { valor: 500, unidad: 'mg', estado: 'medido', origen: 'medido' },
            route: 'oral',
            frequency: { kind: 'every_n_hours', n: 8 },
            durationDays: 5,
            quantity: 15,
            refillsAllowed: 0,
          },
        ],
      },
    });
    expect(rx.status(), await rx.text()).toBe(200);
    expect((await rx.json()).data.signedAtUtc).toBeFalsy();
    return encBody.encounterId as string;
  } finally {
    await ctx.dispose();
  }
}

test.describe.configure({ mode: 'serial' });

test.describe('Guided QA · CP-MC-SC-RX seguridad clinica', () => {
  test.beforeEach(async () => {
    test.skip(!isGuidedEnabled(), 'Activa con MEDICORE_E2E_GUIDED=1 (tools/run-guided-qa.ps1 -Cycle sc-rx)');
    const upUi = await servidorDisponible(entorno.baseURL);
    const upApi = await apiDisponible(api.url);
    test.skip(!upUi || !upApi, `Requiere Vite (${entorno.baseURL}) + API (${api.url})`);
  });

  test('ciclo SC-RX 1/6 — alergias, receta y cierre seguro', async ({ page }) => {
    test.setTimeout(240_000);

    await runGuidedPaso(page, CICLO_SC_RX, PASOS_SC_RX[0]!, async () => {
      await loginMedicoUi(page);
      await expect(page).toHaveURL(/\/app\//);
      return 'Medico autenticado en /app/';
    });

    const consulta = await crearConsultaExterna();
    expect(consulta.label.length).toBeGreaterThan(0);

    await runGuidedPaso(page, CICLO_SC_RX, PASOS_SC_RX[1]!, async () => {
      await page.goto(`/app/consultas?encuentro=${consulta.encounterId}`);
      await expect(page.getByTestId('page-consultas')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId('identity-header')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId('identity-header')).toContainText(consulta.label);
      await expect(page.getByRole('button', { name: /Nueva receta/i })).toBeVisible();
      return `SC-05: cabecera con ${consulta.label}`;
    });

    await runGuidedPaso(page, CICLO_SC_RX, PASOS_SC_RX[2]!, async () => {
      await page.getByRole('button', { name: /Nueva receta/i }).click();
      await expect(page.getByTestId('receta-inline-creator')).toBeVisible();
      await page.getByRole('button', { name: /Niega alergias conocidas/i }).click();
      await page.getByTestId('receta-confirmar-alergia').click();
      await expect(page.getByText(/Estado alergico capturado|Estado alérgico capturado/i)).toBeVisible({
        timeout: 15_000,
      });
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
      return 'Rx emitida tras captura alergica (niega)';
    });

    const encSc02 = await crearConsultaConAlergiaParacetamol();

    await runGuidedPaso(page, CICLO_SC_RX, PASOS_SC_RX[3]!, async () => {
      await page.goto(`/app/consultas?encuentro=${encSc02}`);
      await expect(page.getByTestId('page-consultas')).toBeVisible({ timeout: 15_000 });
      await page.getByRole('button', { name: /Nueva receta/i }).click();
      await page.getByRole('button', { name: /Refiere alergias/i }).click();
      await page.getByTestId('receta-confirmar-alergia').click();
      await expect(page.getByText(/Estado alergico capturado|Estado alérgico capturado/i)).toBeVisible({
        timeout: 15_000,
      });
      await page.getByTestId('receta-buscar-med').fill('Paracetamol');
      await page.getByRole('button', { name: /Paracetamol/i }).first().click();
      await page.getByRole('button', { name: /Agregar a la receta/i }).click();
      await expect(page.getByTestId('receta-justificacion-sc02')).toBeVisible();
      await page.getByTestId('receta-justificacion-sc02').fill('Justificacion sintetica CP-MC-SC-RX-04');
      await expect(page.getByTestId('receta-crear-firmar')).toBeEnabled();
      await page.getByTestId('receta-crear-firmar').click();
      await expect(page.getByTestId('receta-inline-creator')).toHaveCount(0, { timeout: 25_000 });
      await expect(page.getByTestId('encounter-prescription-list')).toBeVisible();
      return 'SC-02: justificacion exigida y Rx emitida';
    });

    const urg = await crearUrgenciaConTriage();
    expect(urg.label.length).toBeGreaterThan(0);

    await runGuidedPaso(page, CICLO_SC_RX, PASOS_SC_RX[4]!, async () => {
      await page.goto(`/app/urgencias?encuentro=${urg.encounterId}`);
      await expect(page.getByTestId('page-urgencias')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId('panel-atencion-urgencia')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId('identity-header')).toContainText(urg.label);
      await page.getByTestId('btn-nueva-receta-urgencia').click();
      await expect(page.getByTestId('urgencia-receta-creator')).toBeVisible();
      await page.getByRole('button', { name: /Niega alergias conocidas/i }).click();
      await page.getByTestId('receta-confirmar-alergia').click();
      await expect(page.getByText(/Estado alergico capturado|Estado alérgico capturado/i)).toBeVisible({
        timeout: 15_000,
      });
      await page.getByTestId('receta-buscar-med').fill('Paracetamol');
      await page.getByRole('button', { name: /Paracetamol/i }).first().click();
      await page.getByRole('button', { name: /Agregar a la receta/i }).click();
      await page.getByTestId('receta-crear-firmar').click();
      await expect(page.getByTestId('urgencia-receta-creator')).toHaveCount(0, { timeout: 25_000 });
      await expect(page.getByTestId('encounter-prescription-list')).toBeVisible({ timeout: 10_000 });
      return 'Urgencias: Rx tras captura alergica';
    });

    const encSc04 = await crearUrgenciaConRxSinFirmar();

    await runGuidedPaso(page, CICLO_SC_RX, PASOS_SC_RX[5]!, async () => {
      await page.goto(`/app/urgencias?encuentro=${encSc04}`);
      await expect(page.getByTestId('panel-atencion-urgencia')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId('sc04-pending-warning')).toBeVisible({ timeout: 10_000 });
      await page
        .locator('select')
        .filter({ has: page.locator('option[value="alta_domicilio"]') })
        .selectOption('alta_domicilio');
      await page.getByRole('textbox', { name: /Justificacion del cierre|Justificación del cierre/i }).fill(
        'CP-MC-SC-RX-06: intento de egreso con Rx borrador.',
      );
      await page.getByTestId('btn-cerrar-episodio').click();
      await expect(page.getByTestId('urgencia-panel-error')).toContainText(
        /receta|firmar|pendiente|SC-04/i,
        { timeout: 10_000 },
      );
      await expect(page.getByTestId('sc04-override-reason')).toBeVisible();
      await page
        .getByTestId('sc04-override-reason')
        .fill('Paciente egresa; Rx borrador para firma en turno siguiente (CP-MC-SC-RX-06)');
      await page.getByTestId('btn-forzar-cierre-sc04').click();
      await expect(page.getByTestId('encounter-state-cerrado')).toBeVisible({ timeout: 15_000 });
      return 'SC-04: bloqueo + override con motivo';
    });
  });
});
