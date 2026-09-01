import { type ButtonHTMLAttributes, type ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger' | 'success' | 'warning' | 'info';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-400 active:bg-primary-700',
  secondary: 'bg-secondary-100 text-secondary-800 hover:bg-secondary-200 focus:ring-secondary-300 active:bg-secondary-300',
  accent: 'bg-accent-500 text-white hover:bg-accent-600 focus:ring-accent-400 active:bg-accent-700',
  ghost: 'bg-transparent text-foreground-700 hover:bg-secondary-100 focus:ring-secondary-300 active:bg-secondary-200',
  danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-400 active:bg-red-700',
  success: 'bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-emerald-400 active:bg-emerald-700',
  warning: 'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-400 active:bg-amber-700',
  info: 'bg-sky-500 text-white hover:bg-sky-600 focus:ring-sky-400 active:bg-sky-700',
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'px-2.5 py-1 text-2xs gap-1 rounded-md',
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-md',
  md: 'px-4 py-2 text-sm gap-2 rounded-md',
  lg: 'px-5 py-2.5 text-base gap-2 rounded-md',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium whitespace-nowrap transition-base cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 flex items-center justify-center">
          <i className="ri-loader-4-line animate-spin"></i>
        </span>
      ) : icon ? (
        <span className="w-4 h-4 flex items-center justify-center">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}