import {
  test,
  expect,
  iniciarSesion,
} from '../../fixtures/api';

/**
 * Consulta SOAP → receta. M12: SC-01/SC-02 y firma de nota contra API real.
 * UI de captura SOAP: `flujo-consulta-ui.spec.ts` (proyecto chromium + Vite).
 */
test.describe.configure({ mode: 'serial' });

const BRANCH_DEMO = '22222222-2222-2222-2222-222222222222';
const MED_PARACETAMOL = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001';

test.describe('04 — Consulta / receta', () => {
  test('alerta de alergia bloqueante antes de prescribir (SC-01)', async ({ apiCtx }) => {
    const login = await iniciarSesion(apiCtx, {
      userName: 'alejandro.garcia@medicore.mx',
      password: 'Admin123!',
    });
    expect(login.status()).toBe(200);
    const headers = { Authorization: `Bearer ${(await login.json()).data.accessToken}` };

    const created = await apiCtx.post('/api/subjects', {
      headers,
      data: { branchId: BRANCH_DEMO },
    });
    const subjectId = (await created.json()).data.subjectId as string;
    const record = await apiCtx.get(`/api/subjects/${subjectId}/record`, { headers });
    expect((await record.json()).data.allergyStatus.status).toBe('no_interrogado');

    const enc = await apiCtx.post('/api/encounters', {
      headers,
      data: { branchId: BRANCH_DEMO, subjectId, encounterType: 'consulta_externa' },
    });
    const encounterId = (await enc.json()).data.encounterId as string;

    const blocked = await apiCtx.post(`/api/encounters/${encounterId}/prescriptions`, {
      headers,
      data: {
        items: [
          {
            medicationId: MED_PARACETAMOL,
            dose: { valor: 500, unidad: 'mg', estado: 'medido', origen: 'medido' },
            route: 'oral',
            frequency: { kind: 'every_n_hours', n: 8 },
            durationDays: 3,
            quantity: 9,
            refillsAllowed: 0,
          },
        ],
      },
    });
    expect(blocked.status(), await blocked.text()).toBe(409);
  });

  test('confirma alergia con justificación (SC-02)', async ({ apiCtx }) => {
    const login = await iniciarSesion(apiCtx, {
      userName: 'alejandro.garcia@medicore.mx',
      password: 'Admin123!',
    });
    expect(login.status()).toBe(200);
    const headers = { Authorization: `Bearer ${(await login.json()).data.accessToken}` };

    const created = await apiCtx.post('/api/subjects', {
      headers,
      data: { branchId: BRANCH_DEMO },
    });
    const subjectId = (await created.json()).data.subjectId as string;
    await apiCtx.get(`/api/subjects/${subjectId}/record`, { headers });

    const setStatus = await apiCtx.put(`/api/subjects/${subjectId}/allergy-status`, {
      headers,
      data: { status: 'no_interrogado' },
    });
    expect(setStatus.status()).toBe(200);
    const captureEventId = (await setStatus.json()).data.statusEventId as string;

    const add = await apiCtx.post(`/api/subjects/${subjectId}/allergies`, {
      headers,
      data: { substance: 'Paracetamol', reactionType: 'alergia', severity: 'moderada' },
    });
    expect(add.status(), await add.text()).toBe(200);

    const enc = await apiCtx.post('/api/encounters', {
      headers,
      data: { branchId: BRANCH_DEMO, subjectId, encounterType: 'consulta_externa' },
    });
    const encounterId = (await enc.json()).data.encounterId as string;

    const item = {
      medicationId: MED_PARACETAMOL,
      dose: { valor: 500, unidad: 'mg', estado: 'medido', origen: 'medido' },
      route: 'oral',
      frequency: { kind: 'every_n_hours', n: 8 },
      durationDays: 3,
      quantity: 9,
      refillsAllowed: 0,
    };

    const sinJust = await apiCtx.post(`/api/encounters/${encounterId}/prescriptions`, {
      headers,
      data: { allergyStatusCaptureEventId: captureEventId, items: [item] },
    });
    expect(sinJust.status(), await sinJust.text()).toBe(409);

    const conJust = await apiCtx.post(`/api/encounters/${encounterId}/prescriptions`, {
      headers,
      data: {
        allergyStatusCaptureEventId: captureEventId,
        allergyOverrideJustification: 'Justificación sintética E2E SC-02',
        items: [item],
      },
    });
    expect(conJust.status(), await conJust.text()).toBe(200);
    expect((await conJust.json()).data.allergyOverrideJustification).toBeTruthy();
  });
});
