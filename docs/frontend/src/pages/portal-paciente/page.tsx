import { useState } from 'react';
import { patients, type Patient } from '@/mocks/patients';
import { appointments } from '@/mocks/appointments';
import { getRecetasByPatient } from '@/mocks/recetas';
import { getEstudiosByPatient } from '@/mocks/estudios';
import { getConsultasByPatient } from '@/mocks/consultas';
import { sucursales } from '@/mocks/branches';
import InstitucionalLogo from '@/components/feature/InstitucionalLogo';

const today = new Date().toISOString().split('T')[0];

function normalize(s: string): string {
  return s.trim().toUpperCase();
}

function formatearFecha(fecha: string): string {
  if (!fecha) return '—';
  const [y, m, d] = fecha.split('-');
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`;
}

function sucursalDe(patient: Patient): string {
  return sucursales.find((s) => s.id === patient.sucursalId)?.nombre || '—';
}

export default function PortalPaciente() {
  const [curp, setCurp] = useState('');
  const [expediente, setExpediente] = useState('');
  const [paciente, setPaciente] = useState<Patient | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!curp.trim() || !expediente.trim()) {
      setError('Ingresa tu CURP y tu número de expediente para continuar.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const found = patients.find(
        (p) => normalize(p.curp) === normalize(curp) && normalize(p.expediente) === normalize(expediente)
      );
      if (found) {
        setPaciente(found);
      } else {
        setError('No encontramos un paciente con esos datos. Verifica tu CURP y expediente.');
      }
      setLoading(false);
    }, 500);
  };

  const handleSalir = () => {
    setPaciente(null);
    setCurp('');
    setExpediente('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-background-50">
      {paciente ? (
        <PortalDashboard paciente={paciente} onSalir={handleSalir} />
      ) : (
        <PortalLogin
          curp={curp}
          setCurp={setCurp}
          expediente={expediente}
          setExpediente={setExpediente}
          error={error}
          loading={loading}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

// ── Pantalla de identificación ──

interface PortalLoginProps {
  curp: string;
  setCurp: (v: string) => void;
  expediente: string;
  setExpediente: (v: string) => void;
  error: string;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

function PortalLogin({ curp, setCurp, expediente, setExpediente, error, loading, onSubmit }: PortalLoginProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <InstitucionalLogo
              fallbackIcon="ri-heart-pulse-line"
              fallbackClassName="w-14 h-14 rounded-2xl bg-primary-500 text-white flex items-center justify-center"
              imgClassName="w-14 h-14 object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground-900 font-heading">Portal del Paciente</h1>
          <p className="text-sm text-foreground-500 mt-1">Consulta tus citas, recetas y resultados en un solo lugar.</p>
        </div>

        <form onSubmit={onSubmit} className="bg-background-50 rounded-2xl border border-secondary-200 p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <span className="w-4 h-4 flex items-center justify-center text-red-500 flex-shrink-0">
                <i className="ri-error-warning-line text-sm"></i>
              </span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground-700 mb-1.5">CURP</label>
            <input
              type="text"
              value={curp}
              onChange={(e) => setCurp(e.target.value.toUpperCase())}
              placeholder="LOHF880514MDFPRR09"
              maxLength={18}
              autoComplete="off"
              className="w-full px-3 py-2.5 bg-background-50 border border-secondary-200 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground-700 mb-1.5">Número de expediente</label>
            <input
              type="text"
              value={expediente}
              onChange={(e) => setExpediente(e.target.value.toUpperCase())}
              placeholder="EXP-2024-0001"
              maxLength={20}
              autoComplete="off"
              className="w-full px-3 py-2.5 bg-background-50 border border-secondary-200 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-base cursor-pointer whitespace-nowrap disabled:opacity-60"
          >
            {loading ? (
              <><i className="ri-loader-4-line animate-spin"></i> Verificando...</>
            ) : (
              <><i className="ri-login-box-line"></i> Acceder a mi expediente</>
            )}
          </button>

          <div className="pt-2 border-t border-secondary-100">
            <p className="text-2xs text-foreground-400 text-center">
              Demo: CURP <span className="font-mono">LOHF880514MDFPRR09</span> · Expediente <span className="font-mono">EXP-2024-0001</span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Dashboard del paciente ──

function PortalDashboard({ paciente, onSalir }: { paciente: Patient; onSalir: () => void }) {
  const citas = appointments
    .filter((a) => a.patientId === paciente.id)
    .sort((a, b) => (a.fecha + a.horaInicio).localeCompare(b.fecha + b.horaInicio));
  const proximaCita = citas.find((a) => a.fecha >= today && (a.estado === 'confirmada' || a.estado === 'reservada'));
  const citasPasadas = citas.filter((a) => a.fecha < today || a.estado === 'atendida').slice(0, 5);
  const recetas = getRecetasByPatient(paciente.id);
  const recetasActivas = recetas.filter((r) => r.estado === 'activa');
  const estudios = getEstudiosByPatient(paciente.id);
  const consultas = getConsultasByPatient(paciente.id).slice(0, 5);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <InstitucionalLogo
            fallbackIcon="ri-heart-pulse-line"
            fallbackClassName="w-11 h-11 rounded-xl bg-primary-500 text-white flex items-center justify-center"
            imgClassName="w-11 h-11 object-contain"
          />
          <div>
            <h1 className="text-lg font-bold text-foreground-900 font-heading">Portal del Paciente</h1>
            <p className="text-xs text-foreground-500">Tu información de salud, a tu alcance.</p>
          </div>
        </div>
        <button
          onClick={onSalir}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-foreground-600 hover:text-foreground-800 hover:bg-secondary-100 rounded-lg transition-base cursor-pointer whitespace-nowrap"
        >
          <i className="ri-logout-box-line"></i> Cerrar sesión
        </button>
      </div>

      {/* Tarjeta del paciente */}
      <div className="rounded-2xl border border-secondary-200 bg-background-50 p-5">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xl font-bold flex-shrink-0">
            {paciente.nombre.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-foreground-900">{paciente.nombre} {paciente.apellidos}</h2>
            <p className="text-xs text-foreground-500 mt-0.5">
              Expediente: <span className="font-mono font-medium">{paciente.expediente}</span> · {paciente.edad} años · {paciente.sexo === 'M' ? 'Masculino' : 'Femenino'}
            </p>
          </div>
          <div className="text-right text-xs text-foreground-500 space-y-1">
            <p><span className="text-foreground-400">Médico:</span> {paciente.medicoAsignado}</p>
            <p><span className="text-foreground-400">Sucursal:</span> {sucursalDe(paciente)}</p>
            {paciente.aseguradora && <p><span className="text-foreground-400">Seguro:</span> {paciente.aseguradora}</p>}
          </div>
        </div>
        {(paciente.alergias.length > 0 || paciente.alertas.length > 0) && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-secondary-100">
            {paciente.alergias.map((a) => (
              <span key={a} className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-medium rounded-full bg-red-100 text-red-700">
                <i className="ri-alert-line"></i> Alergia: {a}
              </span>
            ))}
            {paciente.alertas.map((a) => (
              <span key={a} className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-medium rounded-full bg-amber-100 text-amber-700">
                <i className="ri-information-line"></i> {a}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Próxima cita */}
      {proximaCita && (
        <div className="rounded-2xl border border-primary-200 bg-primary-50 p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                <i className="ri-calendar-check-line text-lg"></i>
              </span>
              <div>
                <p className="text-2xs text-primary-500 uppercase tracking-wider font-semibold">Próxima cita</p>
                <p className="text-base font-bold text-foreground-900">{formatearFecha(proximaCita.fecha)} · {proximaCita.horaInicio} hrs</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-foreground-800">{proximaCita.doctorName}</p>
              <p className="text-xs text-foreground-500">{proximaCita.motivo}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recetas activas */}
      <Seccion titulo="Recetas activas" icono="ri-capsule-line" color="text-accent-600">
        {recetasActivas.length === 0 ? (
          <Vacio texto="No tienes recetas activas en este momento." />
        ) : (
          <div className="space-y-3">
            {recetasActivas.map((r) => (
              <div key={r.id} className="rounded-xl border border-secondary-200 bg-background-50 p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm font-semibold text-foreground-900">Receta · {formatearFecha(r.fecha)}</p>
                  <span className="text-2xs text-foreground-400">{r.doctorName}</span>
                </div>
                <p className="text-xs text-foreground-500 mt-1">{r.diagnosticoRelacionado}</p>
                <ul className="mt-3 space-y-2">
                  {r.medicamentos.map((m) => (
                    <li key={m.id} className="text-sm text-foreground-700">
                      <span className="font-medium">{m.nombre}</span> · {m.dosis} · {m.frecuencia} · {m.duracion}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Seccion>

      {/* Resultados de estudios */}
      <Seccion titulo="Estudios y resultados" icono="ri-microscope-line" color="text-sky-600">
        {estudios.length === 0 ? (
          <Vacio texto="No tienes estudios solicitados." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-secondary-200">
            <table className="w-full text-sm">
              <thead className="bg-background-100">
                <tr className="text-left">
                  <th className="px-4 py-2.5 text-xs font-semibold text-foreground-500 uppercase tracking-wider">Estudio</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-foreground-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-foreground-500 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {estudios.map((e) => (
                  <tr key={e.id} className="hover:bg-secondary-50/50 transition-base">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground-900">{e.nombre}</p>
                      {e.resultado && <p className="text-xs text-foreground-500 mt-0.5">{e.resultado}</p>}
                    </td>
                    <td className="px-4 py-3 text-foreground-600 whitespace-nowrap">{formatearFecha(e.fechaSolicitud)}</td>
                    <td className="px-4 py-3">
                      <EstadoEstudio estado={e.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Seccion>

      {/* Historial de consultas */}
      <Seccion titulo="Consultas recientes" icono="ri-stethoscope-line" color="text-primary-600">
        {consultas.length === 0 ? (
          <Vacio texto="No tienes consultas registradas." />
        ) : (
          <div className="space-y-3">
            {consultas.map((c) => (
              <div key={c.id} className="rounded-xl border border-secondary-200 bg-background-50 p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm font-semibold text-foreground-900">{c.motivo}</p>
                  <span className="text-2xs text-foreground-400">{formatearFecha(c.fecha)} · {c.hora} hrs</span>
                </div>
                <p className="text-xs text-foreground-500 mt-1">{c.doctorName} · {c.especialidad}</p>
                {c.diagnosticoPrincipal && (
                  <p className="text-xs text-foreground-700 mt-2 font-medium">{c.diagnosticoPrincipal}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Seccion>

      {/* Citas pasadas */}
      {citasPasadas.length > 0 && (
        <Seccion titulo="Citas anteriores" icono="ri-history-line" color="text-secondary-600">
          <div className="overflow-x-auto rounded-xl border border-secondary-200">
            <table className="w-full text-sm">
              <thead className="bg-background-100">
                <tr className="text-left">
                  <th className="px-4 py-2.5 text-xs font-semibold text-foreground-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-foreground-500 uppercase tracking-wider">Médico</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-foreground-500 uppercase tracking-wider">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {citasPasadas.map((a) => (
                  <tr key={a.id} className="hover:bg-secondary-50/50 transition-base">
                    <td className="px-4 py-3 text-foreground-600 whitespace-nowrap">{formatearFecha(a.fecha)}</td>
                    <td className="px-4 py-3 text-foreground-800">{a.doctorName}</td>
                    <td className="px-4 py-3 text-foreground-500">{a.motivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Seccion>
      )}

      <p className="text-center text-2xs text-foreground-400 pb-6">
        MediCore · Tu información está protegida conforme a la NOM-004-SSA3-2012 y la LFPDPPP.
      </p>
    </div>
  );
}

function Seccion({ titulo, icono, color, children }: { titulo: string; icono: string; color: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground-900 mb-3">
        <span className={`w-5 h-5 flex items-center justify-center ${color}`}>
          <i className={icono}></i>
        </span>
        {titulo}
      </h3>
      {children}
    </section>
  );
}

function Vacio({ texto }: { texto: string }) {
  return (
    <div className="rounded-xl border border-secondary-200 bg-background-50 p-6 text-center">
      <p className="text-sm text-foreground-400">{texto}</p>
    </div>
  );
}

function EstadoEstudio({ estado }: { estado: 'solicitado' | 'en_proceso' | 'completado' | 'cancelado' }) {
  const config = {
    solicitado: { label: 'Solicitado', cls: 'bg-secondary-100 text-foreground-600' },
    en_proceso: { label: 'En proceso', cls: 'bg-amber-100 text-amber-700' },
    completado: { label: 'Resultado listo', cls: 'bg-emerald-100 text-emerald-700' },
    cancelado: { label: 'Cancelado', cls: 'bg-red-100 text-red-700' },
  }[estado];
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-2xs font-medium ${config.cls}`}>{config.label}</span>;
}