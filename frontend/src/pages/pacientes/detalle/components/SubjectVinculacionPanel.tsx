import { useState } from 'react';
import { linkSubjects, revertSubjectLink, type SubjectLinkDto } from '@/api/subjects';
import { mensajeDeFalla } from '@/api/errors';
import Button from '@/components/base/Button';
import Input from '@/components/base/Input';

type Props = {
  /** Sujeto sobreviviente (el que se está viendo / al que se absorbe). */
  survivingSubjectId: string;
  /** Si la URL pidió otro id y la API resolvió a este, mostramos aviso. */
  requestedSubjectId?: string | null;
};

/**
 * SC-22: vinculación con justificación + revert append-only.
 * Sin listado de vínculos en API aún: tras vincular se guarda el linkId en sesión de UI.
 */
export default function SubjectVinculacionPanel({
  survivingSubjectId,
  requestedSubjectId,
}: Props) {
  const [absorbedId, setAbsorbedId] = useState('');
  const [linkJustification, setLinkJustification] = useState('');
  const [revertJustification, setRevertJustification] = useState('');
  const [lastLink, setLastLink] = useState<SubjectLinkDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const redirected =
    requestedSubjectId &&
    requestedSubjectId.toLowerCase() !== survivingSubjectId.toLowerCase();

  async function onLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    const absorbed = absorbedId.trim();
    const just = linkJustification.trim();
    if (!absorbed) {
      setError('Indique el subjectId a absorber.');
      return;
    }
    if (!just) {
      setError('La vinculación exige justificación.');
      return;
    }
    setBusy(true);
    const res = await linkSubjects(survivingSubjectId, {
      absorbedSubjectId: absorbed,
      survivingSubjectId,
      justification: just,
    });
    setBusy(false);
    if (!res.success || !res.data) {
      setError(mensajeDeFalla(res.failure).titulo || res.message || 'No se pudo vincular.');
      return;
    }
    setLastLink(res.data);
    setOkMsg('Vinculación registrada. Puede revertirla abajo si fue equivocada.');
    setAbsorbedId('');
    setLinkJustification('');
  }

  async function onRevert(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    if (!lastLink) {
      setError('No hay vínculo reciente en esta pantalla para revertir.');
      return;
    }
    const just = revertJustification.trim();
    if (!just) {
      setError('La reversión exige justificación.');
      return;
    }
    setBusy(true);
    const res = await revertSubjectLink(survivingSubjectId, lastLink.linkId, {
      justification: just,
    });
    setBusy(false);
    if (!res.success || !res.data) {
      setError(mensajeDeFalla(res.failure).titulo || res.message || 'No se pudo revertir.');
      return;
    }
    setOkMsg('Vinculación revertida (append-only). El expediente absorbido queda independiente.');
    setLastLink(null);
    setRevertJustification('');
  }

  return (
    <section
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4"
      data-testid="subject-vinculacion-panel"
    >
      <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-slate-500">
        Vinculación de expedientes
      </h2>
      <p className="text-xs text-slate-500">
        Une un sujeto provisional (absorbido) a este expediente sobreviviente. Una vinculación
        equivocada se corrige con reversión; no se destruye el expediente (SC-22).
      </p>

      {redirected && (
        <p
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          data-testid="subject-resolved-banner"
        >
          Solicitó <code className="text-xs">{requestedSubjectId}</code>; la identidad activa es{' '}
          <code className="text-xs">{survivingSubjectId}</code> (vínculo vigente).
        </p>
      )}

      <form className="space-y-3" onSubmit={(e) => void onLink(e)} data-testid="form-vincular">
        <Input
          label="SubjectId a absorber"
          value={absorbedId}
          onChange={(e) => setAbsorbedId(e.target.value)}
          placeholder="GUID del sujeto provisional"
          data-testid="input-absorbed-subject-id"
        />
        <Input
          label="Justificación de vinculación *"
          value={linkJustification}
          onChange={(e) => setLinkJustification(e.target.value)}
          data-testid="input-link-justification"
        />
        <Button type="submit" variant="primary" size="sm" disabled={busy} data-testid="btn-vincular">
          Vincular
        </Button>
      </form>

      {lastLink && (
        <form
          className="space-y-3 border-t border-slate-100 pt-3"
          onSubmit={(e) => void onRevert(e)}
          data-testid="form-revertir-vinculo"
        >
          <p className="text-xs text-slate-600" data-testid="last-link-id">
            Vínculo activo en UI: <code>{lastLink.linkId}</code> ({lastLink.linkType})
          </p>
          <Input
            label="Justificación de reversión *"
            value={revertJustification}
            onChange={(e) => setRevertJustification(e.target.value)}
            data-testid="input-revert-justification"
          />
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            disabled={busy}
            data-testid="btn-revertir-vinculo"
          >
            Revertir vinculación
          </Button>
        </form>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert" data-testid="vinculacion-error">
          {error}
        </p>
      )}
      {okMsg && (
        <p className="text-sm text-emerald-700" data-testid="vinculacion-ok">
          {okMsg}
        </p>
      )}
    </section>
  );
}
