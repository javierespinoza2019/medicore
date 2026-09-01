import { useSyncExternalStore } from 'react';
import {
  obtenerEstadoEnlace,
  suscribirEstadoEnlace,
  type EstadoEnlace,
} from '@/api/connectivity';

/**
 * Estado del enlace con el API tal como se observó en peticiones reales.
 * No usa `navigator.onLine`: la interfaz de red no prueba que el servidor responda.
 */
export function useEstadoEnlace(): EstadoEnlace {
  return useSyncExternalStore(suscribirEstadoEnlace, obtenerEstadoEnlace, obtenerEstadoEnlace);
}
