import {
  test,
  expect,
  autorizacion,
  sesionValida,
} from '../../fixtures/api';

/**
 * Contrato de reglas de bloqueo de agenda (ScheduleBlock).
 * 409 al agendar sobre un bloqueo activo.
 */
test.describe.configure({ mode: 'serial' });

const BRANCH_DEMO = '22222222-2222-2222-2222-222222222222';
const PROFESSIONAL_D1 = '66666666-6666-6666-6666-666666660001';

test.describe('00 — Contrato API · schedule-blocks', () => {
  test('upsert + list + bloqueo rechaza cita (409) + soft-delete', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const headers = autorizacion(sesion);

    const day = new Date();
    day.setUTCDate(day.getUTCDate() + 21);
    day.setUTCHours(16, 0, 0, 0);
    const start = day.toISOString();
    const endDate = new Date(day);
    endDate.setUTCMinutes(45);
    const end = endDate.toISOString();
    const localDate = start.slice(0, 10);

    const from = new Date(day);
    from.setUTCHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setUTCDate(to.getUTCDate() + 1);

    const blockId = crypto.randomUUID();
    const put = await apiCtx.put(`/api/schedule-blocks/${blockId}`, {
      headers,
      data: {
        branchId: BRANCH_DEMO,
        kind: 'rango',
        name: `Bloqueo E2E ${blockId.slice(0, 8)}`,
        localDate,
        startUtc: start,
        endUtc: end,
        isActive: true,
      },
    });
    expect(put.status(), await put.text()).toBe(200);
    const putBody = await put.json();
    expect(putBody.success).toBe(true);
    expect(putBody.data.blockId).toBe(blockId);

    const list = await apiCtx.get(
      `/api/schedule-blocks?branchId=${BRANCH_DEMO}&from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
      { headers },
    );
    expect(list.status(), await list.text()).toBe(200);
    const listBody = await list.json();
    expect(listBody.data.some((b: { blockId: string }) => b.blockId === blockId)).toBe(true);

    const subjectRes = await apiCtx.post('/api/subjects', {
      headers,
      data: { branchId: BRANCH_DEMO },
    });
    expect(subjectRes.status(), await subjectRes.text()).toBe(200);
    const subjectId = (await subjectRes.json()).data.subjectId as string;

    const create = await apiCtx.post('/api/appointments', {
      headers,
      data: {
        branchId: BRANCH_DEMO,
        subjectId,
        professionalId: PROFESSIONAL_D1,
        scheduledStartUtc: start,
        scheduledEndUtc: end,
        notes: 'intento sobre bloqueo',
      },
    });
    expect(create.status(), await create.text()).toBe(409);

    const del = await apiCtx.delete(`/api/schedule-blocks/${blockId}`, { headers });
    expect(del.status(), await del.text()).toBe(200);
  });
});
