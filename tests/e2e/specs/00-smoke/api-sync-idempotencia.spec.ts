import { test, expect, autorizacion, idE2E, sesionValida } from '../../fixtures/api';

/**
 * Idempotencia al capturar comandos de la cola local (ADR-014, doc 03 §4).
 *
 * Se valida por la respuesta del API (`accepted` vs `duplicate`), nunca borrando
 * filas: la base de Dev es compartida y `DELETE`/`TRUNCATE` están prohibidos.
 * Cada corrida usa claves propias (`e2e-…`) para no pisar datos de nadie.
 */
test.describe('00 — Contrato API · cola e idempotencia', () => {
  test('POST /api/sync/commands sin token responde 401', async ({ apiCtx }) => {
    const res = await apiCtx.post('/api/sync/commands', {
      data: {
        idempotencyKey: idE2E('sin-token'),
        commandType: 'e2e.contract.noop',
        payloadJson: '{}',
        occurredAtUtc: new Date().toISOString(),
      },
    });
    expect(res.status()).toBe(401);
  });

  test('el mismo IdempotencyKey repetido no duplica efecto', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const clave = idE2E('idem');
    const sobre = {
      idempotencyKey: clave,
      commandType: 'e2e.contract.noop',
      payloadJson: JSON.stringify({ origen: 'suite-contrato-api' }),
      occurredAtUtc: new Date().toISOString(),
      deviceId: idE2E('dev'),
    };

    const primera = await apiCtx.post('/api/sync/commands', {
      headers: autorizacion(sesion),
      data: sobre,
    });
    expect(primera.status()).toBe(200);
    const cuerpo1 = await primera.json();
    expect(cuerpo1.success).toBe(true);
    expect(cuerpo1.data.idempotencyKey).toBe(clave);
    expect(cuerpo1.data.status).toBe('accepted');
    expect(typeof cuerpo1.data.serverEntityId).toBe('string');
    expect(cuerpo1.data.serverEntityId.length).toBeGreaterThan(0);

    const reintento = await apiCtx.post('/api/sync/commands', {
      headers: autorizacion(sesion),
      data: sobre,
    });
    expect(reintento.status()).toBe(200);
    const cuerpo2 = await reintento.json();
    expect(cuerpo2.data.status, 'el reintento debe reconocerse como duplicado').toBe('duplicate');
    expect(
      cuerpo2.data.serverEntityId,
      'el duplicado debe devolver el mismo identificador del servidor, no uno nuevo',
    ).toBe(cuerpo1.data.serverEntityId);
  });

  test('claves distintas producen efectos distintos', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const base = {
      commandType: 'e2e.contract.noop',
      payloadJson: '{}',
      occurredAtUtc: new Date().toISOString(),
    };

    const a = await apiCtx.post('/api/sync/commands', {
      headers: autorizacion(sesion),
      data: { ...base, idempotencyKey: idE2E('a') },
    });
    const b = await apiCtx.post('/api/sync/commands', {
      headers: autorizacion(sesion),
      data: { ...base, idempotencyKey: idE2E('b') },
    });

    const cuerpoA = await a.json();
    const cuerpoB = await b.json();
    expect(cuerpoA.data.status).toBe('accepted');
    expect(cuerpoB.data.status).toBe('accepted');
    expect(cuerpoA.data.serverEntityId).not.toBe(cuerpoB.data.serverEntityId);
  });

  test('IdempotencyKey vacía se rechaza con 400', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const res = await apiCtx.post('/api/sync/commands', {
      headers: autorizacion(sesion),
      data: {
        idempotencyKey: '',
        commandType: 'e2e.contract.noop',
        payloadJson: '{}',
        occurredAtUtc: new Date().toISOString(),
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('CommandType vacío se rechaza con 400', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const res = await apiCtx.post('/api/sync/commands', {
      headers: autorizacion(sesion),
      data: {
        idempotencyKey: idE2E('sin-tipo'),
        commandType: '',
        payloadJson: '{}',
        occurredAtUtc: new Date().toISOString(),
      },
    });
    expect(res.status()).toBe(400);
  });

  const BRANCH_DEMO = '22222222-2222-2222-2222-222222222222';

  test('subject.create vía sync acepta y crea sujeto (idempotente)', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const clave = idE2E('subj-sync');
    const sobre = {
      idempotencyKey: clave,
      commandType: 'subject.create',
      payloadJson: JSON.stringify({ branchId: BRANCH_DEMO }),
      occurredAtUtc: new Date().toISOString(),
    };

    const primera = await apiCtx.post('/api/sync/commands', {
      headers: autorizacion(sesion),
      data: sobre,
    });
    expect(primera.status(), await primera.text()).toBe(200);
    const cuerpo1 = await primera.json();
    expect(cuerpo1.data.status).toBe('accepted');
    expect(cuerpo1.data.serverEntityId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );

    const get = await apiCtx.get(`/api/subjects/${cuerpo1.data.serverEntityId}`, {
      headers: autorizacion(sesion),
    });
    expect(get.status(), await get.text()).toBe(200);

    const reintento = await apiCtx.post('/api/sync/commands', {
      headers: autorizacion(sesion),
      data: sobre,
    });
    expect(reintento.status()).toBe(200);
    const cuerpo2 = await reintento.json();
    expect(cuerpo2.data.status).toBe('duplicate');
    expect(cuerpo2.data.serverEntityId).toBe(cuerpo1.data.serverEntityId);
  });

  test('encounter.open vía sync acepta y es idempotente', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const headers = autorizacion(sesion);

    const subj = await apiCtx.post('/api/subjects', {
      headers,
      data: { branchId: BRANCH_DEMO },
    });
    expect(subj.status(), await subj.text()).toBe(200);
    const subjectId = (await subj.json()).data.subjectId as string;

    const clave = idE2E('enc-sync');
    const sobre = {
      idempotencyKey: clave,
      commandType: 'encounter.open',
      payloadJson: JSON.stringify({
        branchId: BRANCH_DEMO,
        subjectId,
        encounterType: 'urgencias',
      }),
      occurredAtUtc: new Date().toISOString(),
    };

    const primera = await apiCtx.post('/api/sync/commands', { headers, data: sobre });
    expect(primera.status(), await primera.text()).toBe(200);
    const cuerpo1 = await primera.json();
    expect(cuerpo1.data.status).toBe('accepted');
    expect(cuerpo1.data.serverEntityId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );

    const get = await apiCtx.get(`/api/encounters/${cuerpo1.data.serverEntityId}`, {
      headers,
    });
    expect(get.status(), await get.text()).toBe(200);

    const reintento = await apiCtx.post('/api/sync/commands', { headers, data: sobre });
    expect(reintento.status()).toBe(200);
    const cuerpo2 = await reintento.json();
    expect(cuerpo2.data.status).toBe('duplicate');
    expect(cuerpo2.data.serverEntityId).toBe(cuerpo1.data.serverEntityId);
  });

  test('triage.save Full sin encounterId responde 400', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const res = await apiCtx.post('/api/sync/commands', {
      headers: autorizacion(sesion),
      data: {
        idempotencyKey: idE2E('triage-bad'),
        commandType: 'triage.save',
        payloadJson: '{}',
        occurredAtUtc: new Date().toISOString(),
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('appointment.state cancelada sin motivo responde 400', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const res = await apiCtx.post('/api/sync/commands', {
      headers: autorizacion(sesion),
      data: {
        idempotencyKey: idE2E('appt-cancel-bad'),
        commandType: 'appointment.state',
        payloadJson: JSON.stringify({
          appointmentId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          toState: 'cancelada',
        }),
        occurredAtUtc: new Date().toISOString(),
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('allergyStatus.set vía sync exige subjectId (Full)', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const res = await apiCtx.post('/api/sync/commands', {
      headers: autorizacion(sesion),
      data: {
        idempotencyKey: idE2E('allergy-bad'),
        commandType: 'allergyStatus.set',
        payloadJson: JSON.stringify({ status: 'niega' }),
        occurredAtUtc: new Date().toISOString(),
      },
    });
    expect(res.status()).toBe(400);
  });
});
