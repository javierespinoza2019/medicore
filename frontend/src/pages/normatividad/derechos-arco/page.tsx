import ModulePlaceholder from '@/components/feature/ModulePlaceholder';

export default function DerechosARCO() {
  return (
    <ModulePlaceholder
      testId="page-derechos-arco"
      title="Derechos ARCO"
      icon="ri-shield-keyhole-line"
      description="Solicitudes de Acceso, Rectificación, Cancelación y Oposición con bitácora y plazos legales."
      reason="Sin trámites inventados. Requiere API de solicitudes + política del establecimiento."
      designNote="Readdy: stats, filtros por tipo ARCO/estado, alta con medio de respuesta e impresión. No portar mocks."
      ctaHref="/app/seguridad/auditoria"
      ctaLabel="Ver Auditoría"
    />
  );
}
