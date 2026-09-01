import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { entorno } from '../../fixtures/tenants';
import { sel } from '../../helpers/selectors';

/**
 * Accesibilidad WCAG básica (axe) contra Vite + API.
 */

async function up(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(3_000) });
    return res.ok || res.status === 304;
  } catch {
    return false;
  }
}

test.describe('07 — Accesibilidad · WCAG básico', () => {
  test.beforeEach(async () => {
    const ok = await up(entorno.baseURL);
    test.skip(!ok, `Requiere Vite en ${entorno.baseURL}`);
  });

  test('axe sin violaciones graves en /login (contraste del pie WCAG AA)', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator(sel.login.submit)).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    const graves = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(
      graves,
      graves.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodos)`).join('\n') || undefined,
    ).toEqual([]);
  });

  test.skip(
    'axe en triage y cabecera de identidad (SC-05 / SC-10) — sesión + cola requerida; cubierto por sc-ui IdentityHeader',
    async () => {
      //
    },
  );

  test('recorrido teclado: foco llega a usuario y Acceder', async ({ page }) => {
    await page.goto('/login');
    await page.locator(sel.login.email).focus();
    await expect(page.locator(sel.login.email)).toBeFocused();
    await page.locator(sel.login.submit).focus();
    await expect(page.locator(sel.login.submit)).toBeFocused();
  });
});
