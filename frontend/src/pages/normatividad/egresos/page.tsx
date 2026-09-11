import ModulePlaceholder from '@/components/feature/ModulePlaceholder';

export default function Egresos() {
  return (
    <ModulePlaceholder
      testId="page-egresos"
      title="Hojas de Egreso"
      icon="ri-logout-box-line"
      description="Nota de egreso hospitalario (NOM-004) fuera del alcance F1–4 (ambulatorio + urgencias)."
      reason="Sin egresos inventados. noteType egreso existe en API de notas para usos clínicos puntuales; no hay módulo hospitalario."
      designNote="Readdy: listado hospitalario con destino de alta, filtros e impresión de hoja completa."
    />
  );
}
