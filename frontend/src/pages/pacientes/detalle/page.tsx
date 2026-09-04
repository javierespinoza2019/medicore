import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  clearSubjectPhoto,
  displayNameOf,
  getSubject,
  uploadSubjectPhoto,
  type SubjectDto,
} from '@/api/subjects';
import { mensajeDeFalla } from '@/api/errors';
import { formatSubjectDate, identificationStateLabel } from '@/utils/subjectPresentation';
import Avatar from '@/components/base/Avatar';
import Badge from '@/components/base/Badge';
import Button from '@/components/base/Button';
import Card from '@/components/base/Card';
import Tabs from '@/components/base/Tabs';
import IdentityHeader from '@/components/feature/IdentityHeader';
import { useAuth } from '@/hooks/useAuth';
import { useSubjectPhotoUrl } from '@/hooks/useSubjectPhotoUrl';
import ExpedienteUnificado from './components/ExpedienteUnificado';
import SubjectConsultasTab from './components/SubjectConsultasTab';
import SubjectRecetasTab from './components/SubjectRecetasTab';
import SubjectEstudiosTab from './components/SubjectEstudiosTab';
import SubjectVinculacionPanel from './components/SubjectVinculacionPanel';

const TABS = [
  { key: 'resumen', label: 'Resumen', icon: 'ri-file-text-line' },
  { key: 'identidad', label: 'Identidad', icon: 'ri-user-line' },
  { key: 'expediente', label: 'Expediente', icon: 'ri-folder-history-line' },
  { key: 'consultas', label: 'Consultas', icon: 'ri-stethoscope-line' },
  { key: 'recetas', label: 'Recetas', icon: 'ri-capsule-line' },
  { key: 'estudios', label: 'Estudios', icon: 'ri-microscope-line' },
];

/** Detalle de sujeto: tabs al estilo prototipo; datos reales M3 + expediente M7. */
export default function PacienteDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [subject, setSubject] = useState<SubjectDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestedId, setRequestedId] = useState<string | null>(id ?? null);
  const [activeTab, setActiveTab] = useState('resumen');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoUrl = useSubjectPhotoUrl(subject?.subjectId, !!subject?.photoRelativePath);

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
    return <p className="p-6 text-sm text-foreground-500">Cargando sujeto…</p>;
  }

  if (error || !subject) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <Card padding="lg" className="w-full max-w-md text-center">
          <h2 className="font-heading text-xl font-bold text-foreground-900">Sujeto no encontrado</h2>
          <p className="mt-2 text-sm text-foreground-500">{error}</p>
          <Button className="mt-4" variant="primary" size="sm" onClick={() => navigate('/app/pacientes')}>
            Volver
          </Button>
        </Card>
      </div>
    );
  }

  const nombre = displayNameOf(subject);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError(null);
    const res = await uploadSubjectPhoto(subject.subjectId, file);
    setPhotoBusy(false);
    if (photoInputRef.current) photoInputRef.current.value = '';
    if (!res.success || !res.data) {
      setPhotoError(res.message ?? mensajeDeFalla(res.failure).titulo);
      return;
    }
    setSubject(res.data);
  };

  const handleClearPhoto = async () => {
    setPhotoBusy(true);
    setPhotoError(null);
    const res = await clearSubjectPhoto(subject.subjectId);
    setPhotoBusy(false);
    if (!res.success || !res.data) {
      setPhotoError(res.message ?? mensajeDeFalla(res.failure).titulo);
      return;
    }
    setSubject(res.data);
  };

  return (
    <div className="space-y-5 p-4 md:p-6" data-testid="paciente-detalle">
      <div className="flex items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => navigate('/app/pacientes')}
          className="cursor-pointer text-foreground-500 transition-base hover:text-primary-600"
        >
          Pacientes
        </button>
        <span className="text-foreground-300">/</span>
        <span className="truncate font-medium text-foreground-700">{nombre}</span>
      </div>

      <Card padding="lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <Avatar name={nombre} size="xl" src={photoUrl ?? undefined} />
            <input
              ref={photoInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.gif,image/jpeg,image/png,image/gif"
              className="hidden"
              data-testid="subject-photo-input"
              onChange={(e) => void handlePhotoSelect(e)}
            />
            <div className="flex flex-wrap justify-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                disabled={photoBusy}
                data-testid="subject-photo-upload"
                onClick={() => photoInputRef.current?.click()}
              >
                {subject.photoRelativePath ? 'Cambiar foto' : 'Subir foto'}
              </Button>
              {subject.photoRelativePath && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={photoBusy}
                  data-testid="subject-photo-clear"
                  onClick={() => void handleClearPhoto()}
                >
                  Quitar
                </Button>
              )}
            </div>
            {photoError && (
              <p className="text-xs text-red-500 text-center max-w-[12rem]" role="alert">
                {photoError}
              </p>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-heading text-xl font-bold text-foreground-900 md:text-2xl">
                {nombre}
              </h1>
              {subject.recordNumber && (
                <Badge variant="secondary" size="md">
                  {subject.recordNumber}
                </Badge>
              )}
              <Badge
                variant={subject.identificationState === 'no_identificado' ? 'warning' : 'success'}
                size="md"
                dot
              >
                {identificationStateLabel(subject.identificationState)}
              </Badge>
            </div>
          </div>
          <div className="flex flex-shrink-0 flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/app/agenda?paciente=${subject.subjectId}`)}
            >
              <i className="ri-calendar-event-line mr-1" aria-hidden />
              Agendar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/app/consultas?paciente=${subject.subjectId}`)}
            >
              <i className="ri-stethoscope-line mr-1" aria-hidden />
              Consulta
            </Button>
          </div>
        </div>
      </Card>

      <IdentityHeader subject={subject} />

      <SubjectVinculacionPanel
        survivingSubjectId={subject.subjectId}
        requestedSubjectId={requestedId ?? subject.requestedSubjectId}
      />

      <Card padding="none">
        <div className="px-5 pt-2">
          <Tabs
            id="paciente-tab"
            tabs={TABS}
            activeTab={activeTab}
            onChange={setActiveTab}
            ariaLabel="Secciones del expediente del sujeto"
          />
        </div>
        <div
          className="p-5"
          role="tabpanel"
          id={`paciente-tab-panel-${activeTab}`}
          aria-labelledby={`paciente-tab-tab-${activeTab}`}
        >
          {activeTab === 'resumen' && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card padding="md">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-500">
                  Datos clave
                </h2>
                <dl className="mt-3 space-y-2 text-sm">
                  <div>
                    <dt className="text-foreground-500">CURP</dt>
                    <dd className="font-medium text-foreground-900">{subject.curp ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-foreground-500">Alta</dt>
                    <dd>{formatSubjectDate(subject.createdAtUtc)}</dd>
                  </div>
                  <div>
                    <dt className="text-foreground-500">Etiqueta operativa</dt>
                    <dd>{subject.activeLabel?.operationalLabel ?? '—'}</dd>
                  </div>
                </dl>
              </Card>
              {subject.descriptor && (
                <Card padding="md">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-500">
                    Descriptor
                  </h2>
                  <p className="mt-2 text-sm text-foreground-700">
                    {[subject.descriptor.apparentSex, subject.descriptor.apparentAgeRange, subject.descriptor.freeText]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </p>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'identidad' && (
            <Card padding="md">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-foreground-500">Nombre</dt>
                  <dd className="font-medium text-foreground-900">
                    {[subject.givenName, subject.firstSurname, subject.secondSurname]
                      .filter(Boolean)
                      .join(' ') || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground-500">CURP</dt>
                  <dd className="font-medium text-foreground-900">{subject.curp ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-foreground-500">Sexo biológico</dt>
                  <dd>
                    {subject.biologicalSex ?? 'no capturado'}
                    {subject.sexSource ? ` · ${subject.sexSource}` : ''}
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground-500">Nacimiento / edad</dt>
                  <dd>
                    {subject.birthDate
                      ?? (subject.estimatedAge
                        ? `${subject.estimatedAge.valor} ${subject.estimatedAge.unidad} (estimada)`
                        : 'no capturado')}
                  </dd>
                </div>
              </dl>
              {subject.marks.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-secondary-200 pt-4 text-sm">
                  {subject.marks.map((m) => (
                    <li key={m.markId} className="rounded-lg bg-secondary-50 px-3 py-2">
                      {m.rawText || m.description || 'Seña registrada'}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {activeTab === 'expediente' && (
            <ExpedienteUnificado patientId={subject.subjectId} />
          )}

          {activeTab === 'consultas' && (
            <SubjectConsultasTab subjectId={subject.subjectId} />
          )}
          {activeTab === 'recetas' && (
            <SubjectRecetasTab
              subjectId={subject.subjectId}
              patientName={nombre}
              patientExpediente={subject.recordNumber ?? subject.activeLabel?.operationalLabel ?? ''}
            />
          )}
          {activeTab === 'estudios' && (
            <SubjectEstudiosTab subjectId={subject.subjectId} />
          )}
        </div>
      </Card>
    </div>
  );
}
