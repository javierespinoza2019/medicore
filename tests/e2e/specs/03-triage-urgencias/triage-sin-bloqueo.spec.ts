import {
  test,
  expect,
  autorizacion,
  sesionValida,
} from '../../fixtures/api';

/**
 * SC de triage/urgencias. M12: contrato API activo (SC-03 / SC-14).
 * SC-19 de Sync handlers offline de triage.* sigue en skip (parcial en subject/encounter).
 */
test.describe.configure({ mode: 'serial' });

const BRANCH_DEMO = '22222222-2222-2222-2222-222222222222';

test.describe('03 — Triage urgencias · sin bloqueo', () => {
  test('clasifica triage sin datos administrativos (SC-14)', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const headers = autorizacion(sesion);

    const subjectRes = await apiCtx.post('/api/subjects', {
      headers,
      data: { branchId: BRANCH_DEMO },
    });
    expect(subjectRes.status()).toBe(200);
    const subjectId = (await subjectRes.json()).data.subjectId as string;

    const openRes = await apiCtx.post('/api/encounters', {
      headers,
      data: { branchId: BRANCH_DEMO, subjectId, encounterType: 'urgencias' },
    });
    expect(openRes.status()).toBe(200);
    const openBody = await openRes.json();
    const encounterId = openBody.data.encounterId as string;
    expect(openBody.data.triageLevel).toBeNull();

    const triageRes = await apiCtx.post(`/api/encounters/${encounterId}/triage`, {
      headers,
      data: { level: null, chiefComplaint: null, vitals: [] },
    });
    expect(triageRes.status(), await triageRes.text()).toBe(200);
    expect((await triageRes.json()).data.level).toBeNull();
  });

  test('no asigna nivel por omisión; cierre sin triage 409 (SC-03)', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const headers = autorizacion(sesion);

    const subjectRes = await apiCtx.post('/api/subjects', {
      headers,
      data: { branchId: BRANCH_DEMO },
    });
    const subjectId = (await subjectRes.json()).data.subjectId as string;
    const openRes = await apiCtx.post('/api/encounters', {
      headers,
      data: { branchId: BRANCH_DEMO, subjectId, encounterType: 'urgencias' },
    });
    const openBody = await openRes.json();
    const encounterId = openBody.data.encounterId as string;
    expect(openBody.data.triageLevel).toBeNull();

    const closeRes = await apiCtx.post(`/api/encounters/${encounterId}/state`, {
      headers,
      data: {
        toState: 'cerrado',
        disposition: 'alta_domicilio',
        justification: 'SC-03 sin triage',
      },
    });
    expect(closeRes.status(), await closeRes.text()).toBe(409);
  });

  test.skip(
    `[activo en chromium] inicio de atención no se bloquea por fallo de red (SC-19) — ver sc-19-estacion-offline.spec.ts (Vite + cola IndexedDB + sync); este proyecto es contrato-api sin browser`,
    async () => {
      // Cubierto en specs/03-triage-urgencias/sc-19-estacion-offline.spec.ts
    },
  );
});
