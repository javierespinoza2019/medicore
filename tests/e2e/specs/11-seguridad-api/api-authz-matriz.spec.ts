import {
  test,
  expect,
  autorizacion,
  idE2E,
  iniciarSesion,
  sesionValida,
} from '../../fixtures/api';

/**
 * Pentest light M13 — AuthZ matriz (S.1, S.3, S.4).
 * Sin exploits; solo códigos de estado esperados contra API + BD Dev.
 */

const BRANCH_DEMO = '22222222-2222-2222-2222-222222222222';
const JUSTIFICACION =
  'Continuidad de atención en urgencias; estación sin médico de guardia.';

const RUTAS_CLINICAS = [
  '/api/subjects',
  '/api/encounters',
  '/api/professionals',
] as const;

test.describe.configure({ mode: 'serial' });

test.describe('11 — Seguridad API · authz matriz', () => {
  test('S.1 rutas clínicas sin token → 401', async ({ apiCtx }) => {
    for (const ruta of RUTAS_CLINICAS) {
      const res = await apiCtx.get(ruta);
      // 401 = no autenticado; 405 = método no expuesto (sigue sin filtrar datos).
      expect([401, 405], `${ruta} sin token`).toContain(res.status());
    }
    const post = await apiCtx.post('/api/subjects', {
      data: { branchId: BRANCH_DEMO },
    });
    expect(post.status()).toBe(401);
  });

  test('S.3 caja no crea nota clínica ni lee auditoría (403)', async ({ apiCtx }) => {
    const admin = await sesionValida(apiCtx);
    const headersAdmin = autorizacion(admin);
    const subj = await apiCtx.post('/api/subjects', {
      headers: headersAdmin,
      data: { branchId: BRANCH_DEMO },
    });
    expect(subj.status()).toBe(200);
    const subjectId = (await subj.json()).data.subjectId as string;
    const enc = await apiCtx.post('/api/encounters', {
      headers: headersAdmin,
      data: {
        branchId: BRANCH_DEMO,
        subjectId,
        encounterType: 'consulta_externa',
      },
    });
    expect(enc.status()).toBe(200);
    const encounterId = (await enc.json()).data.encounterId as string;

    const loginCaja = await iniciarSesion(apiCtx, {
      userName: 'monica.soto@medicore.mx',
      password: 'Admin123!',
    });
    expect(loginCaja.status()).toBe(200);
    const cajaBody = await loginCaja.json();
    const headersCaja = { Authorization: `Bearer ${cajaBody.data.accessToken}` };

    const nota = await apiCtx.post(`/api/encounters/${encounterId}/notes`, {
      headers: headersCaja,
      data: {
        noteType: 'evolucion',
        prognosis: null,
        body: { subjetivo: 'intento caja', objetivo: null, analisis: null, plan: null },
      },
    });
    expect(nota.status(), await nota.text()).toBe(403);

    const audit = await apiCtx.get(`/api/audit/actor/${cajaBody.data.userId}`, {
      headers: headersCaja,
    });
    expect(audit.status()).toBe(403);
  });

  test('S.4 break-glass no concede canAdminUsers ni canVerAuditoria', async ({ apiCtx }) => {
    // Usuario efímero: no contaminar recepción seed (UI permisos / agenda).
    const admin = await sesionValida(apiCtx);
    const adminHeaders = autorizacion(admin);
    const stamp = idE2E('s4');
    const userId = crypto.randomUUID();
    const userName = `e2e.s4.${stamp}@medicore.mx`.slice(0, 128);
    const password = 'AuthzS4123!';
    const branches = await apiCtx.get('/api/branches?onlyActive=true', { headers: adminHeaders });
    expect(branches.status(), await branches.text()).toBe(200);
    const branchId = ((await branches.json()).data as Array<{ branchId: string }>)[0].branchId;
    const create = await apiCtx.post('/api/users', {
      headers: adminHeaders,
      data: {
        userId,
        userName,
        displayName: `E2E S4 ${stamp}`,
        password,
        isActive: true,
        roleCodes: ['recepcion'],
        branchIds: [branchId],
      },
    });
    expect(create.status(), await create.text()).toBe(200);

    const login = await iniciarSesion(apiCtx, { userName, password });
    expect(login.status()).toBe(200);
    const token = (await login.json()).data.accessToken as string;
    const headers = { Authorization: `Bearer ${token}` };

    const bgAdmin = await apiCtx.post('/api/auth/break-glass', {
      headers,
      data: {
        justification: JUSTIFICACION,
        permissionKeys: ['canAdminUsers'],
      },
    });
    expect(bgAdmin.status()).toBe(400);

    const bgAudit = await apiCtx.post('/api/auth/break-glass', {
      headers,
      data: {
        justification: JUSTIFICACION,
        permissionKeys: ['canVerAuditoria'],
      },
    });
    expect(bgAudit.status()).toBe(400);

    const bgClinico = await apiCtx.post('/api/auth/break-glass', {
      headers,
      data: {
        justification: JUSTIFICACION,
        permissionKeys: ['canCreateConsulta'],
      },
    });
    expect(bgClinico.status(), await bgClinico.text()).toBe(200);
    const perms = (await bgClinico.json()).data.permissions;
    expect(perms.canAdminUsers).toBe(false);
    expect(perms.canVerAuditoria).toBe(false);

    await apiCtx.delete(`/api/users/${userId}`, { headers: adminHeaders });
  });
});
