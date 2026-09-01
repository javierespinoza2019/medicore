import {
  test,
  expect,
  autorizacion,
  sesionValida,
  api,
} from '../../fixtures/api';
import * as signalR from '@microsoft/signalr';

/**
 * Contrato del hub SignalR de cola clínica (M10 / WS-K).
 * - Negociación exige JWT.
 * - Grupos por tenant del token: otro tenant no recibe eventos.
 * - Payload sin PHI (sólo ids / nivel / estado).
 */
test.describe.configure({ mode: 'serial' });

const BRANCH_DEMO = '22222222-2222-2222-2222-222222222222';
const HUB_PATH = '/hubs/clinical-queue';

const PHI_KEYS = new Set([
  'givenName',
  'firstSurname',
  'secondSurname',
  'preferredName',
  'operationalLabel',
  'chiefComplaint',
  'subjectGivenName',
  'subjectFirstSurname',
  'notes',
  'curp',
  'displayName',
]);

function assertSinPhi(payload: Record<string, unknown>) {
  for (const key of Object.keys(payload)) {
    expect(PHI_KEYS.has(key), `payload del hub no debe incluir PHI: ${key}`).toBe(false);
  }
}

async function conectarHub(accessToken: string): Promise<signalR.HubConnection> {
  const conn = new signalR.HubConnectionBuilder()
    .withUrl(`${api.url}${HUB_PATH}`, {
      accessTokenFactory: () => accessToken,
    })
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Error)
    .build();
  await conn.start();
  return conn;
}

test.describe('00 — Contrato hub · clinical-queue', () => {
  test('negotiate sin token responde 401', async ({ apiCtx }) => {
    const res = await apiCtx.post(`${HUB_PATH}/negotiate?negotiateVersion=1`);
    expect(res.status(), await res.text()).toBe(401);
  });

  test('negotiate con Bearer responde 200', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const res = await apiCtx.post(`${HUB_PATH}/negotiate?negotiateVersion=1`, {
      headers: autorizacion(sesion),
    });
    expect(res.status(), await res.text()).toBe(200);
    const body = await res.json();
    expect(body.connectionToken || body.connectionId).toBeTruthy();
  });

  test('JoinBranch + POST encounter emite queueChanged sin PHI', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const conn = await conectarHub(sesion.accessToken);

    const received: unknown[] = [];
    conn.on('queueChanged', (payload) => {
      received.push(payload);
    });

    await conn.invoke('JoinBranch', BRANCH_DEMO);

    const subjectRes = await apiCtx.post('/api/subjects', {
      headers: autorizacion(sesion),
      data: { branchId: BRANCH_DEMO },
    });
    expect(subjectRes.status(), await subjectRes.text()).toBe(200);
    const subjectId = (await subjectRes.json()).data.subjectId as string;

    const openRes = await apiCtx.post('/api/encounters', {
      headers: autorizacion(sesion),
      data: {
        branchId: BRANCH_DEMO,
        subjectId,
        encounterType: 'urgencias',
      },
    });
    expect(openRes.status(), await openRes.text()).toBe(200);
    const encounterId = (await openRes.json()).data.encounterId as string;

    // Suite paralela: otros workers emiten queueChanged en el mismo branch; no tomar received[0].
    const matchEncounter = (p: unknown) =>
      String((p as Record<string, unknown>).encounterId ?? '').toLowerCase() ===
      encounterId.toLowerCase();

    await expect
      .poll(() => received.find(matchEncounter), { timeout: 10_000 })
      .toBeTruthy();

    const payload = received.find(matchEncounter) as Record<string, unknown>;
    assertSinPhi(payload);
    expect(String(payload.branchId).toLowerCase()).toBe(BRANCH_DEMO);
    expect(String(payload.encounterId).toLowerCase()).toBe(encounterId.toLowerCase());
    expect(payload.reason).toBe('encounter.open');

    await conn.stop();
  });

  test('token de otro tenant no recibe el grupo (si hay MEDICORE_TENANT_B)', async ({
    apiCtx,
  }) => {
    const hayB = api.tenantB.trim().length > 0 && api.tenantB !== api.tenant;
    test.skip(
      !hayB,
      'Requiere MEDICORE_TENANT_B con credenciales válidas para aislar grupos SignalR.',
    );

    const sesionA = await sesionValida(apiCtx);
    const loginB = await apiCtx.post('/api/auth/login', {
      data: {
        tenantCode: api.tenantB,
        userName: api.usuario,
        password: api.password,
      },
    });
    expect(loginB.status(), await loginB.text()).toBe(200);
    const tokenB = (await loginB.json()).data.accessToken as string;

    const connB = await conectarHub(tokenB);
    const receivedB: unknown[] = [];
    connB.on('queueChanged', (p) => receivedB.push(p));
    // Mismo branchId GUID: el grupo usa tenant del token B → no debe oír a A.
    await connB.invoke('JoinBranch', BRANCH_DEMO);

    const connA = await conectarHub(sesionA.accessToken);
    await connA.invoke('JoinBranch', BRANCH_DEMO);

    const subjectRes = await apiCtx.post('/api/subjects', {
      headers: autorizacion(sesionA),
      data: { branchId: BRANCH_DEMO },
    });
    const subjectId = (await subjectRes.json()).data.subjectId as string;
    const openRes = await apiCtx.post('/api/encounters', {
      headers: autorizacion(sesionA),
      data: { branchId: BRANCH_DEMO, subjectId, encounterType: 'urgencias' },
    });
    expect(openRes.status()).toBe(200);

    // Dar tiempo a que A publique; B no debe recibir.
    await new Promise((r) => setTimeout(r, 2500));
    expect(receivedB.length).toBe(0);

    await connA.stop();
    await connB.stop();
  });
});
