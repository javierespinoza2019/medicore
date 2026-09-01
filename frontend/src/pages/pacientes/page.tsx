import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  displayNameOf,
  searchSubjects,
  type SubjectListItemDto,
} from '@/api/subjects';
import { listBranches, type BranchDto } from '@/api/branches';
import IdentityHeader from '@/components/feature/IdentityHeader';
import Button from '@/components/base/Button';
import Input from '@/components/base/Input';
import { useAuth } from '@/hooks/useAuth';
import { mensajeDeFalla } from '@/api/errors';

export default function Pacientes() {
  const navigate = useNavigate();
  const { sucursalActualId } = useAuth();
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<SubjectListItemDto[]>([]);
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeUnidentified, setIncludeUnidentified] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await searchSubjects(search, includeUnidentified);
    if (!res.success || !res.data) {
      setError(mensajeDeFalla(res.failure).titulo || res.message || 'No se pudo cargar el padrón.');
      setItems([]);
    } else {
      setItems(res.data);
    }
    setLoading(false);
  }, [search, includeUnidentified]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    void (async () => {
      const res = await listBranches(true);
      if (res.success && res.data) setBranches(res.data);
    })();
  }, []);

  const branchName = (id: string) =>
    branches.find((b) => b.branchId === id)?.name ?? id.slice(0, 8);

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Pacientes</h1>
          <p className="text-sm text-slate-500">
            Padrón de sujetos · identidad progresiva (API real, sin mocks)
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/app/pacientes/nuevo')}
          data-testid="btn-nuevo-paciente"
        >
          Nuevo paciente
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="min-w-[220px] flex-1">
          <Input
            label="Buscar"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre, CURP, etiqueta, expediente…"
            data-testid="search-pacientes"
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={includeUnidentified}
            onChange={(e) => setIncludeUnidentified(e.target.checked)}
          />
          Incluir no identificados
        </label>
        <Button variant="secondary" size="sm" onClick={() => void cargar()}>
          Buscar
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-slate-600">No hay sujetos que coincidan.</p>
          <p className="mt-1 text-sm text-slate-500">
            Sucursal de sesión: {sucursalActualId ? branchName(sucursalActualId) : '—'}
          </p>
          <Button
            className="mt-4"
            variant="primary"
            size="sm"
            onClick={() => navigate('/app/pacientes/nuevo')}
          >
            Registrar sujeto
          </Button>
        </div>
      ) : (
        <ul className="space-y-2" data-testid="lista-pacientes">
          {items.map((s) => (
            <li key={s.subjectId}>
              <button
                type="button"
                className="w-full text-left transition hover:opacity-95"
                onClick={() => navigate(`/app/pacientes/${s.subjectId}`)}
              >
                <IdentityHeader subject={s} compact />
                <div className="mt-1 px-1 text-xs text-slate-400">
                  {displayNameOf(s)}
                  {s.curp ? ` · CURP ${s.curp}` : ''}
                  {` · ${branchName(s.originBranchId)}`}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
