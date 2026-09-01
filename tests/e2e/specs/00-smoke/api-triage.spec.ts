import {
  test,
  expect,
  autorizacion,
  sesionValida,
} from '../../fixtures/api';

/**
 * Contrato de triage / signos (M5 / WS-F).
 * POST sin nivel y sin signos medidos → 200.
 * Escala efectiva por cascada sucursal > tenant.
 */
test.describe.configure({ mode: 'serial' });

const BRANCH_DEMO = '22222222-2222-2222-2222-222222222222';

test.describe('00 — Contrato API · triage', () => {
  test('GET escala efectiva de sucursal responde 200 con niveles', async ({
    apiCtx,
  }) => {
    const sesion = await sesionValida(apiCtx);
    const res = await apiCtx.get(
      `/api/branches/${BRANCH_DEMO}/triage-scale`,
      { headers: autorizacion(sesion) },
    );
    expect(res.status(), await res.text()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.scaleCode).toBeTruthy();
    expect(Array.isArray(body.data.levels)).toBe(true);
    expect(body.data.levels.length).toBeGreaterThan(0);
    expect(body.data.resolvedFrom === 'tenant' || body.data.resolvedFrom === 'branch').toBe(
      true,
    );
  });

  test('POST triage sin nivel y sin signos medidos responde 200', async ({
    apiCtx,
  }) => {
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

    const triageRes = await apiCtx.post(`/api/encounters/${encounterId}/triage`, {
      headers: autorizacion(sesion),
      data: {
        level: null,
        chiefComplaint: null,
        vitals: [],
      },
    });
    expect(triageRes.status(), await triageRes.text()).toBe(200);
    const body = await triageRes.json();
    expect(body.success).toBe(true);
    expect(body.data.triageId).toBeTruthy();
    expect(body.data.level).toBeNull();
    expect(Array.isArray(body.data.vitals)).toBe(true);
    expect(body.data.vitals.length).toBeGreaterThan(0);
    for (const v of body.data.vitals) {
      expect(v.state).toBe('no_medido');
      expect(v.value).toBeNull();
      expect(v.notMeasuredReason).toBeTruthy();
    }
  });

  test('POST triage con nivel de escala y cierre posterior deja de ser 409', async ({
    apiCtx,
  }) => {
    const sesion = await sesionValida(apiCtx);

    const scaleRes = await apiCtx.get(
      `/api/branches/${BRANCH_DEMO}/triage-scale`,
      { headers: autorizacion(sesion) },
    );
    expect(scaleRes.status()).toBe(200);
    const levelCode = (await scaleRes.json()).data.levels[0].code as string;

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

    const triageRes = await apiCtx.post(`/api/encounters/${encounterId}/triage`, {
      headers: autorizacion(sesion),
      data: { level: levelCode, vitals: [] },
    });
    expect(triageRes.status(), await triageRes.text()).toBe(200);
    expect((await triageRes.json()).data.level).toBe(levelCode);

    const closeRes = await apiCtx.post(`/api/encounters/${encounterId}/state`, {
      headers: autorizacion(sesion),
      data: {
        toState: 'cerrado',
        disposition: 'alta_domicilio',
        justification: 'Cierre tras triage clasificado (contrato M5)',
      },
    });
    expect(closeRes.status(), await closeRes.text()).toBe(200);
  });
});
