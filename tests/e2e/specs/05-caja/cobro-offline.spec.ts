import { test } from '@playwright/test';
import { SKIP_HASTA_BACKEND } from '../../fixtures/tenants';

/** Cobro y corte con partición de red — Fase 2 (sin API de caja aún). */
test.describe('05 — Caja · cobro offline', () => {
  test.skip(
    `[pendiente Fase 2] registra cobro offline y sincroniza sin duplicar — sin endpoints de caja/cobro en API (${SKIP_HASTA_BACKEND})`,
    async () => {
      //
    },
  );

  test.skip(
    `[pendiente Fase 2] corte de caja iniciado offline es atómico al reconectar — módulo caja no entregado`,
    async () => {
      //
    },
  );
});
