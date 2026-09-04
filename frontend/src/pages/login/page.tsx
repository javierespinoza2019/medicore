import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { ApiFailure } from '@/api/errors';
import { AvisoDeFalla } from '@/components/feature/EstadoEnlace';
import InstitucionalLogo from '@/components/feature/InstitucionalLogo';

export default function Login() {
  const navigate = useNavigate();
  const { login, sessionFailure } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aviso, setAviso] = useState('');
  const [failure, setFailure] = useState<ApiFailure | null>(null);

  // Si al arrancar no se pudo preguntar por la sesión, el usuario lo sabe antes de intentar.
  const fallaVisible = failure ?? sessionFailure;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAviso('');
    setFailure(null);

    if (!email.trim() || !password) {
      setAviso('Ingresa tu usuario y tu contraseña.');
      return;
    }

    setLoading(true);
    try {
      const resultado = await login(email.trim(), password);
      if (resultado.ok) {
        navigate('/app/dashboard');
      } else {
        setFailure(resultado.failure ?? { kind: 'error_servidor' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background-50">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] relative overflow-hidden bg-primary-900">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-800 via-primary-900 to-primary-950"></div>
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, oklch(1 0 0 / 0.3) 0%, transparent 50%), radial-gradient(circle at 75% 75%, oklch(var(--accent-500) / 0.3) 0%, transparent 50%)',
        }}></div>
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'linear-gradient(oklch(1 0 0 / 0.4) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.4) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}></div>
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          <div>
            <div className="mb-8">
              <InstitucionalLogo
                fallbackIcon="ri-heart-pulse-line"
                fallbackClassName="w-12 h-12 flex items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm"
                iconClassName="text-2xl text-white"
                imgClassName="w-12 h-12 object-contain rounded-xl"
              />
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold text-white font-heading tracking-tight leading-tight">
              MediCore
            </h1>
            <p className="mt-3 text-lg text-white/80 font-heading">
              Plataforma Integral de Gestion Clinica
            </p>
            <p className="mt-8 text-sm text-white/75 leading-relaxed max-w-sm">
              Sistema de administracion clinica de nueva generacion. Disenado para optimizar cada aspecto de la atencion al paciente con tecnologia de vanguardia.
            </p>
          </div>
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-white/75">
                <span className="w-5 h-5 flex items-center justify-center"><i className="ri-shield-check-line text-sm"></i></span>
                <span className="text-xs">Cifrado AES-256</span>
              </div>
              <div className="flex items-center gap-2 text-white/75">
                <span className="w-5 h-5 flex items-center justify-center"><i className="ri-lock-line text-sm"></i></span>
                <span className="text-xs">Acceso seguro</span>
              </div>
              <div className="flex items-center gap-2 text-white/75">
                <span className="w-5 h-5 flex items-center justify-center"><i className="ri-fingerprint-line text-sm"></i></span>
                <span className="text-xs">2FA disponible</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-white/70">
              <div className="h-px flex-1 bg-white/10"></div>
              <span className="text-2xs uppercase tracking-widest">Cumplimiento</span>
              <div className="h-px flex-1 bg-white/10"></div>
            </div>
            <div className="flex gap-4">
              <span className="px-3 py-1.5 text-2xs font-medium text-white/75 bg-white/5 rounded-full border border-white/10">HIPAA Ready</span>
              <span className="px-3 py-1.5 text-2xs font-medium text-white/75 bg-white/5 rounded-full border border-white/10">NOM-024-SSA3</span>
              <span className="px-3 py-1.5 text-2xs font-medium text-white/75 bg-white/5 rounded-full border border-white/10">ISO 27001</span>
            </div>
            <p className="text-2xs text-white/70">&copy; 2026 MediCore. Todos los derechos reservados.</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[440px]">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10 text-center">
            <div className="mb-4 flex justify-center">
              <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-primary-500">
                <i className="ri-heart-pulse-line text-2xl text-white"></i>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground-900 font-heading">MediCore</h1>
            <p className="text-sm text-slate-700 mt-1">Plataforma de Gestion Clinica</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground-900 font-heading">Iniciar Sesion</h2>
            <p className="text-sm text-slate-700 mt-1.5">Ingresa tus credenciales para acceder al sistema</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {fallaVisible && <AvisoDeFalla failure={fallaVisible} />}

            {aviso && (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <span className="w-4 h-4 flex items-center justify-center text-red-500 flex-shrink-0">
                  <i className="ri-error-warning-line text-sm"></i>
                </span>
                <p className="text-sm text-red-700">{aviso}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground-700 mb-1.5">Usuario o Email</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-slate-600 pointer-events-none">
                  <i className="ri-user-line text-sm"></i>
                </span>
                <input
                  type="text"
                  placeholder="usuario@medicore.mx"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  className="w-full pl-10 pr-3 py-2.5 bg-background-50 border border-secondary-200 rounded-lg text-sm text-foreground-900 placeholder:text-slate-500 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground-700 mb-1.5">Contrasena</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-slate-600 pointer-events-none">
                  <i className="ri-lock-line text-sm"></i>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-background-50 border border-secondary-200 rounded-lg text-sm text-foreground-900 placeholder:text-slate-500 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  <i className={`${showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} text-sm`} aria-hidden="true"></i>
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-secondary-300 text-primary-500 focus:ring-primary-400 cursor-pointer"
              />
              <span className="text-sm text-foreground-600">Recordarme</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-base cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              {loading ? (
                <><i className="ri-loader-4-line animate-spin"></i> Accediendo...</>
              ) : (
                <>Acceder al Sistema</>
              )}
            </button>
          </form>



          <div className="mt-8 pt-6 border-t border-secondary-200 space-y-4">
            <button
              type="button"
              onClick={() => navigate('/portal-paciente')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-foreground-600 hover:text-foreground-800 hover:bg-secondary-100 border border-secondary-200 rounded-lg transition-base cursor-pointer whitespace-nowrap"
            >
              <i className="ri-user-heart-line"></i> Portal del Paciente
            </button>
            <div className="flex items-center gap-3 text-xs text-slate-700" data-testid="login-footer-secure">
              <span className="w-4 h-4 flex items-center justify-center text-slate-700">
                <i className="ri-shield-check-line text-xs" aria-hidden="true"></i>
              </span>
              <span>Sesion segura protegida con cifrado de extremo a extremo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}