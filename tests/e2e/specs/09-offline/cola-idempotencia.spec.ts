import { test } from '@playwright/test';
import { SKIP_HASTA_BACKEND } from '../../fixtures/tenants';

/**
 * Cola de salida e idempotencia — doc 03 §4, doc 07, suite partición de red.
 */
test.describe('09 — Offline · cola e idempotencia', () => {
  test.skip(`[pendiente backend] reintento del mismo ULID no duplica escritura — ${SKIP_HASTA_BACKEND}`, async () => {
    //
  });

  test.skip(`[pendiente backend] cola sobrevive cierre de pestaña y reinicio (SC-11 / SS-09) — ${SKIP_HASTA_BACKEND}`, async () => {
    //
  });

  test.skip(`[pendiente backend] drenado por lotes sin duplicar al interrumpir (SS-10) — ${SKIP_HASTA_BACKEND}`, async () => {
    //
  });
});
