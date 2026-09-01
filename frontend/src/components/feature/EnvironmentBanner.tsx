import {
  environmentLabels,
  environmentName,
  isDemo,
  showEnvironmentBanner,
} from '@/config/environment';

const toneByEnvironment: Record<string, string> = {
  development: 'bg-slate-700 text-white',
  qa: 'bg-amber-500 text-black',
  production: 'bg-red-700 text-white',
};

/**
 * Franja de ambiente. Evita que alguien capture un paciente real
 * en un ambiente sin PHI (dev/QA/demo).
 */
export function EnvironmentBanner() {
  if (!showEnvironmentBanner) return null;

  const tone = toneByEnvironment[environmentName] ?? toneByEnvironment.development;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="environment-banner"
      className={`w-full px-3 py-1 text-center text-xs font-semibold tracking-wide ${tone}`}
    >
      Ambiente: {environmentLabels[environmentName]}
      {isDemo && ' · Datos sintéticos: no capture pacientes reales'}
    </div>
  );
}

export default EnvironmentBanner;
