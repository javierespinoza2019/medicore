import { test } from '@playwright/test';
import { SKIP_HASTA_BACKEND } from '../../fixtures/tenants';

/**
 * Matriz de permisos por rol.
 * Hoy el prototipo no aplica PermissionGate real; queda skip hasta backend (doc 05 F0 identidad).
 */
test.describe('01 — Auth / seguridad · permisos por rol', () => {
  test.skip(`[pendiente backend] recepción no accede a administración de usuarios — ${SKIP_HASTA_BACKEND}`, async () => {
    // PermissionGate + roles dinámicos en BD
  });

  test.skip(`[pendiente backend] caja no accede a expediente clínico editable — ${SKIP_HASTA_BACKEND}`, async () => {
    //
  });

  test.skip(`[pendiente backend] médico no ejecuta corte de caja — ${SKIP_HASTA_BACKEND}`, async () => {
    //
  });

  test.skip(`[pendiente backend] enfermería puede triage / no puede emitir receta firmada — ${SKIP_HASTA_BACKEND}`, async () => {
    //
  });
});
