import { test, expect } from '@playwright/test';
import { users } from '../../data/users';
import { injectSession } from '../../fixtures/auth';
import { goOffline, goOnline, isOnline } from '../../fixtures/offline';
import { expectNavigatorOffline, expectNavigatorOnline } from '../../helpers/assertions';
import { entorno } from '../../fixtures/tenants';

/**
 * Scaffold: dos estaciones (Equipo1 / Equipo2) con contextos de navegador independientes.
 * Simula partición de red con fixtures/offline (context.setOffline).
 *
 * Hoy (mock): valida que cada contexto puede ir offline/online por separado.
 * Cuando exista Edge / cola por dispositivo (doc 07, SS-08): asertar colas aisladas.
 */

async function servidorDisponible(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(3_000) });
    return res.ok || res.status === 304;
  } catch {
    return false;
  }
}

test.describe('03 — Triage urgencias · dos estaciones offline', () => {
  test('Equipo1 y Equipo2: contextos independientes y setOffline por estación', async ({
    browser,
  }) => {
    const up = await servidorDisponible(entorno.baseURL);
    test.skip(!up, `Servidor no disponible en ${entorno.baseURL}. Arranca docs/frontend.`);

    const equipo1 = await browser.newContext();
    const equipo2 = await browser.newContext();
    const page1 = await equipo1.newPage();
    const page2 = await equipo2.newPage();

    try {
      await injectSession(page1, users.recepcion, 'suc1');
      await injectSession(page2, users.recepcionNorte, 'suc2');

      await page1.goto('/app/triage');
      await page2.goto('/app/urgencias');

      await goOffline(equipo1);
      await expectNavigatorOffline(page1);
      await expectNavigatorOnline(page2);
      expect(await isOnline(page1)).toBe(false);
      expect(await isOnline(page2)).toBe(true);

      await goOffline(equipo2);
      await expectNavigatorOffline(page2);

      await goOnline(equipo1);
      await goOnline(equipo2);
      await expectNavigatorOnline(page1);
      await expectNavigatorOnline(page2);

      // Pendiente backend: capturar triage en ambos offline y verificar colas no compartidas (SS-08).
    } finally {
      await equipo1.close();
      await equipo2.close();
    }
  });

  test.skip(
    'cada estación conserva su cola al reconectar sin duplicar (SS-08 / SC-11)',
    async () => {
      // Requiere IndexedDB de cola de salida + Core
    },
  );
});
