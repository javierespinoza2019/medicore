import type { BrowserContext, Page } from '@playwright/test';

/**
 * Simulación de partición de red / contingencia.
 * Usa `BrowserContext.setOffline` (Playwright) — navigator.onLine = false.
 * Ver docs/analisis/07-modalidades-de-despliegue.md y 03 (cola / sincronización).
 */

/** Corta la red del contexto. Equipo "offline". */
export async function goOffline(context: BrowserContext): Promise<void> {
  await context.setOffline(true);
}

/** Restaura la red del contexto. */
export async function goOnline(context: BrowserContext): Promise<void> {
  await context.setOffline(false);
}

/** ¿El navegador cree que hay enlace? */
export async function isOnline(page: Page): Promise<boolean> {
  return page.evaluate(() => navigator.onLine);
}

/**
 * Aborta sólo llamadas API dejando la SPA cargada
 * (escenario "Core caído a media captura").
 */
export async function abortApi(page: Page, pattern = '**/api/**'): Promise<void> {
  await page.route(pattern, (route) => route.abort('internetdisconnected'));
}

export async function clearApiAbort(page: Page, pattern = '**/api/**'): Promise<void> {
  await page.unroute(pattern);
}
