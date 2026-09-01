/**
 * Estado observado del enlace con el API.
 *
 * Honestidad del indicador: esto **no** es `navigator.onLine`. Tener interfaz de red no prueba
 * que el servidor responda (doc 07 §7.1). El estado aquí registrado proviene únicamente de
 * peticiones reales al API: si no se ha hecho ninguna, el estado es `sin_verificar`.
 */

import type { ApiFailure, ApiFailureKind } from '@/api/errors';

export type EstadoEnlace = {
  /** `null` = todavía no se ha intentado ninguna petición en esta sesión de la pestaña. */
  alcanzable: boolean | null;
  /** Momento de la última petición al API, alcanzable o no. */
  verificadoEn: Date | null;
  /** Tipo de la última falla de enlace observada. */
  ultimaFalla: ApiFailureKind | null;
};

let estado: EstadoEnlace = {
  alcanzable: null,
  verificadoEn: null,
  ultimaFalla: null,
};

type Listener = () => void;
const listeners = new Set<Listener>();

function emitir(siguiente: EstadoEnlace) {
  estado = siguiente;
  listeners.forEach((l) => l());
}

/** El API respondió (aunque la respuesta haya sido un rechazo de negocio). */
export function registrarRespuestaDelApi() {
  emitir({ alcanzable: true, verificadoEn: new Date(), ultimaFalla: null });
}

/** El API no fue alcanzable o se declaró no disponible. */
export function registrarFallaDeEnlace(failure: ApiFailure) {
  emitir({ alcanzable: false, verificadoEn: new Date(), ultimaFalla: failure.kind });
}

export function obtenerEstadoEnlace(): EstadoEnlace {
  return estado;
}

export function suscribirEstadoEnlace(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
