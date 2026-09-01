/**
 * Consultas / SOAP contra API real (notes + prescriptions + subjects).
 * Sin mocks de consultas/notas/recetas/patients.
 * No cierra episodio vía TransitionState (SC-04 = otro frente).
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  encounterDisplayName,
  estadoConfig,
  getEncounter,
  type EncounterDto,
} from '@/api/encounters';
import { displayNameOf, getSubject, type SubjectDto } from '@/api/subjects';
import {
  listPrescriptionsBySubject,
  type PrescriptionDto,
} from '@/api/prescriptions';
import { useAuth } from '@/hooks/useAuth';
import { useEncounterQueue } from '@/hooks/useEncounterQueue';
import { mensajeDeFalla } from '@/api/errors';
import Button from '@/components/base/Button';
import Card from '@/components/base/Card';
import IdentityHeader from '@/components/feature/IdentityHeader';
import QueueLiveBanner from '@/components/feature/QueueLiveBanner';
import ClinicalNotesPanel from '@/pages/consultas/components/ClinicalNotesPanel';
import RecetaInlineCreator from '@/pages/consultas/components/RecetaInlineCreator';
import RecetaPrintModal from '@/pages/recetas/components/RecetaPrintModal';
import type { RecetaView } from '@/pages/consultas/types';
import { doseLabel, frequencyLabel } from '@/api/prescriptions';

function prescriptionToView(
  rx: PrescriptionDto,
  meta: {
    patientName: string;
    patientExpediente: string;
    doctorName: string;
    doctorCedula: string;
  },
): RecetaView {
  const issued = rx.issuedAtUtc ?? rx.occurredAtUtc;
  const d = new Date(issued);
  return {
    id: rx.prescriptionId,
    patientId: rx.subjectId,
    patientName: meta.patientName,
    patientExpediente: meta.patientExpediente,
    doctorId: rx.professionalId ?? '',
    doctorName: meta.doctorName || rx.authorDisplayName,
    doctorCedula: meta.doctorCedula || rx.authorLicenseSnapshot || '',
    consultaId: rx.encounterId,
    fecha: d.toISOString().slice(0, 10),
    hora: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    medicamentos: rx.items.map((it) => ({
      id: it.prescriptionItemId,
      medicamentoId: it.medicationId,
      nombre: it.genericNameSnapshot,
      presentacion: '',
      concentracion: doseLabel(it.dose),
      dosis: doseLabel(it.dose),
      frecuencia: frequencyLabel(it.frequency),
      via: it.route,
      duracion: it.durationDays != null ? `${it.durationDays} días` : '',
      indicaciones: it.instructions ?? '',
    })),
    indicacionesGenerales: rx.generalInstructions ?? '',
    estado: rx.cancelledAtUtc ? 'cancelada' : 'activa',
    diagnosticoRelacionado: '',
  };
}

function formatArrival(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export default function Consultas() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const encuentroParam = searchParams.get('encuentro') || '';

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [showReceta, setShowReceta] = useState(false);
  const [recetas, setRecetas] = useState<RecetaView[]>([]);
  const [recetaPrint, setRecetaPrint] = useState<RecetaView | null>(null);

  const consultas = useMemo(
    () => items.filter((e) => e.encounterType === 'consulta_externa'),
    [items],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return consultas;
    const q = search.toLowerCase();
    return consultas.filter((e) => {
      const name = encounterDisplayName(e).toLowerCase();
      return (
        name.includes(q) ||
        String(e.turnNumber).includes(q) ||
        (e.operationalLabel?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [consultas, search]);

  useEffect(() => {
    if (!encuentroParam || authLoading || !isAuthenticated) {
      if (!encuentroParam) {
        setEncounter(null);
        setSubject(null);
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
        setLoadError(mensajeDeFalla(enc.failure).titulo || enc.message || 'No se pudo cargar el episodio.');
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
          const name = displayNameOf(subj.data);
          const exp = subj.data.recordNumber || subj.data.activeLabel?.operationalLabel || '';
          setRecetas(
            rx.data
              .filter((p) => p.encounterId === enc.data!.encounterId)
              .map((p) =>
                prescriptionToView(p, {
                  patientName: name,
                  patientExpediente: exp,
                  doctorName: p.authorDisplayName,
                  doctorCedula: p.authorLicenseSnapshot || '',
                }),
              ),
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

  const openEncounter = (e: EncounterDto) => {
    setSearchParams({ encuentro: e.encounterId }, { replace: false });
  };

  const closeDetalle = () => {
    setShowReceta(false);
    setRecetaPrint(null);
    navigate('/app/consultas');
  };

  const patientName = subject ? displayNameOf(subject) : '';
  const patientExpediente =
    subject?.recordNumber || subject?.activeLabel?.operationalLabel || '';
  const doctorName = user ? `${user.nombre} ${user.apellidos}`.trim() : '';
  const doctorCedula = user?.cedulaProfesional || '';
  const doctorId = user?.doctorId || '';

  if (encuentroParam) {
    // No montar paneles clínicos hasta tener sesión: un 401 temprano disparaba refresh
    // en paralelo con AuthProvider y, con rotación de cookie, borraba el access token.
    if (authLoading || !isAuthenticated) {
      return (
        <div className="space-y-4 p-4 md:p-6" data-testid="page-consultas">
          <p className="text-sm text-slate-500">Preparando sesión clínica…</p>
        </div>
      );
    }

    return (
      <div className="space-y-4 p-4 md:p-6" data-testid="page-consultas">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold text-slate-900">Consulta</h1>
            <p className="text-sm text-slate-500">
              Nota SOAP y receta contra API. El cierre de episodio (transición de estado) es otro
              frente (SC-04).
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={closeDetalle}>
            Volver al listado
          </Button>
        </div>

        {subject && <IdentityHeader subject={subject} />}

        {loadingDetalle && <p className="text-sm text-slate-500">Cargando episodio…</p>}
        {loadError && (
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">
            {loadError}
          </p>
        )}

        {encounter && (
          <Card padding="md">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span>
                Turno <strong>{encounter.turnNumber}</strong>
              </span>
              <span className={`rounded px-2 py-0.5 text-xs ${estadoConfig[encounter.state]?.className ?? ''}`}>
                {estadoConfig[encounter.state]?.label ?? encounter.state}
              </span>
              <span>Llegada {formatArrival(encounter.arrivalAtUtc)}</span>
            </div>
          </Card>
        )}

        <div data-testid="panel-notas-clinicas">
          <ClinicalNotesPanel encounterId={encuentroParam} defaultNoteType="evolucion" />
        </div>

        <Card padding="md">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">Recetas del episodio</h2>
            {subject && encounter && !showReceta && (
              <Button variant="primary" size="sm" onClick={() => setShowReceta(true)}>
                Nueva receta
              </Button>
            )}
          </div>
          {showReceta && subject && encounter && (
            <RecetaInlineCreator
              consultaId={encounter.encounterId}
              patientId={subject.subjectId}
              patientName={patientName}
              patientExpediente={patientExpediente}
              doctorId={doctorId}
              doctorName={doctorName}
              doctorCedula={doctorCedula}
              diagnosticoRelacionado=""
              onRecetaCreada={(r) => {
                setRecetas((prev) => [r, ...prev]);
                setShowReceta(false);
              }}
              onCancel={() => setShowReceta(false)}
            />
          )}
          {!showReceta && recetas.length === 0 && (
            <p className="text-sm text-slate-500">Sin recetas en este episodio.</p>
          )}
          {!showReceta && recetas.length > 0 && (
            <ul className="space-y-2">
              {recetas.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <span>
                    {r.fecha} {r.hora} · {r.medicamentos.length} medicamento(s)
                  </span>
                  <Button variant="secondary" size="sm" onClick={() => setRecetaPrint(r)}>
                    Ver / imprimir
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {recetaPrint && (
          <RecetaPrintModal
            receta={recetaPrint}
            isOpen={Boolean(recetaPrint)}
            onClose={() => setRecetaPrint(null)}
            sucursalNombre={user?.sucursales?.[0] ?? ''}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6" data-testid="page-consultas">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Consultas</h1>
          <p className="text-sm text-slate-500">
            Cola de consulta externa (API). Abre un episodio para capturar SOAP y receta.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void refresh()} disabled={loading}>
          Actualizar cola
        </Button>
      </div>

      <QueueLiveBanner
        liveStatus={liveStatus}
        fromCache={fromCache}
        cacheAgeLabel={cacheAgeLabel}
        showStaleBanner={showStaleBanner}
      />

      {error && (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">
          {error}
        </p>
      )}

      <div className="relative max-w-md">
        <input
          type="search"
          aria-label="Buscar en cola de consultas"
          placeholder="Buscar por etiqueta, turno o nombre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
      </div>

      {loading && consultas.length === 0 ? (
        <p className="text-sm text-slate-500">Cargando cola…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500">
          No hay episodios de consulta externa abiertos en esta sucursal.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {filtered.map((e) => (
            <li key={e.encounterId}>
              <button
                type="button"
                onClick={() => openEncounter(e)}
                className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
                data-testid={`consulta-row-${e.encounterId}`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {encounterDisplayName(e)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Turno {e.turnNumber} · {formatArrival(e.arrivalAtUtc)}
                    {e.operationalLabel ? ` · ${e.operationalLabel}` : ''}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-2xs font-medium ${
                    estadoConfig[e.state]?.className ?? 'bg-slate-100 text-slate-700'
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
