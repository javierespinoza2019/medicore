import ModulePlaceholder from '@/components/feature/ModulePlaceholder';

export default function Egresos() {
  return (
    <ModulePlaceholder
      testId="page-egresos"
      title="Egresos"
      icon="ri-logout-box-r-line"
      description="Egreso hospitalario fuera del alcance ambulatorio+urgencias F1–4."
      reason="Sin egresos inventados."
    />
  );
}
