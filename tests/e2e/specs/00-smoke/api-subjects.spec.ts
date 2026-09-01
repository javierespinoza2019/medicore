import {
  test,
  expect,
  autorizacion,
  iniciarSesion,
  sesionValida,
} from '../../fixtures/api';

/**
 * Contrato de /api/subjects (M3 / WS-D).
 * POST con sólo branchId → 200.
 * search-by-description: admin 200 (sin nombres); medico 403.
 * Opción B: genderIdentity opcional (GIIS); no inventa biologicalSex.
 */
test.describe.configure({ mode: 'serial' });

const BRANCH_DEMO = '22222222-2222-2222-2222-222222222222';

test.describe('00 — Contrato API · subjects', () => {
  test('POST /api/subjects con sólo branchId responde 200', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const res = await apiCtx.post('/api/subjects', {
      headers: autorizacion(sesion),
      data: { branchId: BRANCH_DEMO },
    });
    expect(res.status(), await res.text()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.subjectId).toBeTruthy();
    expect(body.data.originBranchId.toLowerCase()).toBe(BRANCH_DEMO);
    expect(body.data.identificationState).toBe('no_identificado');
    expect(body.data.activeLabel?.operationalLabel).toBeTruthy();
    expect(body.data.biologicalSex).toBeNull();
    expect(body.data.genderIdentity).toBeNull();
    expect(body.data.curp).toBeNull();
    expect(body.data.birthDate).toBeNull();
  });

  test('POST /api/subjects con genderIdentity opcional no bloquea ni inventa sexo', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const res = await apiCtx.post('/api/subjects', {
      headers: autorizacion(sesion),
      data: {
        branchId: BRANCH_DEMO,
        givenName: 'Sujeto',
        firstSurname: 'Genero',
        genderIdentity: '3',
      },
    });
    expect(res.status(), await res.text()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.genderIdentity).toBe('3');
    expect(body.data.biologicalSex).toBeNull();
  });

  test('GET /api/subjects lista padrón', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const res = await apiCtx.get('/api/subjects?includeUnidentified=true', {
      headers: autorizacion(sesion),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('search-by-description admin 200 sin nombres; medico 403', async ({ apiCtx }) => {
    const admin = await sesionValida(apiCtx);
    const ok = await apiCtx.post('/api/subjects/search-by-description', {
      headers: autorizacion(admin),
      data: { branchId: BRANCH_DEMO },
    });
    expect(ok.status()).toBe(200);
    const okBody = await ok.json();
    expect(okBody.success).toBe(true);
    expect(typeof okBody.data.matchCount).toBe('number');
    for (const m of okBody.data.matches) {
      expect(m.subjectId).toBeTruthy();
      expect(m).not.toHaveProperty('givenName');
      expect(m).not.toHaveProperty('curp');
      expect(m).not.toHaveProperty('firstSurname');
    }

    const login = await iniciarSesion(apiCtx, {
      userName: 'alejandro.garcia@medicore.mx',
      password: 'Admin123!',
    });
    expect(login.status()).toBe(200);
    const medico = await login.json();
    const deny = await apiCtx.post('/api/subjects/search-by-description', {
      headers: { Authorization: `Bearer ${medico.data.accessToken}` },
      data: { branchId: BRANCH_DEMO },
    });
    expect(deny.status()).toBe(403);
  });

  test('sin token responde 401', async ({ apiCtx }) => {
    const res = await apiCtx.get('/api/subjects');
    expect(res.status()).toBe(401);
  });

  // Defensa parcial SC-25 (modelo): centinela SINBA no entra a Subject. Criterio SC-25 completo = Fase 4.
  test('POST /api/subjects rechaza birthDate centinela SINBA 9999-09-09 (400)', async ({
    apiCtx,
  }) => {
    const sesion = await sesionValida(apiCtx);
    const res = await apiCtx.post('/api/subjects', {
      headers: autorizacion(sesion),
      data: {
        branchId: BRANCH_DEMO,
        birthDate: '9999-09-09',
      },
    });
    expect(res.status(), await res.text()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(String(body.message ?? '').toLowerCase()).toMatch(/sinba|9999|centinela/);
  });
});
