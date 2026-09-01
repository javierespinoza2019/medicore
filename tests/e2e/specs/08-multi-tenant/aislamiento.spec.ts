import { test, expect, api, autorizacion, idE2E, sesionValida } from '../../fixtures/api';

/**
 * Aislamiento multi-tenant — prioridad doc 2 / puerta F0.
 * Sucursales (M11): contrato en `00-smoke/api-branches.spec.ts` (404 cruzado).
 * Lectura cruzada de pacientes: con `MEDICORE_TENANT_B=bravo` (seed 008).
 */
const haySegundoTenant = api.tenantB.trim().length > 0 && api.tenantB !== api.tenant;

test.describe('08 — Multi-tenant · aislamiento', () => {
  test.describe('lectura cruzada entre tenants', () => {
    test.skip(
      !haySegundoTenant,
      `Requiere MEDICORE_TENANT_B. Con seed 008: MEDICORE_TENANT_B=bravo (mismo user/password sintéticos).`,
    );

    test('tenant A no lee pacientes de tenant B', async ({ apiCtx }) => {
      const sesionA = await sesionValida(apiCtx);
      const created = await apiCtx.post('/api/subjects', {
        headers: autorizacion(sesionA),
        data: { branchId: '22222222-2222-2222-2222-222222222222' },
      });
      expect(created.status()).toBe(200);
      const subjectId = (await created.json()).data.subjectId as string;

      const loginB = await apiCtx.post('/api/auth/login', {
        data: {
          tenantCode: api.tenantB,
          userName: api.usuario,
          password: api.password,
        },
      });
      expect(loginB.status()).toBe(200);
      const tokenB = (await loginB.json()).data.accessToken as string;

      const cruzada = await apiCtx.get(`/api/subjects/${subjectId}`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      expect(cruzada.status()).toBe(404);
    });

    test('tenant B no lee encuentro abierto en tenant A (bravo)', async ({ apiCtx }) => {
      const sesionA = await sesionValida(apiCtx);
      const headersA = autorizacion(sesionA);
      const created = await apiCtx.post('/api/subjects', {
        headers: headersA,
        data: { branchId: '22222222-2222-2222-2222-222222222222' },
      });
      expect(created.status()).toBe(200);
      const subjectId = (await created.json()).data.subjectId as string;

      const enc = await apiCtx.post('/api/encounters', {
        headers: headersA,
        data: {
          branchId: '22222222-2222-2222-2222-222222222222',
          subjectId,
          encounterType: 'urgencias',
        },
      });
      expect(enc.status(), await enc.text()).toBe(200);
      const encounterId = (await enc.json()).data.encounterId as string;

      const loginB = await apiCtx.post('/api/auth/login', {
        data: {
          tenantCode: api.tenantB,
          userName: api.usuario,
          password: api.password,
        },
      });
      expect(loginB.status()).toBe(200);
      const tokenB = (await loginB.json()).data.accessToken as string;

      const cruzada = await apiCtx.get(`/api/encounters/${encounterId}`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      expect(cruzada.status(), 'bravo no debe ver el episodio de demo').toBe(404);
    });
  });

  test('manipular recurso ajeno por id inexistente responde 404 (tenant del token)', async ({
    apiCtx,
  }) => {
    const sesion = await sesionValida(apiCtx);
    const lectura = await apiCtx.get(`/api/devices/${idE2E('ajeno')}`, {
      headers: autorizacion(sesion),
    });
    expect(lectura.status()).toBe(404);
  });

  test.skip(
    `[pendiente exportaciones] listados y exportaciones no filtran por conteo cruzado — requiere segundo tenant + export`,
    async () => {
      //
    },
  );
});
