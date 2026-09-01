import {
  test,
  expect,
  autorizacion,
  sesionValida,
} from '../../fixtures/api';

/**
 * Contrato de /api/encounters (M4 / WS-E).
 * POST sin dato administrativo → 200.
 * Cierre sin triage → 409.
 */
test.describe.configure({ mode: 'serial' });

const BRANCH_DEMO = '22222222-2222-2222-2222-222222222222';

test.describe('00 — Contrato API · encounters', () => {
  test('POST /api/encounters con subjectId+branchId responde 200; MP null', async ({
    apiCtx,
  }) => {
    const sesion = await sesionValida(apiCtx);

    const subjectRes = await apiCtx.post('/api/subjects', {
      headers: autorizacion(sesion),
      data: { branchId: BRANCH_DEMO },
    });
    expect(subjectRes.status(), await subjectRes.text()).toBe(200);
    const subject = await subjectRes.json();
    const subjectId = subject.data.subjectId as string;

    const res = await apiCtx.post('/api/encounters', {
      headers: autorizacion(sesion),
      data: {
        branchId: BRANCH_DEMO,
        subjectId,
        encounterType: 'urgencias',
      },
    });
    expect(res.status(), await res.text()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.encounterId).toBeTruthy();
    expect(body.data.subjectId.toLowerCase()).toBe(subjectId.toLowerCase());
    expect(body.data.state).toBe('abierto');
    expect(body.data.disposition).toBeNull();
    expect(body.data.ministerioPublicoNotified).toBeNull();
    expect(body.data.turnNumber).toBeGreaterThan(0);
    expect(body.data.triageLevel).toBeNull();
  });

  test('GET /api/encounters/queue ordena y lista abiertos', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const res = await apiCtx.get(
      `/api/encounters/queue?branchId=${BRANCH_DEMO}&includeClosed=false`,
      { headers: autorizacion(sesion) },
    );
    expect(res.status(), await res.text()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.branchId.toLowerCase()).toBe(BRANCH_DEMO);
    expect(Array.isArray(body.data.items)).toBe(true);
    expect(body.data.allUnclassified).toBe(true);
  });

  test('POST state cerrado sin triage responde 409', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);

    const subjectRes = await apiCtx.post('/api/subjects', {
      headers: autorizacion(sesion),
      data: { branchId: BRANCH_DEMO },
    });
    expect(subjectRes.status(), await subjectRes.text()).toBe(200);
    const subjectId = (await subjectRes.json()).data.subjectId as string;

    const openRes = await apiCtx.post('/api/encounters', {
      headers: autorizacion(sesion),
      data: { branchId: BRANCH_DEMO, subjectId, encounterType: 'urgencias' },
    });
    expect(openRes.status(), await openRes.text()).toBe(200);
    const encounterId = (await openRes.json()).data.encounterId as string;

    const closeRes = await apiCtx.post(`/api/encounters/${encounterId}/state`, {
      headers: autorizacion(sesion),
      data: {
        toState: 'cerrado',
        disposition: 'alta_domicilio',
        justification: 'Intento de cierre sin triage (contrato SC-03)',
      },
    });
    expect(closeRes.status(), await closeRes.text()).toBe(409);
    const body = await closeRes.json();
    expect(body.success).toBe(false);
  });

  test('POST care-without-consent con mismo profesional responde 409', async ({
    apiCtx,
  }) => {
    const sesion = await sesionValida(apiCtx);
    const subjectRes = await apiCtx.post('/api/subjects', {
      headers: autorizacion(sesion),
      data: { branchId: BRANCH_DEMO },
    });
    const subjectId = (await subjectRes.json()).data.subjectId as string;
    const openRes = await apiCtx.post('/api/encounters', {
      headers: autorizacion(sesion),
      data: { branchId: BRANCH_DEMO, subjectId, encounterType: 'urgencias' },
    });
    const encounterId = (await openRes.json()).data.encounterId as string;

    const same = '66666666-6666-6666-6666-666666660001';
    const res = await apiCtx.post(
      `/api/encounters/${encounterId}/care-without-consent`,
      {
        headers: autorizacion(sesion),
        data: {
          clinicalAssessment: 'Valoración sintética de prueba',
          urgencyRationale: 'Razonamiento sintético de urgencia',
          noRelativeOrRepresentative: true,
          professionalId1: same,
          professionalId2: same,
        },
      },
    );
    expect(res.status(), await res.text()).toBe(409);
  });

  test('sin token responde 401', async ({ apiCtx }) => {
    const res = await apiCtx.get(`/api/encounters/queue?branchId=${BRANCH_DEMO}`);
    expect(res.status()).toBe(401);
  });
});
