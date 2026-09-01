import {
  test,
  expect,
  autorizacion,
  iniciarSesion,
  sesionValida,
  idE2E,
  api,
} from '../../fixtures/api';

/**
 * Mapa ejecutable SC-01 … SC-24.
 * Fuente: docs/analisis/05-roadmap-qa-riesgos.md §4 (seguridad clínica + 3.b).
 * Títulos literales del documento (sin marcas markdown).
 *
 * M12: se retira `test.skip` solo donde el producto ya soporta el escenario contra
 * stack real (API + BD Dev). Sin mocks. Los IDs no se borran.
 *
 * SC-25 / SC-26: fuera de este mapa. Alcance y motivos canónicos en
 * docs/operacion/pruebas.md § «Discrepancia SC-25 / SC-26».
 */

const BRANCH_DEMO = '22222222-2222-2222-2222-222222222222';
const MED_PARACETAMOL = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001';

type ApiCtx = Parameters<typeof sesionValida>[0];

async function crearSujetoSinIdentidad(apiCtx: ApiCtx, headers: Record<string, string>) {
  const created = await apiCtx.post('/api/subjects', {
    headers,
    data: { branchId: BRANCH_DEMO },
  });
  expect(created.status(), await created.text()).toBe(200);
  return (await created.json()).data as {
    subjectId: string;
    identificationState: string;
    biologicalSex: string | null;
    birthDate: string | null;
    curp: string | null;
    estimatedAge: { valor: number; unidad: string; origen: string } | null;
    activeLabel: { operationalLabel: string } | null;
  };
}

async function abrirUrgencias(
  apiCtx: ApiCtx,
  headers: Record<string, string>,
  subjectId: string,
) {
  const enc = await apiCtx.post('/api/encounters', {
    headers,
    data: {
      branchId: BRANCH_DEMO,
      subjectId,
      encounterType: 'urgencias',
    },
  });
  expect(enc.status(), await enc.text()).toBe(200);
  return (await enc.json()).data as {
    encounterId: string;
    triageLevel: string | null;
    state: string;
  };
}

async function sesionMedico(apiCtx: ApiCtx) {
  const login = await iniciarSesion(apiCtx, {
    userName: 'alejandro.garcia@medicore.mx',
    password: 'Admin123!',
  });
  expect(login.status(), await login.text()).toBe(200);
  const body = await login.json();
  expect(body.data.healthcareProfessional?.professionalLicense).toBeTruthy();
  return {
    headers: { Authorization: `Bearer ${body.data.accessToken}` } as Record<string, string>,
    body,
  };
}

function itemParacetamol() {
  return {
    medicationId: MED_PARACETAMOL,
    dose: { valor: 500, unidad: 'mg', estado: 'medido', origen: 'medido' },
    route: 'oral',
    frequency: { kind: 'every_n_hours', n: 8 },
    durationDays: 5,
    quantity: 15,
    refillsAllowed: 0,
  };
}

test.describe.configure({ mode: 'serial' });

test.describe('06 — Seguridad clínica · mapa SC-01…SC-24', () => {
  test.describe('SC-01 … SC-12 — bloqueantes clínicos', () => {
    test('SC-01: Las alergias y alertas del paciente se presentan de forma inequívoca antes de emitir una receta', async ({
      apiCtx,
    }) => {
      const { headers } = await sesionMedico(apiCtx);
      const subject = await crearSujetoSinIdentidad(apiCtx, headers);
      const record = await apiCtx.get(`/api/subjects/${subject.subjectId}/record`, { headers });
      expect(record.status(), await record.text()).toBe(200);
      const rec = (await record.json()).data;
      expect(rec.allergyStatus.status).toBe('no_interrogado');
      expect(Array.isArray(rec.allergies)).toBe(true);

      const enc = await abrirUrgencias(apiCtx, headers, subject.subjectId);
      const blocked = await apiCtx.post(`/api/encounters/${enc.encounterId}/prescriptions`, {
        headers,
        data: { items: [itemParacetamol()] },
      });
      expect(blocked.status(), await blocked.text()).toBe(409);
      expect(String((await blocked.json()).message).toLowerCase()).toContain('captura');
    });

    test('SC-02: Prescribir un medicamento al que el paciente es alérgico exige confirmación explícita con justificación registrada', async ({
      apiCtx,
    }) => {
      const { headers } = await sesionMedico(apiCtx);
      const subject = await crearSujetoSinIdentidad(apiCtx, headers);
      await apiCtx.get(`/api/subjects/${subject.subjectId}/record`, { headers });

      const setStatus = await apiCtx.put(`/api/subjects/${subject.subjectId}/allergy-status`, {
        headers,
        data: { status: 'no_interrogado' },
      });
      expect(setStatus.status(), await setStatus.text()).toBe(200);
      const captureEventId = (await setStatus.json()).data.statusEventId as string;

      const add = await apiCtx.post(`/api/subjects/${subject.subjectId}/allergies`, {
        headers,
        data: { substance: 'Paracetamol', reactionType: 'alergia', severity: 'grave' },
      });
      expect(add.status(), await add.text()).toBe(200);

      const enc = await abrirUrgencias(apiCtx, headers, subject.subjectId);

      const sinJust = await apiCtx.post(`/api/encounters/${enc.encounterId}/prescriptions`, {
        headers,
        data: {
          allergyStatusCaptureEventId: captureEventId,
          items: [itemParacetamol()],
        },
      });
      expect(sinJust.status(), await sinJust.text()).toBe(409);
      expect(String((await sinJust.json()).message).toLowerCase()).toMatch(/alerg|justific/);

      const conJust = await apiCtx.post(`/api/encounters/${enc.encounterId}/prescriptions`, {
        headers,
        data: {
          allergyStatusCaptureEventId: captureEventId,
          allergyOverrideJustification:
            'Beneficio supera riesgo; sin alternativa disponible en catálogo sintético E2E',
          items: [itemParacetamol()],
        },
      });
      expect(conJust.status(), await conJust.text()).toBe(200);
      const rx = (await conJust.json()).data;
      expect(rx.allergyOverrideJustification).toBeTruthy();
    });

    test('SC-03: No se puede cerrar un episodio de urgencias sin clasificación de triage. Y en sentido inverso: el sistema no asigna un nivel por omisión. El .docx fija amarillo automático; se verifica que eso no ocurre y que en su lugar el episodio queda en estado explícito "sin clasificar", ordenado con prioridad alta hasta clasificarse (doc 03 §11.3). Bloquear el cierre es legítimo; bloquear el inicio no lo es', async ({
      apiCtx,
    }) => {
      const sesion = await sesionValida(apiCtx);
      const headers = autorizacion(sesion);
      const subject = await crearSujetoSinIdentidad(apiCtx, headers);
      const enc = await abrirUrgencias(apiCtx, headers, subject.subjectId);
      expect(enc.triageLevel).toBeNull();
      expect(enc.state).toBe('abierto');

      const close = await apiCtx.post(`/api/encounters/${enc.encounterId}/state`, {
        headers,
        data: {
          toState: 'cerrado',
          disposition: 'alta_domicilio',
          justification: 'SC-03 cierre sin triage (debe 409)',
        },
      });
      expect(close.status(), await close.text()).toBe(409);
    });

    test('SC-04: El alta con recetas pendientes está bloqueada; forzarla exige motivo y genera evento de excepción', async ({
      apiCtx,
    }) => {
      const { headers } = await sesionMedico(apiCtx);
      const subject = await crearSujetoSinIdentidad(apiCtx, headers);
      const enc = await abrirUrgencias(apiCtx, headers, subject.subjectId);

      const scale = await apiCtx.get(`/api/branches/${BRANCH_DEMO}/triage-scale`, { headers });
      expect(scale.status(), await scale.text()).toBe(200);
      const levelCode = (await scale.json()).data.levels[0].code as string;

      const triage = await apiCtx.post(`/api/encounters/${enc.encounterId}/triage`, {
        headers,
        data: { level: levelCode, vitals: [] },
      });
      expect(triage.status(), await triage.text()).toBe(200);

      const setStatus = await apiCtx.put(`/api/subjects/${subject.subjectId}/allergy-status`, {
        headers,
        data: { status: 'no_interrogado' },
      });
      expect(setStatus.status(), await setStatus.text()).toBe(200);
      const captureEventId = (await setStatus.json()).data.statusEventId as string;

      const rx = await apiCtx.post(`/api/encounters/${enc.encounterId}/prescriptions`, {
        headers,
        data: {
          allergyStatusCaptureEventId: captureEventId,
          items: [itemParacetamol()],
        },
      });
      expect(rx.status(), await rx.text()).toBe(200);
      expect((await rx.json()).data.signedAtUtc).toBeFalsy();

      const blocked = await apiCtx.post(`/api/encounters/${enc.encounterId}/state`, {
        headers,
        data: {
          toState: 'cerrado',
          disposition: 'alta_domicilio',
          justification: 'SC-04 cierre con Rx pendiente sin override (debe 409)',
        },
      });
      expect(blocked.status(), await blocked.text()).toBe(409);
      expect(String((await blocked.json()).message).toLowerCase()).toMatch(
        /receta|firmar|pendiente/,
      );

      const forced = await apiCtx.post(`/api/encounters/${enc.encounterId}/state`, {
        headers,
        data: {
          toState: 'cerrado',
          disposition: 'alta_domicilio',
          justification: 'SC-04 alta forzada con Rx pendiente',
          pendingPrescriptionsOverrideReason:
            'Paciente egresa; receta queda borrador para firma en turno siguiente (SC-04 E2E)',
        },
      });
      expect(forced.status(), await forced.text()).toBe(200);
      expect((await forced.json()).data.state).toBe('cerrado');

      const adminLogin = await iniciarSesion(apiCtx, {
        tenantCode: 'demo',
        userName: 'admin',
        password: 'Demo123!',
      });
      expect(adminLogin.status(), await adminLogin.text()).toBe(200);
      const adminHeaders = {
        Authorization: `Bearer ${(await adminLogin.json()).data.accessToken}`,
      } as Record<string, string>;

      const audit = await apiCtx.get(`/api/audit/subject/${subject.subjectId}`, {
        headers: adminHeaders,
      });
      expect(audit.status(), await audit.text()).toBe(200);
      const events = (await audit.json()).data as Array<{ eventType: string }>;
      expect(
        events.some(
          (e) => e.eventType === 'clinical_exception.discharge_with_pending_prescriptions',
        ),
      ).toBe(true);
    });

    test.skip(
      'SC-05: La cabecera de identidad del paciente es visible en todo momento durante la atención',
      async () => {
        // Pleno UI (IdentityHeader en detalle, triage, urgencias, consultas con Subject API):
        // activo en sc-ui.spec.ts con Vite+API. Sin navegador en contrato-api.
      },
    );

    test('SC-06: Un documento firmado no puede modificarse por ninguna vía de la API', async ({
      apiCtx,
    }) => {
      const { headers } = await sesionMedico(apiCtx);
      const subject = await crearSujetoSinIdentidad(apiCtx, headers);
      const enc = await apiCtx.post('/api/encounters', {
        headers,
        data: {
          branchId: BRANCH_DEMO,
          subjectId: subject.subjectId,
          encounterType: 'consulta_externa',
        },
      });
      expect(enc.status(), await enc.text()).toBe(200);
      const encounterId = (await enc.json()).data.encounterId as string;

      const create = await apiCtx.post(`/api/encounters/${encounterId}/notes`, {
        headers,
        data: {
          noteType: 'evolucion',
          body: { subjetivo: 'cefalea sintética', plan: 'reposo' },
        },
      });
      expect(create.status(), await create.text()).toBe(200);
      const noteId = (await create.json()).data.noteId as string;

      const sign = await apiCtx.post(`/api/notes/${noteId}/sign`, { headers, data: {} });
      expect(sign.status(), await sign.text()).toBe(200);

      const put = await apiCtx.put(`/api/notes/${noteId}`, {
        headers,
        data: { body: { plan: 'hack' } },
      });
      expect([405, 409]).toContain(put.status());

      const patch = await apiCtx.patch(`/api/notes/${noteId}`, {
        headers,
        data: { body: { plan: 'hack' } },
      });
      expect([405, 409]).toContain(patch.status());

      const again = await apiCtx.post(`/api/notes/${noteId}/sign`, { headers, data: {} });
      expect(again.status(), await again.text()).toBe(409);
    });

    test('SC-07: La cola de urgencias ordena por nivel, luego estado, luego hora de llegada, incluso offline', async ({
      apiCtx,
    }) => {
      const sesion = await sesionValida(apiCtx);
      const headers = autorizacion(sesion);
      const a = await crearSujetoSinIdentidad(apiCtx, headers);
      const b = await crearSujetoSinIdentidad(apiCtx, headers);
      await abrirUrgencias(apiCtx, headers, a.subjectId);
      await abrirUrgencias(apiCtx, headers, b.subjectId);

      const queue = await apiCtx.get(
        `/api/encounters/queue?branchId=${BRANCH_DEMO}&includeClosed=false`,
        { headers },
      );
      expect(queue.status(), await queue.text()).toBe(200);
      const data = (await queue.json()).data;
      expect(Array.isArray(data.items)).toBe(true);
      expect(data.items.length).toBeGreaterThanOrEqual(2);
      // Sin clasificar: el contrato marca allUnclassified; offline de orden se valida vía sync+cola.
      expect(data.allUnclassified).toBe(true);
    });

    test('SC-08: Los signos vitales fuera de rango crítico se destacan y nunca se guardan silenciosamente como normales', async ({
      apiCtx,
    }) => {
      // Mitad API: valor extremo se persiste como medido (no se reescribe a «normal»/vacío).
      // Destacado UI: sc-ui.spec.ts (vitalValidation + triage).
      const sesion = await sesionValida(apiCtx);
      const headers = autorizacion(sesion);
      const subject = await crearSujetoSinIdentidad(apiCtx, headers);
      const enc = await abrirUrgencias(apiCtx, headers, subject.subjectId);

      const triage = await apiCtx.post(`/api/encounters/${enc.encounterId}/triage`, {
        headers,
        data: {
          level: null,
          chiefComplaint: null,
          vitals: [
            {
              signCode: 'temperatura',
              state: 'medido',
              value: 41.5,
              unit: '°C',
            },
          ],
        },
      });
      expect(triage.status(), await triage.text()).toBe(200);
      const body = (await triage.json()).data;
      const temp = (body.vitals as { signCode: string; state: string; value: number | null }[]).find(
        (v) => v.signCode === 'temperatura',
      );
      expect(temp).toBeTruthy();
      expect(temp!.state).toBe('medido');
      expect(temp!.value).toBe(41.5);
      expect(String(temp!.state).toLowerCase()).not.toMatch(/normal/);
    });

    test.skip(
      'SC-09: En modo contingencia, ninguna pantalla presenta datos obsoletos sin indicar su antigüedad',
      async () => {
        // Antigüedad = UI (QueueLiveBanner / formatCacheAge). Activo en sc-ui.spec.ts con Vite+API.
      },
    );

    test('SC-10: El nivel de triage es distinguible sin percepción de color (texto + icono)', async ({
      apiCtx,
    }) => {
      // Contrato de escala: cada nivel trae label + icon (no sólo color). UI: sc-ui.spec.ts.
      const sesion = await sesionValida(apiCtx);
      const scale = await apiCtx.get(`/api/branches/${BRANCH_DEMO}/triage-scale`, {
        headers: autorizacion(sesion),
      });
      expect(scale.status(), await scale.text()).toBe(200);
      const levels = (await scale.json()).data.levels as {
        code: string;
        label: string;
        icon: string | null;
      }[];
      expect(levels.length).toBeGreaterThan(0);
      for (const l of levels) {
        expect(l.code).toBeTruthy();
        expect(l.label?.trim().length).toBeGreaterThan(0);
        expect(l.icon?.trim().length).toBeGreaterThan(0);
      }
    });

    test.skip(
      'SC-11: Los datos capturados offline nunca se pierden al cerrar el navegador o reiniciar la estación',
      async () => {
        // IndexedDB medicore-outbox: activo en 09-offline/sc-11-indexeddb.spec.ts (chromium + Vite).
      },
    );

    test('SC-12: El sistema no permite atribuir una nota a un profesional distinto del autor autenticado', async ({
      apiCtx,
    }) => {
      const sesion = await sesionValida(apiCtx);
      const headers = autorizacion(sesion);
      const subject = await crearSujetoSinIdentidad(apiCtx, headers);
      const enc = await apiCtx.post('/api/encounters', {
        headers,
        data: {
          branchId: BRANCH_DEMO,
          subjectId: subject.subjectId,
          encounterType: 'consulta_externa',
        },
      });
      const encounterId = (await enc.json()).data.encounterId as string;

      const create = await apiCtx.post(`/api/encounters/${encounterId}/notes`, {
        headers,
        data: { noteType: 'enfermeria', body: { observacion: 'SC-12' } },
      });
      expect(create.status(), await create.text()).toBe(200);
      const noteId = (await create.json()).data.noteId as string;

      // Admin sin profesional sanitario: firma fail closed (autoría del token, no del cuerpo).
      const sign = await apiCtx.post(`/api/notes/${noteId}/sign`, { headers, data: {} });
      expect(sign.status(), await sign.text()).toBe(403);
    });
  });

  test.describe('SC-13 … SC-24 — nada bloquea el inicio de la atención (doc 08)', () => {
    test('SC-13: Registrar y atender a un paciente inconsciente sin ningún dato de identidad y con el Core caído', async ({
      apiCtx,
    }) => {
      // Mitad servidor: cola sync subject.create + encounter.open (equivalente a drenar tras Core caído).
      const sesion = await sesionValida(apiCtx);
      const headers = autorizacion(sesion);
      const claveSubj = idE2E('sc13-subj');
      const createSubj = await apiCtx.post('/api/sync/commands', {
        headers,
        data: {
          idempotencyKey: claveSubj,
          commandType: 'subject.create',
          payloadJson: JSON.stringify({ branchId: BRANCH_DEMO }),
          occurredAtUtc: new Date().toISOString(),
        },
      });
      expect(createSubj.status(), await createSubj.text()).toBe(200);
      const subjectId = (await createSubj.json()).data.serverEntityId as string;

      const get = await apiCtx.get(`/api/subjects/${subjectId}`, { headers });
      expect(get.status()).toBe(200);
      expect((await get.json()).data.identificationState).toBe('no_identificado');

      const claveEnc = idE2E('sc13-enc');
      const open = await apiCtx.post('/api/sync/commands', {
        headers,
        data: {
          idempotencyKey: claveEnc,
          commandType: 'encounter.open',
          payloadJson: JSON.stringify({
            branchId: BRANCH_DEMO,
            subjectId,
            encounterType: 'urgencias',
          }),
          occurredAtUtc: new Date().toISOString(),
        },
      });
      expect(open.status(), await open.text()).toBe(200);
      expect((await open.json()).data.status).toBe('accepted');
    });

    test('SC-14: Clasificar triage sin ningún dato administrativo', async ({ apiCtx }) => {
      const sesion = await sesionValida(apiCtx);
      const headers = autorizacion(sesion);
      const subject = await crearSujetoSinIdentidad(apiCtx, headers);
      const enc = await abrirUrgencias(apiCtx, headers, subject.subjectId);

      const triage = await apiCtx.post(`/api/encounters/${enc.encounterId}/triage`, {
        headers,
        data: { level: null, chiefComplaint: null, vitals: [] },
      });
      expect(triage.status(), await triage.text()).toBe(200);
      const body = (await triage.json()).data;
      expect(body.level).toBeNull();
      expect(body.vitals.every((v: { state: string }) => v.state === 'no_medido')).toBe(true);
    });

    test('SC-15: El sexo no tiene valor por omisión en la ruta de ingreso', async ({ apiCtx }) => {
      const sesion = await sesionValida(apiCtx);
      const subject = await crearSujetoSinIdentidad(apiCtx, autorizacion(sesion));
      expect(subject.biologicalSex).toBeNull();
    });

    test('SC-16: La edad desconocida no obliga a inventar un número', async ({ apiCtx }) => {
      const sesion = await sesionValida(apiCtx);
      const headers = autorizacion(sesion);
      const bare = await crearSujetoSinIdentidad(apiCtx, headers);
      expect(bare.birthDate).toBeNull();
      expect(bare.estimatedAge).toBeNull();

      const withEstimate = await apiCtx.post('/api/subjects', {
        headers,
        data: {
          branchId: BRANCH_DEMO,
          estimatedAge: {
            valor: 40,
            unidad: 'anios',
            rangoMin: 30,
            rangoMax: 50,
            origen: 'estimada',
          },
        },
      });
      expect(withEstimate.status(), await withEstimate.text()).toBe(200);
      const data = (await withEstimate.json()).data;
      expect(data.birthDate).toBeNull();
      expect(data.estimatedAge?.origen).toBe('estimada');
      expect(data.estimatedAge?.rangoMin).toBe(30);
      expect(data.estimatedAge?.rangoMax).toBe(50);
    });

    test('SC-17: Dos o más pacientes no identificados simultáneos nunca se confunden', async ({
      apiCtx,
    }) => {
      const sesion = await sesionValida(apiCtx);
      const headers = autorizacion(sesion);
      const a = await crearSujetoSinIdentidad(apiCtx, headers);
      const b = await crearSujetoSinIdentidad(apiCtx, headers);
      expect(a.subjectId).not.toBe(b.subjectId);
      expect(a.activeLabel?.operationalLabel).toBeTruthy();
      expect(b.activeLabel?.operationalLabel).toBeTruthy();
      expect(a.activeLabel!.operationalLabel).not.toBe(b.activeLabel!.operationalLabel);
    });

    test('SC-18: Nunca hay fusión automática de identidades', async ({ apiCtx }) => {
      const sesion = await sesionValida(apiCtx);
      const headers = autorizacion(sesion);
      const a = await crearSujetoSinIdentidad(apiCtx, headers);
      const b = await crearSujetoSinIdentidad(apiCtx, headers);
      expect(a.subjectId).not.toBe(b.subjectId);

      const sinJust = await apiCtx.post(`/api/subjects/${a.subjectId}/links`, {
        headers,
        data: {
          absorbedSubjectId: b.subjectId,
          survivingSubjectId: a.subjectId,
          justification: '',
        },
      });
      expect([400, 422]).toContain(sinJust.status());

      const mergeQueue = await apiCtx.get('/api/subjects/merge-queue', { headers });
      expect([404, 405]).toContain(mergeQueue.status());

      const getA = await apiCtx.get(`/api/subjects/${a.subjectId}`, { headers });
      const getB = await apiCtx.get(`/api/subjects/${b.subjectId}`, { headers });
      expect(getA.status()).toBe(200);
      expect(getB.status()).toBe(200);
      expect((await getA.json()).data.subjectId).toBe(a.subjectId);
      expect((await getB.json()).data.subjectId).toBe(b.subjectId);
    });

    test('SC-19: Ningún fallo de red, de Core, de validación diferida o de sincronización produce un bloqueo en la ruta de ingreso', async ({
      apiCtx,
    }) => {
      const sesion = await sesionValida(apiCtx);
      const headers = autorizacion(sesion);
      const clave = idE2E('sc19');
      const sobre = {
        idempotencyKey: clave,
        commandType: 'subject.create',
        payloadJson: JSON.stringify({ branchId: BRANCH_DEMO }),
        occurredAtUtc: new Date().toISOString(),
      };
      const primera = await apiCtx.post('/api/sync/commands', { headers, data: sobre });
      expect(primera.status(), await primera.text()).toBe(200);
      const id1 = (await primera.json()).data.serverEntityId as string;

      const reintento = await apiCtx.post('/api/sync/commands', { headers, data: sobre });
      expect(reintento.status()).toBe(200);
      const cuerpo = await reintento.json();
      expect(cuerpo.data.status).toBe('duplicate');
      expect(cuerpo.data.serverEntityId).toBe(id1);

      const encClave = idE2E('sc19-enc');
      const open = await apiCtx.post('/api/sync/commands', {
        headers,
        data: {
          idempotencyKey: encClave,
          commandType: 'encounter.open',
          payloadJson: JSON.stringify({
            branchId: BRANCH_DEMO,
            subjectId: id1,
            encounterType: 'urgencias',
          }),
          occurredAtUtc: new Date().toISOString(),
        },
      });
      expect(open.status(), await open.text()).toBe(200);
      expect((await open.json()).data.status).toBe('accepted');
    });

    test('SC-20: Un catálogo faltante no impide avanzar', async ({ apiCtx }) => {
      // Ingreso urgencias sin CIE/medicamentos/catálogos admin: solo branchId + subjectId.
      const sesion = await sesionValida(apiCtx);
      const headers = autorizacion(sesion);
      const subject = await crearSujetoSinIdentidad(apiCtx, headers);
      const enc = await apiCtx.post('/api/encounters', {
        headers,
        data: {
          branchId: BRANCH_DEMO,
          subjectId: subject.subjectId,
          encounterType: 'urgencias',
        },
      });
      expect(enc.status(), await enc.text()).toBe(200);
      const data = (await enc.json()).data;
      expect(data.encounterId).toBeTruthy();
      expect(data.state).toBe('abierto');

      const triage = await apiCtx.post(`/api/encounters/${data.encounterId}/triage`, {
        headers,
        data: { level: null, chiefComplaint: null, vitals: [] },
      });
      expect(triage.status(), await triage.text()).toBe(200);
    });

    test('SC-21: La identidad asignada después no altera ni contradice lo ya registrado', async ({
      apiCtx,
    }) => {
      const { headers } = await sesionMedico(apiCtx);
      const subject = await crearSujetoSinIdentidad(apiCtx, headers);
      const enc = await apiCtx.post('/api/encounters', {
        headers,
        data: {
          branchId: BRANCH_DEMO,
          subjectId: subject.subjectId,
          encounterType: 'consulta_externa',
        },
      });
      expect(enc.status(), await enc.text()).toBe(200);
      const encounterId = (await enc.json()).data.encounterId as string;

      const create = await apiCtx.post(`/api/encounters/${encounterId}/notes`, {
        headers,
        data: {
          noteType: 'evolucion',
          body: { subjetivo: 'nota previa SC-21', plan: 'observar' },
        },
      });
      expect(create.status(), await create.text()).toBe(200);
      const note = (await create.json()).data;
      const noteId = note.noteId as string;
      const bodyAntes = note.body;

      const idPut = await apiCtx.put(`/api/subjects/${subject.subjectId}/identity`, {
        headers,
        data: {
          givenName: 'Identidad',
          firstSurname: 'Asignada',
          secondSurname: 'SC21',
        },
      });
      expect(idPut.status(), await idPut.text()).toBe(200);
      const afterId = (await idPut.json()).data;
      expect(afterId.subjectId).toBe(subject.subjectId);
      expect(afterId.givenName).toBe('Identidad');

      const noteGet = await apiCtx.get(`/api/notes/${noteId}`, { headers });
      expect(noteGet.status(), await noteGet.text()).toBe(200);
      const noteAfter = (await noteGet.json()).data;
      expect(noteAfter.body).toEqual(bodyAntes);
      expect(noteAfter.encounterId).toBe(encounterId);

      const encGet = await apiCtx.get(`/api/encounters/${encounterId}`, { headers });
      expect(encGet.status()).toBe(200);
      expect((await encGet.json()).data.subjectId).toBe(subject.subjectId);
    });

    test('SC-22: Una vinculación equivocada se corrige sin destruir el expediente', async ({
      apiCtx,
    }) => {
      const sesion = await sesionValida(apiCtx);
      const headers = autorizacion(sesion);
      const sobreviviente = await crearSujetoSinIdentidad(apiCtx, headers);
      const absorbido = await crearSujetoSinIdentidad(apiCtx, headers);

      const enc = await abrirUrgencias(apiCtx, headers, absorbido.subjectId);
      const { headers: medHeaders } = await sesionMedico(apiCtx);
      const noteCreate = await apiCtx.post(`/api/encounters/${enc.encounterId}/notes`, {
        headers: medHeaders,
        data: {
          noteType: 'evolucion',
          body: { subjetivo: 'nota previa SC-22', plan: 'observar' },
        },
      });
      expect(noteCreate.status(), await noteCreate.text()).toBe(200);
      const note = (await noteCreate.json()).data;
      const noteId = note.noteId as string;
      const bodyAntes = note.body;

      const linkRes = await apiCtx.post(`/api/subjects/${sobreviviente.subjectId}/links`, {
        headers,
        data: {
          absorbedSubjectId: absorbido.subjectId,
          survivingSubjectId: sobreviviente.subjectId,
          justification: 'SC-22 vínculo equivocado sintético',
        },
      });
      expect(linkRes.status(), await linkRes.text()).toBe(200);
      const link = (await linkRes.json()).data as {
        linkId: string;
        linkType: string;
        absorbedSubjectId: string;
        survivingSubjectId: string;
      };
      expect(link.linkType).toBe('vinculacion');
      expect(link.linkId).toBeTruthy();

      const durante = await apiCtx.get(`/api/subjects/${absorbido.subjectId}`, { headers });
      expect(durante.status()).toBe(200);
      const duranteBody = (await durante.json()).data;
      expect(duranteBody.resolvedSubjectId).toBe(sobreviviente.subjectId);
      expect(duranteBody.subjectId).toBe(sobreviviente.subjectId);

      const sinJust = await apiCtx.post(
        `/api/subjects/${sobreviviente.subjectId}/links/${link.linkId}/revert`,
        { headers, data: { justification: '' } },
      );
      expect([400, 422]).toContain(sinJust.status());

      const revertRes = await apiCtx.post(
        `/api/subjects/${sobreviviente.subjectId}/links/${link.linkId}/revert`,
        {
          headers,
          data: { justification: 'SC-22 corrección: vínculo al sujeto equivocado' },
        },
      );
      expect(revertRes.status(), await revertRes.text()).toBe(200);
      const revert = (await revertRes.json()).data as {
        linkId: string;
        linkType: string;
        revertsLinkId: string;
        justification: string;
      };
      expect(revert.linkType).toBe('vinculacion_revertida');
      expect(revert.revertsLinkId).toBe(link.linkId);
      expect(revert.justification).toContain('SC-22');

      const despuesAbs = await apiCtx.get(`/api/subjects/${absorbido.subjectId}`, { headers });
      expect(despuesAbs.status()).toBe(200);
      const absBody = (await despuesAbs.json()).data;
      expect(absBody.subjectId).toBe(absorbido.subjectId);
      expect(absBody.resolvedSubjectId).toBe(absorbido.subjectId);
      expect(absBody.identificationState).toBe('rectificada');

      const noteGet = await apiCtx.get(`/api/notes/${noteId}`, { headers: medHeaders });
      expect(noteGet.status(), await noteGet.text()).toBe(200);
      const noteAfter = (await noteGet.json()).data;
      expect(noteAfter.body).toEqual(bodyAntes);
      expect(noteAfter.encounterId).toBe(enc.encounterId);

      const encGet = await apiCtx.get(`/api/encounters/${enc.encounterId}`, { headers });
      expect(encGet.status()).toBe(200);
      expect((await encGet.json()).data.subjectId).toBe(absorbido.subjectId);

      const recordAbs = await apiCtx.get(`/api/subjects/${absorbido.subjectId}/record`, {
        headers: medHeaders,
      });
      expect(recordAbs.status(), await recordAbs.text()).toBe(200);
      const flagsAbs = ((await recordAbs.json()).data.flags ?? []) as Array<{
        flagType: string;
        isActive: boolean;
        payloadJson?: string | null;
      }>;
      const alertaAbs = flagsAbs.find((f) => f.isActive && f.flagType === 'riesgo');
      expect(alertaAbs).toBeTruthy();
      expect(String(alertaAbs!.payloadJson ?? '')).toContain('vinculacion_revertida');

      const recordSur = await apiCtx.get(`/api/subjects/${sobreviviente.subjectId}/record`, {
        headers: medHeaders,
      });
      expect(recordSur.status(), await recordSur.text()).toBe(200);
      const flagsSur = ((await recordSur.json()).data.flags ?? []) as Array<{
        flagType: string;
        isActive: boolean;
      }>;
      expect(flagsSur.some((f) => f.isActive && f.flagType === 'riesgo')).toBe(true);

      const audit = await apiCtx.get(`/api/audit/subject/${absorbido.subjectId}`, { headers });
      expect(audit.status()).toBe(200);
      const events = (await audit.json()).data as Array<{ eventType: string }>;
      expect(events.some((e) => e.eventType === 'subject.link.revert')).toBe(true);

      const correcto = await crearSujetoSinIdentidad(apiCtx, headers);
      const linkOk = await apiCtx.post(`/api/subjects/${correcto.subjectId}/links`, {
        headers,
        data: {
          absorbedSubjectId: absorbido.subjectId,
          survivingSubjectId: correcto.subjectId,
          justification: 'SC-22 vínculo correcto tras reversión',
        },
      });
      expect(linkOk.status(), await linkOk.text()).toBe(200);
      const resuelto = await apiCtx.get(`/api/subjects/${absorbido.subjectId}`, { headers });
      expect(resuelto.status()).toBe(200);
      expect((await resuelto.json()).data.resolvedSubjectId).toBe(correcto.subjectId);
    });

    test('SC-23: La búsqueda por descripción no divulga a quien no acredita interés legítimo', async ({
      apiCtx,
    }) => {
      const admin = await sesionValida(apiCtx);
      const ok = await apiCtx.post('/api/subjects/search-by-description', {
        headers: autorizacion(admin),
        data: { branchId: BRANCH_DEMO },
      });
      expect(ok.status()).toBe(200);
      const okBody = await ok.json();
      for (const m of okBody.data.matches) {
        expect(m).not.toHaveProperty('givenName');
        expect(m).not.toHaveProperty('curp');
      }

      const login = await iniciarSesion(apiCtx, {
        userName: 'alejandro.garcia@medicore.mx',
        password: 'Admin123!',
      });
      expect(login.status()).toBe(200);
      const medico = await login.json();
      const deny = await apiCtx.post('/api/subjects/search-by-description', {
        headers: { Authorization: `Bearer ${medico.data.accessToken}` },
        data: { branchId: BRANCH_DEMO },
      });
      expect(deny.status()).toBe(403);
    });

    test('SC-24: La hoja de notificación al Ministerio Público se genera fuera de línea y no bloquea', async ({
      apiCtx,
    }) => {
      // Ingreso no bloquea con MP null; hoja vía API (identidad provisional). Offline UI de generación: pendiente.
      const sesion = await sesionValida(apiCtx);
      const headers = autorizacion(sesion);
      const subject = await crearSujetoSinIdentidad(apiCtx, headers);
      const open = await apiCtx.post('/api/encounters', {
        headers,
        data: {
          branchId: BRANCH_DEMO,
          subjectId: subject.subjectId,
          encounterType: 'urgencias',
        },
      });
      expect(open.status(), await open.text()).toBe(200);
      const encounter = (await open.json()).data;
      expect(encounter.ministerioPublicoNotified).toBeNull();
      expect(encounter.state).toBe('abierto');

      const label = subject.activeLabel?.operationalLabel ?? 'Identidad provisional SC-24';
      const notice = await apiCtx.post(`/api/encounters/${encounter.encounterId}/mp-notice`, {
        headers,
        data: {
          establishmentNameSnapshot: 'Sucursal Central Demo',
          patientIdentificationText: label,
          notifiedAct: 'Lesión con presunción de hecho ilícito (sintético E2E)',
          injuryReportText: 'Descripción sintética SC-24',
          mpAgencyName: 'Agencia MP sintética',
          notifyingProfessionalId: '66666666-6666-6666-6666-666666660001',
          notifyingProfessionalName: 'Profesional sintético E2E',
        },
      });
      expect(notice.status(), await notice.text()).toBe(200);
      const noticeBody = (await notice.json()).data;
      expect(noticeBody.noticeId).toBeTruthy();
      expect(noticeBody.patientIdentificationText).toBe(label);

      const syncKey = idE2E('sc24-mp');
      const syncMp = await apiCtx.post('/api/sync/commands', {
        headers,
        data: {
          idempotencyKey: syncKey,
          commandType: 'encounter.mpNotice',
          payloadJson: JSON.stringify({
            encounterId: encounter.encounterId,
            establishmentNameSnapshot: 'Sucursal Central Demo',
            patientIdentificationText: `${label} sync`,
            notifiedAct: 'Segundo aviso sync SC-24',
            mpAgencyName: 'Agencia MP sintética',
            notifyingProfessionalId: '66666666-6666-6666-6666-666666660001',
            notifyingProfessionalName: 'Profesional sintético E2E',
          }),
          occurredAtUtc: new Date().toISOString(),
        },
      });
      expect(syncMp.status(), await syncMp.text()).toBe(200);
      expect(['accepted', 'duplicate']).toContain((await syncMp.json()).data.status);
    });
  });

  test.describe('Multi-tenant (mapa auxiliar M12)', () => {
    const hayB = api.tenantB.trim().length > 0 && api.tenantB !== api.tenant;

    test.skip(
      !hayB,
      `Lectura cruzada tenant A/B: requiere MEDICORE_TENANT_B. Seed Dev sólo trae '${api.tenant}'; no se inventa tenant en BD compartida sin seed idempotente documentado.`,
    );

    test('token de otro tenant no lee sujetos del tenant A', async ({ apiCtx }) => {
      const sesionA = await sesionValida(apiCtx);
      const subject = await crearSujetoSinIdentidad(apiCtx, autorizacion(sesionA));

      const loginB = await apiCtx.post('/api/auth/login', {
        data: {
          tenantCode: api.tenantB,
          userName: api.usuario,
          password: api.password,
        },
      });
      expect(loginB.status(), await loginB.text()).toBe(200);
      const tokenB = (await loginB.json()).data.accessToken as string;

      const cruzada = await apiCtx.get(`/api/subjects/${subject.subjectId}`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      expect(cruzada.status()).toBe(404);
    });
  });
});
