/**
 * Caja — cobros offline/API pendientes; sin transacciones inventadas.
 */
import ModulePlaceholder from '@/components/feature/ModulePlaceholder';

export default function Caja() {
  return (
    <ModulePlaceholder
      testId="page-caja"
      title="Caja y cobros"
      icon="ri-cash-line"
      description="Cobros, recibos provisionales y corte por dispositivo requieren contrato de caja."
      reason="Sin mocks de caja. No se inventan cobros ni saldos."
    />
  );
}
