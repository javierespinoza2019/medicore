/**
 * Facturación CFDI — feature flag + PAC; sin timbrado simulado.
 */
import ModulePlaceholder from '@/components/feature/ModulePlaceholder';

export default function Facturacion() {
  return (
    <ModulePlaceholder
      testId="page-facturacion"
      title="Facturación CFDI"
      icon="ri-file-shield-2-line"
      description="Comprobantes CFDI 4.0 vía outbox cuando el flag y el PAC estén configurados (Fase 2)."
      reason="Sin comprobantes inventados ni simulación de UUID/sello SAT. Fallos de timbrado no deben tumbar la consulta (outbox). IVA en servicios médicos = decisión abierta doc 06 §7/§67."
      designNote="Readdy: listado vigente/cancelada, stats de facturado e IVA, alta desde cobro (?trx=) con catálogos SAT (uso CFDI, forma/método de pago, régimen), impresión y cancelación mock — no portar."
      ctaHref="/app/caja"
      ctaLabel="Ver Caja"
    />
  );
}
