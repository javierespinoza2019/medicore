import {
  test,
  expect,
  autorizacion,
  iniciarSesion,
  sesionValida,
} from '../../fixtures/api';

/**
 * Break-glass (#23) y permisos efectivos en sesión contra API real.
 */

const BRANCH_DEMO = '22222222-2222-2222-2222-222222222222';
const JUSTIFICACION =
  'Paciente crítico sin médico de guardia; continuidad de atención en urgencias.';

test.describe.configure({ mode: 'serial' });

test.describe('01 — Auth / seguridad · break-glass (API)', () => {
  test('login y /me exponen permissions efectivos', async ({ apiCtx }) => {
    const login = await iniciarSesion(apiCtx, {
      userName: 'alejandro.garcia@medicore.mx',
      password: 'Admin123!',
    });
    expect(login.status()).toBe(200);
    const body = await login.json();
    expect(body.data.permissions).toBeTruthy();
    expect(body.data.permissions.canCreateConsulta).toBe(true);
    expect(body.data.permissions.canVerAuditoria).toBe(false);

    const token = body.data.accessToken as string;
    const me = await apiCtx.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(me.status()).toBe(200);
    const meBody = await me.json();
    expect(meBody.data.permissions.canCreateReceta).toBe(true);
    expect(Array.isArray(meBody.data.breakGlassGrants)).toBe(true);
  });

  test('break-glass concede acceso clínico temporal a recepción', async ({ apiCtx }) => {
    const admin = await sesionValida(apiCtx);
    const headersAdmin = autorizacion(admin);
    const subj = await apiCtx.post('/api/subjects', {
      headers: headersAdmin,
      data: { branchId: BRANCH_DEMO },
    });
    expect(subj.status()).toBe(200);
    const subjectId = (await subj.json()).data.subjectId as string;

    const login = await iniciarSesion(apiCtx, {
      userName: 'jose.ramirez@medicore.mx',
      password: 'Admin123!',
    });
    expect(login.status()).toBe(200);
    const loginBody = await login.json();
    const token = loginBody.data.accessToken as string;
    const headers = { Authorization: `Bearer ${token}` };

    const antes = await apiCtx.get(`/api/subjects/${subjectId}/record`, { headers });
    expect(antes.status()).toBe(403);

    const bg = await apiCtx.post('/api/auth/break-glass', {
      headers,
      data: {
        justification: JUSTIFICACION,
        permissionKeys: ['canCreateConsulta'],
      },
    });
    expect(bg.status(), await bg.text()).toBe(200);
    const bgBody = await bg.json();
    expect(bgBody.data.permissions.canCreateConsulta).toBe(true);
    expect(bgBody.data.breakGlassGrants.length).toBeGreaterThan(0);

    const despues = await apiCtx.get(`/api/subjects/${subjectId}/record`, { headers });
    expect(despues.status(), await despues.text()).toBe(200);
  });

  test('break-glass rechaza permisos administrativos', async ({ apiCtx }) => {
    const login = await iniciarSesion(apiCtx, {
      userName: 'jose.ramirez@medicore.mx',
      password: 'Admin123!',
    });
    expect(login.status()).toBe(200);
    const token = (await login.json()).data.accessToken as string;

    const bg = await apiCtx.post('/api/auth/break-glass', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        justification: JUSTIFICACION,
        permissionKeys: ['canAdminUsers'],
      },
    });
    expect(bg.status()).toBe(400);
  });
});
