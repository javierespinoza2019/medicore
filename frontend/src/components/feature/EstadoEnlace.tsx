/**
 * Comunicación del estado del enlace y de las fallas del API.
 *
 * Doc 12 §3 / doc 07 §7: al leer, la degradación se declara; nunca se disfraza de otro error
 * ni se bloquea la operación con un diálogo (regla de frontend: indicador pasivo).
 */

import { mensajeDeFalla, type ApiFailure } from '@/api/errors';
import { useEstadoEnlace } from '@/hooks/useEstadoEnlace';

/** Aviso en línea para una falla concreta de una operación. */
export function AvisoDeFalla({ failure }: { failure: ApiFailure }) {
  const { titulo, detalle, esEnlace } = mensajeDeFalla(failure);

  const tono = esEnlace
    ? 'bg-amber-500/10 border-amber-500/30 text-amber-800'
    : 'bg-red-500/10 border-red-500/20 text-red-700';
  const icono = esEnlace ? 'ri-cloud-off-line' : 'ri-error-warning-line';

  return (
    <div className={`flex items-start gap-2.5 px-4 py-3 border rounded-lg ${tono}`} role="alert">
      <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">
        <i className={`${icono} text-sm`}></i>
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{titulo}</p>
        <p className="text-xs mt-1 leading-relaxed">{detalle}</p>
      </div>
    </div>
  );
}

function horaCorta(fecha: Date): string {
  return fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Indicador pasivo del enlace. Solo aparece cuando una petición real al API falló:
 * mientras no se haya intentado nada, no afirma nada.
 */
export function IndicadorDeEnlace() {
  const { alcanzable, verificadoEn } = useEstadoEnlace();

  if (alcanzable !== false) return null;

  return (
    <span
      data-testid="indicador-enlace"
      className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium whitespace-nowrap"
      title="El último intento de comunicación con el servidor falló. La captura sigue disponible y se enviará al restablecerse el enlace."
    >
      <span className="w-3.5 h-3.5 flex items-center justify-center">
        <i className="ri-cloud-off-line text-xs"></i>
      </span>
      Sin enlace con el servidor
      {verificadoEn && <span className="font-normal">· {horaCorta(verificadoEn)}</span>}
    </span>
  );
}
