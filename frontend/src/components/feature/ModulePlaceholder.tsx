import { useLocation } from 'react-router-dom';
import Card from '@/components/base/Card';

interface ModulePlaceholderProps {
  title?: string;
  icon?: string;
  description?: string;
  /** Motivo honesto: sin contrato API / fuera de fase / flag apagado. */
  reason?: string;
  testId?: string;
}

/**
 * Placeholder honesto: no inventa datos ni simula integración.
 * Usar en módulos sin API real en el build demo/staging.
 */
export default function ModulePlaceholder({
  title,
  icon,
  description,
  reason = 'Sin contrato API en esta fase. No se muestran datos inventados.',
  testId,
}: ModulePlaceholderProps) {
  const location = useLocation();
  const displayTitle = title || 'Módulo';
  const displayIcon = icon || 'ri-tools-line';
  const displayDesc =
    description || 'Este módulo estará disponible cuando exista integración real.';

  return (
    <div className="p-4 md:p-6" data-testid={testId}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground-900 font-heading">{displayTitle}</h1>
          <p className="text-sm text-foreground-500 mt-1">{location.pathname}</p>
        </div>
      </div>
      <Card padding="lg" className="max-w-lg mx-auto mt-12 text-center border-dashed border-secondary-300">
        <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-2xl bg-secondary-100 mb-5">
          <i className={`${displayIcon} text-3xl text-foreground-400`}></i>
        </div>
        <h2 className="text-lg font-semibold text-foreground-900 font-heading mb-2">{displayTitle}</h2>
        <p className="text-sm text-foreground-500 leading-relaxed">{displayDesc}</p>
        <p className="text-xs text-foreground-500 mt-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-4 py-2 inline-block">
          {reason}
        </p>
      </Card>
    </div>
  );
}
