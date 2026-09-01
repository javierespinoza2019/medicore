/** Cliente HTTP central: Bearer + refresh httpOnly (ADR-006). Sin mocks. */

import { apiBaseUrl } from '@/config/environment';
import type { ApiFailure } from '@/api/errors';
import { registrarFallaDeEnlace, registrarRespuestaDelApi } from '@/api/connectivity';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  /**
   * Clasificación de la falla cuando `success` es false. La UI decide el mensaje
   * con `mensajeDeFalla` (`@/api/errors`), nunca con el texto crudo del servidor.
   */
  failure?: ApiFailure;
};

const API_BASE = apiBaseUrl;

/** El API es fuente de verdad; sin respuesta en este plazo se considera enlace interrumpido. */
const TIMEOUT_MS = 15_000;

let accessToken: string | null = null;

/** Profesional sanitario ligado a la cuenta; `null`/ausente = usuario sin profesional (fail closed). */
export type HealthcareProfessionalSession = {
  healthcareProfessionalId: string;
  /** Cédula; `null` = no capturada. Nunca se inventa en el cliente. */
  professionalLicense: string | null;
  /** Especialidad; `null` = no capturada. */
  specialty: string | null;
};

export type LoginResult = {
  userId: string;
  tenantId: string;
  displayName: string;
  accessToken: string;
  expiresInSeconds: number;
  roles: string[];
  branchIds: string[];
  branchCodes: string[];
  /**
   * Profesional sanitario del servidor. `null` o ausente = sin profesional asociado.
   * El cliente no inventa `doctorId` ni cédula cuando viene vacío.
   */
  healthcareProfessional?: HealthcareProfessionalSession | null;
  /** Permisos efectivos del tenant (matriz §19). Ausente = usar plantilla local. */
  permissions?: Partial<Record<string, boolean>>;
  breakGlassGrants?: Array<{
    grantId: string;
    permissionKey: string;
    expiresAtUtc: string;
  }>;
};

export type RestoreOutcome = {
  user: LoginResult | null;
  failure?: ApiFailure;
};

/**
 * Un solo vuelo para refresh: AuthProvider.restoreSession y apiFetch(401) deben
 * compartir la misma petición. El API rota la cookie httpOnly; dos POST concurrentes
 * invalidan la sesión (el segundo llega con cookie ya revocada y borra el access token).
 */
type RefreshFlight = RestoreOutcome;
let refreshFlight: Promise<RefreshFlight> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

/** `res` presente = el servidor respondió; `failure` presente = no hubo respuesta utilizable. */
type ResultadoDeTransporte = {
  ok: boolean;
  res?: Response;
  failure?: ApiFailure;
};

/**
 * Única puerta de salida al API. Distingue el transporte (¿llegó y respondió el servidor?)
 * de la semántica de negocio (¿qué contestó?). Registra el estado observado del enlace.
 */
async function pedir(
  url: string,
  init: RequestInit,
  timeoutMs = TIMEOUT_MS,
): Promise<ResultadoDeTransporte> {
  const controller = new AbortController();
  let venció = false;
  const temporizador = setTimeout(() => {
    venció = true;
    controller.abort();
  }, timeoutMs);

  try {
    const res = await fetch(url, { ...init, signal: controller.signal });

    // 502/503/504 los emite el servidor o su intermediario para decir "no puedo atender":
    // es indisponibilidad, no una respuesta de negocio.
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      const failure: ApiFailure = { kind: 'servidor_no_disponible', status: res.status };
      registrarFallaDeEnlace(failure);
      return { ok: false, failure };
    }

    registrarRespuestaDelApi();
    return { ok: true, res };
  } catch {
    const failure: ApiFailure = venció
      ? { kind: 'tiempo_agotado' }
      : { kind: 'sin_enlace' };
    registrarFallaDeEnlace(failure);
    return { ok: false, failure };
  } finally {
    clearTimeout(temporizador);
  }
}

async function interpretar<T>(res: Response): Promise<ApiResponse<T>> {
  const body = (await res.json().catch(() => ({ success: false }))) as ApiResponse<T>;

  if (res.ok) return body;

  let failure: ApiFailure;
  if (res.status === 401) {
    failure = { kind: 'sesion_expirada', status: 401 };
  } else if (res.status === 403) {
    failure = { kind: 'sin_permiso', status: 403 };
  } else if (res.status >= 500) {
    failure = { kind: 'error_servidor', status: res.status };
  } else {
    failure = { kind: 'solicitud_invalida', status: res.status, apiMessage: body.message };
  }

  return { success: false, message: body.message, errors: body.errors, failure };
}

function refreshSession(): Promise<RefreshFlight> {
  if (!refreshFlight) {
    refreshFlight = (async (): Promise<RefreshFlight> => {
      const intento = await pedir(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!intento.ok) {
        accessToken = null;
        return { user: null, failure: intento.failure };
      }

      if (!intento.res.ok) {
        accessToken = null;
        return { user: null };
      }

      const body = (await intento.res.json().catch(() => null)) as ApiResponse<LoginResult> | null;
      if (!body?.success || !body.data?.accessToken) {
        accessToken = null;
        return { user: null };
      }

      accessToken = body.data.accessToken;
      return { user: body.data };
    })().finally(() => {
      refreshFlight = null;
    });
  }
  return refreshFlight;
}

async function tryRefresh(): Promise<boolean> {
  const outcome = await refreshSession();
  return Boolean(outcome.user?.accessToken);
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<ApiResponse<T>> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const intento = await pedir(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (!intento.ok) {
    return { success: false, failure: intento.failure };
  }

  if (intento.res.status === 401 && retry) {
    const ok = await tryRefresh();
    if (ok) return apiFetch<T>(path, init, false);
  }

  return interpretar<T>(intento.res);
}

export async function login(tenantCode: string, userName: string, password: string) {
  // Sin reintento por refresh: en el inicio de sesión un 401 es rechazo de credenciales,
  // no una sesión caducada.
  const body = await apiFetch<LoginResult>(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ tenantCode, userName, password }),
    },
    false,
  );

  if (body.success && body.data?.accessToken) {
    setAccessToken(body.data.accessToken);
    return body;
  }

  if (body.failure?.kind === 'sesion_expirada') {
    // El API responde 401 sin distinguir usuario inexistente de contraseña incorrecta,
    // y así debe quedarse.
    const failure: ApiFailure = { kind: 'credenciales', status: body.failure.status };
    return { ...body, failure };
  }

  return body;
}

/**
 * Reanuda la sesión con la cookie httpOnly de refresh.
 * Distingue "la sesión ya no es válida" (`user: null` sin falla de enlace) de
 * "no se pudo preguntar al servidor" (`failure` de enlace): lo segundo no es cierre de sesión.
 * Comparte vuelo con el reintento 401 de `apiFetch` (rotación de cookie).
 */
export function restoreSession(): Promise<RestoreOutcome> {
  return refreshSession();
}

export async function logout() {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } finally {
    setAccessToken(null);
  }
}

/** #75 — cierra sesión en todos los dispositivos del usuario autenticado. */
export async function revokeAllSessions() {
  try {
    await apiFetch('/api/auth/sessions/revoke-all', { method: 'POST' });
  } finally {
    setAccessToken(null);
  }
}

export async function health() {
  return apiFetch<{ status: string; product: string; phase: string }>('/api/health');
}
