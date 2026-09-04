/**
 * Consultas / consultorio contra API real (M4/M6/M7/M8).
 * Cola consulta_externa + shell consultorio con nota, historia y receta.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  encounterDisplayName,
  estadoConfig,
  getEncounter,
  openEncounter,
  type EncounterDto,
} from '@/api/encounters';
import { displayNameOf, getSubject, type SubjectDto } from '@/api/subjects';
import {
  listPrescriptionsBySubject,
  type PrescriptionDto,
} from '@/api/prescriptions';
import { useAuth } from '@/hooks/useAuth';
import { useEncounterQueue, resolveBranchId } from '@/hooks/useEncounterQueue';
import { listBranches } from '@/api/branches';
import { mensajeDeFalla } from '@/api/errors';
import Button from '@/components/base/Button';
import Card from '@/components/base/Card';
import ConsultQueueStatsBar from '@/components/feature/ConsultQueueStatsBar';
import QueueLiveBanner from '@/components/feature/QueueLiveBanner';
import ConsultorioShell from '@/pages/consultas/components/ConsultorioShell';
import {
  computeConsultQueueStats,
  filterConsultQueue,
  formatConsultArrival,
} from '@/utils/consultPresentation';

export default function Consultas() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isAuthenticated, sucursalActualId } = useAuth();
  const encuentroParam = searchParams.get('encuentro') || '';
  const pacienteParam = searchParams.get('paciente') || '';

  const {
    items,
    loading,
    error,
    refresh,
    liveStatus,
    fromCache,
    cacheAgeLabel,
    showStaleBanner,
  } = useEncounterQueue(false);

  const [search, setSearch] = useState('');
  const [encounter, setEncounter] = useState<EncounterDto | null>(null);
  const [subject, setSubject] = useState<SubjectDto | null>(null);
  const [filterSubject, setFilterSubject] = useState<SubjectDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [prescriptions, setPrescriptions] = useState<PrescriptionDto[]>([]);
  const [openingEncounter, setOpeningEncounter] = useState(false);
  const [branchId, setBranchId] = useState<string | null>(null);

  const consultas = useMemo(
    () => items.filter((e) => e.encounterType === 'consulta_externa'),
    [items],
  );

  const filtered = useMemo(
    () =>
      filterConsultQueue(consultas, {
        search,
        subjectId: pacienteParam || null,
      }),
    [consultas, search, pacienteParam],
  );

  const stats = useMemo(() => computeConsultQueueStats(consultas), [consultas]);

  useEffect(() => {
    void (async () => {
      const res = await listBranches(true);
      if (res.success && res.data) {
        setBranchId(resolveBranchId(sucursalActualId, res.data));
      }
    })();
  }, [sucursalActualId]);

  useEffect(() => {
    if (!pacienteParam || authLoading || !isAuthenticated) {
      if (!pacienteParam) setFilterSubject(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await getSubject(pacienteParam);
      if (cancelled) return;
      if (res.success && res.data) setFilterSubject(res.data);
      else setFilterSubject(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [pacienteParam, authLoading, isAuthenticated]);

  useEffect(() => {
    if (!encuentroParam || authLoading || !isAuthenticated) {
      if (!encuentroParam) {
        setEncounter(null);
        setSubject(null);
        setPrescriptions([]);
      }
      return;
    }
    let cancelled = false;
    setLoadingDetalle(true);
    setLoadError(null);
    void (async () => {
      const enc = await getEncounter(encuentroParam);
      if (cancelled) return;
      if (!enc.success || !enc.data) {
        setLoadError(
          mensajeDeFalla(enc.failure).titulo || enc.message || 'No se pudo cargar el episodio.',
        );
        setEncounter(null);
        setSubject(null);
        setLoadingDetalle(false);
        return;
      }
      setEncounter(enc.data);
      const subj = await getSubject(enc.data.subjectId);
      if (cancelled) return;
      if (subj.success && subj.data) {
        setSubject(subj.data);
        const rx = await listPrescriptionsBySubject(enc.data.subjectId);
        if (!cancelled && rx.success && rx.data) {
          setPrescriptions(
            rx.data.filter((p) => p.encounterId === enc.data!.encounterId),
          );
        }
      } else {
        setSubject(null);
      }
      setLoadingDetalle(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [encuentroParam, authLoading, isAuthenticated]);

  const openEncounterRow = (e: EncounterDto) => {
    const next = new URLSearchParams(searchParams);
    next.set('encuentro', e.encounterId);
    setSearchParams(next, { replace: false });
  };

  const closeDetalle = () => {
    if (pacienteParam) {
      navigate(`/app/consultas?paciente=${pacienteParam}`);
    } else {
      navigate('/app/consultas');
    }
  };

  const handleNuevoIngreso = async () => {
    const subjectId = pacienteParam || filterSubject?.subjectId;
    if (!subjectId || !branchId) return;
    setOpeningEncounter(true);
    setLoadError(null);
    try {
      const res = await openEncounter({
        branchId,
        subjectId,
        encounterType: 'consulta_externa',
      });
      if (!res.success || !res.data) {
        setLoadError(
          mensajeDeFalla(res.failure).titulo || res.message || 'No se pudo abrir el episodio.',
        );
        return;
      }
      await refresh();
      const next = new URLSearchParams(searchParams);
      next.set('encuentro', res.data.encounterId);
      if (pacienteParam) next.set('paciente', pacienteParam);
      setSearchParams(next, { replace: false });
    } finally {
      setOpeningEncounter(false);
    }
  };

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
  };
  const doctorName = user ? `${user.nombre} ${user.apellidos}`.trim() : '';
  const doctorCedula = user?.cedulaProfesional || '';
  const doctorId = user?.doctorId || '';

  if (encuentroParam) {
    if (authLoading || !isAuthenticated) {
      return (
        <div className="space-y-4 p-4 md:p-6" data-testid="page-consultas">
          <p className="text-sm text-foreground-500">Preparando sesión clínica…</p>
        </div>
      );
    }

    if (loadingDetalle) {
      return (
        <div className="space-y-4 p-4 md:p-6" data-testid="page-consultas">
          <p className="text-sm text-foreground-500">Cargando episodio…</p>
        </div>
      );
    }

    if (loadError || !encounter || !subject) {
      return (
        <div className="space-y-4 p-4 md:p-6" data-testid="page-consultas">
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">
            {loadError || 'Episodio o sujeto no disponible.'}
          </p>
          <Button variant="secondary" size="sm" onClick={closeDetalle}>
            Volver
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4 p-4 md:p-6" data-testid="page-consultas">
        <ConsultorioShell
          encounter={encounter}
          subject={subject}
          doctorId={doctorId}
          doctorName={doctorName}
          doctorCedula={doctorCedula}
          sucursalNombre={user?.sucursales?.[0] ?? ''}
          prescriptions={prescriptions}
          onBack={closeDetalle}
          onPrescriptionChange={handlePrescriptionChange}
        />
      </div>
    );
  }

  const openForSubject = pacienteParam
    ? filtered.filter((e) => e.state !== 'cerrado')
    : [];

  return (
    <div className="space-y-4 p-4 md:p-6" data-testid="page-consultas">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground-900">Consultas</h1>
          <p className="text-sm text-foreground-500">
            Cola de consulta externa (API). Abra un episodio para capturar nota, historia y receta.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void refresh()} disabled={loading}>
          Actualizar cola
        </Button>
      </div>

      {filterSubject && (
        <Card padding="md" className="border-primary-200/50 bg-primary-50/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground-900">
                Consulta para {displayNameOf(filterSubject)}
              </p>
              <p className="text-xs text-foreground-500">
                {openForSubject.length > 0
                  ? `${openForSubject.length} episodio(s) abierto(s) en cola`
                  : 'Sin episodio abierto — puede crear uno nuevo'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {openForSubject.length === 1 && (
                <Button variant="primary" size="sm" onClick={() => openEncounterRow(openForSubject[0])}>
                  Abrir episodio activo
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                disabled={openingEncounter || !branchId}
                onClick={() => void handleNuevoIngreso()}
              >
                {openingEncounter ? 'Abriendo…' : 'Nuevo ingreso consulta'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/app/consultas')}
              >
                Quitar filtro
              </Button>
            </div>
          </div>
        </Card>
      )}

      <QueueLiveBanner
        liveStatus={liveStatus}
        fromCache={fromCache}
        cacheAgeLabel={cacheAgeLabel}
        showStaleBanner={showStaleBanner}
      />

      <ConsultQueueStatsBar stats={stats} />

      {error && (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">
          {error}
        </p>
      )}
      {loadError && (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">
          {loadError}
        </p>
      )}

      <div className="relative max-w-md">
        <input
          type="search"
          aria-label="Buscar en cola de consultas"
          placeholder="Buscar por etiqueta, turno o nombre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="consultas-buscar-cola"
          className="w-full rounded-lg border border-secondary-200 bg-background-0 px-3 py-2 text-sm"
        />
      </div>

      {loading && consultas.length === 0 ? (
        <p className="text-sm text-foreground-500">Cargando cola…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-foreground-500">
          {pacienteParam
            ? 'No hay episodios de consulta externa para este sujeto en la cola actual.'
            : 'No hay episodios de consulta externa abiertos en esta sucursal.'}
        </p>
      ) : (
        <ul className="divide-y divide-secondary-100 rounded-xl border border-secondary-200 bg-background-0">
          {filtered.map((e) => (
            <li key={e.encounterId}>
              <button
                type="button"
                onClick={() => openEncounterRow(e)}
                className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-base hover:bg-secondary-50/50"
                data-testid={`consulta-row-${e.encounterId}`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground-900">
                    {encounterDisplayName(e)}
                  </p>
                  <p className="mt-0.5 text-xs text-foreground-500">
                    Turno {e.turnNumber} · {formatConsultArrival(e.arrivalAtUtc)}
                    {e.operationalLabel ? ` · ${e.operationalLabel}` : ''}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-2xs font-medium ${
                    estadoConfig[e.state]?.className ?? 'bg-secondary-100 text-foreground-700'
                  }`}
                >
                  {estadoConfig[e.state]?.label ?? e.state}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
