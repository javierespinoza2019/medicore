import {
  test,
  expect,
  autorizacion,
  sesionValida,
  iniciarSesion,
} from '../../fixtures/api';

/**
 * Contrato de agenda (M9 / WS-J).
 * 409 por traslape; cancelar exige motivo; sujeto sin identidad completa se puede agendar.
 */
test.describe.configure({ mode: 'serial' });

const BRANCH_DEMO = '22222222-2222-2222-2222-222222222222';
const PROFESSIONAL_D1 = '66666666-6666-6666-6666-666666660001';
const ROOM_101 = '77777777-7777-7777-7777-777777770001';

test.describe('00 — Contrato API · appointments', () => {
  test('GET /api/consulting-rooms lista consultorios de CENTRAL', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const res = await apiCtx.get(`/api/consulting-rooms?branchId=${BRANCH_DEMO}`, {
      headers: autorizacion(sesion),
    });
    expect(res.status(), await res.text()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('PUT consulting-room vincula especialidad y médicos', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const specialtyMg = '55555555-5555-5555-5555-555555550001';
    const roomId = crypto.randomUUID();
    const code = `LNK-${Date.now().toString(36).slice(-6).toUpperCase()}`;

    const put = await apiCtx.put(`/api/consulting-rooms/${roomId}`, {
      headers: autorizacion(sesion),
      data: {
        branchId: BRANCH_DEMO,
        code,
        name: `Consultorio vínculo ${code}`,
        isActive: true,
        specialtyId: specialtyMg,
        professionalIds: [PROFESSIONAL_D1],
      },
    });
    expect(put.status(), await put.text()).toBe(200);
    const body = await put.json();
    expect(body.success).toBe(true);
    expect(body.data.specialtyId.toLowerCase()).toBe(specialtyMg);
    expect(body.data.specialtyName).toMatch(/medicina general/i);
    expect(body.data.professionalIds.map((x: string) => x.toLowerCase())).toContain(
      PROFESSIONAL_D1.toLowerCase(),
    );

    // Desactivar conservando vínculos
    const deactivate = await apiCtx.put(`/api/consulting-rooms/${roomId}`, {
      headers: autorizacion(sesion),
      data: {
        branchId: BRANCH_DEMO,
        code,
        name: body.data.name,
        isActive: false,
        specialtyId: specialtyMg,
        professionalIds: [PROFESSIONAL_D1],
      },
    });
    expect(deactivate.status(), await deactivate.text()).toBe(200);
    expect((await deactivate.json()).data.isActive).toBe(false);
  });

  test('crear cita de sujeto sin identidad + 409 por traslape + cancelar con motivo', async ({
    apiCtx,
  }) => {
    const sesion = await sesionValida(apiCtx);

    const subjectRes = await apiCtx.post('/api/subjects', {
      headers: autorizacion(sesion),
      data: { branchId: BRANCH_DEMO },
    });
    expect(subjectRes.status(), await subjectRes.text()).toBe(200);
    const subjectId = (await subjectRes.json()).data.subjectId as string;

    const day = new Date();
    day.setUTCDate(day.getUTCDate() + 14);
    day.setUTCHours(15, 0, 0, 0);
    const start = day.toISOString();
    const endDate = new Date(day);
    endDate.setUTCMinutes(30);
    const end = endDate.toISOString();

    const create = await apiCtx.post('/api/appointments', {
      headers: autorizacion(sesion),
      data: {
        branchId: BRANCH_DEMO,
        subjectId,
        professionalId: PROFESSIONAL_D1,
        roomId: ROOM_101,
        scheduledStartUtc: start,
        scheduledEndUtc: end,
        notes: 'cita contrato M9',
      },
    });
    expect(create.status(), await create.text()).toBe(200);
    const created = await create.json();
    expect(created.success).toBe(true);
    expect(created.data.state).toBe('agendada');
    expect(created.data.subjectId).toBe(subjectId);
    const appointmentId = created.data.appointmentId as string;

    const overlap = await apiCtx.post('/api/appointments', {
      headers: autorizacion(sesion),
      data: {
        branchId: BRANCH_DEMO,
        subjectId,
        professionalId: PROFESSIONAL_D1,
        scheduledStartUtc: start,
        scheduledEndUtc: end,
      },
    });
    expect(overlap.status(), await overlap.text()).toBe(409);

    const cancelSinMotivo = await apiCtx.post(`/api/appointments/${appointmentId}/state`, {
      headers: autorizacion(sesion),
      data: { toState: 'cancelada' },
    });
    expect(cancelSinMotivo.status(), await cancelSinMotivo.text()).toBe(400);

    const cancel = await apiCtx.post(`/api/appointments/${appointmentId}/state`, {
      headers: autorizacion(sesion),
      data: { toState: 'cancelada', reason: 'Paciente reprogramó' },
    });
    expect(cancel.status(), await cancel.text()).toBe(200);
    const cancelled = await cancel.json();
    expect(cancelled.data.state).toBe('cancelada');
  });

  test('flujo intermedio llego → en_espera → en_consulta → atendida', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const subject = await apiCtx.post('/api/subjects', {
      headers: autorizacion(sesion),
      data: { branchId: BRANCH_DEMO },
    });
    expect(subject.status()).toBe(200);
    const subjectId = (await subject.json()).data.subjectId as string;

    const start = new Date(Date.now() + 4 * 3600_000);
    start.setMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 30 * 60_000);

    const create = await apiCtx.post('/api/appointments', {
      headers: autorizacion(sesion),
      data: {
        branchId: BRANCH_DEMO,
        subjectId,
        professionalId: PROFESSIONAL_D1,
        scheduledStartUtc: start.toISOString(),
        scheduledEndUtc: end.toISOString(),
        notes: 'flujo intermedio agenda',
      },
    });
    expect(create.status(), await create.text()).toBe(200);
    const appointmentId = (await create.json()).data.appointmentId as string;

    const bad = await apiCtx.post(`/api/appointments/${appointmentId}/state`, {
      headers: autorizacion(sesion),
      data: { toState: 'en_consulta' },
    });
    expect(bad.status(), await bad.text()).toBe(400);

    for (const toState of ['llego', 'en_espera', 'en_consulta', 'atendida'] as const) {
      const res = await apiCtx.post(`/api/appointments/${appointmentId}/state`, {
        headers: autorizacion(sesion),
        data: { toState },
      });
      expect(res.status(), await res.text()).toBe(200);
      expect((await res.json()).data.state).toBe(toState);
    }

    const terminal = await apiCtx.post(`/api/appointments/${appointmentId}/state`, {
      headers: autorizacion(sesion),
      data: { toState: 'llego' },
    });
    expect(terminal.status(), await terminal.text()).toBe(400);
  });

  test('mine=true sin profesional falla cerrado (lista vacía)', async ({ apiCtx }) => {
    // admin demo no tiene profesional ligado → mine debe devolver []
    const sesion = await sesionValida(apiCtx);
    const from = new Date().toISOString();
    const to = new Date(Date.now() + 86400000).toISOString();
    const res = await apiCtx.get(
      `/api/appointments?branchId=${BRANCH_DEMO}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&mine=true`,
      { headers: autorizacion(sesion) },
    );
    expect(res.status(), await res.text()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  test('medico con profesional puede listar mine', async ({ apiCtx }) => {
    const login = await iniciarSesion(apiCtx, {
      userName: 'alejandro.garcia@medicore.mx',
      password: 'Admin123!',
    });
    expect(login.status()).toBe(200);
    const medico = await login.json();
    expect(medico.data.healthcareProfessional?.healthcareProfessionalId).toBe(PROFESSIONAL_D1);

    const from = new Date().toISOString();
    const to = new Date(Date.now() + 86400000 * 30).toISOString();
    const res = await apiCtx.get(
      `/api/appointments?branchId=${BRANCH_DEMO}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&mine=true`,
      { headers: { Authorization: `Bearer ${medico.data.accessToken}` } },
    );
    expect(res.status(), await res.text()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    for (const a of body.data) {
      expect(a.professionalId.toLowerCase()).toBe(PROFESSIONAL_D1);
    }
  });

  test('sin token responde 401', async ({ apiCtx }) => {
    const res = await apiCtx.get(`/api/appointments?branchId=${BRANCH_DEMO}&from=2026-01-01&to=2026-01-02`);
    expect(res.status()).toBe(401);
  });

  test('agenda usa profesional del catálogo API (no mock doctors)', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const headers = autorizacion(sesion);

    const profs = await apiCtx.get('/api/professionals?onlyActive=true', { headers });
    expect(profs.status(), await profs.text()).toBe(200);
    const list = (await profs.json()).data as Array<{
      healthcareProfessionalId: string;
      fullName: string;
    }>;
    expect(list.length).toBeGreaterThanOrEqual(1);
    const professional = list.find((p) => p.healthcareProfessionalId === PROFESSIONAL_D1) ?? list[0];
    expect(professional.fullName.length).toBeGreaterThan(0);
    // IDs sintéticos del mock legado (d3/d4/…) no deben ser el catálogo de agenda.
    expect(professional.healthcareProfessionalId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(professional.healthcareProfessionalId).not.toMatch(/^d\d+$/i);

    const subjectRes = await apiCtx.post('/api/subjects', {
      headers,
      data: { branchId: BRANCH_DEMO },
    });
    expect(subjectRes.status(), await subjectRes.text()).toBe(200);
    const subjectId = (await subjectRes.json()).data.subjectId as string;

    const day = new Date();
    day.setUTCDate(day.getUTCDate() + 21);
    day.setUTCHours(11, 0, 0, 0);
    const start = day.toISOString();
    const endDate = new Date(day);
    endDate.setUTCMinutes(30);
    const end = endDate.toISOString();

    const create = await apiCtx.post('/api/appointments', {
      headers,
      data: {
        branchId: BRANCH_DEMO,
        subjectId,
        professionalId: professional.healthcareProfessionalId,
        scheduledStartUtc: start,
        scheduledEndUtc: end,
        notes: 'cita sin mocks/doctors',
      },
    });
    expect(create.status(), await create.text()).toBe(200);
    const created = await create.json();
    expect(created.data.professionalId.toLowerCase()).toBe(
      professional.healthcareProfessionalId.toLowerCase(),
    );
    expect(created.data.professionalFullName).toBeTruthy();

    await apiCtx.post(`/api/appointments/${created.data.appointmentId}/state`, {
      headers,
      data: { toState: 'cancelada', reason: 'Limpieza contrato agenda-profesionales' },
    });
  });
});
