import {
  test,
  expect,
  autorizacion,
  iniciarSesion,
  sesionValida,
} from '../../fixtures/api';

/**
 * Matriz de permisos por rol contra API real (sin mocks).
 * UI PermissionGate / menú (admin, médico, enfermería, caja): `permisos-por-rol-ui.spec.ts`
 * (proyecto chromium + helpers `auth-ui`).
 */

const BRANCH_DEMO = '22222222-2222-2222-2222-222222222222';

test.describe.configure({ mode: 'serial' });

test.describe('01 — Auth / seguridad · permisos por rol (API)', () => {
  test('caja no lee expediente clínico (403)', async ({ apiCtx }) => {
    const login = await iniciarSesion(apiCtx, {
      userName: 'monica.soto@medicore.mx',
      password: 'Admin123!',
    });
    expect(login.status(), await login.text()).toBe(200);
    const token = (await login.json()).data.accessToken as string;

    const admin = await sesionValida(apiCtx);
    const subj = await apiCtx.post('/api/subjects', {
      headers: autorizacion(admin),
      data: { branchId: BRANCH_DEMO },
    });
    const subjectId = (await subj.json()).data.subjectId as string;

    const record = await apiCtx.get(`/api/subjects/${subjectId}/record`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(record.status()).toBe(403);
  });

  test('médico no lista auditoría (403)', async ({ apiCtx }) => {
    const login = await iniciarSesion(apiCtx, {
      userName: 'alejandro.garcia@medicore.mx',
      password: 'Admin123!',
    });
    expect(login.status()).toBe(200);
    const body = await login.json();
    const token = body.data.accessToken as string;
    const userId = body.data.userId as string;
    const audit = await apiCtx.get(`/api/audit/actor/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(audit.status()).toBe(403);
  });

  test('enfermería no emite receta (403 o 409 por captura alérgica)', async ({ apiCtx }) => {
    const admin = await sesionValida(apiCtx);
    const headersAdmin = autorizacion(admin);
    const subj = await apiCtx.post('/api/subjects', {
      headers: headersAdmin,
      data: { branchId: BRANCH_DEMO },
    });
    const subjectId = (await subj.json()).data.subjectId as string;
    const enc = await apiCtx.post('/api/encounters', {
      headers: headersAdmin,
      data: {
        branchId: BRANCH_DEMO,
        subjectId,
        encounterType: 'consulta_externa',
      },
    });
    const encounterId = (await enc.json()).data.encounterId as string;

    const login = await iniciarSesion(apiCtx, {
      userName: 'carmen.vargas@medicore.mx',
      password: 'Admin123!',
    });
    expect(login.status()).toBe(200);
    const token = (await login.json()).data.accessToken as string;

    const rx = await apiCtx.post(`/api/encounters/${encounterId}/prescriptions`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        items: [
          {
            medicationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001',
            dose: { valor: 500, unidad: 'mg', estado: 'medido', origen: 'medido' },
            route: 'oral',
            frequency: { kind: 'every_n_hours', n: 8 },
            durationDays: 5,
            quantity: 15,
            refillsAllowed: 0,
          },
        ],
      },
    });
    expect([403, 409]).toContain(rx.status());
  });

  test.skip(
    '[pendiente Fase 2] médico no ejecuta corte de caja — sin módulo de caja en API',
    async () => {
      //
    },
  );
});
