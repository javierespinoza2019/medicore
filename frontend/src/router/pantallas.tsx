import { lazy, Suspense } from "react";
import CargandoPantalla from "@/components/feature/CargandoPantalla";

const AppLayout = lazy(() => import("@/components/feature/AppLayout"));

/** Envuelve una pantalla diferida con su estado de carga, para no dejar la vista en blanco. */
export function Pantalla({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<CargandoPantalla />}>{children}</Suspense>;
}

/** Pantalla diferida dentro del layout de la aplicación. */
export function EnApp({ children }: { children: React.ReactNode }) {
  return (
    <Pantalla>
      <AppLayout>{children}</AppLayout>
    </Pantalla>
  );
}
