import {
  test,
  expect,
  autorizacion,
  sesionValida,
  idE2E,
  api,
} from '../../fixtures/api';

/**
 * Cola de salida e idempotencia — doc 03 §4, ADR-014.
 * M12: reintento ULID y subject.create/encounter.open contra API real.
 * SC-11 (sobrevive reinicio de estación IndexedDB) sigue en skip.
 */
test.describe.configure({ mode: 'serial' });

const BRANCH_DEMO = '22222222-2222-2222-2222-222222222222';

test.describe('09 — Offline · cola e idempotencia', () => {
  test('reintento del mismo ULID no duplica escritura', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const clave = idE2E('cola-ulid');
    const sobre = {
      idempotencyKey: clave,
      commandType: 'subject.create',
      payloadJson: JSON.stringify({ branchId: BRANCH_DEMO }),
      occurredAtUtc: new Date().toISOString(),
    };

    const primera = await apiCtx.post('/api/sync/commands', {
      headers: autorizacion(sesion),
      data: sobre,
    });
    expect(primera.status(), await primera.text()).toBe(200);
    const id1 = (await primera.json()).data.serverEntityId as string;

    const reintento = await apiCtx.post('/api/sync/commands', {
      headers: autorizacion(sesion),
      data: sobre,
    });
    expect(reintento.status()).toBe(200);
    const cuerpo2 = await reintento.json();
    expect(cuerpo2.data.status).toBe('duplicate');
    expect(cuerpo2.data.serverEntityId).toBe(id1);
  });

  test('subject.create + encounter.open vía cola sync (idempotente)', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const headers = autorizacion(sesion);

    const subjKey = idE2E('cola-subj');
    const subj = await apiCtx.post('/api/sync/commands', {
      headers,
      data: {
        idempotencyKey: subjKey,
        commandType: 'subject.create',
        payloadJson: JSON.stringify({ branchId: BRANCH_DEMO }),
        occurredAtUtc: new Date().toISOString(),
      },
    });
    expect(subj.status(), await subj.text()).toBe(200);
    const subjectId = (await subj.json()).data.serverEntityId as string;

    const encKey = idE2E('cola-enc');
    const enc = await apiCtx.post('/api/sync/commands', {
      headers,
      data: {
        idempotencyKey: encKey,
        commandType: 'encounter.open',
        payloadJson: JSON.stringify({
          branchId: BRANCH_DEMO,
          subjectId,
          encounterType: 'urgencias',
        }),
        occurredAtUtc: new Date().toISOString(),
      },
    });
    expect(enc.status(), await enc.text()).toBe(200);
    expect((await enc.json()).data.status).toBe('accepted');

    const dup = await apiCtx.post('/api/sync/commands', {
      headers,
      data: {
        idempotencyKey: encKey,
        commandType: 'encounter.open',
        payloadJson: JSON.stringify({
          branchId: BRANCH_DEMO,
          subjectId,
          encounterType: 'urgencias',
        }),
        occurredAtUtc: new Date().toISOString(),
      },
    });
    expect(dup.status()).toBe(200);
    expect((await dup.json()).data.status).toBe('duplicate');
  });

  test.skip(
    `cola sobrevive cierre de pestaña y reinicio (SC-11 / SS-09) — activo en sc-11-indexeddb.spec.ts (chromium + Vite); API=${api.url}`,
    async () => {
      // Evita duplicar el caso en contrato-api (sin page).
    },
  );

  test.skip(
    `[pendiente Sync por lotes] drenado por lotes sin duplicar al interrumpir (SS-10)`,
    async () => {
      //
    },
  );
});
