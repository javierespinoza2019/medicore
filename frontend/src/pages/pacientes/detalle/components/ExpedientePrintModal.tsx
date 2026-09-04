/**
 * Impresión de resumen de expediente — datos reales (M3/M4/M6/M7/M8).
 * Sin mocks de pacientes ni timeline sintético.
 */
import { useEffect, useMemo, useState } from 'react';
import { displayNameOf, getSubject, type SubjectDto } from '@/api/subjects';
import {
  allergyStatusLabel,
  getClinicalRecord,
  type ClinicalRecordDto,
} from '@/api/clinicalRecord';
import { listEncountersBySubject, encounterDisplayName, estadoConfig } from '@/api/encounters';
import { listPrescriptionsBySubject } from '@/api/prescriptions';
import { exportElementToPDF, exportElementToPDFBlob } from '@/utils/exportUtils';
import InstitucionalLogo from '@/components/feature/InstitucionalLogo';
import Button from '@/components/base/Button';

interface ExpedientePrintModalProps {
  patientId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ExpedientePrintModal({
  patientId,
  isOpen,
  onClose,
}: ExpedientePrintModalProps) {
  const [subject, setSubject] = useState<SubjectDto | null>(null);
  const [record, setRecord] = useState<ClinicalRecordDto | null>(null);
  const [encounterCount, setEncounterCount] = useState(0);
  const [rxCount, setRxCount] = useState(0);
  const [encounters, setEncounters] = useState<
    { label: string; state: string; arrival: string }[]
  >([]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void (async () => {
      const [subRes, recRes, encRes, rxRes] = await Promise.all([
        getSubject(patientId),
        getClinicalRecord(patientId),
        listEncountersBySubject(patientId),
        listPrescriptionsBySubject(patientId),
      ]);
      if (cancelled) return;
      setSubject(subRes.success ? (subRes.data ?? null) : null);
      setRecord(recRes.success ? (recRes.data ?? null) : null);
      const encList = encRes.success ? (encRes.data ?? []) : [];
      setEncounterCount(encList.length);
      setEncounters(
        encList.slice(0, 20).map((e) => ({
          label: `Turno ${e.turnNumber} · ${encounterDisplayName(e)}`,
          state: estadoConfig[e.state]?.label ?? e.state,
          arrival: new Date(e.arrivalAtUtc).toLocaleString('es-MX'),
        })),
      );
      setRxCount(rxRes.success ? (rxRes.data?.length ?? 0) : 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, patientId]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('printing-expediente');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('printing-expediente');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('printing-expediente');
    };
  }, [isOpen]);

  const patientName = useMemo(
    () => (subject ? displayNameOf(subject) : 'Sujeto'),
    [subject],
  );

  const handlePrint = async () => {
    const wrapper = document.getElementById('expediente-print-wrapper');
    if (!wrapper) return;
    await exportElementToPDF(wrapper, `expediente-${patientId.slice(0, 8)}`);
  };

  const handleDownload = async () => {
    const wrapper = document.getElementById('expediente-print-wrapper');
    if (!wrapper) return;
    const blob = await exportElementToPDFBlob(wrapper);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expediente-${patientId.slice(0, 8)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 print:relative print:inset-auto print:bg-transparent print:p-0">
      <div className="my-4 w-full max-w-3xl rounded-xl bg-background-0 shadow-xl print:my-0 print:max-w-none print:shadow-none">
        <div className="flex items-center justify-between border-b border-secondary-200 px-5 py-3 print:hidden">
          <h2 className="font-heading text-lg font-semibold text-foreground-900">
            Resumen de expediente
          </h2>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => void handleDownload()}>
              PDF
            </Button>
            <Button variant="primary" size="sm" onClick={() => void handlePrint()}>
              Imprimir
            </Button>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>

        <div id="expediente-print-wrapper" className="p-6 text-sm text-foreground-800">
          <div className="mb-6 flex items-center justify-between border-b border-secondary-200 pb-4">
            <InstitucionalLogo />
            <p className="text-xs text-foreground-500">
              Generado {new Date().toLocaleString('es-MX')}
            </p>
          </div>

          <h1 className="font-heading text-xl font-bold text-foreground-900">{patientName}</h1>
          {subject?.recordNumber && (
            <p className="text-xs text-foreground-500">Expediente {subject.recordNumber}</p>
          )}
          {subject?.curp && (
            <p className="mt-1 font-mono text-xs text-foreground-600">CURP {subject.curp}</p>
          )}

          {record && (
            <section className="mt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-600">
                Estado alérgico
              </h2>
              <p className="mt-1">
                {allergyStatusLabel(record.allergyStatus.status, record.allergies.length)}
              </p>
              {record.allergies.length > 0 && (
                <ul className="mt-2 list-disc pl-5">
                  {record.allergies.map((a) => (
                    <li key={a.allergyId}>
                      {a.substance}
                      {a.manifestation ? ` — ${a.manifestation}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-600">
              Episodios ({encounterCount})
            </h2>
            {encounters.length === 0 ? (
              <p className="mt-1 text-foreground-500">Sin episodios registrados.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {encounters.map((e, i) => (
                  <li key={i} className="text-xs">
                    {e.arrival} · {e.label} · {e.state}
                  </li>
                ))}
              </ul>
            )}
            {encounterCount > 20 && (
              <p className="mt-1 text-2xs text-foreground-400">
                Mostrando 20 de {encounterCount} episodios.
              </p>
            )}
          </section>

          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-600">
              Recetas ({rxCount})
            </h2>
            <p className="mt-1 text-xs text-foreground-500">
              Detalle de medicamentos en módulo recetas / consulta.
            </p>
          </section>

          <p className="mt-8 border-t border-secondary-200 pt-4 text-2xs text-foreground-400">
            Resumen parcial desde API. No incluye estudios, certificados ni documentos legales hasta
            integración de módulos correspondientes. Firma del sistema (integridad); sin e.firma SAT.
          </p>
        </div>
      </div>
    </div>
  );
}
