import { useLogo } from '@/hooks/useAppSettings';

interface InstitucionalLogoProps {
  fallbackIcon?: string;
  fallbackClassName?: string;
  iconClassName?: string;
  imgClassName?: string;
}

// Muestra el logo institucional cargado por el usuario si existe; de lo contrario
// muestra el icono por defecto. Se usa en sidebar, login y reportes de impresión.
export default function InstitucionalLogo({
  fallbackIcon = 'ri-heart-pulse-line',
  fallbackClassName = 'w-14 h-14 rounded-xl bg-primary-500 text-white flex items-center justify-center flex-shrink-0 print:bg-gray-800',
  iconClassName = 'text-2xl',
  imgClassName = 'w-14 h-14 object-contain flex-shrink-0',
}: InstitucionalLogoProps) {
  const logo = useLogo();

  if (logo) {
    return <img src={logo} alt="Logo MediCore" className={imgClassName} />;
  }

  return (
    <div className={fallbackClassName}>
      <i className={`${fallbackIcon} ${iconClassName}`}></i>
    </div>
  );
}