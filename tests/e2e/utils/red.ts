import type { BrowserContext, Page } from '@playwright/test';

/**
 * Control de red. Dos mecanismos distintos y no intercambiables:
 *
 *  - `context.setOffline(true)` emula el estado de red del contexto completo.
 *    Verificado en la documentación oficial (browserContext.setOffline).
 *  - `page.route(patrón, r => r.abort(código))` aborta peticiones concretas
 *    dejando el resto viva. Es lo que se necesita para simular "el backend no
 *    responde pero la aplicación sigue cargada".
 */

/** Corta la red del contexto completo. `navigator.onLine` pasa a `false`. */
export async function desconectar(context: BrowserContext): Promise<void> {
  await context.setOffline(true);
}

export async function reconectar(context: BrowserContext): Promise<void> {
  await context.setOffline(false);
}

/**
 * Aborta sólo las llamadas al backend, dejando la aplicación cargada.
 * Es el escenario "el enlace se cae a media captura": el documento ya está en
 * el navegador y lo que falla es la escritura.
 */
export async function abortarBackend(page: Page, patron = '**/api/**'): Promise<void> {
  await page.route(patron, (route) => route.abort('internetdisconnected'));
}

/** Responde 500 a las llamadas al backend sin cortar la red (SC-19). */
export async function backendCon500(page: Page, patron = '**/api/**'): Promise<void> {
  await page.route(patron, (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"simulado"}' }),
  );
}

/** Inyecta latencia extrema sin cortar el enlace (SC-19). */
export async function backendLento(page: Page, ms: number, patron = '**/api/**'): Promise<void> {
  await page.route(patron, async (route) => {
    await new Promise((r) => setTimeout(r, ms));
    await route.continue();
  });
}

export async function liberarRutas(page: Page, patron = '**/api/**'): Promise<void> {
  await page.unroute(patron);
}

/** Lo que el navegador cree del enlace. Sirve para aserciones observables. */
export async function estaEnLinea(page: Page): Promise<boolean> {
  return page.evaluate(() => navigator.onLine);
}
