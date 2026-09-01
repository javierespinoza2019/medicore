import { expect, type Page } from '@playwright/test';
import { sel } from './selectors';

/** El formulario de login del prototipo está visible. */
export async function expectLoginScreen(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: /Iniciar Sesion/i })).toBeVisible();
  await expect(page.locator(sel.login.email)).toBeVisible();
  await expect(page.locator(sel.login.password)).toBeVisible();
}

/** Tras login exitoso, la app autenticada responde en /app/*. */
export async function expectAuthenticatedApp(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/app\//);
}

/** Mensaje de error de credenciales en el login. */
export async function expectLoginError(page: Page): Promise<void> {
  await expect(page.locator(sel.login.error)).toBeVisible();
}

/** Aserción genérica de offline (navigator.onLine). */
export async function expectNavigatorOffline(page: Page): Promise<void> {
  await expect.poll(async () => page.evaluate(() => navigator.onLine)).toBe(false);
}

export async function expectNavigatorOnline(page: Page): Promise<void> {
  await expect.poll(async () => page.evaluate(() => navigator.onLine)).toBe(true);
}
