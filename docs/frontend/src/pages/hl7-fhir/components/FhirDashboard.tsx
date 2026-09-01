import { useMemo } from 'react';
import { fhirMessages, fhirLogs, fhirServers, fhirResourceProfiles, type FhirServerConfig } from '@/mocks/hl7fhir';

export default function FhirDashboard() {
  const stats = useMemo(() => {
    const total = fhirMessages.length;
    const outbound = fhirMessages.filter((m) => m.direction === 'outbound').length;
    const inbound = fhirMessages.filter((m) => m.direction === 'inbound').length;
    const sent = fhirMessages.filter((m) => m.status === 'sent').length;
    const errors = fhirMessages.filter((m) => m.status === 'error').length;
    const pending = fhirMessages.filter((m) => m.status === 'pending').length;
    const today = fhirMessages.filter((m) => m.fecha === '2026-08-20').length;
    return { total, outbound, inbound, sent, errors, pending, today };
  }, []);

  const serverStats = useMemo(() => {
    return fhirServers.map((srv) => {
      const srvMsgs = fhirMessages.filter((m) => m.serverId === srv.id);
      const srvLogs = fhirLogs.filter((l) => l.serverId === srv.id);
      const lastMsg = srvMsgs.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora))[0];
      const errorCount = srvMsgs.filter((m) => m.status === 'error').length;
      return { ...srv, msgCount: srvMsgs.length, logCount: srvLogs.length, lastActivity: lastMsg?.hora || '--:--', errorCount };
    });
  }, []);

  const resourceStats = useMemo(() => {
    const counts: Record<string, number> = {};
    fhirMessages.forEach((m) => {
      counts[m.resourceType] = (counts[m.resourceType] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, []);

  const activeProfiles = fhirResourceProfiles.filter((p) => p.activo).length;

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-secondary-200 bg-background-50">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-100 text-primary-600">
              <i className="ri-exchange-line text-sm"></i>
            </span>
            <span className="text-2xs text-foreground-500 uppercase tracking-wide font-medium">Total mensajes</span>
          </div>
          <p className="text-2xl font-bold text-foreground-900">{stats.total}</p>
          <p className="text-xs text-foreground-400 mt-1">{stats.outbound} salientes · {stats.inbound} entrantes</p>
        </div>
        <div className="p-4 rounded-xl border border-secondary-200 bg-background-50">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <i className="ri-check-double-line text-sm"></i>
            </span>
            <span className="text-2xs text-foreground-500 uppercase tracking-wide font-medium">Enviados OK</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{stats.sent}</p>
          <p className="text-xs text-foreground-400 mt-1">{stats.today} hoy · {stats.pending} pendientes</p>
        </div>
        <div className="p-4 rounded-xl border border-secondary-200 bg-background-50">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-100 text-red-600">
              <i className="ri-error-warning-line text-sm"></i>
            </span>
            <span className="text-2xs text-foreground-500 uppercase tracking-wide font-medium">Errores</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.errors}</p>
          <p className="text-xs text-foreground-400 mt-1">Requieren atencion</p>
        </div>
        <div className="p-4 rounded-xl border border-secondary-200 bg-background-50">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-accent-100 text-accent-600">
              <i className="ri-file-list-3-line text-sm"></i>
            </span>
            <span className="text-2xs text-foreground-500 uppercase tracking-wide font-medium">Perfiles activos</span>
          </div>
          <p className="text-2xl font-bold text-accent-600">{activeProfiles}</p>
          <p className="text-xs text-foreground-400 mt-1">{fhirResourceProfiles.length} totales configurados</p>
        </div>
      </div>

      {/* Server Status Cards */}
      <div className="rounded-xl border border-secondary-200 bg-background-50 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-secondary-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-100 text-primary-600">
              <i className="ri-server-line text-sm"></i>
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground-800">Estado de Servidores FHIR</h3>
              <p className="text-2xs text-foreground-400">Conectividad y actividad por endpoint</p>
            </div>
          </div>
        </div>
        <div className="divide-y divide-secondary-100">
          {serverStats.map((srv) => (
            <div key={srv.id} className="px-5 py-4 flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full mt-2 flex-shrink-0 ${srv.enabled ? 'bg-emerald-500' : 'bg-secondary-300'}`}></span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground-800">{srv.nombre}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium ${srv.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-secondary-100 text-foreground-500'}`}>
                      {srv.enabled ? 'Activo' : 'Inactivo'}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium bg-primary-100 text-primary-700">
                      {srv.version}
                    </span>
                  </div>
                  <p className="text-xs text-foreground-500 mt-0.5 truncate">{srv.url}</p>
                  <p className="text-xs text-foreground-400 mt-0.5">{srv.descripcion}</p>
                  <div className="flex items-center gap-3 mt-2 text-2xs text-foreground-400 flex-wrap">
                    <span className="flex items-center gap-1"><i className="ri-exchange-line"></i> {srv.msgCount} mensajes</span>
                    <span className="flex items-center gap-1"><i className="ri-file-list-line"></i> {srv.logCount} logs</span>
                    <span className="flex items-center gap-1"><i className="ri-time-line"></i> Ultima actividad: {srv.lastActivity}</span>
                    {srv.errorCount > 0 && (
                      <span className="flex items-center gap-1 text-red-500"><i className="ri-error-warning-line"></i> {srv.errorCount} errores</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-2xs font-medium bg-secondary-100 text-foreground-500">
                  <i className="ri-shield-keyhole-line"></i>
                  {srv.authType === 'none' ? 'Sin auth' : srv.authType === 'basic' ? 'Basic' : srv.authType === 'bearer' ? 'Bearer' : 'API Key'}
                </span>
                {srv.isDefault && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-2xs font-medium bg-primary-100 text-primary-700">
                    <i className="ri-star-line"></i> Default
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resource Types Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl border border-secondary-200 bg-background-50 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-secondary-100">
            <h3 className="text-sm font-semibold text-foreground-800 flex items-center gap-2">
              <i className="ri-pie-chart-line text-primary-600"></i>
              Distribucion de Recursos FHIR
            </h3>
          </div>
          <div className="p-4 space-y-2">
            {resourceStats.map(([type, count]) => {
              const pct = Math.round((count / stats.total) * 100);
              return (
                <div key={type} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-foreground-600 w-28 truncate">{type}</span>
                  <div className="flex-1 h-2 bg-secondary-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                  <span className="text-xs font-semibold text-foreground-700 w-8 text-right">{count}</span>
                  <span className="text-2xs text-foreground-400 w-8 text-right">{pct}%</span>
                </div>
              );
            })}
            {resourceStats.length === 0 && (
              <p className="text-xs text-foreground-400 text-center py-4">Sin mensajes registrados</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-secondary-200 bg-background-50 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-secondary-100">
            <h3 className="text-sm font-semibold text-foreground-800 flex items-center gap-2">
              <i className="ri-list-check-3 text-accent-600"></i>
              Perfiles de Recursos Configurados
            </h3>
          </div>
          <div className="divide-y divide-secondary-100">
            {fhirResourceProfiles.map((prof) => (
              <div key={prof.id} className="px-5 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground-800">{prof.nombre}</p>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium ${prof.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-secondary-100 text-foreground-500'}`}>
                      {prof.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <p className="text-xs text-foreground-500 mt-0.5">{prof.descripcion}</p>
                  <p className="text-2xs text-foreground-400 mt-1">{prof.mapeoCampos.length} campos mapeados · {prof.mapeoCampos.filter((c) => c.requerido).length} requeridos</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}