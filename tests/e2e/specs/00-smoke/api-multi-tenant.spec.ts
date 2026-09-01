import { test, expect, api, autorizacion, claimsDe, idE2E, sesionValida } from '../../fixtures/api';

/**
 * Aislamiento multi-tenant en el API (puerta F0).
 * El TenantId sale del claim JWT, nunca del cuerpo ni de la ruta.
 *
 * El seed sintético de Dev trae `demo` (001) y `bravo` (008). Configure
 * `MEDICORE_TENANT_B=bravo` (la suite Dev lo exporta si falta). Sin B ⇒ skip.
 */
const haySegundoTenant = api.tenantB.trim().length > 0 && api.tenantB !== api.tenant;

test.describe('00 — Contrato API · aislamiento multi-tenant', () => {
  test('el tenant del token corresponde al tenant autenticado', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const claims = claimsDe(sesion.accessToken);
    expect(claims.tenant_id).toBe(sesion.tenantId);

    const me = await apiCtx.get('/api/auth/me', { headers: autorizacion(sesion) });
    const body = await me.json();
    expect(body.data.tenantId).toBe(sesion.tenantId);
  });

  test('un dispositivo registrado sólo se lee con el token de su tenant', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const devicePublicId = idE2E('device');

    const alta = await apiCtx.post('/api/devices/register', {
      headers: autorizacion(sesion),
      data: { devicePublicId, displayName: 'Estación E2E contrato' },
    });
    expect(alta.status()).toBe(200);
    const cuerpoAlta = await alta.json();
    expect(cuerpoAlta.data.devicePublicId).toBe(devicePublicId);
    expect(
      cuerpoAlta.data.isApproved,
      'un dispositivo recién registrado no debe quedar aprobado por omisión',
    ).toBe(false);

    const lectura = await apiCtx.get(`/api/devices/${devicePublicId}`, {
      headers: autorizacion(sesion),
    });
    expect(lectura.status()).toBe(200);

    const inexistente = await apiCtx.get(`/api/devices/${idE2E('ajeno')}`, {
      headers: autorizacion(sesion),
    });
    expect(inexistente.status(), 'un id que no pertenece al tenant no debe resolverse').toBe(404);
  });

  test('endpoints con TenantId de claims rechazan petición sin token', async ({ apiCtx }) => {
    const sinToken = await apiCtx.post('/api/devices/register', {
      data: { devicePublicId: idE2E('anon'), displayName: 'Sin token' },
    });
    expect(sinToken.status()).toBe(401);
  });

});

test.describe('00 — Contrato API · lectura cruzada entre tenants', () => {
  test.skip(
    !haySegundoTenant,
    `Requiere un segundo tenant sintético (seed 008_dev_tenant_bravo.sql). Configure MEDICORE_TENANT_B=bravo.`,
  );

  test('un token del tenant A no lee datos del tenant B', async ({ apiCtx }) => {
    const sesionA = await sesionValida(apiCtx);
    const devicePublicId = idE2E('cross');
    await apiCtx.post('/api/devices/register', {
      headers: autorizacion(sesionA),
      data: { devicePublicId, displayName: 'Estación tenant A' },
    });

    const resB = await apiCtx.post('/api/auth/login', {
      data: { tenantCode: api.tenantB, userName: api.usuario, password: api.password },
    });
    expect(resB.status(), `no hay credenciales válidas para el tenant ${api.tenantB}`).toBe(200);
    const sesionB = {
      accessToken: (await resB.json()).data.accessToken,
      tenantId: '',
      userId: '',
      refresh: '',
    };

    const lecturaCruzada = await apiCtx.get(`/api/devices/${devicePublicId}`, {
      headers: autorizacion(sesionB),
    });
    expect(lecturaCruzada.status(), 'el tenant B no debe ver el dispositivo del tenant A').toBe(404);
  });
});
