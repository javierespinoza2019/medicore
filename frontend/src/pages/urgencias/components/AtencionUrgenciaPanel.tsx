import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  circumstanceOptions,
  dispositionOptions,
  encounterDisplayName,
  estadoConfig,
  transitionEncounterState,
  updateAdmission,
  createMpNotice,
  createCareWithoutConsent,
  type EncounterDto,
} from '@/api/encounters';
import { getSubject, displayNameOf, type SubjectDto } from '@/api/subjects';
import { listPrescriptionsBySubject, type PrescriptionDto } from '@/api/prescriptions';
import type { TriageScaleConfigDto } from '@/api/triage';
import { mensajeDeFalla } from '@/api/errors';
import { triageLevelLabel } from '@/utils/triageScalePresentation';
import {
  filterPrescriptions,
  hasPendingPrescriptions,
  isPrescriptionPending,
  prescriptionStatusLabel,
  prescriptionUiStatus,
} from '@/utils/prescriptionPresentation';
import Button from '@/components/base/Button';
import Input from '@/components/base/Input';
import Select from '@/components/base/Select';
import Textarea from '@/components/base/Textarea';
import IdentityHeader from '@/components/feature/IdentityHeader';
import EncounterPrescriptionList from '@/pages/consultas/components/EncounterPrescriptionList';
import UrgenciaRecetaCreator from '@/pages/urgencias/components/UrgenciaRecetaCreator';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  encounter: EncounterDto;
  /** Escala efectiva de la sucursal; si falta, se muestra el código crudo. */
  triageScale?: TriageScaleConfigDto | null;
  onUpdated: (e: EncounterDto) => void;
}

function isPendingPrescriptionsConflict(message: string | undefined): boolean {
  if (!message) return false;
  return /receta|firmar|pendiente/i.test(message);
}

export default function AtencionUrgenciaPanel({
  encounter,
  triageScale = null,
  onUpdated,
}: Props) {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [subject, setSubject] = useState<SubjectDto | null>(null);
  const [prescriptions, setPrescriptions] = useState<PrescriptionDto[]>([]);
  const [rxLoading, setRxLoading] = useState(false);
  const [showRecetaCreator, setShowRecetaCreator] = useState(false);
  const [sc04OverrideReason, setSc04OverrideReason] = useState('');
  const [sc04PromptOpen, setSc04PromptOpen] = useState(false);

  const [accessRoute, setAccessRoute] = useState(encounter.accessRoute ?? '');
  const [circumstance, setCircumstance] = useState(encounter.admissionCircumstance ?? '');
  const [circumstanceText, setCircumstanceText] = useState(
    encounter.admissionCircumstanceText ?? '',
  );
  const [mpValue, setMpValue] = useState<string>(
    encounter.ministerioPublicoNotified === null
      ? 'null'
      : encounter.ministerioPublicoNotified
        ? 'true'
        : 'false',
  );
  const [disposition, setDisposition] = useState('');
  const [justification, setJustification] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [mpAct, setMpAct] = useState('');
  const [mpAgency, setMpAgency] = useState('');
  const [mpPatientId, setMpPatientId] = useState(
    encounter.operationalLabel ?? encounterDisplayName(encounter),
  );

  const [wocAssessment, setWocAssessment] = useState('');
  const [wocRationale, setWocRationale] = useState('');
  const [wocProf2, setWocProf2] = useState('');

  const encounterPrescriptions = useMemo(
    () => filterPrescriptions(prescriptions, { encounterId: encounter.encounterId }),
    [prescriptions, encounter.encounterId],
  );

  const pendingRx = useMemo(
    () => encounterPrescriptions.filter(isPrescriptionPending),
    [encounterPrescriptions],
  );

  const doctorId = user?.doctorId?.trim() || '';
  const doctorName = `${user?.nombre ?? ''} ${user?.apellidos ?? ''}`.trim() || 'Médico';
  const canPrescribe = Boolean(doctorId) && encounter.state !== 'cerrado';

  const loadPrescriptions = useCallback(async () => {
    if (authLoading || !isAuthenticated) {
      setPrescriptions([]);
      return;
    }
    setRxLoading(true);
    const res = await listPrescriptionsBySubject(encounter.subjectId);
    setRxLoading(false);
    if (res.success && res.data) setPrescriptions(res.data);
  }, [encounter.subjectId, authLoading, isAuthenticated]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      setSubject(null);
      return;
    }
    let cancelled = false;
    setSubject(null);
    void (async () => {
      const res = await getSubject(encounter.subjectId);
      if (!cancelled && res.success && res.data) setSubject(res.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [encounter.subjectId, authLoading, isAuthenticated]);

  useEffect(() => {
    void loadPrescriptions();
  }, [loadPrescriptions]);

  useEffect(() => {
    setShowRecetaCreator(false);
    setSc04PromptOpen(false);
    setSc04OverrideReason('');
  }, [encounter.encounterId]);

  const handlePrescriptionChange = (rx: PrescriptionDto) => {
    setPrescriptions((prev) => {
      const idx = prev.findIndex((p) => p.prescriptionId === rx.prescriptionId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = rx;
        return next;
      }
      return [rx, ...prev];
    });
    setShowRecetaCreator(false);
    setMsg('Receta registrada en el episodio.');
  };

  async function saveAdmission() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const body: Record<string, unknown> = {
      accessRoute: accessRoute || null,
      admissionCircumstance: circumstance || null,
      admissionCircumstanceText: circumstanceText || null,
    };
    if (mpValue === 'null') body.clearMpNotified = true;
    else body.ministerioPublicoNotified = mpValue === 'true';

    const res = await updateAdmission(encounter.encounterId, body);
    setBusy(false);
    if (!res.success || !res.data) {
      setErr(mensajeDeFalla(res.failure).titulo || res.message || 'No se pudo guardar ingreso.');
      return;
    }
    onUpdated(res.data);
    setMsg('Datos de ingreso actualizados.');
  }

  async function changeState(
    toState: string,
    opts?: { pendingPrescriptionsOverrideReason?: string },
  ) {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await transitionEncounterState(encounter.encounterId, {
      toState,
      disposition: toState === 'cerrado' ? disposition || null : null,
      justification: toState === 'cerrado' ? justification || null : null,
      pendingPrescriptionsOverrideReason: opts?.pendingPrescriptionsOverrideReason ?? null,
    });
    setBusy(false);
    if (!res.success || !res.data) {
      const status = res.failure?.status;
      const apiMsg = res.message ?? res.failure?.apiMessage ?? '';
      if (status === 409 && isPendingPrescriptionsConflict(apiMsg)) {
        setSc04PromptOpen(true);
        setErr(apiMsg || 'Hay recetas sin firmar. Indique motivo para forzar el cierre (SC-04).');
        return;
      }
      if (status === 409) {
        setErr(apiMsg || 'No se puede cerrar sin clasificación de triage (SC-03).');
      } else if (status === 422) {
        setErr(apiMsg || 'El cierre exige justificación.');
      } else {
        setErr(mensajeDeFalla(res.failure).titulo || apiMsg || 'No se pudo cambiar el estado.');
      }
      return;
    }
    setSc04PromptOpen(false);
    setSc04OverrideReason('');
    onUpdated(res.data);
    setMsg(`Estado: ${res.data.state}`);
  }

  async function attemptClose() {
    if (!disposition) {
      setErr('Seleccione desenlace antes de cerrar.');
      return;
    }
    if (!justification.trim()) {
      setErr('Indique justificación del cierre.');
      return;
    }
    if (hasPendingPrescriptions(encounterPrescriptions)) {
      setSc04PromptOpen(true);
      setErr('Hay recetas sin firmar. Firme, cancele o indique motivo de excepción (SC-04).');
      return;
    }
    await changeState('cerrado');
  }

  async function forceCloseWithOverride() {
    const reason = sc04OverrideReason.trim();
    if (!reason) {
      setErr('SC-04: el motivo de excepción es obligatorio.');
      return;
    }
    await changeState('cerrado', { pendingPrescriptionsOverrideReason: reason });
  }

  async function submitMpNotice() {
    if (!user?.doctorId) {
      setErr('Se requiere profesional sanitario en sesión para la hoja al MP.');
      return;
    }
    setBusy(true);
    setErr(null);
    const displayName = `${user.nombre} ${user.apellidos}`.trim();
    const res = await createMpNotice(encounter.encounterId, {
      establishmentNameSnapshot: 'Clínica Central - CDMX (demo)',
      patientIdentificationText: mpPatientId || encounter.operationalLabel || 'Identidad provisional',
      notifiedAct: mpAct,
      mpAgencyName: mpAgency,
      notifyingProfessionalId: user.doctorId,
      notifyingProfessionalName: displayName || 'Médico',
    });
    setBusy(false);
    if (!res.success || !res.data) {
      setErr(mensajeDeFalla(res.failure).titulo || res.message || 'No se pudo generar la hoja.');
      return;
    }
    setMsg('Hoja al MP registrada (identidad provisional admitida).');
    const refreshed = await updateAdmission(encounter.encounterId, {});
    if (refreshed.success && refreshed.data) onUpdated(refreshed.data);
  }

  async function submitWoc() {
    if (!user?.doctorId) {
      setErr('Se requiere profesional en sesión (co-autor 1).');
      return;
    }
    if (!wocProf2.trim()) {
      setErr('Indique el segundo ProfessionalId (distinto).');
      return;
    }
    setBusy(true);
    setErr(null);
    const res = await createCareWithoutConsent(encounter.encounterId, {
      clinicalAssessment: wocAssessment,
      urgencyRationale: wocRationale,
      noRelativeOrRepresentative: true,
      professionalId1: user.doctorId,
      professionalId2: wocProf2.trim(),
    });
    setBusy(false);
    if (!res.success || !res.data) {
      setErr(
        res.failure?.status === 409
          ? (res.message ?? 'Se exigen dos profesionales distintos.')
          : (mensajeDeFalla(res.failure).titulo ||
              res.message ||
              'No se pudo registrar la constancia.'),
      );
      return;
    }
    setMsg('Constancia de atención sin consentimiento registrada.');
  }

  const estado = estadoConfig[encounter.state] ?? estadoConfig.abierto;
  const patientName = subject ? displayNameOf(subject) : encounterDisplayName(encounter);
  const patientExpediente =
    subject?.recordNumber ||
    subject?.activeLabel?.operationalLabel ||
    encounter.operationalLabel ||
    '';

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4" data-testid="panel-atencion-urgencia">
      {subject ? (
        <IdentityHeader subject={subject} compact />
      ) : (
        <p className="text-xs text-slate-500">Cargando identidad…</p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-semibold text-slate-900">
            Turno {encounter.turnNumber} · {encounterDisplayName(encounter)}
          </h2>
          <p className="text-xs text-slate-500">
            {encounter.triageLevel
              ? `Triage: ${triageLevelLabel(triageScale, encounter.triageLevel)}`
              : 'Sin clasificar (triage pendiente)'}
          </p>
        </div>
        <span
          className={`rounded px-2 py-1 text-xs font-medium ${estado.className}`}
          data-testid={`encounter-state-${encounter.state}`}
        >
          {estado.label}
        </span>
      </div>

      {encounter.suggestMpNoticeEvaluation && encounter.ministerioPublicoNotified === null && (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Sugerencia: valore aviso al Ministerio Público según la circunstancia. El sistema no
          determina ni bloquea.
        </p>
      )}

      <div className="space-y-3 border-t border-slate-100 pt-3" data-testid="urgencia-recetas-section">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-700">Recetas del episodio (M8)</p>
          {canPrescribe && !showRecetaCreator && (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setShowRecetaCreator(true);
                setErr(null);
              }}
              data-testid="btn-nueva-receta-urgencia"
            >
              Nueva receta
            </Button>
          )}
        </div>
        {!doctorId && encounter.state !== 'cerrado' && (
          <p className="text-xs text-amber-800">
            Sesión sin profesional sanitario: no puede emitir recetas (fail closed).
          </p>
        )}
        {showRecetaCreator && canPrescribe && (
          <UrgenciaRecetaCreator
            encounterId={encounter.encounterId}
            patientId={encounter.subjectId}
            patientName={patientName}
            doctorName={doctorName}
            onCreated={handlePrescriptionChange}
            onCancel={() => setShowRecetaCreator(false)}
          />
        )}
        {rxLoading && encounterPrescriptions.length === 0 ? (
          <p className="text-sm text-slate-500">Cargando recetas…</p>
        ) : (
          <EncounterPrescriptionList
            prescriptions={encounterPrescriptions}
            patientName={patientName}
            patientExpediente={patientExpediente}
            onUpdated={handlePrescriptionChange}
          />
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          label="Vía de acceso"
          value={accessRoute}
          onChange={(e) => setAccessRoute(e.target.value)}
        />
        <Select
          label="Circunstancia"
          value={circumstance}
          onChange={(e) => setCircumstance(e.target.value)}
          options={circumstanceOptions}
        />
        <Input
          label="Detalle circunstancia"
          value={circumstanceText}
          onChange={(e) => setCircumstanceText(e.target.value)}
        />
        <Select
          label="Aviso al MP (sí / no / no valorado)"
          value={mpValue}
          onChange={(e) => setMpValue(e.target.value)}
          options={[
            { value: 'null', label: 'No valorado' },
            { value: 'true', label: 'Sí' },
            { value: 'false', label: 'No' },
          ]}
        />
      </div>

      <Button type="button" size="sm" onClick={() => void saveAdmission()} disabled={busy}>
        Guardar ingreso
      </Button>

      {encounter.state !== 'cerrado' && (
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <p className="text-sm font-medium text-slate-700">Estado</p>
          <div className="flex flex-wrap gap-2">
            {encounter.state === 'abierto' && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void changeState('en_observacion')}
              >
                Pasar a observación
              </Button>
            )}
            {encounter.state === 'en_observacion' && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void changeState('abierto')}
              >
                Volver a abierto
              </Button>
            )}
          </div>
          <Select
            label="Desenlace (obligatorio para cerrar; sin default)"
            value={disposition}
            onChange={(e) => setDisposition(e.target.value)}
            options={dispositionOptions}
          />
          <Textarea
            label="Justificación del cierre"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            rows={2}
          />
          {pendingRx.length > 0 && (
            <div
              className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
              data-testid="sc04-pending-warning"
            >
              <p className="font-medium">SC-04: {pendingRx.length} receta(s) sin firmar.</p>
              <ul className="mt-1 list-inside list-disc">
                {pendingRx.map((rx) => (
                  <li key={rx.prescriptionId}>
                    {rx.items.length} medicamento(s) ·{' '}
                    {prescriptionStatusLabel(prescriptionUiStatus(rx))}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(sc04PromptOpen || pendingRx.length > 0) && (
            <Textarea
              label="Motivo de excepción SC-04 (obligatorio para forzar cierre con Rx pendientes)"
              value={sc04OverrideReason}
              onChange={(e) => setSc04OverrideReason(e.target.value)}
              rows={2}
              data-testid="sc04-override-reason"
            />
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => void attemptClose()}
              data-testid="btn-cerrar-episodio"
            >
              Cerrar episodio
            </Button>
            {(sc04PromptOpen || pendingRx.length > 0) && (
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => void forceCloseWithOverride()}
                data-testid="btn-forzar-cierre-sc04"
              >
                Forzar cierre (SC-04)
              </Button>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Cierre sin triage → 409 (SC-03). Con recetas sin firmar → 409 hasta override (SC-04).
          </p>
        </div>
      )}

      <div className="space-y-2 border-t border-slate-100 pt-3">
        <p className="text-sm font-medium text-slate-700">Hoja al MP (NOM-004 10.3)</p>
        <Input
          label="Identificación del paciente (provisional admitida)"
          value={mpPatientId}
          onChange={(e) => setMpPatientId(e.target.value)}
        />
        <Input label="Acto notificado" value={mpAct} onChange={(e) => setMpAct(e.target.value)} />
        <Input
          label="Agencia del MP"
          value={mpAgency}
          onChange={(e) => setMpAgency(e.target.value)}
        />
        <Button type="button" size="sm" disabled={busy} onClick={() => void submitMpNotice()}>
          Generar hoja al MP
        </Button>
      </div>

      <div className="space-y-2 border-t border-slate-100 pt-3">
        <p className="text-sm font-medium text-slate-700">
          Atención sin consentimiento (LGS 51 Bis 2 / Regl. art. 81)
        </p>
        <Textarea
          label="Valoración clínica"
          value={wocAssessment}
          onChange={(e) => setWocAssessment(e.target.value)}
          rows={2}
        />
        <Textarea
          label="Razonamiento del estado de urgencia"
          value={wocRationale}
          onChange={(e) => setWocRationale(e.target.value)}
          rows={2}
        />
        <Input
          label="Segundo ProfessionalId (distinto al de sesión)"
          value={wocProf2}
          onChange={(e) => setWocProf2(e.target.value)}
          placeholder="66666666-6666-6666-6666-666666660002"
        />
        <Button type="button" size="sm" disabled={busy} onClick={() => void submitWoc()}>
          Registrar constancia
        </Button>
      </div>

      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      {err && (
        <p className="text-sm text-red-600" role="alert" data-testid="urgencia-panel-error">
          {err}
        </p>
      )}
    </div>
  );
}
