import { type ReactNode } from 'react';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeStyles = {
  xs: 'w-6 h-6 text-2xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getColorFromName(name: string): string {
  const colors = [
    'bg-primary-500 text-white',
    'bg-accent-500 text-white',
    'bg-emerald-500 text-white',
    'bg-amber-500 text-white',
    'bg-rose-500 text-white',
    'bg-violet-500 text-white',
    'bg-sky-500 text-white',
    'bg-teal-500 text-white',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  if (src) {
    return (
      <div className={`${sizeStyles[size]} rounded-full overflow-hidden flex-shrink-0 ${className}`}>
        <img src={src} alt={name} className="w-full h-full object-cover object-top" />
      </div>
    );
  }

  return (
    <div className={`${sizeStyles[size]} rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${getColorFromName(name)} ${className}`}>
      {getInitials(name)}
    </div>
  );
}