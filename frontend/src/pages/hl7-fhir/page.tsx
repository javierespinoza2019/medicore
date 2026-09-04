/**
 * HL7 FHIR — flag de plataforma; sin cliente FE ni simulación engañosa.
 */
import ModulePlaceholder from '@/components/feature/ModulePlaceholder';

export default function Hl7Fhir() {
  return (
    <ModulePlaceholder
      testId="page-hl7-fhir"
      title="HL7 FHIR"
      icon="ri-share-circle-line"
      description="Interoperabilidad FHIR R4 se habilitará cuando el flag e integración real estén activos."
      reason="Sin mensajes ni servidores simulados. No se afirma intercambio clínico."
    />
  );
}
