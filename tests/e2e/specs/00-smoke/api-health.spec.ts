import { test, expect, api } from '../../fixtures/api';

/**
 * Contrato de /api/health y salvaguarda de ambiente.
 * Requiere API + BD reales (ver tests/e2e/README.md).
 */
test.describe('00 — Contrato API · salud del ambiente', () => {
  test('GET /api/health responde success:true y expone el perfil de plataforma', async ({ apiCtx }) => {
    const res = await apiCtx.get('/api/health');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
    expect(typeof body.data.environment).toBe('string');
    expect(body.data.environment.length).toBeGreaterThan(0);
    expect(typeof body.data.isDemo).toBe('boolean');
    expect(typeof body.data.allowRealPatientData).toBe('boolean');
    expect(typeof body.data.dgisDestination).toBe('string');
    expect(body.data.dgisDestination.length).toBeGreaterThan(0);
  });

  test('el ambiente bajo prueba no admite datos de pacientes reales', async ({ salud }) => {
    // Salvaguarda explícita: la suite escribe. Si esto fuera true, el fixture ya abortó.
    expect(
      salud.allowRealPatientData,
      `El ambiente ${api.url} declara PHI habilitado; la suite no debe escribir ahí.`,
    ).toBe(false);
  });

  test('el ambiente bajo prueba no es Production', async ({ salud }) => {
    expect(salud.environment.toLowerCase()).not.toBe('production');
  });
});
