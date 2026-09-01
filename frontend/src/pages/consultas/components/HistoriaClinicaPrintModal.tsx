/**
 * Vista de impresión de historia clínica (M7).
 * Usa datos del expediente real; no prellena negado/normal.
 * Acepta record/body ya cargados, o solo patientId (carga desde API).
 */
import { useEffect, useState } from 'react';
import {
  allergyStatusLabel,
  createEmptyMedicalHistoryBody,
  getClinicalRecord,
  type ClinicalRecordDto,
  type MedicalHistoryBody,
} from '@/api/clinicalRecord';
import { mensajeDeFalla } from '@/api/errors';
import type { EstadoInterrogatorioCodigo } from '@/types/clinical';

interface Props {
  patientId: string;
  onClose: () => void;
  /** Si ya están en pantalla (formulario / solo lectura), se reutilizan. */
  record?: ClinicalRecordDto | null;
  body?: MedicalHistoryBody;
}

function labelEstado(estado: EstadoInterrogatorioCodigo): string {
  switch (estado) {
    case 'no_interrogado':
      return 'No interrogado';
    case 'se_desconoce':
      return 'Se desconoce';
    case 'no_aplica':
      return 'No aplica';
    case 'conocido':
      return 'Conocido';
    default:
      return estado;
  }
}

function textoValor(valor: unknown): string {
  if (valor == null) return '—';
  if (typeof valor === 'string') return valor || '—';
  try {
    return JSON.stringify(valor);
  } catch {
    return String(valor);
  }
}

function Seccion({ titulo, estado, valor }: { titulo: string; estado: EstadoInterrogatorioCodigo; valor: unknown }) {
  return (
    <div className="mb-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground-600">{titulo}</p>
      <p className="text-sm text-foreground-900">
        <span className="font-medium">{labelEstado(estado)}</span>
        {estado === 'conocido' ? ` — ${textoValor(valor)}` : ''}
      </p>
    </div>
  );
}

export default function HistoriaClinicaPrintModal({ patientId, onClose, record: recordProp, body: bodyProp }: Props) {
  const needsFetch = recordProp === undefined || bodyProp === undefined;
  const [record, setRecord] = useState<ClinicalRecordDto | null>(recordProp ?? null);
  const [body, setBody] = useState<MedicalHistoryBody>(bodyProp ?? createEmptyMedicalHistoryBody());
  const [loading, setLoading] = useState(needsFetch);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    if (!needsFetch) {
      setRecord(recordProp ?? null);
      if (bodyProp) setBody(bodyProp);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const res = await getClinicalRecord(patientId);
      if (cancelled) return;
      if (!res.success || !res.data) {
        setError(mensajeDeFalla(res.failure).titulo || res.message || 'No se pudo cargar el expediente.');
        setLoading(false);
        return;
      }
      setRecord(res.data);
      setBody(res.data.currentHistory?.body ?? createEmptyMedicalHistoryBody());
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId, needsFetch, recordProp, bodyProp]);

  const allergyCount = record?.allergies?.length ?? 0;
  const status = record?.allergyStatus.status ?? 'no_interrogado';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-background-50 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-200">
          <p className="text-sm font-semibold">Historia clínica · impresión</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              disabled={loading || !!error}
              className="px-3 py-1.5 text-xs border rounded-lg cursor-pointer disabled:opacity-50"
            >
              Imprimir
            </button>
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs border rounded-lg cursor-pointer">
              Cerrar
            </button>
          </div>
        </div>
        <div className="p-6 print:p-0" id="historia-clinica-print">
          {loading ? (
            <p className="text-sm text-foreground-500">Cargando historia clínica…</p>
          ) : error ? (
            <p className="text-sm text-red-700">{error}</p>
          ) : (
            <>
              <h1 className="text-lg font-semibold mb-1">Historia clínica</h1>
              <p className="text-xs text-foreground-500 mb-4">Sujeto: {patientId}</p>

              <div className="mb-4 p-3 border border-amber-200 bg-amber-50 rounded-lg">
                <p className="text-sm font-medium">{allergyStatusLabel(status, allergyCount)}</p>
                {status === 'no_interrogado' && (
                  <p className="text-2xs mt-1">No se afirma ausencia de alergias.</p>
                )}
                {record?.allergies?.map((a) => (
                  <p key={a.allergyId} className="text-sm mt-1">
                    {a.substance} ({a.reactionType}
                    {a.severity ? `, ${a.severity}` : ''})
                  </p>
                ))}
              </div>

              <Seccion titulo="Heredo-familiares" estado={body.heredoFamiliares.estado} valor={body.heredoFamiliares.valor} />
              <Seccion
                titulo="Personales patológicos"
                estado={body.personalesPatologicos.estado}
                valor={body.personalesPatologicos.valor}
              />
              <Seccion
                titulo="Personales no patológicos"
                estado={body.personalesNoPatologicos.estado}
                valor={body.personalesNoPatologicos.valor}
              />
              <Seccion
                titulo="Gineco-obstétricos"
                estado={body.ginecoObstetricos.estado}
                valor={body.ginecoObstetricos.valor}
              />
              <Seccion
                titulo="Aparatos y sistemas"
                estado={body.aparatosYSistemas.estado}
                valor={body.aparatosYSistemas.valor}
              />
              <Seccion titulo="Habitus exterior" estado={body.habitusExterior.estado} valor={body.habitusExterior.valor} />
              <Seccion
                titulo="Padecimiento actual"
                estado={body.padecimientoActual.estado}
                valor={body.padecimientoActual.valor}
              />
              {body.observaciones && (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase text-foreground-600">Observaciones</p>
                  <p className="text-sm">{body.observaciones}</p>
                </div>
              )}
              {record?.lastMedicalActAtUtc == null && (
                <p className="text-2xs text-foreground-400 mt-6">
                  Último acto médico: no registrado (pregunta H abierta — regla de retención pendiente).
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
