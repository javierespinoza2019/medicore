import { test, expect } from '@playwright/test';
import {
  api,
  autorizacion,
  contextoLimpio,
} from '../../fixtures/api';
import { entorno } from '../../fixtures/tenants';
import { goOffline, goOnline, abortApi, clearApiAbort } from '../../fixtures/offline';
import { sel } from '../../helpers/selectors';
import {
  OUTBOX_DB,
  listarPendingOutbox,
} from '../../utils/indexeddb';

/**
 * SC-19 — Estación con Core caído (chromium + Vite + IndexedDB + sync API).
 *
 * Criterio (mapa §4): fallo de red / Core no bloquea la ruta de ingreso;
 * la captura queda en cola local vía el modal de producto; al recuperar el
 * enlace se sincroniza sin diálogo modal que obligue a esperar.
 *
 * Sin Edge: un solo Core; escritura local → POST /api/sync/commands.
 */

async function servidorDisponible(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(3_000) });
    return res.ok || res.status === 304;
  } catch {
    return false;
  }
}

async function apiDisponible(): Promise<boolean> {
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

async function loginAdminUi(page: import('@playwright/test').Page) {
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
  await expect(page.getByRole('button', { name: /Central/i })).toBeVisible({ timeout: 10_000 });
}

test.describe('03 — Triage urgencias · SC-19 estación offline (Core caído)', () => {
  test.beforeEach(async () => {
    const upUi = await servidorDisponible(entorno.baseURL);
    const upApi = await apiDisponible();
    test.skip(
      !upUi || !upApi,
      `Requiere Vite (${entorno.baseURL}) + API (${api.url}). upUi=${upUi} upApi=${upApi}`,
    );
  });

  test('Core caído: estación sigue en ingreso vía cola local + sync al recuperar (SC-19)', async ({
    page,
    context,
  }) => {
    test.setTimeout(90_000);

    await loginAdminUi(page);
    await page.goto(sel.urgencias.path);
    await expect(page.getByTestId('page-urgencias')).toBeVisible({ timeout: 15_000 });
    // Precarga online: el botón de ingreso existe antes de la contingencia.
    await expect(page.getByTestId('btn-nuevo-ingreso')).toBeVisible();

    // Esperar resolución de sucursal (catálogo o fallback seed) antes de cortar el Core.
    // Evita carrera: listBranches abortado → branchId null → btn-confirmar disabled.
    await page.getByTestId('btn-nuevo-ingreso').click();
    await expect(page.getByTestId('modal-nuevo-ingreso-urgencias')).toBeVisible();
    await expect(page.getByTestId('btn-confirmar-ingreso')).toBeEnabled({ timeout: 15_000 });
    await page.getByRole('button', { name: /Cancelar/i }).click();
    await expect(page.getByTestId('modal-nuevo-ingreso-urgencias')).toHaveCount(0);

    // Core caído a media captura (SPA ya cargada; sucursal ya resuelta).
    await goOffline(context);
    await abortApi(page);

    await page.getByRole('button', { name: /Actualizar/i }).click();
    await expect(page.getByTestId('queue-live-banner')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('queue-live-banner')).toContainText(
      /Sin enlace|caché|conocida|empuje/i,
    );
    await expect(page.getByTestId('indicador-enlace')).toBeVisible({ timeout: 10_000 });

    // No aparece diálogo modal que obligue a esperar al Core.
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(page.getByRole('dialog').filter({ hasText: /esperando|reconect/i })).toHaveCount(
      0,
    );

    // Ruta de producto: modal de ingreso encola subject.create + encounter.open.
    await expect(page.getByTestId('page-urgencias')).toBeVisible();
    await page.getByTestId('btn-nuevo-ingreso').click();
    await expect(page.getByTestId('modal-nuevo-ingreso-urgencias')).toBeVisible();
    await expect(page.getByTestId('btn-confirmar-ingreso')).toBeEnabled();
    await page.getByTestId('btn-confirmar-ingreso').click();
    await expect(page.getByTestId('modal-nuevo-ingreso-urgencias')).toHaveCount(0, {
      timeout: 15_000,
    });
    await expect(page.getByTestId('page-urgencias')).toBeVisible();

    // Captura durable mientras Core sigue caído (antes de goOnline / drenado FE).
    const pendingOffline = await listarPendingOutbox(page);
    const subjectPending = pendingOffline.find((c) => c.commandType === 'subject.create');
    const encounterPending = pendingOffline.find((c) => c.commandType === 'encounter.open');
    expect(subjectPending, JSON.stringify(pendingOffline)).toBeTruthy();
    expect(encounterPending, JSON.stringify(pendingOffline)).toBeTruthy();
    expect(await page.evaluate(() => navigator.onLine)).toBe(false);

    const subjPayload = JSON.parse(subjectPending!.payloadJson) as {
      clientSubjectId?: string;
      asUnidentified?: boolean;
    };
    const encPayload = JSON.parse(encounterPending!.payloadJson) as {
      clientEncounterId?: string;
      subjectId?: string;
      encounterType?: string;
    };
    expect(subjPayload.asUnidentified).toBe(true);
    expect(subjPayload.clientSubjectId).toBeTruthy();
    expect(encPayload.clientEncounterId).toBeTruthy();
    expect(encPayload.encounterType).toBe('urgencias');
    expect(encPayload.subjectId).toBe(subjPayload.clientSubjectId);

    // Recuperar enlace: sync API idempotente (estación puede drenar sola en paralelo).
    await clearApiAbort(page);
    await goOnline(context);

    const apiCtx = await contextoLimpio();
    try {
      const login = await apiCtx.post('/api/auth/login', {
        data: { tenantCode: 'demo', userName: 'admin', password: 'Demo123!' },
      });
      expect(login.status(), await login.text()).toBe(200);
      const headers = autorizacion({
        accessToken: (await login.json()).data.accessToken as string,
        tenantId: '',
        userId: '',
        refresh: '',
      });

      const syncSubj = await apiCtx.post('/api/sync/commands', {
        headers,
        data: {
          idempotencyKey: subjectPending!.idempotencyKey,
          commandType: subjectPending!.commandType,
          payloadJson: subjectPending!.payloadJson,
          occurredAtUtc: subjectPending!.occurredAtUtc,
        },
      });
      expect(syncSubj.status(), await syncSubj.text()).toBe(200);
      const syncBody = await syncSubj.json();
      expect(['accepted', 'duplicate']).toContain(syncBody.data.status);
      const subjectId = syncBody.data.serverEntityId as string;
      expect(subjectId).toBeTruthy();
      expect(subjectId.toLowerCase()).toBe(subjPayload.clientSubjectId!.toLowerCase());

      const syncEnc = await apiCtx.post('/api/sync/commands', {
        headers,
        data: {
          idempotencyKey: encounterPending!.idempotencyKey,
          commandType: encounterPending!.commandType,
          payloadJson: encounterPending!.payloadJson,
          occurredAtUtc: encounterPending!.occurredAtUtc,
        },
      });
      const syncEncBody = await syncEnc.json();
      expect(syncEnc.status(), JSON.stringify(syncEncBody)).toBe(200);
      expect(['accepted', 'duplicate']).toContain(syncEncBody.data.status);
      expect(String(syncEncBody.data.serverEntityId).toLowerCase()).toBe(
        encPayload.clientEncounterId!.toLowerCase(),
      );

      // Reintento idempotente: no bloquea ni duplica.
      const dup = await apiCtx.post('/api/sync/commands', {
        headers,
        data: {
          idempotencyKey: encounterPending!.idempotencyKey,
          commandType: 'encounter.open',
          payloadJson: encounterPending!.payloadJson,
          occurredAtUtc: encounterPending!.occurredAtUtc,
        },
      });
      expect(dup.status()).toBe(200);
      expect((await dup.json()).data.status).toBe('duplicate');
    } finally {
      await apiCtx.dispose();
    }

    await expect(page.getByTestId('page-urgencias')).toBeVisible();
    expect(OUTBOX_DB).toBe('medicore-outbox');
  });
});
