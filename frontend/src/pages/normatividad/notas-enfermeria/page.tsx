import ModulePlaceholder from '@/components/feature/ModulePlaceholder';

export default function NotasEnfermeria() {
  return (
    <ModulePlaceholder
      testId="page-notas-enfermeria"
      title="Notas de enfermería"
      icon="ri-nurse-line"
      description="Notas de enfermería se integrarán al módulo de notas clínicas cuando el contrato lo permita."
      reason="Sin notas inventadas. Notas médicas SOAP usan API real."
    />
  );
}
