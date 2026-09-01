/**
 * Contrato de API contra el stack real (API + BD). No usa navegador ni mocks.
 *
 * Salvaguarda: la suite escribe (idempotencia, dispositivos). Si el ambiente
 * declara `allowRealPatientData`, se aborta: no se escribe contra PHI.
 */
import { test as base, expect, request as playwrightRequest } from '@playwright/test';
import type { APIRequestContext, APIResponse } from '@playwright/test';

function leer(nombre: string, porOmision: string): string {
  const valor = process.env[nombre];
  return valor === undefined || valor.trim() === '' ? porOmision : valor.trim();
}

export const api = {
  url: leer('MEDICORE_API_URL', 'http://127.0.0.1:5080'),
  tenant: leer('MEDICORE_TENANT_A', 'demo'),
  usuario: leer('MEDICORE_E2E_USER', 'admin'),
  password: leer('MEDICORE_E2E_PASSWORD', 'Demo123!'),
  tenantB: leer('MEDICORE_TENANT_B', ''),
} as const;

export const COOKIE_REFRESH = 'mc_refresh';

export interface SaludPlataforma {
  status: string;
  environment: string;
  isDemo: boolean;
  allowRealPatientData: boolean;
  dgisDestination: string;
}

/** Contexto sin cookies previas: permite mandar `mc_refresh` a mano. */
export async function contextoLimpio(): Promise<APIRequestContext> {
  return playwrightRequest.newContext({ baseURL: api.url });
}

export async function leerSalud(ctx: APIRequestContext): Promise<SaludPlataforma> {
  const res = await ctx.get('/api/health');
  expect(res.status(), 'GET /api/health debe responder 200').toBe(200);
  const body = await res.json();
  expect(body.success, '/api/health debe responder success:true').toBe(true);
  return body.data as SaludPlataforma;
}

/** Devuelve el valor crudo de la cookie mc_refresh del Set-Cookie de la respuesta. */
export function cookieRefresh(res: APIResponse): { valor: string; crudo: string } | null {
  const cabecera = res
    .headersArray()
    .find((h) => h.name.toLowerCase() === 'set-cookie' && h.value.startsWith(`${COOKIE_REFRESH}=`));
  if (!cabecera) return null;
  const valor = cabecera.value.slice(`${COOKIE_REFRESH}=`.length).split(';')[0] ?? '';
  return { valor, crudo: cabecera.value };
}

export interface Sesion {
  accessToken: string;
  tenantId: string;
  userId: string;
  refresh: string;
}

export async function iniciarSesion(
  ctx: APIRequestContext,
  credenciales: { tenantCode?: string; userName?: string; password?: string } = {},
): Promise<APIResponse> {
  return ctx.post('/api/auth/login', {
    data: {
      tenantCode: credenciales.tenantCode ?? api.tenant,
      userName: credenciales.userName ?? api.usuario,
      password: credenciales.password ?? api.password,
    },
  });
}

export async function sesionValida(ctx: APIRequestContext): Promise<Sesion> {
  const res = await iniciarSesion(ctx);
  expect(res.status(), 'login con credenciales sintéticas de Dev debe responder 200').toBe(200);
  const body = await res.json();
  const cookie = cookieRefresh(res);
  expect(cookie, 'login debe emitir cookie mc_refresh').not.toBeNull();
  return {
    accessToken: body.data.accessToken,
    tenantId: body.data.tenantId,
    userId: body.data.userId,
    refresh: cookie!.valor,
  };
}

export function autorizacion(sesion: Sesion): Record<string, string> {
  return { Authorization: `Bearer ${sesion.accessToken}` };
}

/** Decodifica el payload de un JWT sin verificar la firma (solo para aserciones de claims). */
export function claimsDe(accessToken: string): Record<string, unknown> {
  const payload = accessToken.split('.')[1] ?? '';
  const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  return JSON.parse(json);
}

/** Identificador propio para no pisar datos de otros en la base compartida de Dev. */
export function idE2E(prefijo: string): string {
  return `e2e-${prefijo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

type Fixtures = {
  apiCtx: APIRequestContext;
  salud: SaludPlataforma;
};

export const test = base.extend<Fixtures>({
  apiCtx: async ({}, use) => {
    const ctx = await contextoLimpio();
    await use(ctx);
    await ctx.dispose();
  },
  salud: [async ({ apiCtx }, use) => {
    let salud: SaludPlataforma;
    try {
      salud = await leerSalud(apiCtx);
    } catch (error) {
      throw new Error(
        `No hay API en ${api.url}. Levanta el stack real: ` +
          '`dotnet run --project backend/Api --launch-profile http`. ' +
          `Detalle: ${(error as Error).message}`,
      );
    }

    if (salud.allowRealPatientData) {
      throw new Error(
        `Suite abortada: el ambiente ${api.url} declara allowRealPatientData=true. ` +
          'Las pruebas de contrato escriben datos y no se ejecutan contra un ambiente con PHI.',
      );
    }

    await use(salud);
  }, { auto: true }],
});

export { expect };
