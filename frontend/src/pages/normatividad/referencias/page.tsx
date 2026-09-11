import ModulePlaceholder from '@/components/feature/ModulePlaceholder';

export default function Referencias() {
  return (
    <ModulePlaceholder
      testId="page-referencias"
      title="Referencias / Contrarreferencias"
      icon="ri-arrow-left-right-line"
      description="Notas de referencia y contrarreferencia (NOM-004) como documento clínico estructurado."
      reason="Sin hojas mock. Existe noteType referencia_traslado en notas; el módulo de listado/impresión dedicado está pendiente."
      designNote="Readdy: filtros tipo/urgencia, alta con origen/destino/CIE/estudios/transporte e impresión."
      ctaHref="/app/consultas"
      ctaLabel="Ir a Consultas"
    />
  );
}
