import ModulePlaceholder from '@/components/feature/ModulePlaceholder';

export default function VigilanciaEpidemiologica() {
  return (
    <ModulePlaceholder
      testId="page-vigilancia"
      title="Vigilancia Epidemiológica"
      icon="ri-virus-line"
      description="Notificación de enfermedades de notificación obligatoria / SUIVE (NOM-017), alineada a DGIS/SINBA."
      reason="Sin casos simulados. Canal DGIS siempre en producto; destino y UI de vigilancia = Fase 4 / outbox."
      designNote="Readdy: casos SUIVE con filtros estado/tipo, alta, impresión y stats."
    />
  );
}
