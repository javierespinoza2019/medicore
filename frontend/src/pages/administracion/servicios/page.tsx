/**
 * Servicios — sin persistencia. Placeholder honesto (prototipo Readdy usaba mocks).
 * No se inventa catálogo de tarifas / IVA (doc 06 §7/§67).
 */
import ModulePlaceholder from '@/components/feature/ModulePlaceholder';

export default function AdminServicios() {
  return (
    <div className="space-y-4">
      <ModulePlaceholder
        testId="page-admin-servicios"
        title="Servicios"
        icon="ri-price-tag-3-line"
        description="Catálogo de servicios y tarifas (código, especialidad, tipo, precio, duración) cuando exista persistencia y decisión fiscal."
        reason="Sin mocks. El prototipo Readdy usaba datos locales; Appointment.ServiceCode sigue siendo texto libre. IVA / tarifas = doc 06."
      />
      <div className="mx-auto max-w-lg rounded-lg border border-dashed border-secondary-200 bg-background-50 px-4 py-3 text-xs text-foreground-500">
        <p className="font-medium text-foreground-700 mb-1">Diseño original (referencia)</p>
        <p>
          Tabla con Código, Servicio, Especialidad, Tipo, Precio MXN, Duración, Estado + modal de
          alta. Se implementará al existir SP/API y reglas de IVA escritas — no antes.
        </p>
      </div>
    </div>
  );
}
