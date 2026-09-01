import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSubject, type SubjectDto } from '@/api/subjects';
import { mensajeDeFalla } from '@/api/errors';
import IdentityHeader from '@/components/feature/IdentityHeader';
import Button from '@/components/base/Button';
import Card from '@/components/base/Card';
import { useAuth } from '@/hooks/useAuth';
import SubjectVinculacionPanel from './components/SubjectVinculacionPanel';

/** Detalle básico de sujeto + cabecera de identidad + vinculación SC-22. Sin mocks. */
export default function PacienteDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [subject, setSubject] = useState<SubjectDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestedId, setRequestedId] = useState<string | null>(id ?? null);

  useEffect(() => {
    if (!id || authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      setError('Sesión requerida.');
      setSubject(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setRequestedId(id);
      const res = await getSubject(id);
      if (cancelled) return;
      if (!res.success || !res.data) {
        setError(mensajeDeFalla(res.failure).titulo || res.message || 'Sujeto no encontrado.');
        setSubject(null);
      } else {
        setSubject(res.data);
        setError(null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, authLoading, isAuthenticated]);

  if (authLoading || loading) {
    return <p className="p-6 text-sm text-slate-500">Cargando sujeto…</p>;
  }

  if (error || !subject) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <Card padding="lg" className="max-w-md w-full text-center">
          <h2 className="font-heading text-xl font-bold text-slate-900">Sujeto no encontrado</h2>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <Button className="mt-4" variant="primary" size="sm" onClick={() => navigate('/app/pacientes')}>
            Volver
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6" data-testid="paciente-detalle">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/app/pacientes')}>
          ← Pacientes
        </Button>
      </div>

      <IdentityHeader subject={subject} />

      <SubjectVinculacionPanel
        survivingSubjectId={subject.subjectId}
        requestedSubjectId={requestedId ?? subject.requestedSubjectId}
      />

      <Card padding="md">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-slate-500">
          Identidad
        </h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Nombre</dt>
            <dd className="font-medium text-slate-900">
              {[subject.givenName, subject.firstSurname, subject.secondSurname]
                .filter(Boolean)
                .join(' ') || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">CURP</dt>
            <dd className="font-medium text-slate-900">{subject.curp ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Sexo biológico</dt>
            <dd className="font-medium text-slate-900">
              {subject.biologicalSex ?? 'no capturado'}
              {subject.sexSource ? ` · ${subject.sexSource}` : ''}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Nacimiento / edad</dt>
            <dd className="font-medium text-slate-900">
              {subject.birthDate
                ?? (subject.estimatedAge
                  ? `${subject.estimatedAge.valor} ${subject.estimatedAge.unidad} (estimada)`
                  : 'no capturado')}
            </dd>
          </div>
        </dl>
      </Card>

      {subject.marks.length > 0 && (
        <Card padding="md">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-slate-500">
            Señas particulares
          </h2>
          <ul className="mt-2 space-y-2 text-sm">
            {subject.marks.map((m) => (
              <li key={m.markId} className="rounded-lg bg-slate-50 px-3 py-2 text-slate-700">
                {m.rawText || [m.markType, m.anatomicalRegion, m.laterality, m.description]
                  .filter(Boolean)
                  .join(' · ')}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-400">
            Conservadas al identificar (pregunta D abierta: retención definitiva pendiente).
          </p>
        </Card>
      )}

      {subject.belongings.length > 0 && (
        <Card padding="md">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-slate-500">
            Pertenencias
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {subject.belongings.map((b) => (
              <li key={b.belongingId}>{b.description}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
