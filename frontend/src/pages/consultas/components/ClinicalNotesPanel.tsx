/**
 * Panel de notas clínicas contra API real (M6 / WS-H).
 * No usa mocks. Firma local + sello: UI no afirma validez jurídica (pregunta G).
 */
import { useCallback, useEffect, useState } from 'react';
import {
  addNoteAddendum,
  createNote,
  listNotesByEncounter,
  sealStateLabel,
  signNote,
  type ClinicalNoteDto,
  type NoteType,
} from '@/api/notes';
import { mensajeDeFalla } from '@/api/errors';
import Button from '@/components/base/Button';
import Card from '@/components/base/Card';
import Badge from '@/components/base/Badge';

type Props = {
  encounterId: string;
  /** Tipo por omisión al capturar. Pronóstico sin preselección. */
  defaultNoteType?: NoteType;
};

const NOTE_TYPE_LABELS: Record<string, string> = {
  urgencias_inicial: 'Urgencias inicial',
  evolucion: 'Evolución',
  interconsulta: 'Interconsulta',
  referencia_traslado: 'Referencia / traslado',
  egreso: 'Egreso',
  enfermeria: 'Enfermería',
  certificado: 'Certificado',
};

export default function ClinicalNotesPanel({
  encounterId,
  defaultNoteType = 'evolucion',
}: Props) {
  const [notes, setNotes] = useState<ClinicalNoteDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteType, setNoteType] = useState<NoteType>(defaultNoteType);
  const [subjetivo, setSubjetivo] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [analisis, setAnalisis] = useState('');
  const [plan, setPlan] = useState('');
  /** Sin preselección (NOM-004 6.1.5 / 6.2.5). */
  const [prognosis, setPrognosis] = useState('');
  const [busy, setBusy] = useState(false);
  const [addendumFor, setAddendumFor] = useState<string | null>(null);
  const [addendumReason, setAddendumReason] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listNotesByEncounter(encounterId);
      if (!res.success) {
        setError(mensajeDeFalla(res.failure).titulo || res.message || 'No se pudieron cargar las notas.');
        setNotes([]);
        return;
      }
      setNotes(res.data ?? []);
    } catch {
      setError('No se pudieron cargar las notas.');
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [encounterId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleCreate = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await createNote(encounterId, {
        noteType,
        prognosis: prognosis.trim() || null,
        body: {
          subjetivo: subjetivo.trim() || null,
          objetivo: objetivo.trim() || null,
          analisis: analisis.trim() || null,
          plan: plan.trim() || null,
        },
      });
      if (!res.success) {
        setError(mensajeDeFalla(res.failure).titulo || res.message || 'No se pudo crear la nota.');
        return;
      }
      setSubjetivo('');
      setObjetivo('');
      setAnalisis('');
      setPlan('');
      setPrognosis('');
      await reload();
    } catch {
      setError('No se pudo crear la nota.');
    } finally {
      setBusy(false);
    }
  };

  const handleSign = async (noteId: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await signNote(noteId);
      if (!res.success) {
        setError(
          mensajeDeFalla(res.failure).titulo ||
            res.message ||
            'No se pudo firmar. Se requiere profesional ligado con cédula capturada.',
        );
        return;
      }
      await reload();
    } catch {
      setError('No se pudo firmar. Se requiere profesional ligado con cédula capturada.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddendum = async (noteId: string) => {
    if (!addendumReason.trim()) {
      setError('El motivo del addendum es obligatorio.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await addNoteAddendum(noteId, addendumReason.trim());
      if (!res.success) {
        setError(mensajeDeFalla(res.failure).titulo || res.message || 'No se pudo registrar el addendum.');
        return;
      }
      setAddendumFor(null);
      setAddendumReason('');
      await reload();
    } catch {
      setError('No se pudo registrar el addendum.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card padding="md">
      <div className="flex items-start justify-between gap-3 mb-4" data-testid="clinical-notes-panel">
        <div>
          <h3 className="text-base font-semibold text-foreground-900">Notas clínicas</h3>
          <p className="text-xs text-foreground-500 mt-1">
            Firma del sistema (integridad + sello). Alcance piloto: sin e.firma SAT; no se afirma
            cumplimiento NOM-004 5.10.
          </p>
        </div>
        <Badge variant="info">{notes.length} nota(s)</Badge>
      </div>

      {error && (
        <div
          className="mb-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-sm text-amber-800"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="space-y-3 mb-5 p-4 rounded-xl border border-secondary-200 bg-background-50">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-2xs font-medium text-foreground-500 mb-1 block">Tipo de nota</label>
            <select
              value={noteType}
              onChange={(e) => setNoteType(e.target.value as NoteType)}
              className="w-full px-3 py-2 text-sm border border-secondary-200 rounded-lg bg-background-0"
            >
              {Object.entries(NOTE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-2xs font-medium text-foreground-500 mb-1 block">
              Pronóstico (sin preselección)
            </label>
            <input
              type="text"
              value={prognosis}
              onChange={(e) => setPrognosis(e.target.value)}
              placeholder="Capturar explícitamente si aplica"
              className="w-full px-3 py-2 text-sm border border-secondary-200 rounded-lg"
            />
          </div>
        </div>
        <textarea
          data-testid="note-subjetivo"
          value={subjetivo}
          onChange={(e) => setSubjetivo(e.target.value)}
          placeholder="Subjetivo"
          rows={2}
          className="w-full px-3 py-2 text-sm border border-secondary-200 rounded-lg"
        />
        <textarea
          data-testid="note-objetivo"
          value={objetivo}
          onChange={(e) => setObjetivo(e.target.value)}
          placeholder="Objetivo"
          rows={2}
          className="w-full px-3 py-2 text-sm border border-secondary-200 rounded-lg"
        />
        <textarea
          data-testid="note-analisis"
          value={analisis}
          onChange={(e) => setAnalisis(e.target.value)}
          placeholder="Análisis"
          rows={2}
          className="w-full px-3 py-2 text-sm border border-secondary-200 rounded-lg"
        />
        <textarea
          data-testid="note-plan"
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          placeholder="Plan"
          rows={2}
          className="w-full px-3 py-2 text-sm border border-secondary-200 rounded-lg"
        />
        <Button
          variant="primary"
          size="sm"
          disabled={busy}
          onClick={() => void handleCreate()}
          data-testid="note-guardar-borrador"
        >
          Guardar borrador
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-foreground-500">Cargando notas…</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-foreground-500">Sin notas en este episodio.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li
              key={n.noteId}
              className="p-3 rounded-lg border border-secondary-200 bg-background-0 space-y-2"
            >
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground-800">
                    {NOTE_TYPE_LABELS[n.noteType] ?? n.noteType}
                  </span>
                  <Badge variant={n.signedAtUtc ? 'success' : 'warning'}>
                    {sealStateLabel(n.sealState, n.signedAtUtc)}
                  </Badge>
                  {n.signedAtUtc && (
                    <span className="sr-only" data-testid={`note-firmada-${n.noteId}`}>
                      Firmada
                    </span>
                  )}
                </div>
                <span className="text-2xs text-foreground-400">
                  {new Date(n.occurredAtUtc).toLocaleString('es-MX')}
                </span>
              </div>
              <p className="text-xs text-foreground-600">{n.authorDisplayName}</p>
              {(typeof n.body?.subjetivo === 'string' && n.body.subjetivo) ||
              (typeof n.body?.objetivo === 'string' && n.body.objetivo) ||
              (typeof n.body?.analisis === 'string' && n.body.analisis) ||
              (typeof n.body?.plan === 'string' && n.body.plan) ? (
                <p className="text-xs text-foreground-700" data-testid={`note-preview-${n.noteId}`}>
                  {[n.body.subjetivo, n.body.objetivo, n.body.analisis, n.body.plan]
                    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
                    .join(' · ')}
                </p>
              ) : null}
              {n.contentHash && (
                <p className="text-2xs font-mono text-foreground-400 break-all">
                  hash {n.contentHash.slice(0, 16)}…
                </p>
              )}
              <p className="text-2xs text-foreground-500">{n.firmaDescripcionLegible}</p>
              <div className="flex flex-wrap gap-2">
                {!n.signedAtUtc && (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={busy}
                    onClick={() => void handleSign(n.noteId)}
                    data-testid={`note-firmar-${n.noteId}`}
                  >
                    Firmar
                  </Button>
                )}
                {n.signedAtUtc && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => setAddendumFor(addendumFor === n.noteId ? null : n.noteId)}
                  >
                    Addendum
                  </Button>
                )}
              </div>
              {addendumFor === n.noteId && (
                <div className="pt-2 space-y-2">
                  <textarea
                    value={addendumReason}
                    onChange={(e) => setAddendumReason(e.target.value)}
                    placeholder="Motivo del addendum (obligatorio)"
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-secondary-200 rounded-lg"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={busy}
                    onClick={() => void handleAddendum(n.noteId)}
                  >
                    Registrar addendum
                  </Button>
                </div>
              )}
              {n.addenda?.length > 0 && (
                <ul className="text-2xs text-foreground-500 space-y-1 border-t border-secondary-100 pt-2">
                  {n.addenda.map((a) => (
                    <li key={a.addendumId}>
                      Addendum · {a.actorDisplayName}: {a.reasonText}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
