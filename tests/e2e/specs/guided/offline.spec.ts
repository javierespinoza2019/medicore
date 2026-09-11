import { test, expect } from '@playwright/test';
import { api, autorizacion, contextoLimpio } from '../../fixtures/api';
import { isGuidedEnabled } from '../../fixtures/guided-overlay';
import { runGuidedPaso } from '../../fixtures/guided-runner';
import { abortApi, clearApiAbort, goOffline, goOnline } from '../../fixtures/offline';
import { entorno } from '../../fixtures/tenants';
import { apiDisponible, loginUi, servidorDisponible } from '../../helpers/auth-ui';
import { sel } from '../../helpers/selectors';
import { CICLO_OFF, PASOS_OFF } from '../../guided/ciclos/offline';
import { OUTBOX_DB, listarPendingOutbox, type OutboxCommandRow } from '../../utils/indexeddb';

/**
 * Ciclo guiado QA — Offline (CP-MC-OFF 1/6).
 * MEDICORE_E2E_GUIDED=1 · tools/run-guided-qa.ps1 -Cycle off
 * Veredicto = SC-19 (estacion + cola local + sync); overlay solo narra.
 */

async function asegurarEstacionConColaOffline(page: import('@playwright/test').Page) {
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
      data: { devicePublicId, displayName: 'E2E guided OFF' },
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
  if (
    page.url().includes('/login') ||
    (await page.getByRole('heading', { name: /Iniciar Ses/i }).isVisible().catch(() => false))
  ) {
    await loginUi(page, { userName: 'admin', password: 'Demo123!' });
  } else {
    await page.waitForURL(/\/app\//, { timeout: 20_000 });
  }
}

test.describe.configure({ mode: 'serial' });

test.describe('Guided QA · CP-MC-OFF offline', () => {
  test.beforeEach(async () => {
    test.skip(!isGuidedEnabled(), 'Activa con MEDICORE_E2E_GUIDED=1 (tools/run-guided-qa.ps1 -Cycle off)');
    const upUi = await servidorDisponible(entorno.baseURL);
    const upApi = await apiDisponible(api.url);
    test.skip(!upUi || !upApi, `Requiere Vite (${entorno.baseURL}) + API (${api.url})`);
  });

  test('ciclo OFF 1/6 — SC-19 estacion, cola local y sync', async ({ page, context }) => {
    test.setTimeout(180_000);

    let subjectPending: OutboxCommandRow | undefined;
    let encounterPending: OutboxCommandRow | undefined;

    await runGuidedPaso(page, CICLO_OFF, PASOS_OFF[0]!, async () => {
      await loginUi(page, { userName: 'admin', password: 'Demo123!' });
      await asegurarEstacionConColaOffline(page);
      await expect(page).toHaveURL(/\/app\//);
      return 'Admin + estacion con allowsOfflineQueue';
    });

    await runGuidedPaso(page, CICLO_OFF, PASOS_OFF[1]!, async () => {
      await page.goto(sel.urgencias.path);
      if (await page.getByRole('heading', { name: /Iniciar Ses/i }).isVisible().catch(() => false)) {
        await loginUi(page, { userName: 'admin', password: 'Demo123!' });
        await page.goto(sel.urgencias.path);
      }
      await expect(page.getByTestId('page-urgencias')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId('btn-nuevo-ingreso')).toBeVisible({ timeout: 15_000 });
      await page.getByTestId('btn-nuevo-ingreso').click();
      await expect(page.getByTestId('modal-nuevo-ingreso-urgencias')).toBeVisible();
      await expect(page.getByTestId('btn-confirmar-ingreso')).toBeEnabled({ timeout: 15_000 });
      await page.getByRole('button', { name: /Cancelar/i }).click();
      await expect(page.getByTestId('modal-nuevo-ingreso-urgencias')).toHaveCount(0);
      return 'Sucursal resuelta; modal ingreso listo (online)';
    });

    await runGuidedPaso(page, CICLO_OFF, PASOS_OFF[2]!, async () => {
      await goOffline(context);
      await abortApi(page);
      await page.getByRole('button', { name: /Actualizar/i }).click();
      await expect(page.getByTestId('queue-live-banner')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByTestId('queue-live-banner')).toContainText(
        /Sin enlace|caché|conocida|empuje/i,
      );
      await expect(page.getByTestId('indicador-enlace')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('alertdialog')).toHaveCount(0);
      await expect(page.getByRole('dialog').filter({ hasText: /esperando|reconect/i })).toHaveCount(
        0,
      );
      return 'SC-19: contingencia visible sin modal bloqueante';
    });

    await runGuidedPaso(page, CICLO_OFF, PASOS_OFF[3]!, async () => {
      await expect(page.getByTestId('page-urgencias')).toBeVisible();
      await page.getByTestId('btn-nuevo-ingreso').click();
      await expect(page.getByTestId('modal-nuevo-ingreso-urgencias')).toBeVisible();
      await expect(page.getByTestId('btn-confirmar-ingreso')).toBeEnabled();
      await page.getByTestId('btn-confirmar-ingreso').click();
      await expect(page.getByTestId('modal-nuevo-ingreso-urgencias')).toHaveCount(0, {
        timeout: 15_000,
      });

      const pendingOffline = await listarPendingOutbox(page);
      subjectPending = pendingOffline.find((c) => c.commandType === 'subject.create');
      encounterPending = pendingOffline.find((c) => c.commandType === 'encounter.open');
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
      return `Outbox: subject + encounter (${OUTBOX_DB})`;
    });

    await runGuidedPaso(page, CICLO_OFF, PASOS_OFF[4]!, async () => {
      expect(subjectPending && encounterPending).toBeTruthy();
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

        const subjPayload = JSON.parse(subjectPending!.payloadJson) as {
          clientSubjectId?: string;
        };
        const encPayload = JSON.parse(encounterPending!.payloadJson) as {
          clientEncounterId?: string;
        };

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
        return `Sync OK (${syncBody.data.status}/${syncEncBody.data.status})`;
      } finally {
        await apiCtx.dispose();
      }
    });

    await runGuidedPaso(page, CICLO_OFF, PASOS_OFF[5]!, async () => {
      expect(encounterPending).toBeTruthy();
      const apiCtx = await contextoLimpio();
      try {
        const login = await apiCtx.post('/api/auth/login', {
          data: { tenantCode: 'demo', userName: 'admin', password: 'Demo123!' },
        });
        expect(login.status()).toBe(200);
        const headers = autorizacion({
          accessToken: (await login.json()).data.accessToken as string,
          tenantId: '',
          userId: '',
          refresh: '',
        });
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
      return 'Reintento duplicate; urgencias sigue abierta';
    });
  });
});
