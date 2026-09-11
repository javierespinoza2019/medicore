import {
  test,
  expect,
  autorizacion,
  iniciarSesion,
  sesionValida,
} from '../../fixtures/api';

/**
 * Contrato de notas clínicas (M6 / WS-H).
 * SC-06: PUT/PATCH → 405; firmar dos veces → 409.
 * SC-12: firma exige profesional+cédula desde sesión (fail closed).
 * Pregunta G: no se afirma validez jurídica en el DTO legible.
 */
test.describe.configure({ mode: 'serial' });

const BRANCH_DEMO = '22222222-2222-2222-2222-222222222222';

async function abrirEpisodio(apiCtx: Parameters<typeof sesionValida>[0], tokenHeaders: Record<string, string>) {
  const created = await apiCtx.post('/api/subjects', {
    headers: tokenHeaders,
    data: { branchId: BRANCH_DEMO },
  });
  expect(created.status(), await created.text()).toBe(200);
  const subjectId = (await created.json()).data.subjectId as string;

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

test.describe('00 — Contrato API · clinical notes (consulta/firma)', () => {
  test('POST create + GET list; firma con médico (cédula); addendum; PUT 405', async ({
    apiCtx,
  }) => {
    const loginMedico = await iniciarSesion(apiCtx, {
      userName: 'alejandro.garcia@medicore.mx',
      password: 'Admin123!',
    });
    expect(loginMedico.status(), await loginMedico.text()).toBe(200);
    const medicoBody = await loginMedico.json();
    const headers = { Authorization: `Bearer ${medicoBody.data.accessToken}` };
    expect(medicoBody.data.healthcareProfessional?.healthcareProfessionalId).toBeTruthy();
    expect(medicoBody.data.healthcareProfessional?.professionalLicense).toBeTruthy();

    const { encounterId } = await abrirEpisodio(apiCtx, headers);

    const create = await apiCtx.post(`/api/encounters/${encounterId}/notes`, {
      headers,
      data: {
        noteType: 'evolucion',
        prognosis: null,
        body: { subjetivo: 'cefalea', objetivo: null, analisis: null, plan: 'reposo' },
      },
    });
    expect(create.status(), await create.text()).toBe(200);
    const note = (await create.json()).data;
    expect(note.noteId).toBeTruthy();
    expect(note.signedAtUtc).toBeNull();
    expect(note.sealState).toBe('pendiente');

    const list = await apiCtx.get(`/api/encounters/${encounterId}/notes`, { headers });
    expect(list.status()).toBe(200);
    expect((await list.json()).data.length).toBeGreaterThanOrEqual(1);

    const sign = await apiCtx.post(`/api/notes/${note.noteId}/sign`, {
      headers,
      data: {},
    });
    expect(sign.status(), await sign.text()).toBe(200);
    const signed = (await sign.json()).data;
    expect(signed.signedAtUtc).toBeTruthy();
    expect(signed.contentHash).toMatch(/^[a-f0-9]{64}$/i);
    expect(signed.authorLicenseSnapshot).toBeTruthy();
    expect(signed.firmaDescripcionLegible.toLowerCase()).not.toContain('e.firma sat con validez');
    expect(signed.firmaDescripcionLegible.toLowerCase()).toContain('integridad');
    expect(signed.firmaDescripcionLegible.toLowerCase()).not.toContain('cumplimiento nom-004 5.10 afirmado');
    expect(signed.firmaDescripcionLegible.toLowerCase()).toMatch(/sin e\.firma sat|no se afirma cumplimiento/);

    const again = await apiCtx.post(`/api/notes/${note.noteId}/sign`, {
      headers,
      data: {},
    });
    expect(again.status(), await again.text()).toBe(409);

    const put = await apiCtx.put(`/api/notes/${note.noteId}`, {
      headers,
      data: { body: { plan: 'hack' } },
    });
    expect([405, 409]).toContain(put.status());

    const patch = await apiCtx.patch(`/api/notes/${note.noteId}`, {
      headers,
      data: { body: { plan: 'hack' } },
    });
    expect([405, 409]).toContain(patch.status());

    const addendum = await apiCtx.post(`/api/notes/${note.noteId}/addenda`, {
      headers,
      data: { reasonText: 'Corrección tipográfica en plan' },
    });
    expect(addendum.status(), await addendum.text()).toBe(200);
    expect((await addendum.json()).data.reasonText).toContain('Corrección');
  });

  test('admin sin profesional: create ok, sign 403 (SC-12 fail closed)', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const headers = autorizacion(sesion);
    const { encounterId } = await abrirEpisodio(apiCtx, headers);

    const create = await apiCtx.post(`/api/encounters/${encounterId}/notes`, {
      headers,
      data: {
        noteType: 'enfermeria',
        body: { observacion: 'signos estables' },
      },
    });
    expect(create.status(), await create.text()).toBe(200);
    const noteId = (await create.json()).data.noteId as string;

    const sign = await apiCtx.post(`/api/notes/${noteId}/sign`, {
      headers,
      data: {},
    });
    expect(sign.status(), await sign.text()).toBe(403);
  });

  test('rol caja responde 403 al listar', async ({ apiCtx }) => {
    const admin = await sesionValida(apiCtx);
    const { encounterId } = await abrirEpisodio(apiCtx, autorizacion(admin));

    const login = await iniciarSesion(apiCtx, {
      userName: 'monica.soto@medicore.mx',
      password: 'Admin123!',
    });
    expect(login.status()).toBe(200);
    const caja = await login.json();
    const deny = await apiCtx.get(`/api/encounters/${encounterId}/notes`, {
      headers: { Authorization: `Bearer ${caja.data.accessToken}` },
    });
    expect(deny.status()).toBe(403);
  });

  test('GET pending-evolution requiere branchId', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const bad = await apiCtx.get('/api/notes/pending-evolution', {
      headers: autorizacion(sesion),
    });
    expect(bad.status()).toBe(400);

    const ok = await apiCtx.get(
      `/api/notes/pending-evolution?branchId=${BRANCH_DEMO}`,
      { headers: autorizacion(sesion) },
    );
    expect(ok.status(), await ok.text()).toBe(200);
    expect(Array.isArray((await ok.json()).data)).toBe(true);
  });

  test('sin token responde 401', async ({ apiCtx }) => {
    const res = await apiCtx.get(
      `/api/encounters/11111111-1111-1111-1111-111111111111/notes`,
    );
    expect(res.status()).toBe(401);
  });
});
