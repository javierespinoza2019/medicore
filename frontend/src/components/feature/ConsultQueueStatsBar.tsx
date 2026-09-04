import type { ConsultQueueStats } from '@/utils/consultPresentation';

type Props = {
  stats: ConsultQueueStats;
};

function StatCell({
  icon,
  label,
  value,
  valueClass = 'text-foreground-900',
}: {
  icon: string;
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-1 items-center gap-2 border-r border-secondary-200/70 px-3 py-2 last:border-r-0">
      <span
        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-sm text-foreground-500"
        aria-hidden
      >
        <i className={icon} />
      </span>
      <div className="min-w-0">
        <p className={`text-sm font-bold tabular-nums ${valueClass}`}>{value}</p>
        <p className="text-[10px] uppercase tracking-wide text-foreground-500">{label}</p>
      </div>
    </div>
  );
}

/** Estadísticas de cola de consulta externa (M4). */
export default function ConsultQueueStatsBar({ stats }: Props) {
  return (
    <div className="flex overflow-x-auto rounded-lg border border-secondary-200/70 bg-background-50">
      <StatCell icon="ri-stethoscope-line" label="En cola" value={stats.total - stats.cerrado} />
      <StatCell
        icon="ri-time-line"
        label="Abierto"
        value={stats.abierto}
        valueClass="text-amber-600"
      />
      <StatCell
        icon="ri-eye-line"
        label="Observación"
        value={stats.enObservacion}
        valueClass="text-sky-600"
      />
      <StatCell
        icon="ri-timer-line"
        label="Promedio espera"
        value={`${stats.avgWaitMinutes} min`}
        valueClass="text-foreground-600"
      />
      <StatCell
        icon="ri-check-double-line"
        label="Cerrados"
        value={stats.cerrado}
        valueClass="text-emerald-600"
      />
    </div>
  );
}
