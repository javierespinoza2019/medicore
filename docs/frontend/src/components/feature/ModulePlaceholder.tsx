import { useLocation } from 'react-router-dom';
import Card from '@/components/base/Card';

interface ModulePlaceholderProps {
  title?: string;
  icon?: string;
  description?: string;
}

export default function ModulePlaceholder({ title, icon, description }: ModulePlaceholderProps) {
  const location = useLocation();
  const displayTitle = title || 'Módulo';
  const displayIcon = icon || 'ri-tools-line';
  const displayDesc = description || 'Este módulo está en desarrollo y estará disponible próximamente.';

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground-900 font-heading">{displayTitle}</h1>
          <p className="text-sm text-foreground-500 mt-1">{location.pathname}</p>
        </div>
      </div>
      <Card padding="lg" className="max-w-lg mx-auto mt-20 text-center">
        <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-2xl bg-primary-50 mb-5">
          <i className={`${displayIcon} text-3xl text-primary-500`}></i>
        </div>
        <h2 className="text-lg font-semibold text-foreground-900 font-heading mb-2">{displayTitle}</h2>
        <p className="text-sm text-foreground-500 leading-relaxed">{displayDesc}</p>
        <p className="text-xs text-foreground-400 mt-4 bg-secondary-100 rounded-lg px-4 py-2 inline-block">
          Próximamente disponible en fases posteriores
        </p>
      </Card>
    </div>
  );
}