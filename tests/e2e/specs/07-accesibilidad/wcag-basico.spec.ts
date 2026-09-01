import { test } from '@playwright/test';
import { SKIP_HASTA_BACKEND } from '../../fixtures/tenants';

/**
 * Accesibilidad WCAG básica (axe) — puerta F0/F1 del roadmap.
 * Scaffold: instalar recorrido axe cuando las pantallas críticas estén estables.
 */
test.describe('07 — Accesibilidad · WCAG básico', () => {
  test.skip(`[pendiente] axe sin violaciones graves en /login — ${SKIP_HASTA_BACKEND}`, async () => {
    // import AxeBuilder from '@axe-core/playwright'
  });

  test.skip(`[pendiente] axe en triage y cabecera de identidad (SC-05 / SC-10) — ${SKIP_HASTA_BACKEND}`, async () => {
    //
  });

  test.skip(`[pendiente] recorrido teclado en login y menú principal — ${SKIP_HASTA_BACKEND}`, async () => {
    //
  });
});
