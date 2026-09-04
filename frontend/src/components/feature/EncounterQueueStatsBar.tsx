import type { QueueStats } from '@/utils/encounterQueuePresentation';
import type { TriageScaleConfigDto } from '@/api/triage';

type Props = {
  stats: QueueStats;
  scale: TriageScaleConfigDto | null;
  /** Muestra contadores por nivel de escala configurable. */
  showLevelBreakdown?: boolean;
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

/**
 * Barra de estadísticas de cola (escala configurable + estados de episodio).
 * No usa mapa fijo rojo/naranja/amarillo/verde del prototipo (doc 06 §63).
 */
export default function EncounterQueueStatsBar({
  stats,
  scale,
  showLevelBreakdown = true,
}: Props) {
  return (
    <div className="space-y-3">
      {showLevelBreakdown && scale?.levels?.length ? (
        <div className="flex overflow-hidden rounded-lg border border-secondary-200/70 bg-background-50">
          <StatCell
            icon="ri-question-line"
            label="Sin clasificar"
            value={stats.unclassified}
            valueClass="text-foreground-700"
          />
          {stats.byLevel.map(({ level, count, accent }) => (
            <StatCell
              key={level.code}
              icon={level.icon ?? 'ri-flag-line'}
              label={level.label}
              value={count}
              valueClass={accent.iconColor}
            />
          ))}
        </div>
      ) : null}

      <div className="flex overflow-x-auto rounded-lg border border-secondary-200/70 bg-background-50">
        <StatCell icon="ri-group-line" label="En cola" value={stats.total - stats.cerrado} />
        <StatCell
          icon="ri-time-line"
          label="Abierto"
          value={stats.abierto}
          valueClass="text-amber-600"
        />
        <StatCell
          icon="ri-stethoscope-line"
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
    </div>
  );
}
