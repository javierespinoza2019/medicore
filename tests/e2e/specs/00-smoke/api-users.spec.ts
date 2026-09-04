import {
  test,
  expect,
  autorizacion,
  iniciarSesion,
  sesionValida,
  idE2E,
} from '../../fixtures/api';

/**
 * Contrato CRUD usuarios de tenant.
 * DELETE HTTP = baja lógica + revoke-all (#75). Sin DELETE SQL.
 */
test.describe.configure({ mode: 'serial' });

test.describe('00 — Contrato API · users', () => {
  test('admin lista usuarios del seed', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const headers = autorizacion(sesion);

    const res = await apiCtx.get('/api/users?onlyActive=false', { headers });
    expect(res.status(), await res.text()).toBe(200);
    const list = (await res.json()).data as Array<{ userId: string; userName: string }>;
    expect(list.length).toBeGreaterThanOrEqual(2);
  });

  test('médico sin canAdminUsers recibe 403', async ({ apiCtx }) => {
    const login = await iniciarSesion(apiCtx, {
      userName: 'alejandro.garcia@medicore.mx',
      password: 'Admin123!',
    });
    expect(login.status(), await login.text()).toBe(200);
    const token = (await login.json()).data.accessToken as string;

    const res = await apiCtx.get('/api/users', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(403);
  });

  test('admin crea, actualiza, restablece contraseña y baja lógica', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const headers = autorizacion(sesion);
    const stamp = idE2E('usr');
    const userId = crypto.randomUUID();
    const userName = `e2e.${stamp}@medicore.mx`.slice(0, 128);

    const branches = await apiCtx.get('/api/branches?onlyActive=true', { headers });
    expect(branches.status(), await branches.text()).toBe(200);
    const branchList = (await branches.json()).data as Array<{ branchId: string }>;
    expect(branchList.length).toBeGreaterThanOrEqual(1);
    const branchId = branchList[0].branchId;

    const create = await apiCtx.post('/api/users', {
      headers,
      data: {
        userId,
        userName,
        displayName: `Usuario E2E ${stamp}`,
        password: 'Temporal123!',
        isActive: true,
        roleCodes: ['recepcion'],
        branchIds: [branchId],
      },
    });
    expect(create.status(), await create.text()).toBe(200);
    const created = (await create.json()).data;
    expect(created.userId).toBe(userId);
    expect(created.roleCodes).toContain('recepcion');

    const update = await apiCtx.put(`/api/users/${userId}`, {
      headers,
      data: {
        displayName: `Usuario E2E Actualizado ${stamp}`,
        isActive: true,
        roleCodes: ['recepcion', 'caja'],
        branchIds: [branchId],
      },
    });
    expect(update.status(), await update.text()).toBe(200);
    const updated = (await update.json()).data;
    expect(updated.displayName).toContain('Actualizado');
    expect(updated.roleCodes).toEqual(expect.arrayContaining(['recepcion', 'caja']));

    const pwd = await apiCtx.post(`/api/users/${userId}/password`, {
      headers,
      data: { newPassword: 'NuevaClave123!' },
    });
    expect(pwd.status(), await pwd.text()).toBe(200);

    const loginNew = await iniciarSesion(apiCtx, {
      userName,
      password: 'NuevaClave123!',
    });
    expect(loginNew.status(), await loginNew.text()).toBe(200);

    const soft = await apiCtx.delete(`/api/users/${userId}`, { headers });
    expect(soft.status(), await soft.text()).toBe(200);

    const getGone = await apiCtx.get(`/api/users/${userId}`, { headers });
    expect(getGone.status()).toBe(404);
  });

  test('no permite auto-baja', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const headers = autorizacion(sesion);

    const soft = await apiCtx.delete(`/api/users/${sesion.userId}`, { headers });
    expect(soft.status()).toBe(400);
  });
});
