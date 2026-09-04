/**
 * Hoja de triage imprimible — datos reales (M5). Sin mocks ni escala fija de 4 colores.
 */
import { useEffect, useMemo } from 'react';
import type { EncounterDto } from '@/api/encounters';
import type { BranchDto } from '@/api/branches';
import type { SubjectDto } from '@/api/subjects';
import type { TriageDto, TriageScaleConfigDto } from '@/api/triage';
import { exportElementToPDF, exportElementToPDFBlob } from '@/utils/exportUtils';
import {
  computeImcFromMeasurements,
  formatBranchAddress,
  formatTriageLocalDateTime,
  orderedVitalsForPrint,
  painEvaLabel,
  subjectDisplayForPrint,
  triageLevelAccent,
  triageLevelBannerLabel,
  triagePrintFolio,
} from '@/utils/triagePrintPresentation';
import { findTriageScaleLevel } from '@/utils/triageScalePresentation';
import InstitucionalLogo from '@/components/feature/InstitucionalLogo';

export interface TriagePrintModalProps {
  encounter: EncounterDto;
  subject: SubjectDto | null;
  triage: TriageDto;
  scale: TriageScaleConfigDto | null;
  branch: BranchDto | null;
  /** true = datos del formulario aún no persistidos en servidor */
  isDraft?: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export default function TriagePrintModal({
  encounter,
  subject,
  triage,
  scale,
  branch,
  isDraft = false,
  isOpen,
  onClose,
}: TriagePrintModalProps) {
  const patient = useMemo(
    () => subjectDisplayForPrint(subject, encounter),
    [subject, encounter],
  );
  const when = formatTriageLocalDateTime(triage.occurredAtUtc ?? triage.recordedAtUtc);
  const folio = triagePrintFolio(encounter, triage);
  const level = findTriageScaleLevel(scale, triage.level);
  const accent = triageLevelAccent(scale, triage.level);
  const vitals = orderedVitalsForPrint(triage.vitals ?? []);
  const imc = computeImcFromMeasurements(triage.vitals ?? []);
  const branchName = branch?.name ?? 'Sucursal';
  const branchAddress = formatBranchAddress(branch);
  const branchPhone = branch?.phoneNumber?.trim() ?? '';

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('printing-triage');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('printing-triage');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('printing-triage');
    };
  }, [isOpen]);

  const handlePrint = async () => {
    const wrapper = document.getElementById('triage-print-wrapper');
    if (!wrapper) return;
    const blob = await exportElementToPDFBlob(wrapper, {
      title: `Hoja de Triage — ${patient.name}`,
      orientation: 'portrait',
      margin: 0,
    });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  const handleDownloadPDF = async () => {
    const wrapper = document.getElementById('triage-print-wrapper');
    if (!wrapper) return;
    await exportElementToPDF(wrapper, `Triage_${folio}`, {
      title: `Hoja de Triage — ${patient.name}`,
      orientation: 'portrait',
      margin: 0,
    });
  };

  if (!isOpen) return null;

  const painText =
    triage.painAssessable === 'no_valorable'
      ? 'No valorable'
      : triage.painScore != null
        ? `${triage.painScore}/10 · ${painEvaLabel(triage.painScore, triage.painAssessable)}`
        : 'No capturado';

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/60 print:hidden" aria-hidden />

      <div
        className="triage-print-modal-root fixed inset-0 z-[101] flex items-start justify-center overflow-y-auto print:static print:z-auto print:block print:overflow-visible"
        data-testid="triage-print-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Vista previa hoja de triage"
      >
        <div className="relative mx-auto my-4 min-h-[297mm] w-full max-w-[210mm] bg-background-50 print:m-0 print:min-h-0 print:w-full print:max-w-none print:bg-white print:shadow-none">
          <div id="triage-print-wrapper" className="bg-background-50 print:bg-white">
            <div className="border-b-2 border-primary-500/20 px-10 pb-6 pt-10">
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-start gap-4">
                  <InstitucionalLogo
                    fallbackIcon="ri-heart-pulse-line"
                    fallbackClassName="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-primary-500 text-white"
                    imgClassName="h-14 w-14 flex-shrink-0 object-contain"
                  />
                  <div>
                    <h2 className="font-heading text-xl font-bold text-foreground-900">MediCore</h2>
                    <p className="mt-0.5 text-xs text-foreground-500">
                      Sistema Integral de Gestión Médica
                    </p>
                    <p className="text-xs text-foreground-500">{branchName}</p>
                  </div>
                </div>
                {branchAddress && (
                  <div className="text-right text-2xs text-foreground-400">
                    <p>{branchAddress}</p>
                    {branchPhone && <p className="mt-1">Tel: {branchPhone}</p>}
                  </div>
                )}
              </div>
            </div>

            <div className="border-b border-secondary-200 px-10 py-5 text-center">
              <h1 className="font-heading text-2xl font-bold tracking-wide text-foreground-950">
                HOJA DE TRIAGE Y SIGNOS VITALES
              </h1>
              <p className="mt-1 font-mono text-xs text-foreground-500">Folio: {folio}</p>
              {isDraft && (
                <p className="mt-1 text-xs font-medium text-amber-700">
                  Borrador — confirme guardando el triage en el sistema
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6 px-10 py-5">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-foreground-400">
                  Paciente
                </p>
                <p className="text-sm font-semibold text-foreground-900" data-testid="triage-print-patient">
                  {patient.name}
                </p>
                <div className="mt-1 space-y-0.5 text-xs text-foreground-500">
                  <p>
                    Turno: <span className="font-medium text-foreground-700">{encounter.turnNumber}</span>
                  </p>
                  <p>
                    Expediente / etiqueta:{' '}
                    <span className="font-medium text-foreground-700">{patient.expediente}</span>
                  </p>
                  <p>
                    Edad: <span className="font-medium text-foreground-700">{patient.age}</span> · Sexo
                    biológico:{' '}
                    <span className="font-medium text-foreground-700">{patient.sex}</span>
                  </p>
                  <p>
                    CURP: <span className="font-medium text-foreground-700">{patient.curp}</span>
                  </p>
                </div>
                {triage.chiefComplaint?.trim() && (
                  <p className="mt-2 text-xs italic text-foreground-600">
                    «{triage.chiefComplaint.trim()}»
                  </p>
                )}
              </div>
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-foreground-400">
                  Información del triage
                </p>
                <div className="mt-1 space-y-0.5 text-xs text-foreground-500">
                  <p>
                    Fecha: <span className="font-medium text-foreground-700">{when.date}</span>
                  </p>
                  <p>
                    Hora: <span className="font-medium text-foreground-700">{when.time}</span>
                  </p>
                  <p>
                    Clasificado por:{' '}
                    <span className="font-medium text-foreground-700">
                      {triage.actorDisplayName?.trim() || '—'}
                    </span>
                  </p>
                  <p>
                    Escala:{' '}
                    <span className="font-medium text-foreground-700">
                      {scale?.displayName ?? triage.scaleCode}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div
              className={`mx-10 mb-4 flex items-center gap-3 rounded-lg border p-4 ${accent.badge} ${accent.border}`}
              data-testid="triage-print-level"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-background-50 print:bg-white/80">
                <i className={`${level?.icon ?? 'ri-flag-line'} text-lg ${accent.iconColor}`} aria-hidden />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground-400">
                  Nivel de triage
                </p>
                <p className={`text-base font-bold ${accent.text}`}>
                  {triageLevelBannerLabel(scale, triage.level)}
                </p>
              </div>
            </div>

            <div className="px-10 py-5">
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-foreground-400">
                Signos vitales
              </p>
              <div className="grid grid-cols-2 gap-3">
                {vitals.map((v) => (
                  <div
                    key={v.code}
                    className="rounded-lg border border-secondary-200 bg-background-50 p-3"
                  >
                    <p className="text-[10px] uppercase text-foreground-400">{v.label}</p>
                    <p className="font-mono text-base font-bold text-foreground-900">{v.display}</p>
                  </div>
                ))}
              </div>
            </div>

            {imc && (
              <div className="px-10 pb-4">
                <div className="rounded-lg border border-secondary-200 bg-background-50 p-3">
                  <p className="text-[10px] uppercase text-foreground-400">IMC calculado</p>
                  <p className="font-mono text-base font-bold text-foreground-900">
                    {imc.value} kg/m² · {imc.label}
                  </p>
                </div>
              </div>
            )}

            <div className="px-10 pb-6">
              <div className="rounded-lg border border-secondary-200 bg-background-50 p-3">
                <p className="text-[10px] uppercase text-foreground-400">Escala de dolor (EVA)</p>
                <p className="font-mono text-base font-bold text-foreground-900">{painText}</p>
              </div>
            </div>

            <div className="mt-4 px-10 py-8">
              <div className="flex justify-end">
                <div className="text-center">
                  <div className="mb-2 w-56 border-b border-foreground-400" />
                  <p className="text-sm font-semibold text-foreground-900">
                    {triage.actorDisplayName?.trim() || 'Profesional clasificador'}
                  </p>
                  <p className="text-xs text-foreground-500">Registro de triage · integridad local</p>
                </div>
              </div>
            </div>

            <div className="mt-auto border-t border-secondary-200 px-10 py-4">
              <p className="text-center text-[10px] text-foreground-400">
                Los signos vitales deben interpretarse por un profesional de la salud. Valoración inicial
                configurable; no sustituye evaluación médica.
              </p>
            </div>
          </div>

          <div className="sticky bottom-0 left-0 right-0 flex items-center justify-between gap-3 border-t border-secondary-200 bg-background-50/95 p-4 backdrop-blur print:hidden">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium text-foreground-600 transition-base hover:bg-secondary-100 hover:text-foreground-800"
            >
              Cerrar
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleDownloadPDF()}
                className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 transition-base hover:bg-primary-100"
                data-testid="triage-print-download"
              >
                <i className="ri-file-pdf-line" aria-hidden /> Descargar PDF
              </button>
              <button
                type="button"
                onClick={() => void handlePrint()}
                className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg bg-primary-500 px-6 py-2 text-sm font-medium text-white transition-base hover:bg-primary-600"
                data-testid="triage-print-imprimir"
              >
                <i className="ri-printer-line" aria-hidden /> Imprimir
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          html, body {
            background: #ffffff !important;
            overflow: visible !important;
            height: auto !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body.printing-triage #root { display: none !important; }
          .triage-print-modal-root {
            display: block !important;
            position: static !important;
            inset: auto !important;
            overflow: visible !important;
            background: none !important;
            z-index: auto !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .triage-print-modal-root > div {
            max-width: none !important;
            min-height: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
          }
          #triage-print-wrapper {
            display: block !important;
            position: static !important;
            width: 100% !important;
            min-height: 0 !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            box-shadow: none !important;
          }
          #triage-print-wrapper, #triage-print-wrapper * { visibility: visible !important; }
          #triage-print-wrapper .flex { display: flex !important; }
          #triage-print-wrapper .grid { display: grid !important; }
          #triage-print-wrapper [class*="print:hidden"] { display: none !important; }
        }
      `}</style>
    </>
  );
}
