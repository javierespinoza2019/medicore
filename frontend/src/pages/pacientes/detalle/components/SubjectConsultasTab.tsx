import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  estadoConfig,
  listEncountersBySubject,
  type EncounterDto,
} from '@/api/encounters';
import { mensajeDeFalla } from '@/api/errors';
import Badge from '@/components/base/Badge';
import Button from '@/components/base/Button';
import {
  formatConsultArrival,
  formatConsultDate,
} from '@/utils/consultPresentation';

type Props = {
  subjectId: string;
};

/** Historial de episodios de consulta del sujeto (M4). */
export default function SubjectConsultasTab({ subjectId }: Props) {
  const navigate = useNavigate();
  const [items, setItems] = useState<EncounterDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      const res = await listEncountersBySubject(subjectId);
      if (cancelled) return;
      if (!res.success || !res.data) {
        setError(mensajeDeFalla(res.failure).titulo || res.message || 'No se pudo cargar el historial.');
        setItems([]);
      } else {
        setItems(res.data.filter((e) => e.encounterType === 'consulta_externa'));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        const da = a.arrivalAtUtc;
        const db = b.arrivalAtUtc;
        return db.localeCompare(da);
      }),
    [items],
  );

  if (loading) {
    return <p className="text-sm text-foreground-500">Cargando consultas…</p>;
  }

  if (error) {
    return (
      <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">
        {error}
      </p>
    );
  }

  if (sorted.length === 0) {
    return (
      <div
        className="rounded-lg border border-dashed border-secondary-300 bg-secondary-50/50 px-4 py-8 text-center"
        data-testid="subject-consultas-tab"
      >
        <p className="text-sm font-medium text-foreground-700">Sin consultas registradas</p>
        <p className="mt-1 text-xs text-foreground-500">
          Abra una consulta externa desde el botón Consulta o la cola de consultas.
        </p>
        <Button
          className="mt-4"
          variant="primary"
          size="sm"
          onClick={() => navigate(`/app/consultas?paciente=${subjectId}`)}
        >
          Ir a consultas
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="subject-consultas-tab">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-foreground-600">
          {sorted.length} episodio(s) de consulta externa
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(`/app/consultas?paciente=${subjectId}`)}
        >
          Abrir cola / nueva consulta
        </Button>
      </div>
      <ul className="divide-y divide-secondary-100 rounded-xl border border-secondary-200 bg-background-0">
        {sorted.map((e) => (
          <li key={e.encounterId}>
            <button
              type="button"
              className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-base hover:bg-secondary-50/50"
              onClick={() => navigate(`/app/consultas?encuentro=${e.encounterId}`)}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground-900">
                  Turno {e.turnNumber} · {formatConsultDate(e.arrivalAtUtc)}
                </p>
                <p className="mt-0.5 text-xs text-foreground-500">
                  Llegada {formatConsultArrival(e.arrivalAtUtc)}
                  {e.operationalLabel ? ` · ${e.operationalLabel}` : ''}
                </p>
              </div>
              <Badge
                variant={
                  e.state === 'cerrado' ? 'secondary' : e.state === 'en_observacion' ? 'info' : 'warning'
                }
                size="sm"
              >
                {estadoConfig[e.state]?.label ?? e.state}
              </Badge>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
