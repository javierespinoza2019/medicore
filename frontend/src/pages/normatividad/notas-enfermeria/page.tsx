import ModulePlaceholder from '@/components/feature/ModulePlaceholder';

export default function NotasEnfermeria() {
  return (
    <ModulePlaceholder
      testId="page-notas-enfermeria"
      title="Notas de Enfermería"
      icon="ri-nurse-line"
      description="NOM-004 Art. 6.3.4 — cuidados por turno. El tipo noteType=enfermeria ya existe en la API de notas clínicas."
      reason="Sin listado global mock. La captura se hace en el contexto del encuentro (Consultas / Urgencias); no hay endpoint de listado por tipo aún."
      designNote="Readdy: lista por turno/estado, alta con EVA/vitales/cuidados e impresión."
      ctaHref="/app/consultas"
      ctaLabel="Ir a Consultas"
    />
  );
}
