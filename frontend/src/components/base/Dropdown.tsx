import { useState, useRef, useEffect, type ReactNode } from 'react';

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export default function Dropdown({ trigger, children, align = 'left', className = '' }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        {trigger}
      </div>
      {open && (
        <div
          className={`absolute z-40 mt-2 bg-background-50 border border-secondary-200 rounded-xl py-1.5 min-w-[180px] transition-base ${align === 'right' ? 'right-0' : 'left-0'} ${className}`}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface DropdownItemProps {
  children: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  icon?: string;
  className?: string;
}

export function DropdownItem({ children, onClick, danger = false, icon, className = '' }: DropdownItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-medium text-left transition-base cursor-pointer whitespace-nowrap ${danger ? 'text-red-500 hover:bg-red-500/10' : 'text-foreground-700 hover:bg-secondary-100'} ${className}`}
    >
      {icon && (
        <span className="w-4 h-4 flex items-center justify-center">
          <i className={`${icon} text-sm`}></i>
        </span>
      )}
      {children}
    </button>
  );
}

export function DropdownDivider() {
  return <div className="my-1 border-t border-secondary-200"></div>;
}