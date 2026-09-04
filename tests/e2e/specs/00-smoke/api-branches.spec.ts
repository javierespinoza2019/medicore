/**
 * Contrato API — sucursales y perfil de tenant (M11 / WS-C).
 * PUT de sucursal cuyo BranchId pertenece a otro tenant → 404 (no 403).
 * PUT con BranchId nuevo = upsert (alta) en el tenant del token.
 */
import { test, expect, api, autorizacion, idE2E, sesionValida } from '../../fixtures/api';

const CENTRAL_DEMO = '22222222-2222-2222-2222-222222222222';
const GUID_INEXISTENTE = '99999999-9999-9999-9999-999999999999';

test.describe('00 — Contrato API · establecimiento / sucursales (M11)', () => {
  test('GET /api/tenant/profile devuelve el tenant del token', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const res = await apiCtx.get('/api/tenant/profile', { headers: autorizacion(sesion) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.tenantId).toBe(sesion.tenantId);
    expect(body.data.code).toBe(api.tenant);
    expect(body.data).toHaveProperty('legalName');
    expect(body.data).toHaveProperty('rfc');
  });

  test('GET /api/branches lista sucursales del tenant autenticado', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const res = await apiCtx.get('/api/branches', { headers: autorizacion(sesion) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    for (const b of body.data) {
      expect(b.tenantId).toBe(sesion.tenantId);
      expect(b).toHaveProperty('facilityType');
      expect(b).toHaveProperty('hasEmergencyService');
    }
  });

  test('GET /api/branches/{id} de la sucursal demo responde 200', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const res = await apiCtx.get(`/api/branches/${CENTRAL_DEMO}`, {
      headers: autorizacion(sesion),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.branchId.toLowerCase()).toBe(CENTRAL_DEMO);
    expect(body.data.code).toBe('CENTRAL');
  });

  test('GET /api/branches/{id} inexistente responde 404', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const res = await apiCtx.get(`/api/branches/${GUID_INEXISTENTE}`, {
      headers: autorizacion(sesion),
    });
    expect(res.status()).toBe(404);
  });

  test('PUT con BranchId nuevo hace alta en el tenant sin inventar FacilityType', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const nuevoId = crypto.randomUUID();
    const code = idE2E('br').slice(0, 64);

    const res = await apiCtx.put(`/api/branches/${nuevoId}`, {
      headers: autorizacion(sesion),
      data: {
        code,
        name: 'Sucursal E2E M11',
        isActive: true,
        facilityType: null,
        hasEmergencyService: null,
        addressStreet: null,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.branchId.toLowerCase()).toBe(nuevoId.toLowerCase());
    expect(body.data.code).toBe(code);
    expect(body.data.facilityType).toBeNull();
    expect(body.data.hasEmergencyService).toBeNull();
    expect(body.data.addressStreet).toBeNull();
  });

  test('PUT actualiza domicilio preservando FacilityType/HasEmergencyService en null', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const marca = idE2E('calle');

    const lectura = await apiCtx.get(`/api/branches/${CENTRAL_DEMO}`, {
      headers: autorizacion(sesion),
    });
    expect(lectura.status()).toBe(200);
    const actual = (await lectura.json()).data;

    const res = await apiCtx.put(`/api/branches/${CENTRAL_DEMO}`, {
      headers: autorizacion(sesion),
      data: {
        code: actual.code,
        name: actual.name,
        legalName: actual.legalName,
        addressStreet: marca,
        addressNumber: actual.addressNumber,
        addressNeighborhood: actual.addressNeighborhood,
        addressMunicipality: actual.addressMunicipality,
        addressState: actual.addressState,
        addressPostalCode: actual.addressPostalCode,
        phoneNumber: actual.phoneNumber,
        healthLicense: actual.healthLicense,
        timeZoneId: actual.timeZoneId,
        responsiblePhysicianProfessionalId: actual.responsiblePhysicianProfessionalId,
        facilityType: null,
        hasEmergencyService: null,
        isActive: actual.isActive,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.addressStreet).toBe(marca);
    expect(body.data.facilityType).toBeNull();
    expect(body.data.hasEmergencyService).toBeNull();
  });

  test('PUT /api/tenant/profile actualiza primaryColorToken (white-label)', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const lectura = await apiCtx.get('/api/tenant/profile', { headers: autorizacion(sesion) });
    expect(lectura.status()).toBe(200);
    const actual = (await lectura.json()).data;
    const token = '#0EA5E9';

    const res = await apiCtx.put('/api/tenant/profile', {
      headers: autorizacion(sesion),
      data: {
        name: actual.name,
        legalName: actual.legalName,
        rfc: actual.rfc,
        primaryColorToken: token,
      },
    });
    expect(res.status(), await res.text()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.primaryColorToken).toBe(token);

    // Restaura el token previo (null permitido) para no ensuciar demo compartida.
    const restore = await apiCtx.put('/api/tenant/profile', {
      headers: autorizacion(sesion),
      data: {
        name: actual.name,
        legalName: actual.legalName,
        rfc: actual.rfc,
        primaryColorToken: actual.primaryColorToken,
      },
    });
    expect(restore.status()).toBe(200);
  });

  test('ciclo logo tenant: PUT imagen → GET bytes → DELETE limpia', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    // PNG 1×1 mínimo (sin PHI).
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );

    const upload = await apiCtx.put('/api/tenant/logo', {
      headers: autorizacion(sesion),
      multipart: {
        file: {
          name: 'logo-e2e.png',
          mimeType: 'image/png',
          buffer: png,
        },
      },
    });
    expect(upload.status(), await upload.text()).toBe(200);
    const uploaded = await upload.json();
    expect(uploaded.success).toBe(true);
    expect(uploaded.data.logoRelativePath).toMatch(/\/Tenant\//i);
    expect(uploaded.data.logoRelativePath).toMatch(/logo\.png$/i);

    const getLogo = await apiCtx.get('/api/tenant/logo', { headers: autorizacion(sesion) });
    expect(getLogo.status()).toBe(200);
    expect(getLogo.headers()['content-type'] ?? '').toMatch(/image\/png/i);
    const bytes = await getLogo.body();
    expect(bytes.byteLength).toBeGreaterThan(10);

    const getBranchFallback = await apiCtx.get(`/api/branches/${CENTRAL_DEMO}/logo`, {
      headers: autorizacion(sesion),
    });
    expect(getBranchFallback.status()).toBe(200);

    const clear = await apiCtx.delete('/api/tenant/logo', { headers: autorizacion(sesion) });
    expect(clear.status(), await clear.text()).toBe(200);
    const cleared = await clear.json();
    expect(cleared.data.logoRelativePath).toBeNull();

    expect((await apiCtx.get('/api/tenant/logo', { headers: autorizacion(sesion) })).status()).toBe(
      404,
    );
  });

  test('endpoints de branches/tenant rechazan sin token', async ({ apiCtx }) => {
    expect((await apiCtx.get('/api/branches')).status()).toBe(401);
    expect((await apiCtx.get('/api/tenant/profile')).status()).toBe(401);
    expect((await apiCtx.get('/api/tenant/logo')).status()).toBe(401);
    expect(
      (
        await apiCtx.put(`/api/branches/${CENTRAL_DEMO}`, {
          data: { code: 'X', name: 'Y', isActive: true },
        })
      ).status(),
    ).toBe(401);
  });
});

test.describe('08 — Multi-tenant · sucursales (PUT/GET cruzado → 404)', () => {
  const haySegundoTenant = api.tenantB.trim().length > 0 && api.tenantB !== api.tenant;

  test.skip(
    !haySegundoTenant,
    `Requiere MEDICORE_TENANT_B. Aprovisionar con seeds/003_provision_tenant.sql (sin inventar domicilio).`,
  );

  test('token del tenant B no lee ni actualiza sucursales del tenant A (404, no 403)', async ({ apiCtx }) => {
    const sesionA = await sesionValida(apiCtx);
    const listA = await apiCtx.get('/api/branches', { headers: autorizacion(sesionA) });
    const branchA = (await listA.json()).data[0];

    const resB = await apiCtx.post('/api/auth/login', {
      data: { tenantCode: api.tenantB, userName: api.usuario, password: api.password },
    });
    expect(resB.status()).toBe(200);
    const sesionB = {
      accessToken: (await resB.json()).data.accessToken,
      tenantId: '',
      userId: '',
      refresh: '',
    };

    const getCruzado = await apiCtx.get(`/api/branches/${branchA.branchId}`, {
      headers: autorizacion(sesionB),
    });
    expect(getCruzado.status(), 'no debe confirmar existencia con 403').toBe(404);

    const putCruzado = await apiCtx.put(`/api/branches/${branchA.branchId}`, {
      headers: autorizacion(sesionB),
      data: {
        code: 'HACK',
        name: 'Hack',
        isActive: true,
        facilityType: null,
        hasEmergencyService: null,
      },
    });
    expect(putCruzado.status(), 'no debe confirmar existencia con 403').toBe(404);
  });
});
