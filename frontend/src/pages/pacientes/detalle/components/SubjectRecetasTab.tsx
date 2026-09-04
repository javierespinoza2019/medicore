import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listPrescriptionsBySubject, type PrescriptionDto } from '@/api/prescriptions';
import { mensajeDeFalla } from '@/api/errors';
import Badge from '@/components/base/Badge';
import Button from '@/components/base/Button';
import RecetaPrintModal from '@/pages/recetas/components/RecetaPrintModal';
import {
  filterPrescriptions,
  formatPrescriptionDate,
  prescriptionStatusBadge,
  prescriptionStatusLabel,
  prescriptionToRecetaView,
  prescriptionUiStatus,
} from '@/utils/prescriptionPresentation';

type Props = {
  subjectId: string;
  patientName: string;
  patientExpediente: string;
};

/** Recetas del sujeto vía API M8. */
export default function SubjectRecetasTab({
  subjectId,
  patientName,
  patientExpediente,
}: Props) {
  const navigate = useNavigate();
  const [list, setList] = useState<PrescriptionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PrescriptionDto | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      const res = await listPrescriptionsBySubject(subjectId);
      if (cancelled) return;
      if (!res.success || !res.data) {
        setError(mensajeDeFalla(res.failure).titulo || res.message || 'No se pudieron cargar las recetas.');
        setList([]);
      } else {
        setList(res.data);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  const sorted = useMemo(
    () => filterPrescriptions(list, {}),
    [list],
  );

  if (loading) {
    return <p className="text-sm text-foreground-500">Cargando recetas…</p>;
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
        data-testid="subject-recetas-tab"
      >
        <p className="text-sm font-medium text-foreground-700">Sin recetas emitidas</p>
        <p className="mt-1 text-xs text-foreground-500">
          Las recetas se emiten desde consulta o urgencias con captura alérgica explícita.
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
    <div className="space-y-3" data-testid="subject-recetas-tab">
      <p className="text-sm text-foreground-600">{sorted.length} receta(s) en expediente</p>
      <ul className="divide-y divide-secondary-100 rounded-xl border border-secondary-200 bg-background-0">
        {sorted.map((rx) => {
          const status = prescriptionUiStatus(rx);
          const badge = prescriptionStatusBadge[status];
          return (
            <li key={rx.prescriptionId}>
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-base hover:bg-secondary-50/50"
                onClick={() => setSelected(selected?.prescriptionId === rx.prescriptionId ? null : rx)}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground-900">
                    {formatPrescriptionDate(rx)} · {rx.authorDisplayName}
                  </p>
                  <p className="mt-0.5 text-xs text-foreground-500">
                    {rx.items.length} medicamento(s) · Alergias al emitir: {rx.allergyStatusAtIssue}
                  </p>
                </div>
                <Badge variant={badge.variant} size="sm">
                  {prescriptionStatusLabel(status)}
                </Badge>
              </button>
              {selected?.prescriptionId === rx.prescriptionId && (
                <div className="border-t border-secondary-100 bg-secondary-50/30 px-4 py-3">
                  <ul className="list-inside list-disc text-sm text-foreground-700">
                    {rx.items.map((it) => (
                      <li key={it.prescriptionItemId}>{it.genericNameSnapshot}</li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setPrintOpen(true)}>
                      Ver / imprimir
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/app/consultas?encuentro=${rx.encounterId}`)}
                    >
                      Ver consulta
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {printOpen && selected && (
        <RecetaPrintModal
          receta={prescriptionToRecetaView(selected, {
            patientName,
            patientExpediente,
            doctorName: selected.authorDisplayName,
          })}
          isOpen={printOpen}
          onClose={() => setPrintOpen(false)}
        />
      )}
    </div>
  );
}
