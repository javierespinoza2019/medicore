/**
 * Reportes — sin agregados inventados. Dashboard operativo usa API real.
 */
import ModulePlaceholder from '@/components/feature/ModulePlaceholder';

export default function Reportes() {
  return (
    <ModulePlaceholder
      testId="page-reportes"
      title="Reportes"
      icon="ri-bar-chart-box-line"
      description="Reportes clínicos y financieros requieren módulo BI / agregados de solo lectura."
      reason="Sin mocks ni KPIs inventados. Use el panel operativo del dashboard para actividad del día."
    />
  );
}
