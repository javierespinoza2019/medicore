import { test } from '@playwright/test';
import { SKIP_HASTA_BACKEND } from '../../fixtures/tenants';

/**
 * Aislamiento multi-tenant — prioridad doc 2 / puerta F0.
 * El prototipo mock no modela TenantId; todo skip hasta backend.
 */
test.describe('08 — Multi-tenant · aislamiento', () => {
  test.skip(`[pendiente backend] tenant A no lee pacientes de tenant B — ${SKIP_HASTA_BACKEND}`, async () => {
    //
  });

  test.skip(`[pendiente backend] manipular tenantId en body/query/ruta es rechazado — ${SKIP_HASTA_BACKEND}`, async () => {
    //
  });

  test.skip(`[pendiente backend] listados y exportaciones no filtran por conteo cruzado — ${SKIP_HASTA_BACKEND}`, async () => {
    //
  });
});
