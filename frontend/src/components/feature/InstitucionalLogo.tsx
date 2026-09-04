import { useBrandLogo } from '@/hooks/useBrandLogo';
import { useAuth } from '@/hooks/useAuth';

interface InstitucionalLogoProps {
  fallbackIcon?: string;
  fallbackClassName?: string;
  iconClassName?: string;
  imgClassName?: string;
  /** Si se omite, usa la sucursal actual de la sesión (fallback tenant en API). */
  branchId?: string | null;
}

/** Logo desde API (tenant / branch). Sin sesión o sin archivo → icono por defecto. */
export default function InstitucionalLogo({
  fallbackIcon = 'ri-heart-pulse-line',
  fallbackClassName = 'w-14 h-14 rounded-xl bg-primary-500 text-white flex items-center justify-center flex-shrink-0 print:bg-gray-800',
  iconClassName = 'text-2xl',
  imgClassName = 'w-14 h-14 object-contain flex-shrink-0',
  branchId,
}: InstitucionalLogoProps) {
  const { sucursalActualId } = useAuth();
  const effectiveBranchId = branchId === undefined ? sucursalActualId : branchId;
  const logo = useBrandLogo(effectiveBranchId);

  if (logo) {
    return <img src={logo} alt="Logo institucional" className={imgClassName} />;
  }

  return (
    <div className={fallbackClassName}>
      <i className={`${fallbackIcon} ${iconClassName}`}></i>
    </div>
  );
}
