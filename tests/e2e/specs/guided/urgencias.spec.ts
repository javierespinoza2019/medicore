import { test, expect } from '@playwright/test';
import { api, contextoLimpio } from '../../fixtures/api';
import { isGuidedEnabled } from '../../fixtures/guided-overlay';
import { runGuidedPaso } from '../../fixtures/guided-runner';
import { entorno } from '../../fixtures/tenants';
import { apiDisponible, loginUi, servidorDisponible } from '../../helpers/auth-ui';
import { sel } from '../../helpers/selectors';
import { CICLO_URG, PASOS_URG } from '../../guided/ciclos/urgencias';

/**
 * Ciclo guiado QA — Urgencias (CP-MC-URG 1/6).
 * MEDICORE_E2E_GUIDED=1 · tools/run-guided-qa.ps1 -Cycle urg
 */

const BRANCH_DEMO = '22222222-2222-2222-2222-222222222222';

async function asegurarEstacionAprobada(page: import('@playwright/test').Page) {
  const devicePublicId = await page.evaluate(() => {
    const key = 'medicore_device_public_id';
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  });
  const ctx = await contextoLimpio();
  try {
    const login = await ctx.post('/api/auth/login', {
      data: { tenantCode: 'demo', userName: 'admin', password: 'Demo123!' },
    });
    expect(login.status()).toBe(200);
    const token = (await login.json()).data.accessToken as string;
    const headers = { Authorization: `Bearer ${token}` };
    await ctx.post('/api/devices/register', {
      headers,
      data: { devicePublicId, displayName: 'E2E guided URG' },
    });
    const approve = await ctx.post(`/api/devices/${encodeURIComponent(devicePublicId)}/approve`, {
      headers,
      data: { allowsOfflineQueue: true },
    });
    expect(approve.status(), await approve.text()).toBe(200);
  } finally {
    await ctx.dispose();
  }
  await page.reload();
  await page.waitForURL(/\/app\//, { timeout: 20_000 });
}

async function crearUrgenciaApi(): Promise<{
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

test.describe.configure({ mode: 'serial' });

test.describe('Guided QA · CP-MC-URG urgencias', () => {
  test.beforeEach(async () => {
    test.skip(!isGuidedEnabled(), 'Activa con MEDICORE_E2E_GUIDED=1 (tools/run-guided-qa.ps1 -Cycle urg)');
    const upUi = await servidorDisponible(entorno.baseURL);
    const upApi = await apiDisponible(api.url);
    test.skip(!upUi || !upApi, `Requiere Vite (${entorno.baseURL}) + API (${api.url})`);
  });

  test('ciclo URG 1/6 — ingreso, triage, monitor y sala', async ({ page }) => {
    test.setTimeout(180_000);

    await runGuidedPaso(page, CICLO_URG, PASOS_URG[0]!, async () => {
      // Admin: misma estacion aprobable que sc-ui; evita "Sin enlace" sin device approve.
      await loginUi(page, { userName: 'admin', password: 'Demo123!' });
      await asegurarEstacionAprobada(page);
      if (await page.getByRole('heading', { name: /Iniciar Ses/i }).isVisible().catch(() => false)) {
        await loginUi(page, { userName: 'admin', password: 'Demo123!' });
      }
      await expect(page).toHaveURL(/\/app\//);
      return 'Admin + estacion aprobada (cola en vivo)';
    });

    await runGuidedPaso(page, CICLO_URG, PASOS_URG[1]!, async () => {
      await page.goto(sel.urgencias.path);
      await expect(page.getByTestId('page-urgencias')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId('btn-nuevo-ingreso')).toBeVisible();
      await page.getByTestId('btn-nuevo-ingreso').click();
      await expect(page.getByTestId('modal-nuevo-ingreso-urgencias')).toBeVisible();
      await expect(page.getByTestId('btn-confirmar-ingreso')).toBeEnabled({ timeout: 15_000 });
      await page.getByTestId('btn-confirmar-ingreso').click();
      await expect(page.getByTestId('modal-nuevo-ingreso-urgencias')).toHaveCount(0, {
        timeout: 20_000,
      });
      return 'Ingreso UI confirmado sin CURP';
    });

    const urg = await crearUrgenciaApi();
    expect(urg.label.length).toBeGreaterThan(0);

    await runGuidedPaso(page, CICLO_URG, PASOS_URG[2]!, async () => {
      // Misma ruta que sc-rx / urgencias-receta-ui: query + espera (getEncounter fallback).
      // No click inmediato en fila: si ?encuentro= ya seleccionó, el toggle deselecciona.
      await page.goto(`/app/urgencias?encuentro=${urg.encounterId}`);
      await expect(page.getByTestId('page-urgencias')).toBeVisible({ timeout: 15_000 });
      const panel = page.getByTestId('panel-atencion-urgencia');
      const opened = await panel.isVisible().catch(() => false)
        ? true
        : await panel.waitFor({ state: 'visible', timeout: 20_000 }).then(() => true).catch(() => false);
      if (!opened) {
        await page.goto(sel.urgencias.path);
        await expect(page.getByTestId('page-urgencias')).toBeVisible({ timeout: 15_000 });
        await page.getByTestId('urgencias-buscar-cola').fill(urg.label);
        for (let i = 0; i < 3; i++) {
          await page.getByRole('button', { name: /^Actualizar$/i }).click();
          const hit = page.getByTestId(/^fila-encuentro-/).filter({ hasText: urg.label }).first();
          if (await hit.isVisible().catch(() => false)) break;
          await page.waitForTimeout(1_500);
        }
        const row = page.getByTestId(/^fila-encuentro-/).filter({ hasText: urg.label }).first();
        await expect(row).toBeVisible({ timeout: 20_000 });
        await row.click();
      }
      await expect(panel).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId('identity-header')).toBeVisible({ timeout: 25_000 });
      await expect(page.getByTestId('identity-header')).toContainText(urg.label);
      return `SC-05: panel con ${urg.label}`;
    });

    await runGuidedPaso(page, CICLO_URG, PASOS_URG[3]!, async () => {
      await page.goto(sel.triage.path);
      await expect(page.getByTestId('page-triage')).toBeVisible({ timeout: 15_000 });
      await page.getByTestId('triage-buscar-cola').fill(urg.label);
      for (let i = 0; i < 3; i++) {
        await page.getByRole('button', { name: /Actualizar cola/i }).click();
        const hit = page.locator('section ul li button').filter({ hasText: urg.label }).first();
        if (await hit.isVisible().catch(() => false)) break;
        await new Promise((r) => setTimeout(r, 1_500));
      }
      const row = page.locator('section ul li button').filter({ hasText: urg.label }).first();
      await expect(row).toBeVisible({ timeout: 20_000 });
      await row.click();

      const levelButtons = page
        .locator('fieldset')
        .filter({ hasText: /Nivel de triage/i })
        .locator('button');
      await expect(levelButtons.first()).toBeVisible({ timeout: 10_000 });
      expect(await levelButtons.count()).toBeGreaterThan(1);
      await expect(page.locator('fieldset button i[class*="ri-"]').first()).toBeVisible();
      await expect(levelButtons.nth(1)).toContainText(/\S+/);

      const tempInput = page.locator('label').filter({ hasText: /Temperatura/i }).locator('input');
      await expect(tempInput).toBeVisible();
      await tempInput.fill('41.5');
      await expect(page.getByText(/Fuera de rango/i).first()).toBeVisible();
      await tempInput.fill('');
      await expect(page.getByText(/Fuera de rango/i)).toHaveCount(0);
      return 'SC-10 niveles + SC-08 vital extremo';
    });

    await runGuidedPaso(page, CICLO_URG, PASOS_URG[4]!, async () => {
      await page.goto('/app/monitor-turnos');
      await expect(page.getByTestId('page-monitor-turnos')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(/sin datos personales|#21|solo n[uú]mero/i).first()).toBeVisible();
      const cards = page.locator('[data-testid^="monitor-turno-"]');
      const n = await cards.count();
      for (let i = 0; i < Math.min(n, 4); i++) {
        const text = (await cards.nth(i).innerText()).toLowerCase();
        expect(text).toMatch(/turno\s*\d+/);
        expect(text).not.toMatch(/\bcurp\b/);
        expect(text).not.toContain('@');
      }
      return n > 0 ? `${n} tarjeta(s) sin PHI (#21)` : 'Monitor cargo (sin tarjetas)';
    });

    await runGuidedPaso(page, CICLO_URG, PASOS_URG[5]!, async () => {
      await page.goto('/app/sala-espera');
      const root = page.getByTestId('page-sala-espera');
      await expect(root).toBeVisible({ timeout: 15_000 });
      await expect(root.getByText(/prototipo Readdy/i)).toBeVisible();
      await expect(root.getByText(/Pacientes en sala \(urgencias\)/i)).toBeVisible();
      return 'Sala: honestidad urgencias OK';
    });
  });
});
