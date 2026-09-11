/**
 * Caja y cobros — Fase 2. Sin transacciones inventadas.
 * Readdy: sesión abierta, pendientes de consulta, cobro manual, recibo, cierre.
 */
import ModulePlaceholder from '@/components/feature/ModulePlaceholder';

export default function Caja() {
  return (
    <ModulePlaceholder
      testId="page-caja"
      title="Caja y cobros"
      icon="ri-cash-line"
      description="Cobros del día, recibos provisionales (no fiscales) y sesión de caja por dispositivo/estación."
      reason="Sin contrato API de caja en esta fase. No se inventan cobros, saldos ni fondo de apertura. Cobro offline permitido (doc 06) cuando exista persistencia + cola."
      designNote="Readdy: header de sesión (apertura/cierre, fondo, totales efectivo/tarjeta/transferencia), pestañas Pendientes de cobro vs Cobro manual (servicios + descuento + método mixto), listado de transacciones del día, modal de recibo e impresión, modal de cierre de caja con arqueo."
      ctaHref="/app/consultas"
      ctaLabel="Ir a Consultas"
    />
  );
}
