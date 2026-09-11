import ModulePlaceholder from '@/components/feature/ModulePlaceholder';

export default function Consentimientos() {
  return (
    <ModulePlaceholder
      testId="page-consentimientos"
      title="Consentimientos Informados"
      icon="ri-file-list-3-line"
      description="Registro de consentimiento bajo información (NOM-004) ligado al expediente cuando exista contrato."
      reason="Sin formularios ni listados mock. No se afirma cumplimiento LFPDPPP/NOM solo por esta pantalla."
      designNote="El prototipo tenía stats, filtros por tipo/estado, alta con riesgos/beneficios/alternativas, firma de paciente/testigo e impresión. Eso requiere persistencia en expediente — pendiente."
      ctaHref="/app/pacientes"
      ctaLabel="Ir a Pacientes"
    />
  );
}
