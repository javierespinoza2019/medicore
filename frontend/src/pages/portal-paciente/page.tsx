/**
 * Portal paciente — no exponer PHI sintético en build demo.
 */
import ModulePlaceholder from '@/components/feature/ModulePlaceholder';

export default function PortalPaciente() {
  return (
    <ModulePlaceholder
      testId="page-portal-paciente"
      title="Portal del paciente"
      icon="ri-user-heart-line"
      description="El portal público se habilitará con autenticación e identidad reales."
      reason="Sin expediente ni citas inventadas en el navegador."
    />
  );
}
