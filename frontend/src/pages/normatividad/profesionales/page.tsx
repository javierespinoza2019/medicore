import ModulePlaceholder from '@/components/feature/ModulePlaceholder';

export default function GestionProfesionales() {
  return (
    <ModulePlaceholder
      testId="page-normatividad-profesionales"
      title="Gestión normativa de profesionales"
      icon="ri-stethoscope-line"
      description="El catálogo operativo de médicos está en Administración → Médicos (API)."
      reason="Sin padrón normativo mock. Use /app/administracion/medicos."
    />
  );
}
