import {
  test,
  expect,
  autorizacion,
  sesionValida,
} from '../../fixtures/api';

/**
 * Paciente no identificado — doc 08 + SC-13…SC-18.
 * Alta API + etiqueta. UI de vinculación SC-22: `registro-ui.spec.ts` (chromium).
 */
test.describe.configure({ mode: 'serial' });

const BRANCH_DEMO = '22222222-2222-2222-2222-222222222222';

test.describe('02 — Pacientes · no identificado', () => {
  test('ingresa paciente inconsciente sin datos de identidad (API / SC-13 parcial)', async ({
    apiCtx,
  }) => {
    const sesion = await sesionValida(apiCtx);
    const res = await apiCtx.post('/api/subjects', {
      headers: autorizacion(sesion),
      data: { branchId: BRANCH_DEMO },
    });
    expect(res.status(), await res.text()).toBe(200);
    const body = (await res.json()).data;
    expect(body.identificationState).toBe('no_identificado');
    expect(body.givenName).toBeFalsy();
    expect(body.curp).toBeNull();
    expect(body.biologicalSex).toBeNull();
    expect(body.birthDate).toBeNull();
    expect(body.activeLabel?.operationalLabel).toBeTruthy();
  });

  test('etiqueta provisional distinta por sujeto (SC-17)', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const headers = autorizacion(sesion);
    const a = await apiCtx.post('/api/subjects', {
      headers,
      data: { branchId: BRANCH_DEMO },
    });
    const b = await apiCtx.post('/api/subjects', {
      headers,
      data: { branchId: BRANCH_DEMO },
    });
    expect(a.status()).toBe(200);
    expect(b.status()).toBe(200);
    const labelA = (await a.json()).data.activeLabel.operationalLabel as string;
    const labelB = (await b.json()).data.activeLabel.operationalLabel as string;
    expect(labelA).toBeTruthy();
    expect(labelB).toBeTruthy();
    expect(labelA).not.toBe(labelB);
  });
});
