/**
 * Cortes de caja — depende de sesiones/transacciones persistidas (Fase 2).
 */
import ModulePlaceholder from '@/components/feature/ModulePlaceholder';

export default function CortesCaja() {
  return (
    <ModulePlaceholder
      testId="page-caja-cortes"
      title="Cortes de caja"
      icon="ri-file-chart-line"
      description="Historial de cierres, conciliación por método de pago y exportación cuando exista corte durable."
      reason="Sin mocks de cortes. Requiere API de sesión de caja + transacciones; en contingencia el corte es por dispositivo (doc 06)."
      designNote="Readdy: stats (cortes, transacciones, efectivo/tarjeta/transferencia, diferencia), filtros mes/usuario, tabla expandible con arqueo, export Excel."
      ctaHref="/app/caja"
      ctaLabel="Ver Caja"
    />
  );
}
