import { useState, useMemo } from 'react';
import { fhirMessages, fhirResourceTypes, type FhirMessage, type FhirResourceType } from '@/mocks/hl7fhir';
import { exportToExcel } from '@/utils/exportUtils';

const statusConfig: Record<FhirMessage['status'], { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: 'Pendiente', color: 'text-amber-600', bg: 'bg-amber-100', icon: 'ri-time-line' },
  sent: { label: 'Enviado', color: 'text-emerald-600', bg: 'bg-emerald-100', icon: 'ri-check-line' },
  received: { label: 'Recibido', color: 'text-sky-600', bg: 'bg-sky-100', icon: 'ri-download-line' },
  error: { label: 'Error', color: 'text-red-600', bg: 'bg-red-100', icon: 'ri-error-warning-line' },
  acked: { label: 'ACK Recibido', color: 'text-primary-600', bg: 'bg-primary-100', icon: 'ri-check-double-line' },
};

const directionConfig: Record<FhirMessage['direction'], { label: string; icon: string }> = {
  outbound: { label: 'Saliente', icon: 'ri-upload-line' },
  inbound: { label: 'Entrante', icon: 'ri-download-line' },
};

export default function FhirMessages() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterResource, setFilterResource] = useState<FhirResourceType | 'todas'>('todas');
  const [filterStatus, setFilterStatus] = useState<FhirMessage['status'] | 'todas'>('todas');
  const [filterDirection, setFilterDirection] = useState<FhirMessage['direction'] | 'todas'>('todas');
  const [selectedMessage, setSelectedMessage] = useState<FhirMessage | null>(null);

  const filtered = useMemo(() => {
    let list = [...fhirMessages];
    if (filterResource !== 'todas') list = list.filter((m) => m.resourceType === filterResource);
    if (filterStatus !== 'todas') list = list.filter((m) => m.status === filterStatus);
    if (filterDirection !== 'todas') list = list.filter((m) => m.direction === filterDirection);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (m) =>
          m.patientName?.toLowerCase().includes(q) ||
          m.resourceType.toLowerCase().includes(q) ||
          m.userName.toLowerCase().includes(q) ||
          m.correlationId.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora));
  }, [searchTerm, filterResource, filterStatus, filterDirection]);

  const handleExportExcel = () => {
    const rows = filtered.map((m) => ({
      ID: m.id,
      Recurso: m.resourceType,
      Operacion: m.operation,
      Estado: statusConfig[m.status].label,
      Direccion: directionConfig[m.direction].label,
      Paciente: m.patientName || '—',
      Servidor: m.serverName,
      Fecha: m.fecha,
      Hora: m.hora,
      HTTP: m.httpStatus || '—',
      CorrelationID: m.correlationId,
    }));
    exportToExcel(rows, `FHIR_Mensajes_${new Date().toISOString().split('T')[0]}`, 'MensajesFHIR');
  };

  const handleDownloadJson = (msg: FhirMessage) => {
    const data = {
      id: msg.id,
      resourceType: msg.resourceType,
      operation: msg.operation,
      direction: msg.direction,
      status: msg.status,
      patientId: msg.patientId,
      patientName: msg.patientName,
      serverName: msg.serverName,
      endpointPath: msg.endpointPath,
      correlationId: msg.correlationId,
      fecha: msg.fecha,
      hora: msg.hora,
      httpStatus: msg.httpStatus,
      errorMessage: msg.errorMessage,
      payload: msg.rawPayload,
      response: msg.responsePayload,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FHIR_${msg.resourceType}_${msg.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const handlePrintTransmission = (msg: FhirMessage) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const status = statusConfig[msg.status];
    const dir = directionConfig[msg.direction];

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comprobante FHIR — ${msg.resourceType}</title>
        <style>
          body { font-family: sans-serif; padding: 40px; color: #333; }
          .header { border-bottom: 2px solid #2d2d2d; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { margin: 0; font-size: 22px; }
          .header p { margin: 5px 0 0; font-size: 13px; color: #666; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-right: 8px; }
          .badge-sent { background: #d1fae5; color: #065f46; }
          .badge-error { background: #fee2e2; color: #991b1b; }
          .badge-pending { background: #fef3c7; color: #92400e; }
          .section { margin-bottom: 24px; }
          .section h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; margin: 0 0 8px; }
          .section p { margin: 4px 0; font-size: 14px; }
          .payload { background: #f5f5f5; padding: 16px; border-radius: 6px; font-family: monospace; font-size: 12px; white-space: pre-wrap; word-break: break-word; max-height: 300px; overflow-y: auto; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>MediCore — Comprobante de Transmisión FHIR</h1>
          <p>Fast Healthcare Interoperability Resources (FHIR R4) · NOM-024-SSA3-2012</p>
        </div>

        <div style="margin-bottom:24px;">
          <span class="badge badge-${msg.status}">${status.label}</span>
          <span class="badge" style="background:#f3f4f6;color:#374151;">${dir.label}</span>
          <span class="badge" style="background:#eff6ff;color:#1e40af;">${msg.operation.toUpperCase()}</span>
        </div>

        <div class="grid">
          <div class="section">
            <h3>Identificación del mensaje</h3>
            <p><strong>ID:</strong> ${msg.id}</p>
            <p><strong>Correlation ID:</strong> ${msg.correlationId}</p>
            <p><strong>Fecha/Hora:</strong> ${msg.fecha} ${msg.hora}</p>
            <p><strong>Recurso:</strong> ${msg.resourceType}</p>
            <p><strong>Endpoint:</strong> ${msg.endpointPath}</p>
          </div>
          <div class="section">
            <h3>Destino y responsable</h3>
            <p><strong>Servidor:</strong> ${msg.serverName}</p>
            <p><strong>Usuario:</strong> ${msg.userName}</p>
            ${msg.patientName ? `<p><strong>Paciente:</strong> ${msg.patientName}</p>` : ''}
            ${msg.httpStatus ? `<p><strong>HTTP Status:</strong> ${msg.httpStatus}</p>` : ''}
          </div>
        </div>

        <div class="section">
          <h3>Payload JSON FHIR</h3>
          <div class="payload">${msg.rawPayload.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </div>

        ${msg.errorMessage ? `
        <div class="section">
          <h3>Error reportado</h3>
          <p style="color:#991b1b;">${msg.errorMessage}</p>
        </div>
        ` : ''}

        <div class="footer">
          <p>Este comprobante certifica la transmisión/ recepción de un mensaje FHIR conforme al protocolo HL7 FHIR R4.</p>
          <p>MediCore Clínica · Documento generado el ${new Date().toLocaleString('es-MX')}</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
            <i className="ri-search-line text-sm"></i>
          </span>
          <input
            type="search"
            placeholder="Buscar por paciente, recurso, usuario o correlation ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-background-50 border border-secondary-200 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base"
          />
        </div>
        <select
          value={filterResource}
          onChange={(e) => setFilterResource(e.target.value as FhirResourceType | 'todas')}
          className="px-3 py-2 bg-background-50 border border-secondary-200 rounded-lg text-sm text-foreground-700 outline-none focus:border-primary-400 transition-base"
        >
          <option value="todas">Todos los recursos</option>
          {fhirResourceTypes.map((rt) => (
            <option key={rt.value} value={rt.value}>{rt.label}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FhirMessage['status'] | 'todas')}
          className="px-3 py-2 bg-background-50 border border-secondary-200 rounded-lg text-sm text-foreground-700 outline-none focus:border-primary-400 transition-base"
        >
          <option value="todas">Todos los estados</option>
          {Object.entries(statusConfig).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
        <select
          value={filterDirection}
          onChange={(e) => setFilterDirection(e.target.value as FhirMessage['direction'] | 'todas')}
          className="px-3 py-2 bg-background-50 border border-secondary-200 rounded-lg text-sm text-foreground-700 outline-none focus:border-primary-400 transition-base"
        >
          <option value="todas">Ambas direcciones</option>
          <option value="outbound">Saliente</option>
          <option value="inbound">Entrante</option>
        </select>
        <button
          onClick={handleExportExcel}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-foreground-600 bg-background-50 border border-secondary-200 rounded-lg hover:bg-secondary-100 transition-base cursor-pointer whitespace-nowrap"
        >
          <i className="ri-file-excel-line"></i> Exportar Excel
        </button>
      </div>

      {/* Message List */}
      <div className="rounded-xl border border-secondary-200 bg-background-50 overflow-hidden">
        <div className="px-5 py-3 border-b border-secondary-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground-800">Mensajes FHIR</h3>
          <span className="text-2xs text-foreground-400">{filtered.length} mensaje(s)</span>
        </div>
        <div className="divide-y divide-secondary-100">
          {filtered.map((msg) => {
            const status = statusConfig[msg.status];
            const dir = directionConfig[msg.direction];
            return (
              <button
                key={msg.id}
                onClick={() => setSelectedMessage(msg)}
                className="w-full text-left px-5 py-3.5 hover:bg-secondary-50/50 transition-base cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className={`w-9 h-9 flex items-center justify-center rounded-lg ${status.bg} ${status.color} flex-shrink-0`}>
                      <i className={`${status.icon} text-sm`}></i>
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-secondary-100 text-foreground-500">
                          <i className={`${dir.icon} text-[10px]`}></i>
                          {dir.label}
                        </span>
                        <span className="text-xs font-semibold text-foreground-800">{msg.operation.toUpperCase()}</span>
                        <span className="text-xs text-foreground-500">{msg.endpointPath}</span>
                      </div>
                      <p className="text-sm font-medium text-foreground-800 mt-1">{msg.resourceType} · {msg.resourceId}</p>
                      {msg.patientName && (
                        <p className="text-xs text-foreground-500 mt-0.5">Paciente: {msg.patientName}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-2xs text-foreground-400 flex-wrap">
                        <span><i className="ri-time-line mr-1"></i>{msg.fecha} {msg.hora}</span>
                        <span><i className="ri-server-line mr-1"></i>{msg.serverName}</span>
                        <span><i className="ri-user-line mr-1"></i>{msg.userName}</span>
                        <span><i className="ri-link mr-1"></i>{msg.correlationId}</span>
                        {msg.httpStatus && (
                          <span className={`font-medium ${msg.httpStatus >= 200 && msg.httpStatus < 300 ? 'text-emerald-500' : msg.httpStatus >= 400 ? 'text-red-500' : 'text-amber-500'}`}>
                            HTTP {msg.httpStatus}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="w-5 h-5 flex items-center justify-center text-foreground-300 flex-shrink-0">
                    <i className="ri-arrow-right-s-line text-sm"></i>
                  </span>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-foreground-400">No hay mensajes que coincidan con los filtros</p>
            </div>
          )}
        </div>
      </div>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedMessage(null)}>
          <div className="bg-background-50 rounded-xl shadow-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b border-secondary-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 flex items-center justify-center rounded-lg ${statusConfig[selectedMessage.status].bg} ${statusConfig[selectedMessage.status].color}`}>
                  <i className={`${statusConfig[selectedMessage.status].icon} text-sm`}></i>
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground-900">{selectedMessage.resourceType} · {selectedMessage.operation.toUpperCase()}</h3>
                  <p className="text-2xs text-foreground-400">{selectedMessage.correlationId} · {selectedMessage.fecha} {selectedMessage.hora}</p>
                </div>
              </div>
              <button onClick={() => setSelectedMessage(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-foreground-700 hover:bg-secondary-100 transition-base cursor-pointer">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 bg-background-50 rounded-lg border border-secondary-200">
                  <p className="text-foreground-400 mb-0.5">Servidor</p>
                  <p className="font-medium text-foreground-800">{selectedMessage.serverName}</p>
                </div>
                <div className="p-2.5 bg-background-50 rounded-lg border border-secondary-200">
                  <p className="text-foreground-400 mb-0.5">Endpoint</p>
                  <p className="font-medium text-foreground-800">{selectedMessage.endpointPath}</p>
                </div>
                <div className="p-2.5 bg-background-50 rounded-lg border border-secondary-200">
                  <p className="text-foreground-400 mb-0.5">Direccion</p>
                  <p className="font-medium text-foreground-800">{directionConfig[selectedMessage.direction].label}</p>
                </div>
                <div className="p-2.5 bg-background-50 rounded-lg border border-secondary-200">
                  <p className="text-foreground-400 mb-0.5">Usuario</p>
                  <p className="font-medium text-foreground-800">{selectedMessage.userName}</p>
                </div>
                {selectedMessage.patientName && (
                  <div className="p-2.5 bg-background-50 rounded-lg border border-secondary-200 col-span-2">
                    <p className="text-foreground-400 mb-0.5">Paciente</p>
                    <p className="font-medium text-foreground-800">{selectedMessage.patientName} ({selectedMessage.patientId})</p>
                  </div>
                )}
                {selectedMessage.httpStatus && (
                  <div className="p-2.5 bg-background-50 rounded-lg border border-secondary-200">
                    <p className="text-foreground-400 mb-0.5">HTTP Status</p>
                    <p className={`font-medium ${selectedMessage.httpStatus >= 200 && selectedMessage.httpStatus < 300 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {selectedMessage.httpStatus}
                    </p>
                  </div>
                )}
                {selectedMessage.errorMessage && (
                  <div className="p-2.5 bg-red-50 rounded-lg border border-red-200 col-span-2">
                    <p className="text-red-400 mb-0.5">Error</p>
                    <p className="font-medium text-red-700">{selectedMessage.errorMessage}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadJson(selectedMessage)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg transition-base cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-download-line"></i> Descargar JSON
                </button>
                <button
                  onClick={() => handlePrintTransmission(selectedMessage)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-foreground-700 bg-background-50 hover:bg-secondary-100 border border-secondary-200 rounded-lg transition-base cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-printer-line"></i> Imprimir comprobante
                </button>
              </div>

              <div>
                <p className="text-xs font-semibold text-foreground-700 mb-2">Payload enviado / recibido</p>
                <pre className="p-3 bg-secondary-100 rounded-lg text-xs text-foreground-700 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed border border-secondary-200">
                  {selectedMessage.rawPayload}
                </pre>
              </div>

              {selectedMessage.responsePayload && (
                <div>
                  <p className="text-xs font-semibold text-foreground-700 mb-2">Respuesta del servidor</p>
                  <pre className="p-3 bg-secondary-100 rounded-lg text-xs text-foreground-700 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed border border-secondary-200">
                    {selectedMessage.responsePayload}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}