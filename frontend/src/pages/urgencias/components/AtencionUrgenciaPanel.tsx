import { useEffect, useState } from 'react';
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
import { getSubject, type SubjectDto } from '@/api/subjects';
import type { TriageScaleConfigDto } from '@/api/triage';
import { mensajeDeFalla } from '@/api/errors';
import { triageLevelLabel } from '@/utils/triageScalePresentation';
import Button from '@/components/base/Button';
import Input from '@/components/base/Input';
import Select from '@/components/base/Select';
import Textarea from '@/components/base/Textarea';
import IdentityHeader from '@/components/feature/IdentityHeader';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  encounter: EncounterDto;
  /** Escala efectiva de la sucursal; si falta, se muestra el código crudo. */
  triageScale?: TriageScaleConfigDto | null;
  onUpdated: (e: EncounterDto) => void;
}

export default function AtencionUrgenciaPanel({
  encounter,
  triageScale = null,
  onUpdated,
}: Props) {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [subject, setSubject] = useState<SubjectDto | null>(null);
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

  async function changeState(toState: string) {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await transitionEncounterState(encounter.encounterId, {
      toState,
      disposition: toState === 'cerrado' ? disposition || null : null,
      justification: toState === 'cerrado' ? justification || null : null,
    });
    setBusy(false);
    if (!res.success || !res.data) {
      const status = res.failure?.status;
      if (status === 409) {
        setErr(res.message ?? 'No se puede cerrar sin clasificación de triage (SC-03).');
      } else if (status === 422) {
        setErr(res.message ?? 'El cierre exige justificación.');
      } else {
        setErr(mensajeDeFalla(res.failure).titulo || res.message || 'No se pudo cambiar el estado.');
      }
      return;
    }
    onUpdated(res.data);
    setMsg(`Estado: ${res.data.state}`);
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
        <span className={`rounded px-2 py-1 text-xs font-medium ${estado.className}`}>
          {estado.label}
        </span>
      </div>

      {encounter.suggestMpNoticeEvaluation && encounter.ministerioPublicoNotified === null && (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Sugerencia: valore aviso al Ministerio Público según la circunstancia. El sistema no
          determina ni bloquea.
        </p>
      )}

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
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void changeState('cerrado')}
            data-testid="btn-cerrar-episodio"
          >
            Cerrar episodio
          </Button>
          <p className="text-xs text-slate-500">
            El cierre sin triage responde 409 (legítimo). El inicio nunca se bloquea.
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
        <p className="text-sm text-red-600" role="alert">
          {err}
        </p>
      )}
    </div>
  );
}
