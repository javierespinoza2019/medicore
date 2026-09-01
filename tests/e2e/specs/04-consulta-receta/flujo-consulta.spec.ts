import { test } from '@playwright/test';
import { SKIP_HASTA_BACKEND } from '../../fixtures/tenants';

/** Consulta SOAP → receta. Flujo F1 del roadmap. */
test.describe('04 — Consulta / receta', () => {
  test.skip(`[pendiente backend] abre consulta, captura SOAP y cierra episodio — ${SKIP_HASTA_BACKEND}`, async () => {
    //
  });

  test.skip(`[pendiente backend] alerta de alergia bloqueante antes de prescribir (SC-01) — ${SKIP_HASTA_BACKEND}`, async () => {
    //
  });

  test.skip(`[pendiente backend] confirma alergia con justificación (SC-02) — ${SKIP_HASTA_BACKEND}`, async () => {
    //
  });
});
