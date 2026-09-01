import {
  test,
  expect,
  autorizacion,
  iniciarSesion,
  sesionValida,
  idE2E,
} from '../../fixtures/api';

/**
 * Contrato CRUD profesionales + especialidades (M1 restante).
 * Baja = SoftDelete (HTTP DELETE ≠ DELETE SQL).
 */
test.describe.configure({ mode: 'serial' });

test.describe('00 — Contrato API · professionals / specialties', () => {
  test('admin lista especialidades y profesionales del seed', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const headers = autorizacion(sesion);

    const specs = await apiCtx.get('/api/specialties?onlyActive=false', { headers });
    expect(specs.status(), await specs.text()).toBe(200);
    const specList = (await specs.json()).data as Array<{ specialtyId: string; name: string }>;
    expect(Array.isArray(specList)).toBe(true);
    expect(specList.length).toBeGreaterThanOrEqual(2);

    const profs = await apiCtx.get('/api/professionals?onlyActive=false', { headers });
    expect(profs.status(), await profs.text()).toBe(200);
    const list = (await profs.json()).data as Array<{ healthcareProfessionalId: string }>;
    expect(list.length).toBeGreaterThanOrEqual(2);
  });

  test('admin crea especialidad, profesional, actualiza y baja lógica', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const headers = autorizacion(sesion);
    const stamp = idE2E('prof');
    const specialtyId = crypto.randomUUID();
    const professionalId = crypto.randomUUID();
    const code = `E2E_${stamp}`.slice(0, 64).toUpperCase();

    const upsertSpec = await apiCtx.put(`/api/specialties/${specialtyId}`, {
      headers,
      data: { code, name: `Especialidad ${stamp}`, isActive: true },
    });
    expect(upsertSpec.status(), await upsertSpec.text()).toBe(200);
    const spec = (await upsertSpec.json()).data;
    expect(spec.specialtyId).toBe(specialtyId);
    expect(spec.code).toBe(code);

    const create = await apiCtx.post('/api/professionals', {
      headers,
      data: {
        healthcareProfessionalId: professionalId,
        fullName: `Dr. E2E ${stamp}`,
        professionalLicense: `CED-E2E-${stamp}`.slice(0, 64),
        specialtyId,
        isActive: true,
      },
    });
    expect(create.status(), await create.text()).toBe(200);
    const created = (await create.json()).data;
    expect(created.healthcareProfessionalId).toBe(professionalId);
    expect(created.specialtyName).toContain('Especialidad');

    const update = await apiCtx.put(`/api/professionals/${professionalId}`, {
      headers,
      data: {
        fullName: `Dr. E2E Actualizado ${stamp}`,
        professionalLicense: created.professionalLicense,
        specialtyId,
        isActive: false,
      },
    });
    expect(update.status(), await update.text()).toBe(200);
    expect((await update.json()).data.isActive).toBe(false);

    const soft = await apiCtx.delete(`/api/professionals/${professionalId}`, { headers });
    expect(soft.status(), await soft.text()).toBe(200);

    const getGone = await apiCtx.get(`/api/professionals/${professionalId}`, { headers });
    expect(getGone.status()).toBe(404);

    const softSpec = await apiCtx.delete(`/api/specialties/${specialtyId}`, { headers });
    expect(softSpec.status(), await softSpec.text()).toBe(200);
  });

  test('cédula duplicada en el mismo tenant → 409', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const headers = autorizacion(sesion);
    const stamp = idE2E('dup');
    const license = `CED-DUP-${stamp}`.slice(0, 64);

    const first = await apiCtx.post('/api/professionals', {
      headers,
      data: {
        fullName: `Primero ${stamp}`,
        professionalLicense: license,
        isActive: true,
      },
    });
    expect(first.status(), await first.text()).toBe(200);

    const second = await apiCtx.post('/api/professionals', {
      headers,
      data: {
        fullName: `Segundo ${stamp}`,
        professionalLicense: license,
        isActive: true,
      },
    });
    expect(second.status(), await second.text()).toBe(409);
  });

  test('médico puede listar; no puede crear (403)', async ({ apiCtx }) => {
    const login = await iniciarSesion(apiCtx, {
      userName: 'alejandro.garcia@medicore.mx',
      password: 'Admin123!',
    });
    expect(login.status()).toBe(200);
    const headers = { Authorization: `Bearer ${(await login.json()).data.accessToken}` };

    const list = await apiCtx.get('/api/professionals?onlyActive=true', { headers });
    expect(list.status()).toBe(200);

    const create = await apiCtx.post('/api/professionals', {
      headers,
      data: { fullName: 'No debe crearse', isActive: true },
    });
    expect(create.status()).toBe(403);
  });

  test('caja no lista profesionales (403); sin token 401', async ({ apiCtx }) => {
    const login = await iniciarSesion(apiCtx, {
      userName: 'monica.soto@medicore.mx',
      password: 'Admin123!',
    });
    expect(login.status()).toBe(200);
    const headers = { Authorization: `Bearer ${(await login.json()).data.accessToken}` };

    const deny = await apiCtx.get('/api/professionals', { headers });
    expect(deny.status()).toBe(403);

    const anon = await apiCtx.get('/api/professionals');
    expect(anon.status()).toBe(401);
  });
});
