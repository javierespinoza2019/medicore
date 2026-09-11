import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSubject } from '@/api/subjects';
import { listBranches, type BranchDto } from '@/api/branches';
import { mensajeDeFalla } from '@/api/errors';
import { validateCurpFormat } from '@/utils/subjectPresentation';
import Avatar from '@/components/base/Avatar';
import Button from '@/components/base/Button';
import Card from '@/components/base/Card';
import Input from '@/components/base/Input';
import Select from '@/components/base/Select';
import { useAuth } from '@/hooks/useAuth';

const SEXO_OPTS = [
  { value: '', label: 'Sin capturar (no inventar)' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'femenino', label: 'Femenino' },
  { value: 'no_determinado', label: 'No determinado' },
  { value: 'no_especificado', label: 'No especificado' },
];

const STEPS = [
  { key: 1, label: 'Datos personales', icon: 'ri-user-line' },
  { key: 2, label: 'Descriptor / señas', icon: 'ri-fingerprint-line' },
  { key: 3, label: 'Confirmación', icon: 'ri-check-double-line' },
];

/**
 * Alta de sujeto con wizard visual. Identidad progresiva: sólo sucursal obligatoria.
 * Paso 1 expone campos que usan los E2E (`registro-ui.spec.ts`).
 */
export default function PacienteNuevo() {
  const navigate = useNavigate();
  const { sucursalActualId } = useAuth();
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [step, setStep] = useState(1);
  const [unidentified, setUnidentified] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [curpError, setCurpError] = useState<string | null>(null);

  const [branchId, setBranchId] = useState(sucursalActualId || '');
  const [givenName, setGivenName] = useState('');
  const [firstSurname, setFirstSurname] = useState('');
  const [secondSurname, setSecondSurname] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [biologicalSex, setBiologicalSex] = useState('');
  const [curp, setCurp] = useState('');
  const [apparentSex, setApparentSex] = useState('');
  const [apparentAgeRange, setApparentAgeRange] = useState('');
  const [descriptorFreeText, setDescriptorFreeText] = useState('');
  const [markRawText, setMarkRawText] = useState('');

  useEffect(() => {
    void (async () => {
      const res = await listBranches(true);
      if (res.success && res.data) {
        setBranches(res.data);
        if (!branchId && res.data[0]) setBranchId(res.data[0].branchId);
      }
    })();
  }, [branchId]);

  useEffect(() => {
    if (sucursalActualId && /^[0-9a-f-]{36}$/i.test(sucursalActualId)) {
      setBranchId(sucursalActualId);
    }
  }, [sucursalActualId]);

  const previewName = useMemo(() => {
    if (unidentified) return 'Etiqueta temporal (no identificado)';
    const parts = [givenName, firstSurname, secondSurname].filter(Boolean);
    return parts.length ? parts.join(' ') : 'Sin nombre capturado';
  }, [unidentified, givenName, firstSurname, secondSurname]);

  const branchLabel =
    branches.find((b) => b.branchId === branchId)?.name ?? 'Sucursal';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCurpError(null);
    if (!branchId) {
      setError('La sucursal es el único dato obligatorio.');
      return;
    }
    if (!unidentified && curp.trim()) {
      const curpMsg = validateCurpFormat(curp);
      if (curpMsg) {
        setCurpError(curpMsg);
        setStep(1);
        return;
      }
    }
    setSaving(true);
    const res = await createSubject({
      branchId,
      asUnidentified: unidentified || undefined,
      givenName: unidentified ? null : givenName || null,
      firstSurname: unidentified ? null : firstSurname || null,
      secondSurname: unidentified ? null : secondSurname || null,
      birthDate: unidentified || !birthDate ? null : birthDate,
      biologicalSex: unidentified || !biologicalSex ? null : biologicalSex,
      sexSource: biologicalSex && !unidentified ? 'declarado' : null,
      curp: unidentified || !curp ? null : curp.toUpperCase(),
      apparentSex: apparentSex || null,
      apparentAgeRange: apparentAgeRange || null,
      descriptorFreeText: descriptorFreeText || null,
      markRawText: markRawText || null,
    });
    setSaving(false);
    if (!res.success || !res.data) {
      setError(mensajeDeFalla(res.failure).titulo || res.message || 'No se pudo crear el sujeto.');
      return;
    }
    navigate(`/app/pacientes/${res.data.subjectId}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5" data-testid="page-paciente-nuevo">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground-900">Nuevo sujeto</h1>
          <p className="text-sm text-foreground-500">
            Wizard de alta · sólo la sucursal es obligatoria
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/app/pacientes')}>
          Volver
        </Button>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        Identidad progresiva: nombre, CURP, sexo y fecha son opcionales. No se fabrican valores por
        omisión. Alta como no identificado = etiqueta operativa (doc 08), no bloquea atención.
      </div>

      <nav aria-label="Pasos de registro" className="flex flex-wrap gap-2">
        {STEPS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setStep(s.key)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-base ${
              step === s.key
                ? 'border-primary-400 bg-primary-50 text-primary-800'
                : 'border-secondary-200 bg-background-50 text-foreground-600 hover:border-secondary-300'
            }`}
          >
            <i className={s.icon} aria-hidden />
            {s.label}
          </button>
        ))}
      </nav>

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="space-y-4"
        data-testid="form-nuevo-paciente"
      >
        {step === 1 && (
          <Card padding="md" className="space-y-4">
            <Select
              label="Sucursal de contacto"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              options={[
                { value: '', label: 'Seleccione sucursal' },
                ...branches.map((b) => ({ value: b.branchId, label: `${b.code} — ${b.name}` })),
              ]}
              required
            />

            <label className="flex items-center gap-2 text-sm font-medium text-foreground-700">
              <input
                type="checkbox"
                checked={unidentified}
                onChange={(e) => setUnidentified(e.target.checked)}
                data-testid="chk-no-identificado"
              />
              Paciente no identificado (emite etiqueta temporal)
            </label>

            {!unidentified && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Nombre(s)" value={givenName} onChange={(e) => setGivenName(e.target.value)} />
                <Input
                  label="Primer apellido"
                  value={firstSurname}
                  onChange={(e) => setFirstSurname(e.target.value)}
                />
                <Input
                  label="Segundo apellido"
                  value={secondSurname}
                  onChange={(e) => setSecondSurname(e.target.value)}
                />
                <Input
                  label="Fecha de nacimiento"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
                <Select
                  label="Sexo biológico"
                  value={biologicalSex}
                  onChange={(e) => setBiologicalSex(e.target.value)}
                  options={SEXO_OPTS}
                />
                <Input
                  label="CURP (opcional; no se autogenera)"
                  value={curp}
                  onChange={(e) => {
                    setCurp(e.target.value.toUpperCase());
                    setCurpError(null);
                  }}
                  maxLength={18}
                  error={curpError ?? undefined}
                />
              </div>
            )}
          </Card>
        )}

        {step === 2 && (
          <Card padding="md" className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground-500">
              Descriptor / señas (recomendado si no identificado)
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Sexo aparente"
                value={apparentSex}
                onChange={(e) => setApparentSex(e.target.value)}
              />
              <Input
                label="Rango de edad aparente"
                value={apparentAgeRange}
                onChange={(e) => setApparentAgeRange(e.target.value)}
              />
            </div>
            <Input
              label="Texto libre del descriptor"
              value={descriptorFreeText}
              onChange={(e) => setDescriptorFreeText(e.target.value)}
            />
            <Input
              label="Seña particular (texto libre)"
              value={markRawText}
              onChange={(e) => setMarkRawText(e.target.value)}
            />
          </Card>
        )}

        {step === 3 && (
          <Card padding="md">
            <div className="flex items-start gap-4">
              <Avatar name={previewName} size="lg" />
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-foreground-900">{previewName}</p>
                <p className="text-foreground-600">Sucursal: {branchLabel}</p>
                <p className="text-foreground-600">
                  Modo: {unidentified ? 'No identificado' : 'Identidad parcial'}
                </p>
                {!unidentified && curp && <p className="font-mono text-foreground-800">CURP {curp}</p>}
              </div>
            </div>
          </Card>
        )}

        {(error || curpError) && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {curpError ?? error}
          </div>
        )}

        <div className="flex flex-wrap justify-between gap-2">
          <div className="flex gap-2">
            {step > 1 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
                Anterior
              </Button>
            )}
            {step < 3 && (
              <Button type="button" variant="secondary" size="sm" onClick={() => setStep(step + 1)}>
                Siguiente
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/app/pacientes')}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={saving}
              data-testid="btn-guardar-paciente"
            >
              {saving ? 'Guardando…' : 'Crear sujeto'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
