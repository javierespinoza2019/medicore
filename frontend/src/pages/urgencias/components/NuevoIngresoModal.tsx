import { useEffect, useMemo, useState } from 'react';
import { searchSubjects, type SubjectListItemDto } from '@/api/subjects';
import {
  circumstanceOptions,
  type EncounterDto,
} from '@/api/encounters';
import { listBranches, type BranchDto } from '@/api/branches';
import { obtenerEstadoEnlace } from '@/api/connectivity';
import Modal from '@/components/base/Modal';
import Button from '@/components/base/Button';
import Input from '@/components/base/Input';
import Select from '@/components/base/Select';
import { useAuth } from '@/hooks/useAuth';
import { useDevice } from '@/hooks/DeviceProvider';
import { resolveBranchId } from '@/hooks/useEncounterQueue';
import { enqueueCommand } from '@/sync/outboxQueue';
import { syncOutboxCommand } from '@/sync/outboxSync';
import { tryDrainOutbox } from '@/sync/outboxDrain';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (encounter: EncounterDto) => void;
}

function newClientId(): string {
  return crypto.randomUUID();
}

function provisionalEncounter(input: {
  encounterId: string;
  subjectId: string;
  branchId: string;
  accessRoute: string;
  circumstance: string;
  circumstanceText: string;
  queued: boolean;
}): EncounterDto {
  const now = new Date().toISOString();
  return {
    encounterId: input.encounterId,
    tenantId: '',
    branchId: input.branchId,
    subjectId: input.subjectId,
    encounterType: 'urgencias',
    state: 'abierto',
    disposition: null,
    arrivalAtUtc: now,
    accessRoute: input.accessRoute || null,
    admissionCircumstance: input.circumstance || null,
    admissionCircumstanceText: input.circumstanceText || null,
    ministerioPublicoNotified: null,
    attendingProfessionalId: null,
    turnNumber: 0,
    closedAtUtc: null,
    triageLevel: null,
    triageScaleCode: null,
    triagePriority: 0,
    givenName: null,
    firstSurname: null,
    secondSurname: null,
    preferredName: null,
    identificationState: 'no_identificado',
    operationalLabel: input.queued ? 'En cola (sin enlace)' : null,
    internalCode: null,
    suggestMpNoticeEvaluation: false,
    createdAtUtc: now,
    updatedAtUtc: now,
  };
}

/**
 * Ingreso a urgencias. Escritura siempre a cola local (ADR-014); sync inmediato si hay enlace.
 * Nada bloquea: sujeto (existente o no identificado) + sucursal.
 */
export default function NuevoIngresoModal({ open, onClose, onCreated }: Props) {
  const { sucursalActualId } = useAuth();
  const { allowsClinicalCache, isPendingApproval } = useDevice();
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [mode, setMode] = useState<'existente' | 'no_identificado'>('no_identificado');
  const [search, setSearch] = useState('');
  const [matches, setMatches] = useState<SubjectListItemDto[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [accessRoute, setAccessRoute] = useState('');
  const [circumstance, setCircumstance] = useState('');
  const [circumstanceText, setCircumstanceText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const branchId = resolveBranchId(sucursalActualId, branches);

  useEffect(() => {
    void (async () => {
      const res = await listBranches(true);
      if (res.success && res.data) setBranches(res.data);
    })();
  }, []);

  useEffect(() => {
    if (!open) return;
    setMode('no_identificado');
    setSearch('');
    setMatches([]);
    setSubjectId('');
    setAccessRoute('');
    setCircumstance('');
    setCircumstanceText('');
    setError(null);
    setInfo(null);
  }, [open]);

  useEffect(() => {
    if (!open || mode !== 'existente' || search.trim().length < 2) {
      setMatches([]);
      return;
    }
    const t = window.setTimeout(() => {
      void (async () => {
        const res = await searchSubjects(search.trim(), true);
        if (res.success && res.data) setMatches(res.data.slice(0, 8));
      })();
    }, 250);
    return () => window.clearTimeout(t);
  }, [open, mode, search]);

  const selected = useMemo(
    () => matches.find((m) => m.subjectId === subjectId),
    [matches, subjectId],
  );

  async function submit() {
    setError(null);
    setInfo(null);
    if (!branchId) {
      setError('Seleccione una sucursal en la sesión.');
      return;
    }
    setSaving(true);
    try {
      const needNewSubject = mode === 'no_identificado' || !subjectId;
      let sid = subjectId;
      const offline = obtenerEstadoEnlace().alcanzable === false;

      if (offline && !allowsClinicalCache) {
        setError(
          isPendingApproval
            ? 'Esta estación está pendiente de aprobación. Sin cola offline no se puede capturar sin enlace. Pida a un administrador que la apruebe en Administración → Dispositivos.'
            : 'Esta estación no tiene cola offline habilitada. Conéctese a la red o registre/apruebe el dispositivo.',
        );
        setSaving(false);
        return;
      }

      if (needNewSubject) {
        const clientSubjectId = newClientId();
        const subjCmd = await enqueueCommand('subject.create', {
          branchId,
          asUnidentified: true,
          clientSubjectId,
        });
        const synced = offline ? null : await syncOutboxCommand(subjCmd);
        sid = synced?.serverEntityId || clientSubjectId;
      }

      const clientEncounterId = newClientId();
      const encCmd = await enqueueCommand('encounter.open', {
        branchId,
        subjectId: sid,
        encounterType: 'urgencias',
        accessRoute: accessRoute || null,
        admissionCircumstance: circumstance || null,
        admissionCircumstanceText: circumstanceText || null,
        clientEncounterId,
      });

      const encSynced = offline ? null : await syncOutboxCommand(encCmd);
      const encounterId = encSynced?.serverEntityId || clientEncounterId;
      const queued = !encSynced;

      if (queued) {
        setInfo(
          'Ingreso guardado en cola local. Se sincronizará al recuperar el enlace (sin bloquear la atención).',
        );
        void tryDrainOutbox();
      }

      onCreated(
        provisionalEncounter({
          encounterId,
          subjectId: sid,
          branchId,
          accessRoute,
          circumstance,
          circumstanceText,
          queued,
        }),
      );
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar el ingreso.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo ingreso a urgencias" size="lg">
      <div className="space-y-4" data-testid="modal-nuevo-ingreso-urgencias">
        <p className="text-sm text-slate-600">
          Sólo se exige sucursal y sujeto. No se pide CURP, pago, consentimiento ni triage para
          iniciar. La escritura va primero a la cola local de la estación.
        </p>

        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === 'no_identificado' ? 'primary' : 'ghost'}
            onClick={() => {
              setMode('no_identificado');
              setSubjectId('');
            }}
          >
            No identificado
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === 'existente' ? 'primary' : 'ghost'}
            onClick={() => setMode('existente')}
          >
            Sujeto existente
          </Button>
        </div>

        {mode === 'existente' && (
          <div className="space-y-2">
            <Input
              label="Buscar sujeto (opcional)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre, etiqueta o folio"
            />
            {matches.length > 0 && (
              <ul className="max-h-40 overflow-auto rounded border border-slate-200 text-sm">
                {matches.map((m) => (
                  <li key={m.subjectId}>
                    <button
                      type="button"
                      className={`block w-full px-3 py-2 text-left hover:bg-slate-50 ${
                        subjectId === m.subjectId ? 'bg-slate-100' : ''
                      }`}
                      onClick={() => setSubjectId(m.subjectId)}
                    >
                      {m.preferredName ||
                        [m.givenName, m.firstSurname].filter(Boolean).join(' ') ||
                        m.operationalLabel ||
                        m.subjectId.slice(0, 8)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selected && (
              <p className="text-xs text-slate-500">
                Seleccionado: {selected.subjectId.slice(0, 8)}…
              </p>
            )}
            {!subjectId && (
              <p className="text-xs text-amber-700">
                Sin selección se creará un sujeto no identificado al confirmar.
              </p>
            )}
          </div>
        )}

        <Input
          label="Vía de acceso (opcional, texto libre)"
          value={accessRoute}
          onChange={(e) => setAccessRoute(e.target.value)}
          placeholder="caminando, ambulancia, …"
        />

        <Select
          label="Circunstancia de ingreso (opcional)"
          value={circumstance}
          onChange={(e) => setCircumstance(e.target.value)}
          options={circumstanceOptions}
        />

        {circumstance === 'otro' && (
          <Input
            label="Detalle de circunstancia"
            value={circumstanceText}
            onChange={(e) => setCircumstanceText(e.target.value)}
          />
        )}

        {(circumstance === 'agresion' ||
          circumstance === 'hecho_transito' ||
          circumstance === 'hallado_via_publica' ||
          circumstance === 'intoxicacion') && (
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Sugerencia: valore si corresponde aviso al Ministerio Público. El sistema no lo
            determina ni bloquea el ingreso. (Fundamento sanitario: Reglamento art. 19 fracc. V;
            no se afirma fundamento penal.)
          </p>
        )}

        {error && (
          <p className="text-sm text-red-600" role="alert" data-testid="ingreso-error">
            {error}
          </p>
        )}
        {info && (
          <p className="text-sm text-emerald-700" data-testid="ingreso-cola-info">
            {info}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={saving || !branchId}
            data-testid="btn-confirmar-ingreso"
          >
            {saving ? 'Registrando…' : 'Abrir episodio'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
