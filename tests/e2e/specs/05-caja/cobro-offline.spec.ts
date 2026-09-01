import { test } from '@playwright/test';
import { SKIP_HASTA_BACKEND } from '../../fixtures/tenants';

/** Cobro y corte con partición de red — invariantes F2 + suite partición. */
test.describe('05 — Caja · cobro offline', () => {
  test.skip(`[pendiente backend] registra cobro offline y sincroniza sin duplicar — ${SKIP_HASTA_BACKEND}`, async () => {
    //
  });

  test.skip(`[pendiente backend] corte de caja iniciado offline es atómico al reconectar — ${SKIP_HASTA_BACKEND}`, async () => {
    //
  });
});
