import { expect, type Page } from '@playwright/test';
import { api } from '../fixtures/api';
import { entorno } from '../fixtures/tenants';
import { sel } from './selectors';

/** Ping al Vite/SPA; usado para skip condicional sin arrancar stack desde el spec. */
export async function servidorDisponible(url: string = entorno.baseURL): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(3_000) });
    return res.ok || res.status === 304;
  } catch {
    return false;
  }
}

/** Ping a `/api/health` del API real. */
export async function apiDisponible(url: string = api.url): Promise<boolean> {
  try {
    const res = await fetch(`${url}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Login UI contra seed demo (sin mocks de sesión).
 * Prefija sucursal `suc1` para roles multi-sucursal.
 */
/** Prefija sucursal para roles multi-sucursal (`suc1` por omisión). */
export async function loginUi(
  page: Page,
  credenciales: { userName: string; password: string; branchId?: string },
) {
  await page.goto('/login');
  const branchId = credenciales.branchId ?? 'suc1';
  await page.evaluate((id) => {
    try {
      localStorage.setItem('medicore_auth_branch', id);
    } catch {
      /* ignore */
    }
  }, branchId);
  await page.locator(sel.login.email).fill(credenciales.userName);
  await page.locator(sel.login.password).fill(credenciales.password);
  await page.locator(sel.login.submit).click();
  await page.waitForURL(/\/app\//, { timeout: 20_000 });
  await expect(page.getByTestId(sel.nav.sidebar)).toBeVisible({ timeout: 10_000 });
}

/** Sidebar inicia colapsado: expandir para ver etiquetas y grupos. */
export async function expandirMenu(page: Page) {
  const toggle = page.getByTestId(sel.nav.toggleCollapse);
  await expect(toggle).toBeVisible();
  const label = await toggle.getAttribute('aria-label');
  if (label?.includes('Expandir')) {
    await toggle.click();
  }
}

/** Abre un grupo del menú (`operacion`, `clinico`, `administracion`, …) si está plegado. */
export async function expandirGrupo(page: Page, groupKey: string) {
  const group = page.getByTestId(`nav-group-${groupKey}`);
  await expect(group).toBeVisible();
  const btn = page.getByTestId(`nav-group-btn-${groupKey}`);
  const expanded = await btn.getAttribute('aria-expanded');
  if (expanded === 'true') {
    return;
  }
  // Sin aria-expanded: si ya hay un hijo visible en el grupo, no togglear.
  const hijoVisible = await group.locator('[data-testid^="nav-item-"]').first().isVisible().catch(() => false);
  if (hijoVisible) {
    return;
  }
  await btn.click();
}
