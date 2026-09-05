import {
  test,
  expect,
  autorizacion,
  sesionValida,
} from '../../fixtures/api';

/**
 * Contrato admin de catálogo de medicamentos (canAdminCatalogos).
 */
test.describe.configure({ mode: 'serial' });

test.describe('00 — Contrato API · medications admin', () => {
  test('listado admin + upsert + desactivar', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const headers = autorizacion(sesion);
    const suffix = Date.now().toString(36).slice(-6);

    const list = await apiCtx.get(
      '/api/medications?includeControlled=true&onlyActive=false&maxRows=200',
      { headers },
    );
    expect(list.status(), await list.text()).toBe(200);
    const listBody = await list.json();
    expect(listBody.success).toBe(true);
    expect(Array.isArray(listBody.data)).toBe(true);

    const create = await apiCtx.post('/api/medications', {
      headers,
      data: {
        genericName: `Paracetamol E2E ${suffix}`,
        brandName: `TempMed ${suffix}`,
        presentation: 'Tableta',
        concentration: '500 mg',
        defaultRoute: 'Oral',
        saleClassification: 'VI',
        isControlledSubstance: false,
        isActive: true,
      },
    });
    expect(create.status(), await create.text()).toBe(200);
    const created = await create.json();
    expect(created.success).toBe(true);
    const medicationId = created.data.medicationId as string;
    expect(created.data.genericName).toContain(suffix);

    const deactivate = await apiCtx.post(`/api/medications?medicationId=${medicationId}`, {
      headers,
      data: {
        genericName: created.data.genericName,
        brandName: created.data.brandName,
        presentation: created.data.presentation,
        concentration: created.data.concentration,
        defaultRoute: created.data.defaultRoute,
        saleClassification: created.data.saleClassification,
        isControlledSubstance: false,
        isActive: false,
      },
    });
    expect(deactivate.status(), await deactivate.text()).toBe(200);
    expect((await deactivate.json()).data.isActive).toBe(false);

    // Fracción I sin controlado → 400
    const bad = await apiCtx.post('/api/medications', {
      headers,
      data: {
        genericName: `Controlado malo ${suffix}`,
        saleClassification: 'I',
        isControlledSubstance: false,
        isActive: true,
      },
    });
    expect(bad.status(), await bad.text()).toBe(400);
  });
});
