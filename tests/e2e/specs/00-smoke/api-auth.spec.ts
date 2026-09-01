import {
  test,
  expect,
  api,
  autorizacion,
  claimsDe,
  contextoLimpio,
  cookieRefresh,
  iniciarSesion,
  sesionValida,
  COOKIE_REFRESH,
} from '../../fixtures/api';

/**
 * Contrato de /api/auth contra el API real.
 *
 * Serial a propósito: la base de Dev es compartida y el API bloquea la cuenta
 * tras 5 fallos consecutivos. El caso de credenciales inválidas termina con un
 * login válido, que resetea el contador (sp_Auth_ResetLoginFailure).
 */
test.describe.configure({ mode: 'serial' });

test.describe('00 — Contrato API · autenticación', () => {
  test('login válido devuelve accessToken con claim tenant_id y cookie mc_refresh httponly', async ({
    apiCtx,
  }) => {
    const res = await iniciarSesion(apiCtx);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(typeof body.data.accessToken).toBe('string');
    expect(body.data.accessToken.length).toBeGreaterThan(0);
    expect(body.data.expiresInSeconds).toBeGreaterThan(0);

    const claims = claimsDe(body.data.accessToken);
    expect(claims.tenant_id, 'el access token debe portar tenant_id').toBe(body.data.tenantId);

    const cookie = cookieRefresh(res);
    expect(cookie, 'login debe emitir Set-Cookie mc_refresh').not.toBeNull();
    expect(cookie!.crudo.toLowerCase()).toContain('httponly');
    expect(cookie!.crudo.toLowerCase()).toContain('path=/api/auth');
    expect(cookie!.valor.length).toBeGreaterThan(0);
    // El refresh no viaja en el cuerpo: sólo cookie httpOnly (ADR-006).
    expect(JSON.stringify(body)).not.toContain(cookie!.valor);
  });

  test('credenciales inválidas fallan sin revelar si el usuario existe', async ({ apiCtx }) => {
    const usuarioInexistente = await iniciarSesion(apiCtx, {
      userName: `no-existe-${Date.now()}`,
      password: 'LoQueSea123!',
    });
    const passwordIncorrecta = await iniciarSesion(apiCtx, { password: 'PasswordIncorrecta123!' });

    expect(usuarioInexistente.status()).toBe(401);
    expect(passwordIncorrecta.status()).toBe(401);

    const a = await usuarioInexistente.json();
    const b = await passwordIncorrecta.json();
    expect(a.success).toBe(false);
    expect(b.success).toBe(false);
    expect(b.message, 'la respuesta no debe distinguir usuario inexistente de password errónea').toBe(
      a.message,
    );
    expect(cookieRefresh(usuarioInexistente)).toBeNull();
    expect(cookieRefresh(passwordIncorrecta)).toBeNull();

    // Devolver la cuenta compartida a contador cero.
    const recuperacion = await iniciarSesion(apiCtx);
    expect(recuperacion.status(), 'la cuenta sintética no debe quedar bloqueada').toBe(200);
  });

  test('tenant inexistente no autentica aunque el usuario exista en otro tenant', async ({ apiCtx }) => {
    const res = await iniciarSesion(apiCtx, { tenantCode: `tenant-inexistente-${Date.now()}` });
    expect(res.status()).toBe(401);
  });

  test('GET /api/auth/me sin token responde 401', async ({ apiCtx }) => {
    const res = await apiCtx.get('/api/auth/me');
    expect(res.status()).toBe(401);
  });

  test('GET /api/auth/me con token devuelve los claims del tenant', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const res = await apiCtx.get('/api/auth/me', { headers: autorizacion(sesion) });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.tenantId).toBe(sesion.tenantId);
    expect(body.data.userId).toBe(sesion.userId);
    expect(Array.isArray(body.data.roles)).toBe(true);
  });

  test('token con firma alterada es rechazado', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);
    const [encabezado, payload, firma = ''] = sesion.accessToken.split('.');
    const alterado = `${encabezado}.${payload}.${firma.slice(0, -2)}${firma.endsWith('aa') ? 'bb' : 'aa'}`;
    const res = await apiCtx.get('/api/auth/me', { headers: { Authorization: `Bearer ${alterado}` } });
    expect(res.status()).toBe(401);
  });

  test('refresh rota el token y el refresh anterior deja de servir', async ({ apiCtx }) => {
    const sesion = await sesionValida(apiCtx);

    // Contextos limpios: la cookie se manda explícitamente para controlar cuál se usa.
    const ctxRotacion = await contextoLimpio();
    const primera = await ctxRotacion.post('/api/auth/refresh', {
      headers: { Cookie: `${COOKIE_REFRESH}=${sesion.refresh}` },
    });
    expect(primera.status(), 'el refresh vigente debe emitir una sesión nueva').toBe(200);

    const nueva = cookieRefresh(primera);
    expect(nueva, 'refresh debe rotar la cookie').not.toBeNull();
    expect(nueva!.valor).not.toBe(sesion.refresh);

    const ctxReuso = await contextoLimpio();
    const reuso = await ctxReuso.post('/api/auth/refresh', {
      headers: { Cookie: `${COOKIE_REFRESH}=${sesion.refresh}` },
    });
    expect(reuso.status(), 'el refresh anterior ya no debe servir').toBe(401);

    const ctxRotado = await contextoLimpio();
    const conRotado = await ctxRotado.post('/api/auth/refresh', {
      headers: { Cookie: `${COOKIE_REFRESH}=${nueva!.valor}` },
    });
    expect(conRotado.status(), 'el refresh rotado sí debe servir').toBe(200);

    await ctxRotacion.dispose();
    await ctxReuso.dispose();
    await ctxRotado.dispose();
  });

  test('refresh sin cookie responde 401', async ({ apiCtx }) => {
    const res = await apiCtx.post('/api/auth/refresh');
    expect(res.status()).toBe(401);
  });

  test('logout invalida el refresh de la estación que cierra', async () => {
    const ctx = await contextoLimpio();
    const sesion = await sesionValida(ctx);

    const salida = await ctx.post('/api/auth/logout', {
      headers: { ...autorizacion(sesion), Cookie: `${COOKIE_REFRESH}=${sesion.refresh}` },
    });
    expect(salida.status()).toBe(200);

    const ctxDespues = await contextoLimpio();

    const reuso = await ctxDespues.post('/api/auth/refresh', {
      headers: { Cookie: `${COOKIE_REFRESH}=${sesion.refresh}` },
    });
    expect(reuso.status(), 'tras logout el refresh debe estar revocado').toBe(401);

    await ctx.dispose();
    await ctxDespues.dispose();
  });

  /**
   * Decisión 73 (2026-08-27): el logout cierra sólo la sesión actual. El caso real es urgencias
   * con dos estaciones sobre la misma cuenta: cerrar en recepción no debe expulsar a triage.
   */
  test('una segunda sesión del mismo usuario sobrevive al logout de la primera', async () => {
    const recepcion = await contextoLimpio();
    const triage = await contextoLimpio();

    const sesionRecepcion = await sesionValida(recepcion);
    const sesionTriage = await sesionValida(triage);
    expect(sesionTriage.refresh, 'cada estación debe recibir su propio refresh').not.toBe(
      sesionRecepcion.refresh,
    );

    const salida = await recepcion.post('/api/auth/logout', {
      headers: {
        ...autorizacion(sesionRecepcion),
        Cookie: `${COOKIE_REFRESH}=${sesionRecepcion.refresh}`,
      },
    });
    expect(salida.status()).toBe(200);

    const ctxRecepcion = await contextoLimpio();
    const reusoRecepcion = await ctxRecepcion.post('/api/auth/refresh', {
      headers: { Cookie: `${COOKIE_REFRESH}=${sesionRecepcion.refresh}` },
    });
    expect(reusoRecepcion.status(), 'la sesión que cerró debe quedar revocada').toBe(401);

    const ctxTriage = await contextoLimpio();
    const sigueTriage = await ctxTriage.post('/api/auth/refresh', {
      headers: { Cookie: `${COOKIE_REFRESH}=${sesionTriage.refresh}` },
    });
    expect(sigueTriage.status(), 'la otra estación no debe perder su sesión').toBe(200);

    await recepcion.dispose();
    await triage.dispose();
    await ctxRecepcion.dispose();
    await ctxTriage.dispose();
  });

  test('logout sin cookie de refresh responde 400 y no cierra otras sesiones', async () => {
    const estacion = await contextoLimpio();
    const sesion = await sesionValida(estacion);

    const sinCookie = await contextoLimpio();
    const salida = await sinCookie.post('/api/auth/logout', { headers: autorizacion(sesion) });
    expect(salida.status(), 'sin sesión identificable el API no debe afirmar que cerró algo').toBe(400);

    const body = await salida.json();
    expect(body.success).toBe(false);

    const ctxSigue = await contextoLimpio();
    const sigue = await ctxSigue.post('/api/auth/refresh', {
      headers: { Cookie: `${COOKIE_REFRESH}=${sesion.refresh}` },
    });
    expect(sigue.status(), 'un logout sin cookie no debe revocar la sesión vigente').toBe(200);

    await estacion.dispose();
    await sinCookie.dispose();
    await ctxSigue.dispose();
  });

  test('sessions/revoke-all cierra todas las sesiones del usuario', async () => {
    const estacionA = await contextoLimpio();
    const estacionB = await contextoLimpio();

    const sesionA = await sesionValida(estacionA);
    const sesionB = await sesionValida(estacionB);
    expect(sesionB.refresh).not.toBe(sesionA.refresh);

    const cierre = await estacionA.post('/api/auth/sessions/revoke-all', {
      headers: {
        ...autorizacion(sesionA),
        Cookie: `${COOKIE_REFRESH}=${sesionA.refresh}`,
      },
    });
    expect(cierre.status()).toBe(200);

    const ctxA = await contextoLimpio();
    const ctxB = await contextoLimpio();
    expect(
      (await ctxA.post('/api/auth/refresh', { headers: { Cookie: `${COOKIE_REFRESH}=${sesionA.refresh}` } })).status(),
    ).toBe(401);
    expect(
      (await ctxB.post('/api/auth/refresh', { headers: { Cookie: `${COOKIE_REFRESH}=${sesionB.refresh}` } })).status(),
    ).toBe(401);

    await estacionA.dispose();
    await estacionB.dispose();
    await ctxA.dispose();
    await ctxB.dispose();
  });

  test('login de médico con profesional ligado trae healthcareProfessional en la sesión', async ({
    apiCtx,
  }) => {
    const res = await iniciarSesion(apiCtx, {
      userName: 'alejandro.garcia@medicore.mx',
      password: 'Admin123!',
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    const profesional = body.data.healthcareProfessional;
    expect(profesional, 'el médico sintético debe traer profesional del servidor').not.toBeNull();
    expect(typeof profesional.healthcareProfessionalId).toBe('string');
    expect(profesional.healthcareProfessionalId.length).toBeGreaterThan(0);
    // Cédula del prototipo (sintética); no se inventa otra en el cliente ni en el API.
    expect(profesional.professionalLicense).toBe('CED-09876543');
    expect(profesional.specialty).toBe('Medicina General');

    const claims = claimsDe(body.data.accessToken);
    expect(claims.healthcare_professional_id).toBe(profesional.healthcareProfessionalId);
  });

  test('login de usuario sin profesional trae healthcareProfessional explícitamente vacío', async ({
    apiCtx,
  }) => {
    // Recepción: tiene cuenta, no es profesional sanitario. Caso fail-closed del filtro médico.
    const res = await iniciarSesion(apiCtx, {
      userName: 'jose.ramirez@medicore.mx',
      password: 'Admin123!',
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(
      body.data.healthcareProfessional,
      'sin liga a profesional el campo debe ir null, nunca un id inventado',
    ).toBeNull();

    const claims = claimsDe(body.data.accessToken);
    expect(claims.healthcare_professional_id).toBeUndefined();
  });

  test.skip(
    `[pendiente producto] bloqueo por 5 intentos fallidos — no se ejercita contra la base compartida de Dev (${api.tenant}): dejaría la cuenta sintética bloqueada 15 minutos para todo el equipo. Requiere usuario sintético dedicado al caso.`,
    async () => {
      //
    },
  );
});
