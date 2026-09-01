import { test, expect } from '@playwright/test';
import { api } from '../../fixtures/api';
import { entorno } from '../../fixtures/tenants';
import { idE2E } from '../../fixtures/api';
import {
  OUTBOX_DB,
  encolarOutbox,
  listarPendingOutbox,
  existeBase,
} from '../../utils/indexeddb';

/**
 * SC-11 / SS-09: cola IndexedDB sobrevive cierre de pestaña (Vite).
 * Corre en chromium (no contrato-api).
 */

async function up(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(3_000) });
    return res.ok || res.status === 304;
  } catch {
    return false;
  }
}

test.describe('09 — Offline · SC-11 IndexedDB estación', () => {
  test('cola medicore-outbox sobrevive cierre de pestaña y reinicio (SC-11 / SS-09)', async ({
    page,
    context,
  }) => {
    const uiOk = await up(entorno.baseURL);
    test.skip(!uiOk, `Requiere Vite en ${entorno.baseURL}`);

    const key = idE2E('sc11-outbox');
    const row = {
      id: key.slice(0, 26).toUpperCase().replace(/[^A-Z0-9]/g, 'X').padEnd(26, '0').slice(0, 26),
      idempotencyKey: key,
      commandType: 'subject.create',
      payloadJson: JSON.stringify({
        branchId: '22222222-2222-2222-2222-222222222222',
      }),
      occurredAtUtc: new Date().toISOString(),
      status: 'pending' as const,
      attempts: 0,
      createdAtUtc: new Date().toISOString(),
    };

    await page.goto('/login');
    await encolarOutbox(page, row);
    expect(await existeBase(page, OUTBOX_DB)).toBe(true);
    const before = await listarPendingOutbox(page);
    expect(before.some((c) => c.idempotencyKey === key)).toBe(true);

    await page.close();
    const page2 = await context.newPage();
    await page2.goto('/login');
    expect(await existeBase(page2, OUTBOX_DB)).toBe(true);
    const after = await listarPendingOutbox(page2);
    expect(after.some((c) => c.idempotencyKey === key && c.status === 'pending')).toBe(true);
    expect(after.find((c) => c.idempotencyKey === key)?.commandType).toBe('subject.create');
  });
});

void api;
