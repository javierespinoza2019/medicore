import { useEffect, useState } from 'react';
import type { AgendaConsultorio } from '@/pages/agenda/consultorioTypes';
import type { ReglaBloqueo } from '@/pages/agenda/agendaRulesTypes';
import Tabs from '@/components/base/Tabs';
import ConsultoriosTab from '@/pages/agenda/components/ConsultoriosTab';
import ReglasBloqueoTab from '@/pages/agenda/components/ReglasBloqueoTab';

interface AgendaConfigModalProps {
  open: boolean;
  onClose: () => void;
  consultorios: AgendaConsultorio[];
  branchId: string | null;
  onUpsertRoom: (input: {
    roomId?: string;
    code: string;
    name: string;
    isActive: boolean;
    specialtyId?: string | null;
    professionalIds?: string[];
  }) => Promise<boolean>;
  reglasBloqueo: ReglaBloqueo[];
  defaultFecha: string;
  onReloadBlocks: () => Promise<void>;
}

export default function AgendaConfigModal({
  open,
  onClose,
  consultorios,
  branchId,
  onUpsertRoom,
  reglasBloqueo,
  defaultFecha,
  onReloadBlocks,
}: AgendaConfigModalProps) {
  const [tab, setTab] = useState('consultorios');

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 transition-base" aria-hidden="true" onClick={onClose}></div>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Configuración de agenda"
        tabIndex={-1}
        className="relative w-full max-w-3xl max-h-[85vh] bg-background-50 rounded-2xl outline-none flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-100 text-primary-600">
              <i className="ri-settings-3-line text-base"></i>
            </span>
            <h2 className="text-lg font-semibold text-foreground-900 font-heading">Configuración de Agenda</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-foreground-700 hover:bg-secondary-100 transition-base cursor-pointer"
          >
            <i className="ri-close-line text-lg" aria-hidden="true"></i>
          </button>
        </div>

        <div className="px-6 pt-4 border-b border-secondary-200 shrink-0">
          <Tabs
            tabs={[
              { key: 'consultorios', label: 'Consultorios', icon: 'ri-door-open-line' },
              { key: 'reglas', label: 'Reglas de bloqueo', icon: 'ri-forbid-line' },
            ]}
            activeTab={tab}
            onChange={setTab}
            ariaLabel="Configuración de agenda"
          />
        </div>

        <div className="px-6 py-5 overflow-y-auto scrollbar-thin flex-1">
          {tab === 'consultorios' ? (
            <ConsultoriosTab
              consultorios={consultorios}
              branchId={branchId}
              onUpsert={onUpsertRoom}
            />
          ) : (
            <ReglasBloqueoTab
              branchId={branchId}
              reglasBloqueo={reglasBloqueo}
              defaultFecha={defaultFecha}
              onReload={onReloadBlocks}
            />
          )}
        </div>
      </div>
    </div>
  );
}
