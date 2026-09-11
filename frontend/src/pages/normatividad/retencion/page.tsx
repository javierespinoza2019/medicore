import ModulePlaceholder from '@/components/feature/ModulePlaceholder';

export default function RetencionDocumental() {
  return (
    <ModulePlaceholder
      testId="page-retencion"
      title="Retención Documental"
      icon="ri-archive-line"
      description="Políticas de conservación de expedientes (NOM-004 5.4). Motor de retención = Fase 3."
      reason="Sin calendarios mock de destrucción. Decisión #61 (qué actos cuentan para el reloj) sigue abierta."
      designNote="Readdy: lista de políticas con plazo/norma/responsable y filtros; sin alta de políticas inventadas aquí."
      ctaHref="/app/seguridad/auditoria"
      ctaLabel="Ver Auditoría"
    />
  );
}
