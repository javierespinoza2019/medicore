import { useState } from 'react';
import OperativosTab from './components/OperativosTab';
import ClinicosTab from './components/ClinicosTab';
import FinancierosTab from './components/FinancierosTab';

type TabKey = 'operativos' | 'clinicos' | 'financieros';

const tabs: { key: TabKey; label: string; icon: string }[] = [
  { key: 'operativos', label: 'Operativos', icon: 'ri-calendar-check-line' },
  { key: 'clinicos', label: 'Clínicos', icon: 'ri-stethoscope-line' },
  { key: 'financieros', label: 'Financieros', icon: 'ri-money-dollar-circle-line' },
];

export default function Reportes() {
  const [tab, setTab] = useState<TabKey>('operativos');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground-900 font-heading">Reportes</h1>
          <p className="text-sm text-foreground-500 mt-0.5">
            Indicadores operativos, clínicos y financieros del sistema.
          </p>
        </div>
      </div>

      {/* Segmented control */}
      <div className="inline-flex items-center rounded-full border border-secondary-200 bg-background-50 p-1">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-base cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-primary-500 text-background-50 dark:text-foreground-950'
                  : 'text-foreground-600 hover:text-foreground-800'
              }`}
            >
              <i className={`${t.icon} text-sm`}></i>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Active tab */}
      {tab === 'operativos' && <OperativosTab />}
      {tab === 'clinicos' && <ClinicosTab />}
      {tab === 'financieros' && <FinancierosTab />}
    </div>
  );
}