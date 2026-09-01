import { test } from '@playwright/test';
import { SKIP_HASTA_BACKEND } from '../../fixtures/tenants';

test.describe('02 — Pacientes · registro', () => {
  test.skip(`[pendiente backend] registra paciente ambulatorio con CURP válida — ${SKIP_HASTA_BACKEND}`, async () => {
    // docs/frontend /app/pacientes/nuevo
  });

  test.skip(`[pendiente backend] rechaza CURP mal formada sin inventar identidad — ${SKIP_HASTA_BACKEND}`, async () => {
    //
  });
});
