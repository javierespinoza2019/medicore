import type { LiveQueueStatus } from '@/sync/liveQueue';

type Props = {
  liveStatus: LiveQueueStatus;
  fromCache: boolean;
  cacheAgeLabel: string | null;
  showStaleBanner: boolean;
  /** Estilo oscuro para monitor de turnos. */
  dark?: boolean;
};

/**
 * Indicador de enlace / antigüedad (SC-09).
 * El live es mejora de latencia; sin él la UI lo dice y muestra la edad de la lectura.
 */
export default function QueueLiveBanner({
  liveStatus,
  fromCache,
  cacheAgeLabel,
  showStaleBanner,
  dark = false,
}: Props) {
  if (!showStaleBanner && liveStatus === 'conectado') return null;

  const base = dark
    ? 'rounded border border-slate-600 bg-slate-800/90 px-3 py-2 text-sm text-slate-200'
    : 'rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900';

  let texto: string;
  if (fromCache || liveStatus === 'sin_enlace') {
    texto = cacheAgeLabel
      ? `Sin enlace al servidor. Mostrando última cola conocida (${cacheAgeLabel}). El empuje en vivo no está activo.`
      : 'Sin enlace al servidor. No hay cola en caché; el empuje en vivo no está activo.';
  } else if (liveStatus === 'conectando') {
    texto = cacheAgeLabel
      ? `Conectando empuje en vivo… Lectura actual ${cacheAgeLabel}.`
      : 'Conectando empuje en vivo…';
  } else if (liveStatus === 'desconectado') {
    texto = cacheAgeLabel
      ? `Sin empuje en vivo. Datos de cola ${cacheAgeLabel}; se actualizan por consulta periódica.`
      : 'Sin empuje en vivo. La cola se actualiza por consulta periódica.';
  } else {
    return null;
  }

  return (
    <p className={base} role="status" data-testid="queue-live-banner">
      {texto}
    </p>
  );
}
