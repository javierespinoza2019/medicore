import {
  test,
  expect,
  iniciarSesion,
} from '../../fixtures/api';

/**
 * Contrato de recetas (M8 / WS-I).
 * - 409 si falta captura explícita del estado alérgico
 * - 200 tras capturar aunque sea no_interrogado / paciente_no_puede_responder
 * - 422 con medicamento controlado (mensaje explícito)
 * - Firma fail closed con cédula (médico)
 */
test.describe.configure({ mode: 'serial' });

const BRANCH_DEMO = '22222222-2222-2222-2222-222222222222';
const MED_PARACETAMOL = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001';
const MED_MORFINA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0091';

async function abrirEpisodio(apiCtx: Parameters<typeof iniciarSesion>[0], tokenHeaders: Record<string, string>) {
  const created = await apiCtx.post('/api/subjects', {
    headers: tokenHeaders,
    data: { branchId: BRANCH_DEMO },
  });
  expect(created.status(), await created.text()).toBe(200);
  const subjectId = (await created.json()).data.subjectId as string;

  // Asegura expediente (estado semilla no_interrogado sin captura explícita)
  const record = await apiCtx.get(`/api/subjects/${subjectId}/record`, { headers: tokenHeaders });
  expect(record.status(), await record.text()).toBe(200);

  const enc = await apiCtx.post('/api/encounters', {
    headers: tokenHeaders,
    data: {
      branchId: BRANCH_DEMO,
      subjectId,
      encounterType: 'consulta_externa',
    },
  });
  expect(enc.status(), await enc.text()).toBe(200);
  const encounterId = (await enc.json()).data.encounterId as string;
  return { subjectId, encounterId };
}

function itemPayload(medicationId: string) {
  return {
    medicationId,
    dose: { valor: 500, unidad: 'mg', estado: 'medido', origen: 'medido' },
    route: 'oral',
    frequency: { kind: 'every_n_hours', n: 8 },
    durationDays: 5,
    quantity: 15,
    refillsAllowed: 0,
  };
}

test.describe('00 — Contrato API · prescriptions (M8)', () => {
  test('409 sin captura alérgica; 200 tras Set (incluso no_interrogado); 422 controlado; firma', async ({
    apiCtx,
  }) => {
    const loginMedico = await iniciarSesion(apiCtx, {
      userName: 'alejandro.garcia@medicore.mx',
      password: 'Admin123!',
    });
    expect(loginMedico.status(), await loginMedico.text()).toBe(200);
    const medicoBody = await loginMedico.json();
    const headers = { Authorization: `Bearer ${medicoBody.data.accessToken}` };
    expect(medicoBody.data.healthcareProfessional?.professionalLicense).toBeTruthy();

    const { subjectId, encounterId } = await abrirEpisodio(apiCtx, headers);

    const meds = await apiCtx.get('/api/medications?query=Paracetamol', { headers });
    expect(meds.status(), await meds.text()).toBe(200);
    const medList = (await meds.json()).data as { medicationId: string; isControlledSubstance: boolean }[];
    expect(medList.some((m) => m.medicationId === MED_PARACETAMOL)).toBeTruthy();
    expect(medList.every((m) => !m.isControlledSubstance)).toBeTruthy();

    // Sin captura explícita → 409
    const blocked = await apiCtx.post(`/api/encounters/${encounterId}/prescriptions`, {
      headers,
      data: { items: [itemPayload(MED_PARACETAMOL)] },
    });
    expect(blocked.status(), await blocked.text()).toBe(409);
    const blockedBody = await blocked.json();
    expect(String(blockedBody.message).toLowerCase()).toContain('captura');

    // Captura explícita con valor «no sé»
    const setStatus = await apiCtx.put(`/api/subjects/${subjectId}/allergy-status`, {
      headers,
      data: { status: 'no_interrogado' },
    });
    expect(setStatus.status(), await setStatus.text()).toBe(200);
    const captureEventId = (await setStatus.json()).data.statusEventId as string;
    expect(captureEventId).toBeTruthy();

    const created = await apiCtx.post(`/api/encounters/${encounterId}/prescriptions`, {
      headers,
      data: {
        allergyStatusCaptureEventId: captureEventId,
        items: [itemPayload(MED_PARACETAMOL)],
      },
    });
    expect(created.status(), await created.text()).toBe(200);
    const rx = (await created.json()).data;
    expect(rx.allergyStatusAtIssue).toBe('no_interrogado');
    expect(rx.signedAtUtc).toBeNull();

    // Controlado → 422
    const controlled = await apiCtx.post(`/api/encounters/${encounterId}/prescriptions`, {
      headers,
      data: {
        allergyStatusCaptureEventId: captureEventId,
        items: [itemPayload(MED_MORFINA)],
      },
    });
    expect(controlled.status(), await controlled.text()).toBe(422);
    const controlledBody = await controlled.json();
    expect(String(controlledBody.message).toLowerCase()).toMatch(/controlado|estupefaciente|recetario/);

    // Captura con paciente_no_puede_responder también habilita
    const setNoPuede = await apiCtx.put(`/api/subjects/${subjectId}/allergy-status`, {
      headers,
      data: { status: 'paciente_no_puede_responder' },
    });
    expect(setNoPuede.status()).toBe(200);

    const created2 = await apiCtx.post(`/api/encounters/${encounterId}/prescriptions`, {
      headers,
      data: {
        items: [itemPayload(MED_PARACETAMOL)],
        generalInstructions: 'con alimentos',
      },
    });
    expect(created2.status(), await created2.text()).toBe(200);
    expect((await created2.json()).data.allergyStatusAtIssue).toBe('paciente_no_puede_responder');

    const sign = await apiCtx.post(`/api/prescriptions/${rx.prescriptionId}/sign`, {
      headers,
      data: {},
    });
    expect(sign.status(), await sign.text()).toBe(200);
    const signed = (await sign.json()).data;
    expect(signed.signedAtUtc).toBeTruthy();
    expect(signed.contentHash).toMatch(/^[a-f0-9]{64}$/i);
    expect(signed.authorLicenseSnapshot).toBeTruthy();
    expect(signed.validUntilUtc).toBeTruthy();

    const list = await apiCtx.get(`/api/subjects/${subjectId}/prescriptions`, { headers });
    expect(list.status()).toBe(200);
    expect((await list.json()).data.length).toBeGreaterThanOrEqual(2);

    const cancel = await apiCtx.post(`/api/prescriptions/${signed.prescriptionId}/cancel`, {
      headers,
      data: { reason: 'Prueba de reverso M8' },
    });
    expect(cancel.status(), await cancel.text()).toBe(200);
    expect((await cancel.json()).data.cancelledAtUtc).toBeTruthy();
  });
});
