import { useState, useMemo } from 'react';
import { fhirServers, fhirLogs, fhirResourceProfiles, type FhirServerConfig, type FhirVersion } from '@/mocks/hl7fhir';

export default function FhirConfigPanel() {
  const [servers, setServers] = useState<FhirServerConfig[]>([...fhirServers]);
  const [editingServer, setEditingServer] = useState<FhirServerConfig | null>(null);
  const [showNewServer, setShowNewServer] = useState(false);
  const [newServer, setNewServer] = useState<Partial<FhirServerConfig>>({
    version: 'R4',
    authType: 'none',
    headers: { 'Content-Type': 'application/fhir+json', Accept: 'application/fhir+json' },
    enabled: true,
    isDefault: false,
  });
  const [activeTab, setActiveTab] = useState<'servers' | 'logs' | 'profiles'>('servers');
  const [logFilter, setLogFilter] = useState<'todas' | 'info' | 'warning' | 'error'>('todas');
  const [logSearch, setLogSearch] = useState('');

  const handleToggleServer = (id: string) => {
    setServers((prev) => prev.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const handleSetDefault = (id: string) => {
    setServers((prev) => prev.map((s) => ({ ...s, isDefault: s.id === id })));
  };

  const handleSaveEdit = () => {
    if (!editingServer) return;
    setServers((prev) => prev.map((s) => s.id === editingServer.id ? editingServer : s));
    setEditingServer(null);
  };

  const handleAddServer = () => {
    if (!newServer.nombre || !newServer.url) return;
    const srv: FhirServerConfig = {
      id: `srv-${Date.now()}`,
      nombre: newServer.nombre || '',
      url: newServer.url || '',
      version: (newServer.version as FhirVersion) || 'R4',
      authType: newServer.authType || 'none',
      credentials: {},
      headers: newServer.headers || { 'Content-Type': 'application/fhir+json', Accept: 'application/fhir+json' },
      enabled: newServer.enabled ?? true,
      isDefault: false,
      descripcion: newServer.descripcion || '',
      contactEmail: newServer.contactEmail || '',
      organizationId: 'org-medicore',
    };
    setServers((prev) => [...prev, srv]);
    setShowNewServer(false);
    setNewServer({ version: 'R4', authType: 'none', headers: { 'Content-Type': 'application/fhir+json', Accept: 'application/fhir+json' }, enabled: true, isDefault: false });
  };

  const filteredLogs = useMemo(() => {
    let list = [...fhirLogs];
    if (logFilter !== 'todas') list = list.filter((l) => l.nivel === logFilter);
    if (logSearch.trim()) {
      const q = logSearch.toLowerCase();
      list = list.filter((l) => l.mensaje.toLowerCase().includes(q) || l.detalle?.toLowerCase().includes(q));
    }
    return list.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora));
  }, [logFilter, logSearch]);

  const nivelConfig: Record<string, { color: string; bg: string; icon: string }> = {
    info: { color: 'text-sky-600', bg: 'bg-sky-100', icon: 'ri-information-line' },
    warning: { color: 'text-amber-600', bg: 'bg-amber-100', icon: 'ri-alert-line' },
    error: { color: 'text-red-600', bg: 'bg-red-100', icon: 'ri-error-warning-line' },
    debug: { color: 'text-foreground-500', bg: 'bg-secondary-100', icon: 'ri-bug-line' },
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-background-50 border border-secondary-200 rounded-lg w-fit">
        {[
          { key: 'servers' as const, label: 'Servidores', icon: 'ri-server-line' },
          { key: 'logs' as const, label: 'Logs de Transmision', icon: 'ri-file-list-line' },
          { key: 'profiles' as const, label: 'Perfiles FHIR', icon: 'ri-file-list-3-line' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-base whitespace-nowrap ${
              activeTab === t.key
                ? 'bg-foreground-900 text-background-50'
                : 'text-foreground-600 hover:text-foreground-800 hover:bg-secondary-100'
            }`}
          >
            <i className={t.icon}></i>
            {t.label}
          </button>
        ))}
      </div>

      {/* Servers Tab */}
      {activeTab === 'servers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground-800">Servidores FHIR Configurados</h3>
            <button
              onClick={() => setShowNewServer(true)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-base cursor-pointer whitespace-nowrap"
            >
              <i className="ri-add-line"></i>
              Agregar servidor
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {servers.map((srv) => (
              <div key={srv.id} className="p-4 rounded-xl border border-secondary-200 bg-background-50">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${srv.enabled ? 'bg-emerald-500' : 'bg-secondary-300'}`}></span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground-800">{srv.nombre}</p>
                        {srv.isDefault && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-medium bg-primary-100 text-primary-700">
                            <i className="ri-star-line text-[10px]"></i> Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-foreground-500 truncate">{srv.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setEditingServer(srv)}
                      className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-primary-600 hover:bg-primary-50 transition-base cursor-pointer"
                      title="Editar"
                    >
                      <i className="ri-pencil-line text-sm"></i>
                    </button>
                  </div>
                </div>
                <p className="text-xs text-foreground-400 mb-3">{srv.descripcion}</p>
                <div className="flex items-center gap-2 flex-wrap text-2xs">
                  <span className="px-2 py-1 rounded bg-secondary-100 text-foreground-500 font-medium">{srv.version}</span>
                  <span className="px-2 py-1 rounded bg-secondary-100 text-foreground-500 font-medium">
                    Auth: {srv.authType === 'none' ? 'Ninguna' : srv.authType}
                  </span>
                  <span className="px-2 py-1 rounded bg-secondary-100 text-foreground-500 font-medium">{srv.contactEmail}</span>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-secondary-100">
                  <button
                    onClick={() => handleToggleServer(srv.id)}
                    className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-base whitespace-nowrap ${
                      srv.enabled
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-secondary-100 text-foreground-500 border border-secondary-200 hover:bg-secondary-200'
                    }`}
                  >
                    {srv.enabled ? 'Desactivar' : 'Activar'}
                  </button>
                  {!srv.isDefault && srv.enabled && (
                    <button
                      onClick={() => handleSetDefault(srv.id)}
                      className="px-3 py-1.5 text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-100 transition-base cursor-pointer whitespace-nowrap"
                    >
                      Establecer default
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* New Server Form */}
          {showNewServer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="bg-background-50 rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6">
                <h3 className="text-base font-semibold text-foreground-900 mb-4">Nuevo Servidor FHIR</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground-600 mb-1">Nombre del servidor</label>
                    <input
                      type="text"
                      value={newServer.nombre || ''}
                      onChange={(e) => setNewServer((p) => ({ ...p, nombre: e.target.value }))}
                      className="w-full px-3 py-2 bg-background-50 border border-secondary-200 rounded-lg text-sm text-foreground-900 outline-none focus:border-primary-400 transition-base"
                      placeholder="Ej. Servidor FHIR Regional"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-600 mb-1">URL base</label>
                    <input
                      type="url"
                      value={newServer.url || ''}
                      onChange={(e) => setNewServer((p) => ({ ...p, url: e.target.value }))}
                      className="w-full px-3 py-2 bg-background-50 border border-secondary-200 rounded-lg text-sm text-foreground-900 outline-none focus:border-primary-400 transition-base"
                      placeholder="https://fhir.ejemplo.org/baseR4"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-foreground-600 mb-1">Version FHIR</label>
                      <select
                        value={newServer.version || 'R4'}
                        onChange={(e) => setNewServer((p) => ({ ...p, version: e.target.value as FhirVersion }))}
                        className="w-full px-3 py-2 bg-background-50 border border-secondary-200 rounded-lg text-sm text-foreground-900 outline-none focus:border-primary-400 transition-base"
                      >
                        <option value="R4">FHIR R4</option>
                        <option value="R4B">FHIR R4B</option>
                        <option value="R5">FHIR R5</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground-600 mb-1">Autenticacion</label>
                      <select
                        value={newServer.authType || 'none'}
                        onChange={(e) => setNewServer((p) => ({ ...p, authType: e.target.value as FhirServerConfig['authType'] }))}
                        className="w-full px-3 py-2 bg-background-50 border border-secondary-200 rounded-lg text-sm text-foreground-900 outline-none focus:border-primary-400 transition-base"
                      >
                        <option value="none">Sin autenticacion</option>
                        <option value="basic">Basic Auth</option>
                        <option value="bearer">Bearer Token</option>
                        <option value="apikey">API Key</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-600 mb-1">Descripcion</label>
                    <textarea
                      value={newServer.descripcion || ''}
                      onChange={(e) => setNewServer((p) => ({ ...p, descripcion: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 bg-background-50 border border-secondary-200 rounded-lg text-sm text-foreground-900 outline-none focus:border-primary-400 transition-base resize-none"
                      placeholder="Proposito y alcance de este servidor"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-600 mb-1">Email de contacto</label>
                    <input
                      type="email"
                      value={newServer.contactEmail || ''}
                      onChange={(e) => setNewServer((p) => ({ ...p, contactEmail: e.target.value }))}
                      className="w-full px-3 py-2 bg-background-50 border border-secondary-200 rounded-lg text-sm text-foreground-900 outline-none focus:border-primary-400 transition-base"
                      placeholder="soporte@ejemplo.org"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-5">
                  <button onClick={() => setShowNewServer(false)} className="flex-1 px-4 py-2 text-sm font-medium bg-secondary-100 text-foreground-700 rounded-lg hover:bg-secondary-200 transition-base cursor-pointer">
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddServer}
                    disabled={!newServer.nombre || !newServer.url}
                    className="flex-1 px-4 py-2 text-sm font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-base cursor-pointer disabled:opacity-50"
                  >
                    Guardar servidor
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Server Form */}
          {editingServer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="bg-background-50 rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6">
                <h3 className="text-base font-semibold text-foreground-900 mb-4">Editar Servidor FHIR</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground-600 mb-1">Nombre</label>
                    <input
                      type="text"
                      value={editingServer.nombre}
                      onChange={(e) => setEditingServer((p) => p ? { ...p, nombre: e.target.value } : p)}
                      className="w-full px-3 py-2 bg-background-50 border border-secondary-200 rounded-lg text-sm text-foreground-900 outline-none focus:border-primary-400 transition-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-600 mb-1">URL base</label>
                    <input
                      type="url"
                      value={editingServer.url}
                      onChange={(e) => setEditingServer((p) => p ? { ...p, url: e.target.value } : p)}
                      className="w-full px-3 py-2 bg-background-50 border border-secondary-200 rounded-lg text-sm text-foreground-900 outline-none focus:border-primary-400 transition-base"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-foreground-600 mb-1">Version</label>
                      <select
                        value={editingServer.version}
                        onChange={(e) => setEditingServer((p) => p ? { ...p, version: e.target.value as FhirVersion } : p)}
                        className="w-full px-3 py-2 bg-background-50 border border-secondary-200 rounded-lg text-sm text-foreground-900 outline-none focus:border-primary-400 transition-base"
                      >
                        <option value="R4">FHIR R4</option>
                        <option value="R4B">FHIR R4B</option>
                        <option value="R5">FHIR R5</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground-600 mb-1">Auth</label>
                      <select
                        value={editingServer.authType}
                        onChange={(e) => setEditingServer((p) => p ? { ...p, authType: e.target.value as FhirServerConfig['authType'] } : p)}
                        className="w-full px-3 py-2 bg-background-50 border border-secondary-200 rounded-lg text-sm text-foreground-900 outline-none focus:border-primary-400 transition-base"
                      >
                        <option value="none">Sin auth</option>
                        <option value="basic">Basic</option>
                        <option value="bearer">Bearer</option>
                        <option value="apikey">API Key</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-600 mb-1">Descripcion</label>
                    <textarea
                      value={editingServer.descripcion}
                      onChange={(e) => setEditingServer((p) => p ? { ...p, descripcion: e.target.value } : p)}
                      rows={2}
                      className="w-full px-3 py-2 bg-background-50 border border-secondary-200 rounded-lg text-sm text-foreground-900 outline-none focus:border-primary-400 transition-base resize-none"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-5">
                  <button onClick={() => setEditingServer(null)} className="flex-1 px-4 py-2 text-sm font-medium bg-secondary-100 text-foreground-700 rounded-lg hover:bg-secondary-200 transition-base cursor-pointer">
                    Cancelar
                  </button>
                  <button onClick={handleSaveEdit} className="flex-1 px-4 py-2 text-sm font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-base cursor-pointer">
                    Guardar cambios
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
                <i className="ri-search-line text-sm"></i>
              </span>
              <input
                type="search"
                placeholder="Buscar en logs..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-background-50 border border-secondary-200 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base"
              />
            </div>
            <div className="flex gap-1">
              {(['todas', 'info', 'warning', 'error'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setLogFilter(f)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg cursor-pointer transition-base whitespace-nowrap ${
                    logFilter === f
                      ? 'bg-foreground-900 text-background-50'
                      : 'bg-background-50 text-foreground-600 border border-secondary-200 hover:bg-secondary-100'
                  }`}
                >
                  {f === 'todas' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-secondary-200 bg-background-50 overflow-hidden">
            <div className="px-5 py-3 border-b border-secondary-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground-800">Logs de Transmision</h3>
              <span className="text-2xs text-foreground-400">{filteredLogs.length} registro(s)</span>
            </div>
            <div className="divide-y divide-secondary-100 max-h-[600px] overflow-y-auto">
              {filteredLogs.map((log) => {
                const cfg = nivelConfig[log.nivel];
                return (
                  <div key={log.id} className="px-5 py-3 hover:bg-secondary-50/30 transition-base">
                    <div className="flex items-start gap-3">
                      <span className={`w-7 h-7 flex items-center justify-center rounded flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
                        <i className={`${cfg.icon} text-xs`}></i>
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium ${cfg.bg} ${cfg.color}`}>
                            {log.nivel.toUpperCase()}
                          </span>
                          <span className="text-xs text-foreground-400">{log.fecha} {log.hora}</span>
                          <span className="text-xs text-foreground-400">{log.serverName}</span>
                          {log.correlationId && (
                            <span className="text-2xs text-foreground-300 font-mono">{log.correlationId}</span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-foreground-700 mt-1">{log.mensaje}</p>
                        {log.detalle && (
                          <p className="text-xs text-foreground-500 mt-0.5">{log.detalle}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredLogs.length === 0 && (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm text-foreground-400">No hay logs que coincidan con los filtros</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profiles Tab */}
      {activeTab === 'profiles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground-800">Perfiles de Recursos FHIR</h3>
            <span className="text-xs text-foreground-400">{fhirResourceProfiles.length} perfiles configurados</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {fhirResourceProfiles.map((prof) => (
              <div key={prof.id} className="p-4 rounded-xl border border-secondary-200 bg-background-50">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground-800">{prof.nombre}</p>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium ${prof.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-secondary-100 text-foreground-500'}`}>
                        {prof.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <p className="text-xs text-foreground-500">{prof.descripcion}</p>
                  </div>
                  <span className="px-2 py-1 rounded bg-primary-100 text-primary-700 text-2xs font-medium">
                    {prof.resourceType}
                  </span>
                </div>
                <div className="mt-3 border-t border-secondary-100 pt-3">
                  <p className="text-xs font-medium text-foreground-600 mb-2">Mapeo de campos ({prof.mapeoCampos.length})</p>
                  <div className="space-y-1.5">
                    {prof.mapeoCampos.map((campo, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${campo.requerido ? 'bg-red-400' : 'bg-secondary-300'}`}></span>
                        <span className="text-foreground-600 font-mono text-2xs">{campo.campoFhir}</span>
                        <span className="text-foreground-300">&rarr;</span>
                        <span className="text-foreground-500">{campo.campoLocal}</span>
                        {campo.requerido && (
                          <span className="ml-auto text-2xs text-red-500 font-medium">Requerido</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}