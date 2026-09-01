import { useEffect, useMemo } from 'react';
import { getPatientById } from '@/mocks/patients';
import { triagePacientes, type TriageRecord } from '@/mocks/triage';
import { getConsultasByPatient, type Consultation } from '@/mocks/consultas';
import { urgenciasMock, urgenciaConfig, estadoUrgenciaConfig, destinoAltaConfig, type Urgencia } from '@/mocks/urgencias';
import { getRecetasByPatient } from '@/mocks/recetas';
import { getEstudiosByPatient } from '@/mocks/estudios';
import { getCertificadosByPatient, tipoCertificadoConfig } from '@/mocks/certificados';
import { getConsentimientosByPatient, tipoConsentimientoConfig } from '@/mocks/consentimientos';
import { getSolicitudesByPatient, tipoARCOConfig, estadoARCOConfig } from '@/mocks/derechosARCO';
import { getReferenciasByPatient, urgenciaConfigRef, estadoRefConfig } from '@/mocks/referencias';
import { getEgresosByPatient, estadoAltaConfig, destinoAltaConfigEgreso } from '@/mocks/egresos';
import { notasEnfermeriaMock, turnoConfig } from '@/mocks/notasEnfermeria';
import { sucursales } from '@/mocks/branches';
import { exportElementToPDF, exportElementToPDFBlob } from '@/utils/exportUtils';
import InstitucionalLogo from '@/components/feature/InstitucionalLogo';

interface ExpedientePrintModalProps {
  patientId: string;
  isOpen: boolean;
  onClose: () => void;
}

function formatearFecha(fecha: string): string {
  if (!fecha) return '—';
  const [y, m, d] = fecha.split('-');
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`;
}

const triageNivelConfig: Record<string, { label: string; text: string; bg: string }> = {
  rojo: { label: 'Emergencia', text: 'text-red-700', bg: 'bg-red-100' },
  naranja: { label: 'Urgencia', text: 'text-orange-700', bg: 'bg-orange-100' },
  amarillo: { label: 'Preferente', text: 'text-amber-700', bg: 'bg-amber-100' },
  verde: { label: 'No urgente', text: 'text-emerald-700', bg: 'bg-emerald-100' },
};

type EntryType = 'triage' | 'consulta' | 'urgencia';

interface Entry {
  id: string;
  type: EntryType;
  fecha: string;
  hora: string;
  sortKey: string;
  triage?: TriageRecord;
  consulta?: Consultation;
  urgencia?: Urgencia;
}

export default function ExpedientePrintModal({ patientId, isOpen, onClose }: ExpedientePrintModalProps) {
  const patient = useMemo(() => getPatientById(patientId), [patientId]);
  const sucursal = sucursales[0];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('printing-expediente');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('printing-expediente');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('printing-expediente');
    };
  }, [isOpen]);

  const entries = useMemo<Entry[]>(() => {
    const all: Entry[] = [];
    const tp = triagePacientes.find((t) => t.id === patientId);
    if (tp) {
      tp.historialTriage.forEach((t) => {
        all.push({ id: t.id, type: 'triage', fecha: t.fecha, hora: t.hora, sortKey: `${t.fecha}T${t.hora}`, triage: t });
      });
    }
    getConsultasByPatient(patientId).forEach((c) => {
      all.push({ id: c.id, type: 'consulta', fecha: c.fecha, hora: c.hora, sortKey: `${c.fecha}T${c.hora}`, consulta: c });
    });
    urgenciasMock.filter((u) => u.patientId === patientId).forEach((u) => {
      all.push({ id: u.id, type: 'urgencia', fecha: u.fecha, hora: u.horaLlegada, sortKey: `${u.fecha}T${u.horaLlegada}`, urgencia: u });
    });
    return all.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [patientId]);

  const recetas = useMemo(() => getRecetasByPatient(patientId), [patientId]);
  const estudios = useMemo(() => getEstudiosByPatient(patientId), [patientId]);
  const certificados = useMemo(() => getCertificadosByPatient(patientId), [patientId]);
  const consentimientos = useMemo(() => getConsentimientosByPatient(patientId), [patientId]);
  const solicitudes = useMemo(() => getSolicitudesByPatient(patientId), [patientId]);
  const referencias = useMemo(() => getReferenciasByPatient(patientId), [patientId]);
  const egresos = useMemo(() => getEgresosByPatient(patientId), [patientId]);
  const notasEnf = useMemo(() => notasEnfermeriaMock.filter((n) => n.patientId === patientId), [patientId]);

  const handlePrint = async () => {
    const wrapper = document.getElementById('expediente-print-wrapper');
    if (!wrapper) return;
    const blob = await exportElementToPDFBlob(wrapper, {
      title: `Expediente Clínico — ${patient?.nombre} ${patient?.apellidos}`,
      orientation: 'portrait',
      margin: 0,
    });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const handleDownloadPDF = async () => {
    const wrapper = document.getElementById('expediente-print-wrapper');
    if (!wrapper) return;
    const nombre = `${patient?.nombre || 'Paciente'}_${patient?.apellidos || ''}`.replace(/\s+/g, '_');
    await exportElementToPDF(wrapper, `Expediente_${nombre}`, {
      title: `Expediente Clínico — ${patient?.nombre} ${patient?.apellidos}`,
      orientation: 'portrait',
      margin: 0,
    });
  };

  if (!isOpen || !patient) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[100] print:hidden" />
      <div className="expediente-print-modal-root fixed inset-0 z-[101] flex items-start justify-center overflow-y-auto print:static print:overflow-visible print:z-auto print:block">
        <div className="relative w-full max-w-[210mm] min-h-[297mm] mx-auto my-4 bg-background-50 print:bg-white print:m-0 print:shadow-none print:max-w-none print:w-full print:min-h-0">
          <div id="expediente-print-wrapper" className="bg-background-50 print:bg-white print:text-black">

            {/* Header */}
            <div className="px-10 pt-10 pb-6 border-b-2 border-primary-500/20 print:border-gray-300">
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-start gap-4">
                  <InstitucionalLogo
                    fallbackClassName="w-14 h-14 rounded-xl bg-primary-500 text-white flex items-center justify-center flex-shrink-0 print:bg-gray-800"
                    imgClassName="w-14 h-14 object-contain flex-shrink-0"
                  />
                  <div>
                    <h2 className="text-xl font-bold text-foreground-900 font-heading print:text-black">MediCore</h2>
                    <p className="text-xs text-foreground-500 mt-0.5 print:text-gray-600">Sistema Integral de Gestión Médica</p>
                    <p className="text-xs text-foreground-500 print:text-gray-600">{sucursal.nombre}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xs text-foreground-400 print:text-gray-500">{sucursal.direccion}</p>
                  <p className="text-2xs text-foreground-400 print:text-gray-500">{sucursal.ciudad}, {sucursal.estado} {sucursal.codigoPostal}</p>
                  <p className="text-2xs text-foreground-400 mt-1 print:text-gray-500">Tel: {sucursal.telefono}</p>
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="px-10 py-5 text-center border-b border-secondary-200 print:border-gray-300">
              <h1 className="text-2xl font-bold text-foreground-950 tracking-wide font-heading print:text-black">EXPEDIENTE CLÍNICO COMPLETO</h1>
              <p className="text-xs text-foreground-500 mt-1 font-mono print:text-gray-600">NOM-004-SSA3-2012 · Resumen integral de atención</p>
              <p className="text-xs text-foreground-500 print:text-gray-600">Generado: {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            </div>

            {/* Datos del paciente */}
            <div className="px-10 py-5">
              <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-3 print:text-gray-500">Datos del paciente</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <InfoBox label="Paciente" value={`${patient.nombre} ${patient.apellidos}`} />
                <InfoBox label="Expediente" value={patient.expediente} />
                <InfoBox label="CURP" value={patient.curp} />
                <InfoBox label="Edad" value={`${patient.edad} años`} />
                <InfoBox label="Sexo" value={patient.sexo === 'M' ? 'Masculino' : 'Femenino'} />
                <InfoBox label="Fecha de nacimiento" value={formatearFecha(patient.fechaNacimiento)} />
                <InfoBox label="Teléfono" value={patient.telefono} />
                <InfoBox label="Médico asignado" value={patient.medicoAsignado} />
                <InfoBox label="Aseguradora" value={patient.aseguradora || 'Particular'} />
              </div>

              {(patient.alergias.length > 0 || patient.alertas.length > 0) && (
                <div className="mt-4 space-y-2">
                  {patient.alergias.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg print:rounded-none">
                      <p className="text-2xs font-semibold text-amber-700 uppercase mb-1">Alergias</p>
                      <p className="text-sm text-foreground-800 print:text-black">{patient.alergias.join(', ')}</p>
                    </div>
                  )}
                  {patient.alertas.length > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg print:rounded-none">
                      <p className="text-2xs font-semibold text-red-700 uppercase mb-1">Alertas clínicas</p>
                      <p className="text-sm text-foreground-800 print:text-black">{patient.alertas.join(', ')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Historial clínico */}
            <PrintSection title="Historial clínico" count={entries.length}>
              {entries.length === 0 ? (
                <p className="text-sm text-foreground-500 italic print:text-gray-600">Sin registros clínicos.</p>
              ) : (
                <div className="space-y-4">
                  {entries.map((entry, i) => (
                    <div key={entry.id} className="p-4 border border-secondary-200 rounded-lg print:border-gray-300 print:rounded-none">
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 flex items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold print:bg-gray-200 print:text-black">
                            {i + 1}
                          </span>
                          <span className="text-sm font-bold text-foreground-900 uppercase print:text-black">
                            {entry.type === 'triage' ? 'Triage' : entry.type === 'consulta' ? 'Consulta' : 'Urgencia'}
                          </span>
                          {entry.triage && entry.triage.nivelUrgencia && (
                            <span className={`px-2 py-0.5 rounded-full text-2xs font-semibold ${triageNivelConfig[entry.triage.nivelUrgencia]?.bg || 'bg-secondary-100'} ${triageNivelConfig[entry.triage.nivelUrgencia]?.text || 'text-foreground-600'}`}>
                              {triageNivelConfig[entry.triage.nivelUrgencia]?.label || entry.triage.nivelUrgencia}
                            </span>
                          )}
                          {entry.urgencia && (
                            <span className={`px-2 py-0.5 rounded-full text-2xs font-semibold ${urgenciaConfig[entry.urgencia.nivelUrgencia].bg} ${urgenciaConfig[entry.urgencia.nivelUrgencia].text}`}>
                              {urgenciaConfig[entry.urgencia.nivelUrgencia].label}
                            </span>
                          )}
                        </div>
                        <span className="text-2xs text-foreground-400 print:text-gray-500">{formatearFecha(entry.fecha)} · {entry.hora} hrs</span>
                      </div>

                      {entry.triage && (
                        <div className="space-y-1 text-xs text-foreground-700 print:text-black">
                          <p><strong>Realizado por:</strong> {entry.triage.realizadoPor}</p>
                          {entry.triage.notas && <p className="whitespace-pre-line">{entry.triage.notas}</p>}
                        </div>
                      )}

                      {entry.consulta && (
                        <div className="space-y-1 text-xs text-foreground-700 print:text-black">
                          <p><strong>{entry.consulta.especialidad}</strong> · {entry.consulta.doctorName}</p>
                          <p><strong>Motivo:</strong> {entry.consulta.motivo}</p>
                          {entry.consulta.padecimientoActual && <p><strong>Padecimiento:</strong> {entry.consulta.padecimientoActual}</p>}
                          {entry.consulta.exploracionFisica && <p><strong>Exploración:</strong> {entry.consulta.exploracionFisica}</p>}
                          <p><strong>Diagnóstico:</strong> {entry.consulta.diagnosticoPrincipal}</p>
                          {entry.consulta.diagnosticosSecundarios.length > 0 && (
                            <p><strong>Secundarios:</strong> {entry.consulta.diagnosticosSecundarios.join(', ')}</p>
                          )}
                          {entry.consulta.planTratamiento && <p><strong>Plan:</strong> {entry.consulta.planTratamiento}</p>}
                        </div>
                      )}

                      {entry.urgencia && (
                        <div className="space-y-1 text-xs text-foreground-700 print:text-black">
                          <p><strong>Motivo:</strong> {entry.urgencia.motivo}</p>
                          {entry.urgencia.doctorName && <p><strong>Médico:</strong> {entry.urgencia.doctorName}</p>}
                          {entry.urgencia.notaMedica && <p className="whitespace-pre-line">{entry.urgencia.notaMedica}</p>}
                          {entry.urgencia.destinoAlta && (
                            <p><strong>Destino:</strong> {destinoAltaConfig[entry.urgencia.destinoAlta].label} · {estadoUrgenciaConfig[entry.urgencia.estado].label}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </PrintSection>

            {/* Documentos generados */}
            <PrintSection title="Documentos generados" count={recetas.length + estudios.length + certificados.length}>
              {recetas.length === 0 && estudios.length === 0 && certificados.length === 0 ? (
                <p className="text-sm text-foreground-500 italic print:text-gray-600">Sin recetas, estudios ni certificados.</p>
              ) : (
                <div className="space-y-4">
                  {recetas.length > 0 && (
                    <div>
                      <p className="text-2xs font-semibold text-foreground-500 uppercase mb-2 print:text-gray-600">Recetas ({recetas.length})</p>
                      <div className="space-y-2">
                        {recetas.map((r) => (
                          <div key={r.id} className="text-xs text-foreground-700 print:text-black">
                            <span className="font-medium">{r.doctorName}</span> · {formatearFecha(r.fecha)} — {r.medicamentos.map((m) => `${m.nombre} ${m.concentracion}`).join(', ')}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {estudios.length > 0 && (
                    <div>
                      <p className="text-2xs font-semibold text-foreground-500 uppercase mb-2 print:text-gray-600">Estudios ({estudios.length})</p>
                      <div className="space-y-2">
                        {estudios.map((e) => (
                          <div key={e.id} className="text-xs text-foreground-700 print:text-black">
                            <span className="font-medium">{e.nombre}</span> · {formatearFecha(e.fechaSolicitud)} · {e.estado}
                            {e.resultado && e.estado === 'completado' ? ` — ${e.resultado}` : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {certificados.length > 0 && (
                    <div>
                      <p className="text-2xs font-semibold text-foreground-500 uppercase mb-2 print:text-gray-600">Certificados ({certificados.length})</p>
                      <div className="space-y-2">
                        {certificados.map((c) => (
                          <div key={c.id} className="text-xs text-foreground-700 print:text-black">
                            <span className="font-medium">{tipoCertificadoConfig[c.tipo].label}</span> · {c.folio} · {formatearFecha(c.fecha)}
                            {c.estado === 'anulado' ? ' · Anulado' : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </PrintSection>

            {/* Normatividad */}
            <PrintSection title="Normatividad y gestión legal" count={consentimientos.length + solicitudes.length + referencias.length + egresos.length + notasEnf.length}>
              {consentimientos.length === 0 && solicitudes.length === 0 && referencias.length === 0 && egresos.length === 0 && notasEnf.length === 0 ? (
                <p className="text-sm text-foreground-500 italic print:text-gray-600">Sin registros normativos.</p>
              ) : (
                <div className="space-y-4">
                  {consentimientos.length > 0 && (
                    <div>
                      <p className="text-2xs font-semibold text-foreground-500 uppercase mb-2 print:text-gray-600">Consentimientos informados ({consentimientos.length})</p>
                      {consentimientos.map((c) => (
                        <div key={c.id} className="text-xs text-foreground-700 print:text-black mb-1">
                          <span className="font-medium">{tipoConsentimientoConfig[c.tipo].label}</span> · {c.estado} · {c.fechaFirma || 'Pendiente'}
                        </div>
                      ))}
                    </div>
                  )}
                  {solicitudes.length > 0 && (
                    <div>
                      <p className="text-2xs font-semibold text-foreground-500 uppercase mb-2 print:text-gray-600">Derechos ARCO ({solicitudes.length})</p>
                      {solicitudes.map((s) => (
                        <div key={s.id} className="text-xs text-foreground-700 print:text-black mb-1">
                          <span className="font-medium">{tipoARCOConfig[s.tipo].label}</span> · {estadoARCOConfig[s.estado].label} · {s.fechaSolicitud}
                        </div>
                      ))}
                    </div>
                  )}
                  {referencias.length > 0 && (
                    <div>
                      <p className="text-2xs font-semibold text-foreground-500 uppercase mb-2 print:text-gray-600">Referencias / contrarreferencias ({referencias.length})</p>
                      {referencias.map((r) => (
                        <div key={r.id} className="text-xs text-foreground-700 print:text-black mb-1">
                          <span className="font-medium">{r.tipo === 'referencia' ? 'Referencia' : 'Contrarreferencia'}</span> · {urgenciaConfigRef[r.urgencia].label} · {estadoRefConfig[r.estado].label} · {r.fecha}
                        </div>
                      ))}
                    </div>
                  )}
                  {egresos.length > 0 && (
                    <div>
                      <p className="text-2xs font-semibold text-foreground-500 uppercase mb-2 print:text-gray-600">Hojas de egreso ({egresos.length})</p>
                      {egresos.map((e) => (
                        <div key={e.id} className="text-xs text-foreground-700 print:text-black mb-1">
                          <span className="font-medium">{e.diagnosticoEgreso}</span> · {estadoAltaConfig[e.estadoAlta].label} · {destinoAltaConfigEgreso[e.destinoAlta].label} · {e.fechaEgreso}
                        </div>
                      ))}
                    </div>
                  )}
                  {notasEnf.length > 0 && (
                    <div>
                      <p className="text-2xs font-semibold text-foreground-500 uppercase mb-2 print:text-gray-600">Notas de enfermería ({notasEnf.length})</p>
                      {notasEnf.map((n) => (
                        <div key={n.id} className="text-xs text-foreground-700 print:text-black mb-1">
                          <span className="font-medium">{turnoConfig[n.turno].label}</span> · {n.enfermera} · {n.fecha} {n.horaInicio}–{n.horaFin}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </PrintSection>

            {/* Footer */}
            <div className="px-10 py-4 border-t border-secondary-200 print:border-gray-300">
              <div className="flex items-center justify-between text-[10px] text-foreground-400 print:text-gray-500">
                <p>Este documento forma parte del expediente clínico conforme a la NOM-004-SSA3-2012.</p>
                <p>MediCore · {sucursal.telefono} · {sucursal.email}</p>
              </div>
              <p className="text-[10px] text-foreground-400 mt-1 text-center print:text-gray-500">
                Información confidencial. Su manejo se rige por la LFPDPPP y la NOM-004-SSA3-2012.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="sticky bottom-0 left-0 right-0 bg-background-50/95 backdrop-blur border-t border-secondary-200 p-4 flex items-center justify-between gap-3 print:hidden">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-foreground-600 hover:text-foreground-800 hover:bg-secondary-100 rounded-lg transition-base cursor-pointer whitespace-nowrap"
            >
              Cerrar
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPDF}
                className="px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg transition-base cursor-pointer whitespace-nowrap flex items-center gap-2"
              >
                <i className="ri-file-pdf-line"></i> Descargar PDF
              </button>
              <button
                onClick={handlePrint}
                className="px-6 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-base cursor-pointer whitespace-nowrap flex items-center gap-2"
              >
                <i className="ri-printer-line"></i> Imprimir expediente
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          html, body {
            background: #ffffff !important;
            overflow: visible !important;
            height: auto !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body.printing-expediente #root { display: none !important; }
          .expediente-print-modal-root {
            display: block !important;
            position: static !important;
            inset: auto !important;
            overflow: visible !important;
            background: none !important;
            z-index: auto !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .expediente-print-modal-root > div {
            max-width: none !important;
            min-height: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
          }
          #expediente-print-wrapper {
            display: block !important;
            position: static !important;
            width: 100% !important;
            min-height: 0 !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            box-shadow: none !important;
          }
          #expediente-print-wrapper, #expediente-print-wrapper * { visibility: visible !important; }
          #expediente-print-wrapper .flex { display: flex !important; }
          #expediente-print-wrapper .grid { display: grid !important; }
          #expediente-print-wrapper .hidden,
          #expediente-print-wrapper [class*="print:hidden"] { display: none !important; }
        }
      `}</style>
    </>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 bg-background-50 border border-secondary-100 rounded-lg print:bg-gray-50 print:border-gray-300 print:rounded-none">
      <p className="text-2xs text-foreground-400 uppercase print:text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-foreground-800 print:text-black">{value}</p>
    </div>
  );
}

function PrintSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="px-10 py-5 border-t border-secondary-200 print:border-gray-300">
      <h3 className="text-sm font-bold text-foreground-900 font-heading mb-3 print:text-black flex items-center gap-2">
        {title}
        <span className="px-1.5 py-0.5 rounded-full bg-secondary-200 text-foreground-600 text-2xs print:bg-gray-200 print:text-black">{count}</span>
      </h3>
      {children}
    </div>
  );
}