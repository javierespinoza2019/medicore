import {
  test,
  expect,
  autorizacion,
  iniciarSesion,
  sesionValida,
} from '../../fixtures/api';

/**
 * Contrato de /api/audit (M2).
 * Permiso provisional: SuperAdmin/admin. Rol medico → 403 (pregunta abierta N).
 */
test.describe.configure({ mode: 'serial' });

test.describe('00 — Contrato API · auditoría', () => {
  test('admin puede listar por actor (200)', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const res = await apiCtx.get(`/api/audit/actor/${sesion.userId}`, {
      headers: autorizacion(sesion),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('admin puede listar por sujeto inexistente (200 con lista vacía; 404 pendiente de M3)', async ({
    apiCtx,
  }) => {
    const sesion = await sesionValida(apiCtx);
    const subjectId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const res = await apiCtx.get(`/api/audit/subject/${subjectId}`, {
      headers: autorizacion(sesion),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('rol sin permiso (medico) recibe 403', async ({ apiCtx }) => {
    const login = await iniciarSesion(apiCtx, {
      userName: 'alejandro.garcia@medicore.mx',
      password: 'Admin123!',
    });
    expect(login.status(), 'login medico sintético debe funcionar en Dev').toBe(200);
    const body = await login.json();
    const token = body.data.accessToken as string;
    const userId = body.data.userId as string;

    const res = await apiCtx.get(`/api/audit/actor/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(403);
    const deny = await res.json();
    expect(deny.success).toBe(false);
  });

  test('sin token responde 401', async ({ apiCtx }) => {
    const res = await apiCtx.get(`/api/audit/actor/${crypto.randomUUID()}`);
    expect(res.status()).toBe(401);
  });

  test('admin: fromUtc posterior a toUtc responde 400', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const to = '2026-01-01T00:00:00.000Z';
    const from = '2026-02-01T00:00:00.000Z';
    const res = await apiCtx.get(
      `/api/audit/actor/${sesion.userId}?fromUtc=${encodeURIComponent(from)}&toUtc=${encodeURIComponent(to)}`,
      { headers: autorizacion(sesion) },
    );
    expect(res.status(), await res.text()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
