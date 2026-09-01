import type { Page } from '@playwright/test';
import { sel } from '../helpers/selectors';
import type { TestUser } from '../data/users';
import { entorno } from './tenants';

/**
 * Autenticación contra el prototipo (login por formulario) o inyección de sesión.
 * En mock: localStorage `medicore_auth_user` / `medicore_auth_branch` (useAuth.tsx).
 */

export async function loginViaUi(page: Page, user: TestUser): Promise<void> {
  await page.goto('/login');
  await page.locator(sel.login.email).fill(user.email);
  await page.locator(sel.login.password).fill(user.password);
  await page.locator(sel.login.submit).click();
  await page.waitForURL(/\/app\//, { timeout: 15_000 });
}

/**
 * Inyecta sesión sin pasar por el formulario (más rápido en scaffolds).
 * Solo válido mientras el prototipo lea esas claves de localStorage.
 */
export async function injectSession(page: Page, user: TestUser, sucursalId?: string): Promise<void> {
  const branch = sucursalId ?? user.sucursalIds[0] ?? null;
  const userJson = JSON.stringify(user.toAuthPayload());
  // addInitScript: AuthProvider solo lee localStorage en el mount inicial.
  await page.addInitScript(
    ({ payload, branchId }) => {
      localStorage.setItem('medicore_auth_user', payload);
      if (branchId) localStorage.setItem('medicore_auth_branch', branchId);
    },
    { payload: userJson, branchId: branch },
  );
  await page.goto('/app/dashboard');
}

export async function logout(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('medicore_auth_user');
    localStorage.removeItem('medicore_auth_branch');
  });
  await page.goto('/login');
}

export { entorno };
