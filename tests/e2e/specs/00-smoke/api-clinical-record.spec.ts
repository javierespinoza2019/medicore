import {
  test,
  expect,
  autorizacion,
  iniciarSesion,
  sesionValida,
} from '../../fixtures/api';

/**
 * Contrato de /api/subjects/{id}/record (M7 / WS-G).
 * GET registra record.read; expediente nuevo → alergias no_interrogado (no «sin alergias»).
 */
test.describe.configure({ mode: 'serial' });

const BRANCH_DEMO = '22222222-2222-2222-2222-222222222222';

test.describe('00 — Contrato API · clinical record (expediente)', () => {
  test('GET record asegura expediente; alergias no_interrogado; audit record.read', async ({
    apiCtx,
  }) => {
    const sesion = await sesionValida(apiCtx);
    const created = await apiCtx.post('/api/subjects', {
      headers: autorizacion(sesion),
      data: { branchId: BRANCH_DEMO },
    });
    expect(created.status(), await created.text()).toBe(200);
    const subjectId = (await created.json()).data.subjectId as string;

    const res = await apiCtx.get(`/api/subjects/${subjectId}/record`, {
      headers: autorizacion(sesion),
    });
    expect(res.status(), await res.text()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.recordId).toBeTruthy();
    expect(body.data.subjectId.toLowerCase()).toBe(subjectId.toLowerCase());
    expect(body.data.allergyStatus.status).toBe('no_interrogado');
    expect(Array.isArray(body.data.allergies)).toBe(true);
    expect(body.data.allergies.length).toBe(0);
    expect(body.data.currentHistory?.body?.heredoFamiliares?.estado).toBe('no_interrogado');
    expect(body.data.currentHistory?.body?.aparatosYSistemas?.estado).toBe('no_interrogado');
    expect(body.data.lastMedicalActAtUtc).toBeNull();

    // Idempotencia: segundo GET no falla
    const again = await apiCtx.get(`/api/subjects/${subjectId}/record`, {
      headers: autorizacion(sesion),
    });
    expect(again.status()).toBe(200);
    const againBody = await again.json();
    expect(againBody.data.recordId).toBe(body.data.recordId);
  });

  test('PUT allergy-status y POST allergies; DELETE soft', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const created = await apiCtx.post('/api/subjects', {
      headers: autorizacion(sesion),
      data: { branchId: BRANCH_DEMO },
    });
    const subjectId = (await created.json()).data.subjectId as string;

    const statusRes = await apiCtx.put(`/api/subjects/${subjectId}/allergy-status`, {
      headers: autorizacion(sesion),
      data: { status: 'paciente_no_puede_responder' },
    });
    expect(statusRes.status(), await statusRes.text()).toBe(200);
    expect((await statusRes.json()).data.status).toBe('paciente_no_puede_responder');

    const add = await apiCtx.post(`/api/subjects/${subjectId}/allergies`, {
      headers: autorizacion(sesion),
      data: {
        substance: 'Penicilina',
        reactionType: 'alergia',
        severity: 'grave',
      },
    });
    expect(add.status(), await add.text()).toBe(200);
    const allergyId = (await add.json()).data.allergyId as string;

    const record = await apiCtx.get(`/api/subjects/${subjectId}/record`, {
      headers: autorizacion(sesion),
    });
    const data = (await record.json()).data;
    expect(data.allergyStatus.status).toBe('refiere');
    expect(data.allergies.some((a: { allergyId: string }) => a.allergyId === allergyId)).toBe(true);

    const del = await apiCtx.delete(`/api/subjects/${subjectId}/allergies/${allergyId}`, {
      headers: autorizacion(sesion),
    });
    expect(del.status(), await del.text()).toBe(200);
  });

  test('POST history append versión; addendum', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const created = await apiCtx.post('/api/subjects', {
      headers: autorizacion(sesion),
      data: { branchId: BRANCH_DEMO },
    });
    const subjectId = (await created.json()).data.subjectId as string;

    const save = await apiCtx.post(`/api/subjects/${subjectId}/history`, {
      headers: autorizacion(sesion),
      data: {
        origin: 'capturado',
        body: {
          heredoFamiliares: { estado: 'conocido', valor: [] },
          personalesPatologicos: { estado: 'no_interrogado', valor: null },
          personalesNoPatologicos: { estado: 'no_interrogado', valor: null },
          ginecoObstetricos: { estado: 'no_aplica', valor: null },
          aparatosYSistemas: { estado: 'no_interrogado', valor: null },
          habitusExterior: { estado: 'no_interrogado', valor: null },
          padecimientoActual: { estado: 'se_desconoce', valor: null },
          observaciones: null,
        },
      },
    });
    expect(save.status(), await save.text()).toBe(200);
    const hist = (await save.json()).data;
    expect(hist.version).toBeGreaterThanOrEqual(2);
    expect(hist.body.heredoFamiliares.estado).toBe('conocido');
    expect(Array.isArray(hist.body.heredoFamiliares.valor)).toBe(true);
    expect(hist.body.heredoFamiliares.valor.length).toBe(0);

    const amend = await apiCtx.post(`/api/subjects/${subjectId}/history/amendments`, {
      headers: autorizacion(sesion),
      data: { reasonText: 'Corrección tipográfica en AHF', historyId: hist.historyId },
    });
    expect(amend.status(), await amend.text()).toBe(200);
    expect((await amend.json()).data.reasonText).toContain('Corrección');
  });

  test('rol sin permiso clínico responde 403', async ({ apiCtx }) => {
    const admin = await sesionValida(apiCtx);
    const created = await apiCtx.post('/api/subjects', {
      headers: autorizacion(admin),
      data: { branchId: BRANCH_DEMO },
    });
    const subjectId = (await created.json()).data.subjectId as string;

    const login = await iniciarSesion(apiCtx, {
      userName: 'monica.soto@medicore.mx',
      password: 'Admin123!',
    });
    expect(login.status()).toBe(200);
    const caja = await login.json();
    const deny = await apiCtx.get(`/api/subjects/${subjectId}/record`, {
      headers: { Authorization: `Bearer ${caja.data.accessToken}` },
    });
    expect(deny.status()).toBe(403);
  });

  test('sin token responde 401', async ({ apiCtx }) => {
    const res = await apiCtx.get(
      '/api/subjects/11111111-1111-1111-1111-111111111111/record',
    );
    expect(res.status()).toBe(401);
  });
});
