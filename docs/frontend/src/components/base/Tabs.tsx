import { type ReactNode, type KeyboardEvent, useRef } from 'react';

interface Tab {
  key: string;
  label: string;
  icon?: string;
  badge?: number;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (key: string) => void;
  className?: string;
  variant?: 'default' | 'pills';
  id?: string;
  ariaLabel?: string;
}

export default function Tabs({
  tabs,
  activeTab,
  onChange,
  className = '',
  variant = 'default',
  id = 'tabs',
  ariaLabel,
}: TabsProps) {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys = tabs.map((t) => t.key);
    const currentIndex = keys.indexOf(activeTab);
    let nextIndex: number | null = null;

    if (e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % keys.length;
    else if (e.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + keys.length) % keys.length;
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = keys.length - 1;

    if (nextIndex !== null && nextIndex !== currentIndex) {
      e.preventDefault();
      const nextKey = keys[nextIndex];
      onChange(nextKey);
      tabRefs.current[nextKey]?.focus();
    }
  };

  const tabListClass =
    variant === 'pills'
      ? `inline-flex items-center bg-secondary-100 rounded-full px-1 py-1 ${className}`
      : `flex items-center gap-0 border-b border-secondary-200 ${className}`;

  const tabClass = (tab: Tab) =>
    variant === 'pills'
      ? `inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-full transition-base whitespace-nowrap cursor-pointer ${
          activeTab === tab.key
            ? 'bg-background-50 text-foreground-900'
            : 'text-foreground-600 hover:text-foreground-800'
        }`
      : `inline-flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-base cursor-pointer border-b-2 -mb-[1px] ${
          activeTab === tab.key
            ? 'border-primary-500 text-primary-600'
            : 'border-transparent text-foreground-500 hover:text-foreground-800 hover:border-secondary-300'
        }`;

  return (
    <div role="tablist" aria-label={ariaLabel} onKeyDown={handleKeyDown} className={tabListClass}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          ref={(el) => {
            tabRefs.current[tab.key] = el;
          }}
          role="tab"
          id={`${id}-tab-${tab.key}`}
          aria-selected={activeTab === tab.key}
          aria-controls={`${id}-panel-${tab.key}`}
          tabIndex={activeTab === tab.key ? 0 : -1}
          onClick={() => onChange(tab.key)}
          className={tabClass(tab)}
        >
          {tab.icon && (
            <span className="w-4 h-4 flex items-center justify-center" aria-hidden="true">
              <i className={`${tab.icon} text-sm`}></i>
            </span>
          )}
          {tab.label}
          {tab.badge !== undefined && (
            <span className="ml-1 px-1.5 py-0.5 text-2xs font-semibold rounded-full bg-primary-500 text-white">
              {tab.badge}
            </span>
          )}
          {tab.count !== undefined && (
            <span
              className={`ml-1 px-1.5 py-0.5 text-2xs font-semibold rounded-full ${
                activeTab === tab.key ? 'bg-primary-100 text-primary-700' : 'bg-secondary-100 text-secondary-600'
              }`}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}