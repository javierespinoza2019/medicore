import { test } from '@playwright/test';
import { SKIP_HASTA_BACKEND } from '../../fixtures/tenants';

test.describe('03 — Triage urgencias · sin bloqueo', () => {
  test.skip(`[pendiente backend] clasifica triage sin datos administrativos (SC-14) — ${SKIP_HASTA_BACKEND}`, async () => {
    //
  });

  test.skip(`[pendiente backend] no asigna nivel de triage por omisión (SC-03) — ${SKIP_HASTA_BACKEND}`, async () => {
    //
  });

  test.skip(`[pendiente backend] inicio de atención no se bloquea por fallo de red (SC-19) — ${SKIP_HASTA_BACKEND}`, async () => {
    //
  });
});
