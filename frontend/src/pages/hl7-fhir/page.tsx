import { useState } from 'react';
import FhirDashboard from '@/pages/hl7-fhir/components/FhirDashboard';
import FhirMessages from '@/pages/hl7-fhir/components/FhirMessages';
import FhirCreateMessage from '@/pages/hl7-fhir/components/FhirCreateMessage';
import FhirConfigPanel from '@/pages/hl7-fhir/components/FhirConfigPanel';
import { fhirMessages, fhirServers } from '@/mocks/hl7fhir';

type ActiveTab = 'dashboard' | 'messages' | 'create' | 'config';

const tabs: { key: ActiveTab; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'ri-dashboard-line' },
  { key: 'messages', label: 'Mensajes', icon: 'ri-exchange-line' },
  { key: 'create', label: 'Crear Mensaje', icon: 'ri-add-circle-line' },
  { key: 'config', label: 'Configuracion', icon: 'ri-settings-3-line' },
];

export default function Hl7FhirPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const defaultServer = fhirServers.find((s) => s.isDefault && s.enabled);
  const errorCount = fhirMessages.filter((m) => m.status === 'error').length;
  const pendingCount = fhirMessages.filter((m) => m.status === 'pending').length;

  return (
    <div className="space-y-5 p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-accent-100 text-accent-600 flex-shrink-0">
            <i className="ri-share-circle-line text-xl"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground-900 font-heading">HL7 FHIR</h1>
            <p className="text-sm text-foreground-500">Interoperabilidad clinica basada en Fast Healthcare Interoperability Resources</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {defaultServer ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-medium text-emerald-700">{defaultServer.nombre}</span>
              <span className="text-2xs text-emerald-500">{defaultServer.version}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span className="text-xs font-medium text-amber-700">Sin servidor activo</span>
            </div>
          )}
          {errorCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-lg">
              <i className="ri-error-warning-line"></i>
              {errorCount} error{errorCount > 1 ? 'es' : ''}
            </span>
          )}
          {pendingCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium rounded-lg">
              <i className="ri-time-line"></i>
              {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Notice Banner */}
      <div className="px-4 py-3 rounded-xl bg-primary-50 border border-primary-200 flex items-start gap-3">
        <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-100 text-primary-600 flex-shrink-0">
          <i className="ri-information-line text-sm"></i>
        </span>
        <div>
          <p className="text-sm font-semibold text-primary-800">Modulo en preparacion para integracion con backend</p>
          <p className="text-xs text-primary-600 mt-0.5">
            Este modulo esta completamente disenado con base en el protocolo HL7 FHIR R4. Las funciones de transmision real se activaran al conectar el Readdy Backend o SaaS Supabase con un servidor FHIR compatible. Por ahora la simulacion local esta habilitada para validar payloads y configuraciones.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-background-50 border border-secondary-200 rounded-lg w-fit flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-base whitespace-nowrap ${
              activeTab === t.key
                ? 'bg-foreground-900 text-background-50'
                : 'text-foreground-600 hover:text-foreground-800 hover:bg-secondary-100'
            }`}
          >
            <span className="w-4 h-4 flex items-center justify-center">
              <i className={t.icon}></i>
            </span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && <FhirDashboard />}
      {activeTab === 'messages' && <FhirMessages />}
      {activeTab === 'create' && <FhirCreateMessage />}
      {activeTab === 'config' && <FhirConfigPanel />}
    </div>
  );
}