/**
 * Lectura de historia clínica (M7). API real; estados explícitos no_interrogado.
 */
import { useEffect, useState } from 'react';
import {
  allergyStatusLabel,
  allergyStatusIsWarning,
  createEmptyMedicalHistoryBody,
  getClinicalRecord,
  type ClinicalRecordDto,
  type MedicalHistoryBody,
} from '@/api/clinicalRecord';
import { mensajeDeFalla } from '@/api/errors';
import type { EstadoInterrogatorioCodigo } from '@/types/clinical';
import HistoriaClinicaPrintModal from './HistoriaClinicaPrintModal';

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

function Seccion({
  icono,
  titulo,
  tono,
  estado,
  valor,
}: {
  icono: string;
  titulo: string;
  tono: string;
  estado: EstadoInterrogatorioCodigo;
  valor: unknown;
}) {
  return (
    <div className="p-4 rounded-xl border border-secondary-200 bg-background-50">
      <h4 className="text-sm font-semibold text-foreground-800 flex items-center gap-2 mb-2">
        <span className={`w-6 h-6 flex items-center justify-center rounded-md ${tono}`} aria-hidden="true">
          <i className={`${icono} text-xs`}></i>
        </span>
        {titulo}
      </h4>
      <p className="text-sm text-foreground-700">
        <span className="font-medium">{labelEstado(estado)}</span>
        {estado === 'conocido' ? ` · ${textoValor(valor)}` : ''}
      </p>
      {estado === 'no_interrogado' && (
        <p className="text-2xs text-amber-700 mt-1">Sin afirmar resultado clínico.</p>
      )}
    </div>
  );
}

export default function HistoriaClinicaReadOnly({ patientId }: { patientId: string }) {
  const [record, setRecord] = useState<ClinicalRecordDto | null>(null);
  const [body, setBody] = useState<MedicalHistoryBody>(createEmptyMedicalHistoryBody());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
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
  }, [patientId]);

  if (loading) {
    return <div className="py-10 text-center text-sm text-foreground-500">Cargando historia clínica…</div>;
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  const status = record?.allergyStatus.status ?? 'no_interrogado';
  const allergyCount = record?.allergies?.length ?? 0;
  const allergyTone = allergyStatusIsWarning(status)
    ? 'border-amber-300 bg-amber-50'
    : 'border-emerald-200 bg-emerald-50';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 bg-background-50 rounded-xl border border-secondary-200">
        <div>
          <p className="text-sm font-semibold text-foreground-900">Historia clínica</p>
          <p className="text-2xs text-foreground-400">
            Versión {record?.currentHistory?.version ?? '—'} ·{' '}
            {record?.currentHistory?.actorDisplayName ?? '—'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowPrintModal(true)}
          className="px-3 py-1.5 text-xs border border-secondary-200 rounded-lg cursor-pointer"
        >
          Imprimir
        </button>
      </div>

      <div className={`p-4 rounded-xl border ${allergyTone}`}>
        <p className="text-sm font-medium" role="status">
          {allergyStatusLabel(status, allergyCount)}
        </p>
        {status === 'no_interrogado' && allergyCount === 0 && (
          <p className="text-2xs mt-1">No se muestra «sin alergias» para estado no interrogado.</p>
        )}
        {record?.allergies?.map((a) => (
          <p key={a.allergyId} className="text-sm mt-1">
            {a.substance} · {a.reactionType}
            {a.severity ? ` · ${a.severity}` : ''}
          </p>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Seccion
          icono="ri-parent-line"
          titulo="Heredo-familiares"
          tono="bg-sky-100 text-sky-700"
          estado={body.heredoFamiliares.estado}
          valor={body.heredoFamiliares.valor}
        />
        <Seccion
          icono="ri-heart-pulse-line"
          titulo="Personales patológicos"
          tono="bg-rose-100 text-rose-700"
          estado={body.personalesPatologicos.estado}
          valor={body.personalesPatologicos.valor}
        />
        <Seccion
          icono="ri-walk-line"
          titulo="Personales no patológicos"
          tono="bg-emerald-100 text-emerald-700"
          estado={body.personalesNoPatologicos.estado}
          valor={body.personalesNoPatologicos.valor}
        />
        <Seccion
          icono="ri-women-line"
          titulo="Gineco-obstétricos"
          tono="bg-violet-100 text-violet-700"
          estado={body.ginecoObstetricos.estado}
          valor={body.ginecoObstetricos.valor}
        />
        <Seccion
          icono="ri-body-scan-line"
          titulo="Aparatos y sistemas"
          tono="bg-amber-100 text-amber-700"
          estado={body.aparatosYSistemas.estado}
          valor={body.aparatosYSistemas.valor}
        />
        <Seccion
          icono="ri-user-smile-line"
          titulo="Habitus exterior"
          tono="bg-secondary-100 text-foreground-700"
          estado={body.habitusExterior.estado}
          valor={body.habitusExterior.valor}
        />
        <Seccion
          icono="ri-file-list-3-line"
          titulo="Padecimiento actual"
          tono="bg-primary-100 text-primary-700"
          estado={body.padecimientoActual.estado}
          valor={body.padecimientoActual.valor}
        />
      </div>

      {body.observaciones && (
        <div className="p-4 rounded-xl border border-secondary-200">
          <p className="text-2xs uppercase text-foreground-400 mb-1">Observaciones</p>
          <p className="text-sm text-foreground-800">{body.observaciones}</p>
        </div>
      )}

      {showPrintModal && (
        <HistoriaClinicaPrintModal
          patientId={patientId}
          onClose={() => setShowPrintModal(false)}
          record={record}
          body={body}
        />
      )}
    </div>
  );
}
