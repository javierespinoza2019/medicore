/**
 * Facturación CFDI — feature flag; sin timbrado simulado.
 */
import ModulePlaceholder from '@/components/feature/ModulePlaceholder';

export default function Facturacion() {
  return (
    <ModulePlaceholder
      testId="page-facturacion"
      title="Facturación CFDI"
      icon="ri-file-shield-2-line"
      description="CFDI 4.0 se emite vía outbox cuando el flag y el PAC estén configurados."
      reason="Sin comprobantes inventados ni simulación de timbrado."
    />
  );
}
