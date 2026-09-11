import {
  test,
  expect,
  autorizacion,
  idE2E,
  iniciarSesion,
  sesionValida,
} from '../../fixtures/api';

/**
 * Break-glass (#23) y permisos efectivos en sesión contra API real.
 * Usa recepción NORTE / usuarios efímeros para no contaminar jose.ramirez (UI permisos).
 */

const BRANCH_DEMO = '22222222-2222-2222-2222-222222222222';
const JUSTIFICACION =
  'Paciente crítico sin médico de guardia; continuidad de atención en urgencias.';

test.describe.configure({ mode: 'serial' });

async function crearRecepcionEfimera(
  apiCtx: import('@playwright/test').APIRequestContext,
): Promise<{ userName: string; password: string; userId: string }> {
  const admin = await sesionValida(apiCtx);
  const headers = autorizacion(admin);
  const stamp = idE2E('bg');
  const userId = crypto.randomUUID();
  const userName = `e2e.bg.${stamp}@medicore.mx`.slice(0, 128);
  const password = 'BreakGlass123!';

  const branches = await apiCtx.get('/api/branches?onlyActive=true', { headers });
  expect(branches.status(), await branches.text()).toBe(200);
  const branchId = ((await branches.json()).data as Array<{ branchId: string }>)[0].branchId;

  const create = await apiCtx.post('/api/users', {
    headers,
    data: {
      userId,
      userName,
      displayName: `E2E BG ${stamp}`,
      password,
      isActive: true,
      roleCodes: ['recepcion'],
      branchIds: [branchId],
    },
  });
  expect(create.status(), await create.text()).toBe(200);
  return { userName, password, userId };
}

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

    const { userName, password, userId } = await crearRecepcionEfimera(apiCtx);
    const login = await iniciarSesion(apiCtx, { userName, password });
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

    await apiCtx.delete(`/api/users/${userId}`, { headers: headersAdmin });
  });

  test('break-glass rechaza permisos administrativos', async ({ apiCtx }) => {
    const { userName, password, userId } = await crearRecepcionEfimera(apiCtx);
    const login = await iniciarSesion(apiCtx, { userName, password });
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

    const admin = await sesionValida(apiCtx);
    await apiCtx.delete(`/api/users/${userId}`, { headers: autorizacion(admin) });
  });
});
