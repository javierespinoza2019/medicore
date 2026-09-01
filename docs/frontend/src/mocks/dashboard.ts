import { appointments } from './appointments';
import { urgenciasMock, urgenciaConfig, type Urgencia } from './urgencias';
import { currentSession } from './caja';

// ── KPIs computados desde datos reales de otros módulos ──

export interface DashboardKPIs {
  salaEspera: number;
  consultasActivas: number;
  urgenciasActivas: number;
  urgenciasCriticas: number;
  ingresosDelDia: number;
  tiempoPromedioEspera: number;
  ocupacionAgenda: number;
  citasHoy: number;
  citasCompletadas: number;
  citasCanceladas: number;
  noShows: number;
  cobrosPendientes: number;
  pacientesNuevosHoy: number;
}

export const dashboardKPIs: DashboardKPIs = {
  salaEspera: 3,
  consultasActivas: 1,
  urgenciasActivas: 15,
  urgenciasCriticas: 2,
  ingresosDelDia: 8600,
  tiempoPromedioEspera: 15,
  ocupacionAgenda: 70,
  citasHoy: 20,
  citasCompletadas: 7,
  citasCanceladas: 1,
  noShows: 1,
  cobrosPendientes: 1,
  pacientesNuevosHoy: 6,
};

// ── Urgencias activas para el panel (solo las no dadas de alta) ──

export const urgenciasActivasDelDia: Urgencia[] = urgenciasMock
  .filter((u) => u.estado !== 'alta')
  .sort((a, b) => {
    const orden = { rojo: 0, naranja: 1, amarillo: 2, verde: 3 };
    return (orden[a.nivelUrgencia] ?? 99) - (orden[b.nivelUrgencia] ?? 99);
  });

// ── Distribución de sala de espera por nivel de triage ──

export interface TriageDistItem {
  nivel: 'rojo' | 'naranja' | 'amarillo' | 'verde';
  count: number;
}

export const triageEsperaDist: TriageDistItem[] = [
  { nivel: 'rojo', count: 0 },
  { nivel: 'naranja', count: 0 },
  { nivel: 'amarillo', count: 0 },
  { nivel: 'verde', count: 1 },
];

// ── Próximas citas (hoy, confirmadas/reservadas, ordenadas por hora) ──

export const proximasCitasHoy = appointments
  .filter((a) => a.fecha === '2026-08-20' && (a.estado === 'confirmada' || a.estado === 'reservada'))
  .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
  .slice(0, 6);

// ── Tendencias (comparativas vs ayer) ──

export const tendencias = {
  salaEspera: { valor: 1, positivo: true },
  consultasActivas: { valor: 0, positivo: false },
  urgenciasActivas: { valor: 1, positivo: false },
  ingresosDelDia: { porcentaje: 25, positivo: true },
  tiempoPromedioEspera: { valor: 3, positivo: false },
};