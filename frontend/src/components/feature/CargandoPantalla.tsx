/**
 * Estado de carga de una pantalla diferida. Evita la vista en blanco mientras
 * llega el fragmento de la ruta (carga por ruta, doc 12 §3: arranque rápido en estación).
 */
export default function CargandoPantalla() {
  return (
    <div
      className="w-full h-full min-h-[240px] flex flex-col items-center justify-center gap-3 py-16 text-foreground-500"
      role="status"
      aria-live="polite"
    >
      <span className="w-6 h-6 flex items-center justify-center">
        <i className="ri-loader-4-line text-xl animate-spin"></i>
      </span>
      <p className="text-sm">Cargando pantalla…</p>
    </div>
  );
}
