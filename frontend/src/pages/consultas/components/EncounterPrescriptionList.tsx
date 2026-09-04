/**
 * Listado de recetas del episodio con impresión y cancelación (M8).
 */
import { useState } from 'react';
import {
  cancelPrescription,
  type PrescriptionDto,
} from '@/api/prescriptions';
import { mensajeDeFalla } from '@/api/errors';
import Badge from '@/components/base/Badge';
import Button from '@/components/base/Button';
import RecetaPrintModal from '@/pages/recetas/components/RecetaPrintModal';
import {
  formatPrescriptionDate,
  prescriptionStatusBadge,
  prescriptionStatusLabel,
  prescriptionToRecetaView,
  prescriptionUiStatus,
} from '@/utils/prescriptionPresentation';

type Props = {
  prescriptions: PrescriptionDto[];
  patientName: string;
  patientExpediente: string;
  sucursalNombre?: string;
  onUpdated: (rx: PrescriptionDto) => void;
};

export default function EncounterPrescriptionList({
  prescriptions,
  patientName,
  patientExpediente,
  sucursalNombre = '',
  onUpdated,
}: Props) {
  const [printId, setPrintId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const printRx = prescriptions.find((p) => p.prescriptionId === printId);

  const handleCancel = async (rx: PrescriptionDto) => {
    if (!cancelReason.trim()) {
      setError('Indique el motivo de cancelación.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await cancelPrescription(rx.prescriptionId, cancelReason.trim());
    if (!res.success || !res.data) {
      setError(mensajeDeFalla(res.failure).titulo || res.message || 'No se pudo cancelar.');
      setBusy(false);
      return;
    }
    onUpdated(res.data);
    setCancelId(null);
    setCancelReason('');
    setBusy(false);
  };

  if (prescriptions.length === 0) {
    return <p className="text-sm text-foreground-500">Sin recetas en este episodio.</p>;
  }

  return (
    <div className="space-y-2" data-testid="encounter-prescription-list">
      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
      <ul className="space-y-2">
        {prescriptions.map((rx) => {
          const status = prescriptionUiStatus(rx);
          const badge = prescriptionStatusBadge[status];
          const canCancel = Boolean(rx.signedAtUtc) && !rx.cancelledAtUtc;
          const isCancelling = cancelId === rx.prescriptionId;

          return (
            <li
              key={rx.prescriptionId}
              className="rounded-lg border border-secondary-200 px-3 py-2 text-sm"
              data-testid={`receta-row-${rx.prescriptionId}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium text-foreground-900">
                    {formatPrescriptionDate(rx)} · {rx.items.length} medicamento(s)
                  </span>
                  <p className="text-xs text-foreground-500">{rx.authorDisplayName}</p>
                </div>
                <Badge variant={badge.variant}>{prescriptionStatusLabel(status)}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => setPrintId(rx.prescriptionId)}>
                  Ver / imprimir
                </Button>
                {canCancel && !isCancelling && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setCancelId(rx.prescriptionId);
                      setCancelReason('');
                      setError(null);
                    }}
                    data-testid={`receta-cancelar-${rx.prescriptionId}`}
                  >
                    Cancelar receta
                  </Button>
                )}
              </div>
              {isCancelling && (
                <div className="mt-3 space-y-2 border-t border-secondary-100 pt-3">
                  <label className="block text-xs text-foreground-600">
                    Motivo de cancelación (obligatorio)
                    <textarea
                      className="mt-1 w-full rounded border border-secondary-200 px-2 py-1 text-sm"
                      rows={2}
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      data-testid="receta-motivo-cancelacion"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={busy}
                      onClick={() => void handleCancel(rx)}
                      data-testid="receta-confirmar-cancelacion"
                    >
                      Confirmar cancelación
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCancelId(null)}
                    >
                      Cerrar
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {printRx && (
        <RecetaPrintModal
          receta={prescriptionToRecetaView(printRx, {
            patientName,
            patientExpediente,
            doctorName: printRx.authorDisplayName,
          })}
          isOpen={Boolean(printRx)}
          onClose={() => setPrintId(null)}
          sucursalNombre={sucursalNombre}
        />
      )}
    </div>
  );
}
