import { test } from '@playwright/test';
import { SKIP_HASTA_BACKEND } from '../../fixtures/tenants';

/** Paciente no identificado — doc 08 + SC-13…SC-18. */
test.describe('02 — Pacientes · no identificado', () => {
  test.skip(`[pendiente backend] ingresa paciente inconsciente sin datos de identidad — ${SKIP_HASTA_BACKEND}`, async () => {
    // SC-13 — mapa en specs/06-seguridad-clinica/sc-mapa.spec.ts
  });

  test.skip(`[pendiente backend] etiqueta provisional fonéticamente distinguible (SC-17) — ${SKIP_HASTA_BACKEND}`, async () => {
    //
  });

  test.skip(`[pendiente backend] vinculación posterior no altera documentos previos (SC-21) — ${SKIP_HASTA_BACKEND}`, async () => {
    //
  });
});
