import { type ReactNode } from 'react';

type BadgeVariant = 'primary' | 'accent' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-primary-100 text-primary-800',
  accent: 'bg-accent-100 text-accent-800',
  secondary: 'bg-secondary-100 text-secondary-800',
  success: 'bg-emerald-500/15 text-emerald-500',
  warning: 'bg-amber-500/15 text-amber-500',
  danger: 'bg-red-500/15 text-red-500',
  info: 'bg-sky-500/15 text-sky-500',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-2xs',
  md: 'px-2.5 py-1 text-xs',
};

export default function Badge({ children, variant = 'secondary', size = 'sm', dot = false, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 font-medium rounded-full whitespace-nowrap ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 flex-shrink-0"></span>}
      {children}
    </span>
  );
}