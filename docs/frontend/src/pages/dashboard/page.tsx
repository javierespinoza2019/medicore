import Card from '@/components/base/Card';
import Badge from '@/components/base/Badge';
import Avatar from '@/components/base/Avatar';
import { useNavigate } from 'react-router-dom';
import {
  dashboardKPIs,
  urgenciasActivasDelDia,
  triageEsperaDist,
  proximasCitasHoy,
  tendencias,
} from '@/mocks/dashboard';
import { urgenciaConfig, estadoUrgenciaConfig } from '@/mocks/urgencias';
import type { Urgencia } from '@/mocks/urgencias';

const stateBadgeVariants: Record<string, 'success' | 'warning' | 'primary' | 'danger' | 'secondary' | 'info'> = {
  confirmada: 'success',
  en_espera: 'warning',
  en_consulta: 'primary',
  atendida: 'success',
  llego: 'info',
  cancelada: 'danger',
  reservada: 'secondary',
  no_acudio: 'danger',
};

const stateLabels: Record<string, string> = {
  confirmada: 'Confirmada',
  en_espera: 'Esperando',
  en_consulta: 'En consulta',
  atendida: 'Atendida',
  llego: 'Llegó',
  cancelada: 'Cancelada',
  reservada: 'Reservada',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const kpi = dashboardKPIs;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-foreground-500">
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* ═══════ KPIS PRINCIPALES ═══════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* 1. Sala de Espera */}
        <button
          onClick={() => navigate('/app/sala-espera')}
          className="text-left p-4 rounded-xl border border-secondary-200 bg-background-50 hover:border-amber-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-100">
              <i className="ri-time-line text-amber-600"></i>
            </span>
            <span className="text-2xs text-foreground-400 uppercase tracking-wider">Sala Espera</span>
          </div>
          <p className="text-[28px] font-bold text-foreground-900 font-heading leading-tight">{kpi.salaEspera}</p>
          <div className="flex items-center gap-1 mt-1.5">
            {tendencias.salaEspera.valor > 0 && (
              <>
                <span className={`w-3 h-3 flex items-center justify-center ${tendencias.salaEspera.positivo ? 'text-emerald-500' : 'text-red-500'}`}>
                  <i className={`text-xs ${tendencias.salaEspera.positivo ? 'ri-arrow-down-line' : 'ri-arrow-up-line'}`}></i>
                </span>
                <span className={`text-xs font-medium ${tendencias.salaEspera.positivo ? 'text-emerald-600' : 'text-red-600'}`}>
                  {tendencias.salaEspera.valor} vs ayer
                </span>
              </>
            )}
          </div>
        </button>

        {/* 2. Consultas Activas */}
        <button
          onClick={() => navigate('/app/consultas')}
          className="text-left p-4 rounded-xl border border-secondary-200 bg-background-50 hover:border-primary-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-100">
              <i className="ri-stethoscope-line text-primary-600"></i>
            </span>
            <span className="text-2xs text-foreground-400 uppercase tracking-wider">Consultas</span>
          </div>
          <p className="text-[28px] font-bold text-foreground-900 font-heading leading-tight">{kpi.consultasActivas}</p>
          <span className="text-xs text-foreground-500 mt-1.5 block">en curso ahora</span>
        </button>

        {/* 3. Urgencias Activas */}
        <button
          onClick={() => navigate('/app/urgencias')}
          className={`text-left p-4 rounded-xl border transition-all cursor-pointer group ${
            kpi.urgenciasCriticas > 0
              ? 'border-red-500/20 bg-red-500/10 hover:border-red-500/40'
              : 'border-secondary-200 bg-background-50 hover:border-secondary-300'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-8 h-8 flex items-center justify-center rounded-lg ${kpi.urgenciasCriticas > 0 ? 'bg-red-100' : 'bg-secondary-100'}`}>
              <i className={`${kpi.urgenciasCriticas > 0 ? 'ri-heart-pulse-fill text-red-500' : 'ri-hospital-line text-foreground-400'}`}></i>
            </span>
            <span className="text-2xs text-foreground-400 uppercase tracking-wider">Urgencias</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <p className="text-[28px] font-bold text-foreground-900 font-heading leading-tight">{kpi.urgenciasActivas}</p>
            {kpi.urgenciasCriticas > 0 && (
              <span className="text-xs font-semibold text-red-600">{kpi.urgenciasCriticas} crítica{kpi.urgenciasCriticas > 1 ? 's' : ''}</span>
            )}
          </div>
          {kpi.urgenciasCriticas > 0 && (
            <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              Atención requerida
            </span>
          )}
        </button>

        {/* 4. Ingresos del Día */}
        <div className="text-left p-4 rounded-xl border border-secondary-200 bg-background-50">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-100">
              <i className="ri-money-dollar-circle-line text-emerald-600"></i>
            </span>
            <span className="text-2xs text-foreground-400 uppercase tracking-wider">Ingresos</span>
          </div>
          <p className="text-[28px] font-bold text-foreground-900 font-heading leading-tight">
            ${kpi.ingresosDelDia.toLocaleString()}
          </p>
          <div className="flex items-center gap-1 mt-1.5">
            <span className="w-3 h-3 flex items-center justify-center text-emerald-500">
              <i className="ri-arrow-up-line text-xs"></i>
            </span>
            <span className="text-xs font-medium text-emerald-600">+{tendencias.ingresosDelDia.porcentaje}% vs ayer</span>
          </div>
        </div>

        {/* 5. Tiempo de Espera */}
        <button
          onClick={() => navigate('/app/sala-espera')}
          className="text-left p-4 rounded-xl border border-secondary-200 bg-background-50 hover:border-sky-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-sky-100">
              <i className="ri-hourglass-line text-sky-600"></i>
            </span>
            <span className="text-2xs text-foreground-400 uppercase tracking-wider">Espera Prom.</span>
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-[28px] font-bold text-foreground-900 font-heading leading-tight">{kpi.tiempoPromedioEspera}</p>
            <span className="text-sm text-foreground-500">min</span>
          </div>
          <div className="flex items-center gap-1 mt-1.5">
            <span className="w-3 h-3 flex items-center justify-center text-emerald-500">
              <i className="ri-arrow-down-line text-xs"></i>
            </span>
            <span className="text-xs font-medium text-emerald-600">{tendencias.tiempoPromedioEspera.valor} min vs ayer</span>
          </div>
        </button>
      </div>

      {/* ═══════ PANELES PRINCIPALES ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Urgencias Activas — ocupa 2 columnas */}
        <Card className="lg:col-span-2" padding="none">
          <div className="px-5 py-4 border-b border-secondary-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center">
                <i className="ri-heart-pulse-line text-red-500"></i>
              </span>
              <h3 className="text-base font-semibold text-foreground-900 font-heading">Urgencias Activas</h3>
              <Badge variant="danger" size="sm">{urgenciasActivasDelDia.length}</Badge>
            </div>
            <button
              onClick={() => navigate('/app/urgencias')}
              className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-base cursor-pointer flex items-center gap-1"
            >
              Ver todas <span className="w-3 h-3 flex items-center justify-center"><i className="ri-arrow-right-line text-[10px]"></i></span>
            </button>
          </div>
          {urgenciasActivasDelDia.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <div className="w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-emerald-100 mb-2">
                <i className="ri-check-line text-emerald-600"></i>
              </div>
              <p className="text-sm text-foreground-600">Sin urgencias activas</p>
              <p className="text-xs text-foreground-400 mt-0.5">Todas las urgencias han sido atendidas o dadas de alta</p>
            </div>
          ) : (
            <div className="divide-y divide-secondary-50">
              {urgenciasActivasDelDia.map((u) => (
                <UrgenciaRow key={u.id} urgencia={u} onClick={() => navigate('/app/urgencias')} />
              ))}
            </div>
          )}
        </Card>

        {/* Próximas Citas — 1 columna */}
        <Card padding="none">
          <div className="px-5 py-4 border-b border-secondary-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center">
                <i className="ri-calendar-check-line text-primary-600"></i>
              </span>
              <h3 className="text-base font-semibold text-foreground-900 font-heading">Próximas Citas</h3>
            </div>
            <button
              onClick={() => navigate('/app/agenda')}
              className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-base cursor-pointer flex items-center gap-1"
            >
              Agenda <span className="w-3 h-3 flex items-center justify-center"><i className="ri-arrow-right-line text-[10px]"></i></span>
            </button>
          </div>
          {proximasCitasHoy.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-foreground-500">No hay más citas programadas para hoy</p>
            </div>
          ) : (
            <div className="divide-y divide-secondary-50">
              {proximasCitasHoy.map((apt) => (
                <div key={apt.id} className="flex items-center gap-3 px-5 py-3 hover:bg-secondary-50 transition-base cursor-pointer">
                  <Avatar name={apt.patientName || 'Sin asignar'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground-800 truncate">{apt.patientName || 'Sin asignar'}</p>
                    <p className="text-xs text-foreground-500">{apt.doctorName}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-foreground-700">{apt.horaInicio}</p>
                    <Badge variant={stateBadgeVariants[apt.estado]} size="sm">
                      {stateLabels[apt.estado] || apt.estado}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ═══════ DISTRIBUCIÓN TRIAGE EN ESPERA ═══════ */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 flex items-center justify-center">
              <i className="ri-heart-pulse-line text-foreground-600"></i>
            </span>
            <h3 className="text-base font-semibold text-foreground-900 font-heading">Pacientes en Sala de Espera por Nivel de Triage</h3>
          </div>
          <Badge variant="secondary" size="sm">Total: {triageEsperaDist.reduce((s, i) => s + i.count, 0)}</Badge>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {triageEsperaDist.map((item) => {
            const cfg = urgenciaConfig[item.nivel];
            const total = triageEsperaDist.reduce((s, i) => s + i.count, 0);
            const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
            return (
              <button
                key={item.nivel}
                onClick={() => navigate('/app/sala-espera')}
                className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                  item.count > 0 ? `${cfg.border} ${cfg.bg} hover:shadow-sm` : 'border-secondary-100 bg-background-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${cfg.color}`}></span>
                  <span className={`text-xs font-semibold ${item.count > 0 ? cfg.text : 'text-foreground-400'}`}>
                    {cfg.label}
                  </span>
                </div>
                <p className={`text-2xl font-bold font-heading ${item.count > 0 ? 'text-foreground-900' : 'text-foreground-300'}`}>
                  {item.count}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-1.5 bg-secondary-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${item.count > 0 ? cfg.color : 'bg-secondary-200'}`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                  <span className="text-2xs text-foreground-400 w-8 text-right">{pct}%</span>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* ═══════ INDICADORES OPERATIVOS ═══════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card padding="md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-foreground-500">Ocupación Agenda</span>
            <span className="text-xs font-semibold text-foreground-700">{kpi.ocupacionAgenda}%</span>
          </div>
          <div className="w-full h-2 bg-secondary-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                kpi.ocupacionAgenda > 80 ? 'bg-red-500' : kpi.ocupacionAgenda > 60 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${kpi.ocupacionAgenda}%` }}
            ></div>
          </div>
          <p className="text-2xs text-foreground-400 mt-2">{kpi.citasHoy} citas programadas</p>
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-foreground-500">Tasa de Atención</span>
            <span className="text-xs font-semibold text-foreground-700">
              {kpi.citasHoy > 0 ? Math.round((kpi.citasCompletadas / kpi.citasHoy) * 100) : 0}%
            </span>
          </div>
          <div className="w-full h-2 bg-secondary-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-primary-500 transition-all duration-700"
              style={{ width: `${kpi.citasHoy > 0 ? Math.round((kpi.citasCompletadas / kpi.citasHoy) * 100) : 0}%` }}
            ></div>
          </div>
          <p className="text-2xs text-foreground-400 mt-2">{kpi.citasCompletadas} completadas de {kpi.citasHoy}</p>
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-foreground-500">Cancelaciones</span>
            <span className="text-xs font-semibold text-red-600">{kpi.citasCanceladas}</span>
          </div>
          <p className="text-[28px] font-bold text-foreground-900 font-heading leading-tight mt-1">{kpi.citasCanceladas}</p>
          <p className="text-2xs text-foreground-400 mt-0.5">
            {kpi.citasHoy > 0 ? `${Math.round((kpi.citasCanceladas / kpi.citasHoy) * 100)}% de las citas` : 'Sin cancelaciones'}
          </p>
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-foreground-500">Cobros Pendientes</span>
            <span className={`text-xs font-semibold ${kpi.cobrosPendientes > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {kpi.cobrosPendientes}
            </span>
          </div>
          <p className="text-[28px] font-bold text-foreground-900 font-heading leading-tight mt-1">{kpi.cobrosPendientes}</p>
          <button
            onClick={() => navigate('/app/caja')}
            className="text-2xs text-primary-600 hover:text-primary-700 transition-base cursor-pointer mt-0.5"
          >
            Ir a Caja →
          </button>
        </Card>
      </div>
    </div>
  );
}

function UrgenciaRow({ urgencia, onClick }: { urgencia: Urgencia; onClick: () => void }) {
  const cfg = urgenciaConfig[urgencia.nivelUrgencia];
  const estCfg = estadoUrgenciaConfig[urgencia.estado];

  return (
    <button onClick={onClick} className="w-full text-left flex items-center gap-4 px-5 py-3 hover:bg-secondary-50 transition-base cursor-pointer">
      {/* Priority indicator */}
      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${cfg.color} ${urgencia.estado === 'en_atencion' ? 'animate-pulse' : ''}`}></div>

      {/* Patient info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground-800 truncate">{urgencia.patientName}</p>
          <span className="text-2xs text-foreground-400 whitespace-nowrap">{urgencia.edad}a · {urgencia.genero}</span>
        </div>
        <p className="text-xs text-foreground-500 truncate mt-0.5">{urgencia.motivo.substring(0, 65)}{urgencia.motivo.length > 65 ? '...' : ''}</p>
      </div>

      {/* Status & area */}
      <div className="text-right flex-shrink-0">
        <div className="flex items-center gap-1.5 justify-end">
          <span className={`text-2xs font-semibold ${estCfg.color}`}>{estCfg.label}</span>
          <span className={`text-2xs px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
        </div>
        <p className="text-2xs text-foreground-400 mt-0.5">{urgencia.areaUrgencia}</p>
        <p className="text-2xs text-foreground-400">{urgencia.horaLlegada}</p>
      </div>
    </button>
  );
}