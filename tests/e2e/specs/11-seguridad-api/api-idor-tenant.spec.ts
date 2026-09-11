import {
  test,
  expect,
  api,
  autorizacion,
  claimsDe,
  idE2E,
  sesionValida,
} from '../../fixtures/api';

/**
 * Pentest light M13 — IDOR / tenant (S.2, S.5).
 * TenantId solo de claims JWT; body/ruta no cambian el aislamiento.
 */

const BRANCH_DEMO = '22222222-2222-2222-2222-222222222222';
const haySegundoTenant = api.tenantB.trim().length > 0 && api.tenantB !== api.tenant;

test.describe.configure({ mode: 'serial' });

test.describe('11 — Seguridad API · IDOR / tenant', () => {
  test.skip(
    !haySegundoTenant,
    'Requiere MEDICORE_TENANT_B=bravo (seed 008_dev_tenant_bravo.sql).',
  );

  test('S.2 token tenant A no lee sujeto/encuentro de tenant B', async ({ apiCtx }) => {
    // Crear en demo (tiene UnidentifiedLabelConfig); lectura cruzada con bravo.
    const sesionA = await sesionValida(apiCtx);
    const headersA = autorizacion(sesionA);

    const created = await apiCtx.post('/api/subjects', {
      headers: headersA,
      data: { branchId: BRANCH_DEMO },
    });
    expect(created.status(), await created.text()).toBe(200);
    const subjectId = (await created.json()).data.subjectId as string;

    const enc = await apiCtx.post('/api/encounters', {
      headers: headersA,
      data: {
        branchId: BRANCH_DEMO,
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
    const headersB = {
      Authorization: `Bearer ${(await loginB.json()).data.accessToken}`,
    };

    const subjCruzado = await apiCtx.get(`/api/subjects/${subjectId}`, { headers: headersB });
    expect(subjCruzado.status()).toBe(404);

    const encCruzado = await apiCtx.get(`/api/encounters/${encounterId}`, { headers: headersB });
    expect(encCruzado.status()).toBe(404);

    const recordCruzado = await apiCtx.get(`/api/subjects/${subjectId}/record`, {
      headers: headersB,
    });
    expect([403, 404]).toContain(recordCruzado.status());
  });

  test('S.5 mass-assignment: tenantId ajeno en body se ignora (claims mandan)', async ({
    apiCtx,
  }) => {
    const sesion = await sesionValida(apiCtx);
    const claims = claimsDe(sesion.accessToken);
    const tenantClaim = String(claims.tenant_id ?? claims.tenantId ?? sesion.tenantId);
    const tenantAjeno = '00000000-0000-0000-0000-000000000099';

    const alta = await apiCtx.post('/api/subjects', {
      headers: autorizacion(sesion),
      data: {
        branchId: BRANCH_DEMO,
        tenantId: tenantAjeno,
        TenantId: tenantAjeno,
      },
    });
    expect(alta.status(), await alta.text()).toBe(200);
    const subjectId = (await alta.json()).data.subjectId as string;

    const lectura = await apiCtx.get(`/api/subjects/${subjectId}`, {
      headers: autorizacion(sesion),
    });
    expect(lectura.status()).toBe(200);
    const data = (await lectura.json()).data;
    if (data.tenantId) {
      expect(data.tenantId).toBe(tenantClaim);
      expect(data.tenantId).not.toBe(tenantAjeno);
    }

    const devicePublicId = idE2E('mass');
    const device = await apiCtx.post('/api/devices/register', {
      headers: autorizacion(sesion),
      data: {
        devicePublicId,
        displayName: 'mass-assignment',
        tenantId: tenantAjeno,
      },
    });
    expect(device.status()).toBe(200);
    const deviceRead = await apiCtx.get(`/api/devices/${devicePublicId}`, {
      headers: autorizacion(sesion),
    });
    expect(deviceRead.status()).toBe(200);
  });
});
