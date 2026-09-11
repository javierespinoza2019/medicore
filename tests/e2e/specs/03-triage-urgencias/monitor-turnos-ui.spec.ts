import { test, expect } from '@playwright/test';
import {
  api,
  autorizacion,
  contextoLimpio,
} from '../../fixtures/api';
import { entorno } from '../../fixtures/tenants';
import { sel } from '../../helpers/selectors';

/**
 * Monitor de turnos — doc 06 #21: sólo número; sin nombre/PHI en DOM.
 * La UI muestra como máximo 4 turnos (prioridad de cola); no exige el último alta.
 */

const BRANCH_DEMO = '22222222-2222-2222-2222-222222222222';

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
  await page.evaluate(() => {
    try {
      localStorage.setItem('medicore_auth_branch', 'suc1');
    } catch {
      /* ignore */
    }
  });
  await page.locator(sel.login.email).fill('admin');
  await page.locator(sel.login.password).fill('Demo123!');
  await page.locator(sel.login.submit).click();
  await page.waitForURL(/\/app\//, { timeout: 20_000 });
}

/** Garantiza al menos un episodio de urgencias en la cola (BD compartida). */
async function asegurarUrgenciaEnCola(): Promise<void> {
  const ctx = await contextoLimpio();
  try {
    const login = await ctx.post('/api/auth/login', {
      data: { tenantCode: 'demo', userName: 'admin', password: 'Demo123!' },
    });
    expect(login.status()).toBe(200);
    const headers = autorizacion({
      accessToken: (await login.json()).data.accessToken,
      tenantId: '',
      userId: '',
      refresh: '',
    });
    const subj = await ctx.post('/api/subjects', {
      headers,
      data: { branchId: BRANCH_DEMO },
    });
    expect(subj.status()).toBe(200);
    const subjectId = (await subj.json()).data.subjectId as string;
    const enc = await ctx.post('/api/encounters', {
      headers,
      data: {
        branchId: BRANCH_DEMO,
        subjectId,
        encounterType: 'urgencias',
      },
    });
    expect(enc.status(), await enc.text()).toBe(200);
  } finally {
    await ctx.dispose();
  }
}

test.describe('03 — Monitor de turnos · UI (#21)', () => {
  test.beforeEach(async () => {
    test.skip(!(await viteOk()) || !(await apiOk()), 'Requiere Vite + API');
  });

  test('muestra turnos solo por número; sin nombre ni CURP en pantalla', async ({ page }) => {
    await asegurarUrgenciaEnCola();
    await loginAdmin(page);
    await page.goto('/app/monitor-turnos');

    await expect(page.getByTestId('page-monitor-turnos')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('monitor-clock')).toBeVisible();
    await expect(page.getByText(/sin datos personales|#21|solo n[uú]mero/i).first()).toBeVisible();

    await page.getByRole('button', { name: /Actualizar/i }).click();

    const cards = page.locator('[data-testid^="monitor-turno-"]');
    await expect(cards.first()).toBeVisible({ timeout: 20_000 });
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(4);

    for (let i = 0; i < count; i++) {
      const text = (await cards.nth(i).innerText()).toLowerCase();
      expect(text).toMatch(/turno\s*\d+/);
      expect(text).not.toMatch(/\bcurp\b/);
      expect(text).not.toContain('@');
      expect(text).not.toMatch(/\b[a-z]{4}\d{6}[hm]\w{5}\d{2}\b/i);
    }
  });
});
