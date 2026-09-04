/**
 * Catálogos CIE/estudios/medicamentos — sin API de catálogo clínico completa.
 */
import ModulePlaceholder from '@/components/feature/ModulePlaceholder';

export default function AdminCatalogos() {
  return (
    <ModulePlaceholder
      testId="page-admin-catalogos"
      title="Catálogos"
      icon="ri-book-2-line"
      description="CIE-10, estudios y medicamentos se administrarán cuando exista contrato de catálogo."
      reason="Sin formularios mock. Recetas usan catálogo de prescritir en API."
    />
  );
}
