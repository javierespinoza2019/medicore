import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSubject } from '@/api/subjects';
import { listBranches, type BranchDto } from '@/api/branches';
import { mensajeDeFalla } from '@/api/errors';
import Button from '@/components/base/Button';
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

/**
 * Alta de sujeto. Nada bloquea salvo branchId.
 * Modo no identificado: sin nombre/CURP/sexo/nacimiento.
 */
export default function PacienteNuevo() {
  const navigate = useNavigate();
  const { sucursalActualId } = useAuth();
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [unidentified, setUnidentified] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (sucursalActualId) setBranchId(sucursalActualId);
  }, [sucursalActualId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!branchId) {
      setError('La sucursal es el único dato obligatorio.');
      return;
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
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Nuevo sujeto</h1>
          <p className="text-sm text-slate-500">
            Sólo la sucursal es obligatoria. No se inventa sexo, edad ni CURP.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/app/pacientes')}>
          Volver
        </Button>
      </div>

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-4"
        data-testid="form-nuevo-paciente"
      >
        <Select
          label="Sucursal de contacto *"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          options={[
            { value: '', label: 'Seleccione sucursal' },
            ...branches.map((b) => ({ value: b.branchId, label: `${b.code} — ${b.name}` })),
          ]}
          required
        />

        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
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
              onChange={(e) => setCurp(e.target.value.toUpperCase())}
              maxLength={18}
            />
          </div>
        )}

        <div className="space-y-3 border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Descriptor / señas (recomendado si no identificado)
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Sexo aparente"
              value={apparentSex}
              onChange={(e) => setApparentSex(e.target.value)}
              placeholder="p. ej. masculino aparente"
            />
            <Input
              label="Rango de edad aparente"
              value={apparentAgeRange}
              onChange={(e) => setApparentAgeRange(e.target.value)}
              placeholder="p. ej. 30-40 años"
            />
          </div>
          <Input
            label="Texto libre del descriptor"
            value={descriptorFreeText}
            onChange={(e) => setDescriptorFreeText(e.target.value)}
            placeholder="llegó en ambulancia, hallado en vía…"
          />
          <Input
            label="Seña particular (texto libre)"
            value={markRawText}
            onChange={(e) => setMarkRawText(e.target.value)}
            placeholder="tatuaje mano izquierda…"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
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
      </form>
    </div>
  );
}
