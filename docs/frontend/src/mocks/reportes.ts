import { appointments } from './appointments';
import { consultas } from './consultas';
import { recetas } from './recetas';
import { estudios } from './estudios';
import { todayTransactions, cortesHistorial, currentSession } from './caja';
import { sucursales } from './branches';
import { doctors } from './doctors';

const today = '2026-08-20';

function currency(n: number): string {
  return `$${n.toLocaleString('es-MX')}`;
}

// ── Utilidades ──

function parseDiagnostico(d: string): { codigo: string; descripcion: string } {
  const idx = d.indexOf(' - ');
  if (idx === -1) return { codigo: d, descripcion: '' };
  return { codigo: d.slice(0, idx), descripcion: d.slice(idx + 3) };
}

// ── OPERATIVOS ──

export interface CitaPorSucursal {
  sucursalId: string;
  sucursal: string;
  total: number;
  atendidas: number;
  enEspera: number;
  canceladas: number;
  noAcudio: number;
}

export interface AtencionPorMedico {
  doctorId: string;
  doctor: string;
  especialidad: string;
  atendidas: number;
  enCurso: number;
}

export const reportesOperativos = (() => {
  const citasHoy = appointments.filter((a) => a.fecha === today);

  const atendidas = citasHoy.filter((a) => a.estado === 'atendida').length;
  const enEspera = citasHoy.filter((a) => ['en_espera', 'llego', 'llamando', 'en_triage'].includes(a.estado)).length;
  const enConsulta = citasHoy.filter((a) => a.estado === 'en_consulta').length;
  const canceladas = citasHoy.filter((a) => a.estado === 'cancelada').length;
  const noAcudio = citasHoy.filter((a) => a.estado === 'no_acudio').length;

  const total = citasHoy.length;
  const tasaAtencion = atendidas + noAcudio + canceladas > 0
    ? Math.round((atendidas / (atendidas + noAcudio + canceladas)) * 100)
    : 0;
  const ocupacion = total > 0 ? Math.round(((atendidas + enConsulta + enEspera) / total) * 100) : 0;

  const citasPorSucursal: CitaPorSucursal[] = sucursales
    .filter((s) => s.activo)
    .map((s) => {
      const citas = citasHoy.filter((a) => a.sucursalId === s.id);
      return {
        sucursalId: s.id,
        sucursal: s.nombre,
        total: citas.length,
        atendidas: citas.filter((a) => a.estado === 'atendida').length,
        enEspera: citas.filter((a) => ['en_espera', 'llego', 'llamando', 'en_triage', 'en_consulta'].includes(a.estado)).length,
        canceladas: citas.filter((a) => a.estado === 'cancelada').length,
        noAcudio: citas.filter((a) => a.estado === 'no_acudio').length,
      };
    })
    .sort((a, b) => b.total - a.total);

  const atencionPorMedico: AtencionPorMedico[] = doctors
    .filter((d) => d.status === 'activo')
    .map((d) => {
      const citasDoctor = citasHoy.filter((a) => a.doctorId === d.id);
      return {
        doctorId: d.id,
        doctor: d.nombre,
        especialidad: d.especialidad,
        atendidas: citasDoctor.filter((a) => a.estado === 'atendida').length,
        enCurso: citasDoctor.filter((a) => a.estado === 'en_consulta').length,
      };
    })
    .sort((a, b) => b.atendidas - a.atendidas);

  return {
    kpis: {
      citasHoy: total,
      atendidas,
      enEspera,
      enConsulta,
      canceladas,
      noAcudio,
      tasaAtencion,
      ocupacion,
    },
    citasPorSucursal,
    atencionPorMedico,
  };
})();

// ── CLÍNICOS ──

export interface TopDiagnostico {
  codigo: string;
  descripcion: string;
  total: number;
}

export interface ConteoPorCategoria {
  categoria: string;
  total: number;
}

export const reportesClinicos = (() => {
  const consultasHoy = consultas.filter((c) => c.fecha === today);
  const completadas = consultasHoy.filter((c) => c.estado === 'completada').length;
  const recetasEmitidas = recetas.length;
  const estudiosSolicitados = estudios.length;
  const estudiosCompletados = estudios.filter((e) => e.estado === 'completado').length;

  // Top diagnósticos (CIE-10) por frecuencia
  const diagnosticoMap = new Map<string, { codigo: string; descripcion: string; total: number }>();
  consultasHoy.forEach((c) => {
    if (!c.diagnosticoPrincipal) return;
    const { codigo, descripcion } = parseDiagnostico(c.diagnosticoPrincipal);
    const key = codigo || descripcion;
    if (!key) return;
    const prev = diagnosticoMap.get(key);
    if (prev) prev.total += 1;
    else diagnosticoMap.set(key, { codigo, descripcion, total: 1 });
  });
  const topDiagnosticos: TopDiagnostico[] = Array.from(diagnosticoMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  // Consultas por especialidad
  const espMap = new Map<string, number>();
  consultasHoy.forEach((c) => {
    espMap.set(c.especialidad, (espMap.get(c.especialidad) || 0) + 1);
  });
  const consultasPorEspecialidad: ConteoPorCategoria[] = Array.from(espMap.entries())
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total);

  // Estudios por tipo
  const tipoMap = new Map<string, number>();
  estudios.forEach((e) => {
    tipoMap.set(e.tipo, (tipoMap.get(e.tipo) || 0) + 1);
  });
  const tipoLabels: Record<string, string> = {
    laboratorio: 'Laboratorio',
    imagen: 'Imagen',
    gabinete: 'Gabinete',
    patologia: 'Patología',
    otro: 'Otro',
  };
  const estudiosPorTipo: ConteoPorCategoria[] = Array.from(tipoMap.entries())
    .map(([categoria, total]) => ({ categoria: tipoLabels[categoria] || categoria, total }))
    .sort((a, b) => b.total - a.total);

  return {
    kpis: {
      consultasHoy: consultasHoy.length,
      completadas,
      recetasEmitidas,
      estudiosSolicitados,
      estudiosCompletados,
    },
    topDiagnosticos,
    consultasPorEspecialidad,
    estudiosPorTipo,
  };
})();

// ── FINANCIEROS ──

export interface IngresoPorServicio {
  servicio: string;
  transacciones: number;
  total: number;
}

export const reportesFinancieros = (() => {
  const efectivo = currentSession.totalEfectivo;
  const tarjeta = currentSession.totalTarjeta;
  const transferencia = currentSession.totalTransferencia;
  const totalIngresos = currentSession.totalIngresos;

  // Ingresos por servicio (concepto)
  const servicioMap = new Map<string, { transacciones: number; total: number }>();
  todayTransactions
    .filter((t) => t.estado === 'pagado')
    .forEach((t) => {
      const key = t.concepto;
      const prev = servicioMap.get(key) || { transacciones: 0, total: 0 };
      prev.transacciones += 1;
      prev.total += t.total;
      servicioMap.set(key, prev);
    });
  const ingresosPorServicio: IngresoPorServicio[] = Array.from(servicioMap.entries())
    .map(([servicio, v]) => ({ servicio, transacciones: v.transacciones, total: v.total }))
    .sort((a, b) => b.total - a.total);

  const cortes = cortesHistorial.map((c) => ({
    id: c.id,
    fecha: c.fecha,
    usuario: c.usuario,
    totalIngresos: c.totalIngresos,
    transacciones: c.cantidadTransacciones,
    diferencia: c.diferencia,
  }));

  return {
    kpis: {
      totalIngresos,
      efectivo,
      tarjeta,
      transferencia,
      transacciones: currentSession.cantidadTransacciones,
      cobrosPendientes: 1,
    },
    ingresosPorServicio,
    cortes,
  };
})();

export { currency };