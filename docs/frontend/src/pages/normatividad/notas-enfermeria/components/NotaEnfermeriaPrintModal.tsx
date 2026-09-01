import { useEffect } from 'react';
import type { NotaEnfermeria } from '@/mocks/notasEnfermeria';
import { turnoConfig, estadoPacienteConfig, actividadTipoConfig } from '@/mocks/notasEnfermeria';
import { sucursales } from '@/mocks/branches';
import { exportElementToPDF } from '@/utils/exportUtils';
import InstitucionalLogo from '@/components/feature/InstitucionalLogo';

interface NotaEnfermeriaPrintModalProps {
  nota: NotaEnfermeria;
  isOpen: boolean;
  onClose: () => void;
}

export default function NotaEnfermeriaPrintModal({ nota, isOpen, onClose }: NotaEnfermeriaPrintModalProps) {
  const sucursal = sucursales[0];
  const turnoCfg = turnoConfig[nota.turno];
  const estIniCfg = estadoPacienteConfig[nota.estadoInicio];
  const estFinCfg = estadoPacienteConfig[nota.estadoFin];
  const folio = `NE-${nota.fecha.replace(/-/g, '')}-${nota.patientId.toUpperCase()}`;
  const dolorNum = parseInt(nota.dolorEva, 10);
  const dolorLabel = Number.isNaN(dolorNum) ? '—' : dolorNum <= 3 ? 'Leve' : dolorNum <= 6 ? 'Moderado' : 'Intenso';

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('printing-nota-enf');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('printing-nota-enf');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('printing-nota-enf');
    };
  }, [isOpen]);

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    const wrapper = document.getElementById('nota-enf-print-wrapper');
    if (!wrapper) return;
    await exportElementToPDF(wrapper, `NotaEnfermeria_${nota.patientName.replace(/\s+/g, '_')}_${nota.fecha}`, {
      title: `Nota de Enfermería — ${nota.patientName}`,
      orientation: 'portrait',
      margin: 0,
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[100] print:hidden" />
      <div className="nota-enf-print-modal-root fixed inset-0 z-[101] flex items-start justify-center overflow-y-auto print:static print:overflow-visible print:z-auto print:block">
        <div className="relative w-full max-w-[210mm] min-h-[297mm] mx-auto my-4 bg-background-50 print:bg-white print:m-0 print:shadow-none print:max-w-none print:w-full print:min-h-0">
          <div id="nota-enf-print-wrapper" className="bg-background-50 print:bg-white">

            {/* Header institucional */}
            <div className="px-10 pt-10 pb-6 border-b-2 border-primary-500/20">
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-start gap-4">
                  <InstitucionalLogo
                    fallbackIcon="ri-nurse-line"
                    fallbackClassName="w-14 h-14 rounded-xl bg-primary-500 text-white flex items-center justify-center flex-shrink-0"
                    imgClassName="w-14 h-14 object-contain flex-shrink-0"
                  />
                  <div>
                    <h2 className="text-xl font-bold text-foreground-900 font-heading">MediCore</h2>
                    <p className="text-xs text-foreground-500 mt-0.5">Sistema Integral de Gestión Médica</p>
                    <p className="text-xs text-foreground-500">{sucursal.nombre}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xs text-foreground-400">{sucursal.direccion}</p>
                  <p className="text-2xs text-foreground-400">{sucursal.ciudad}, {sucursal.estado}</p>
                  <p className="text-2xs text-foreground-400 mt-1">Tel: {sucursal.telefono}</p>
                </div>
              </div>
            </div>

            {/* Título */}
            <div className="px-10 py-5 text-center border-b border-secondary-200">
              <h1 className="text-2xl font-bold text-foreground-950 tracking-wide font-heading">NOTA DE ENFERMERÍA</h1>
              <p className="text-xs text-foreground-500 mt-1 font-mono">NOM-004-SSA3-2012 · Art. 6.3.4 · Folio: {folio}</p>
            </div>

            {/* Datos del paciente y turno */}
            <div className="px-10 py-5 grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2">Paciente</p>
                <p className="text-sm font-semibold text-foreground-900">{nota.patientName}</p>
                <div className="text-xs text-foreground-500 mt-1 space-y-0.5">
                  <p>Expediente: <span className="font-medium text-foreground-700">{nota.patientExpediente}</span></p>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2">Información del Turno</p>
                <div className="text-xs text-foreground-500 space-y-0.5">
                  <p>Fecha: <span className="font-medium text-foreground-700">{nota.fecha}</span></p>
                  <p>Turno: <span className="font-medium text-foreground-700">{turnoCfg.label} ({nota.horaInicio} – {nota.horaFin})</span></p>
                  <p>Enfermera: <span className="font-medium text-foreground-700">{nota.enfermera}</span></p>
                  <p>Cédula: <span className="font-medium text-foreground-700">{nota.cedulaEnfermera}</span></p>
                </div>
              </div>
            </div>

            {/* Estado del paciente */}
            <div className="mx-10 mb-4 grid grid-cols-3 gap-3">
              <div className={`p-3 rounded-lg border ${estIniCfg.bg}`}>
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-1">Estado al inicio</p>
                <p className={`text-sm font-bold ${estIniCfg.text}`}>{estIniCfg.label}</p>
              </div>
              <div className={`p-3 rounded-lg border ${estFinCfg.bg}`}>
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-1">Estado al final</p>
                <p className={`text-sm font-bold ${estFinCfg.text}`}>{estFinCfg.label}</p>
              </div>
              <div className="p-3 rounded-lg border bg-background-50 border-secondary-200">
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-1">Dolor EVA</p>
                <p className={`text-sm font-bold ${dolorNum <= 3 ? 'text-emerald-600' : dolorNum <= 6 ? 'text-amber-600' : 'text-red-600'}`}>
                  {nota.dolorEva}/10 — {dolorLabel}
                </p>
              </div>
            </div>

            {/* Signos vitales */}
            <div className="px-10 py-4">
              <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-3">Signos Vitales</p>
              <div className="grid grid-cols-3 gap-3">
                <VitalBox label="Temperatura" value={`${nota.temperatura} °C`} />
                <VitalBox label="Presión Arterial" value={`${nota.presionSistolica}/${nota.presionDiastolica} mmHg`} />
                <VitalBox label="Frecuencia Cardiaca" value={`${nota.frecuenciaCardiaca} lpm`} />
                <VitalBox label="Frecuencia Respiratoria" value={`${nota.frecuenciaRespiratoria} rpm`} />
                <VitalBox label="SpO₂" value={`${nota.saturacionOxigeno}%`} />
                <VitalBox label="Glucosa" value={`${nota.glucosa} mg/dL`} />
                <VitalBox label="Peso" value={`${nota.peso} kg`} />
                <VitalBox label="Talla" value={`${nota.talla} m`} />
              </div>
            </div>

            {/* Actividades */}
            {nota.actividades.length > 0 && (
              <div className="px-10 py-4">
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-3">Actividades Realizadas</p>
                <div className="space-y-2">
                  {nota.actividades.map((a) => {
                    const tipoCfg = actividadTipoConfig[a.tipo];
                    return (
                      <div key={a.id} className="flex items-start gap-3 p-3 bg-background-50 border border-secondary-200 rounded-lg">
                        <span className="text-2xs text-foreground-400 w-12 flex-shrink-0">{a.hora}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium border ${tipoCfg.color}`}>
                              <i className={`${tipoCfg.icon} text-[10px]`}></i> {tipoCfg.label}
                            </span>
                            <p className="text-xs text-foreground-700">{a.descripcion}</p>
                          </div>
                          {a.resultado && <p className="text-2xs text-foreground-500 mt-0.5">→ {a.resultado}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Medicamentos administrados */}
            {nota.medicamentos.length > 0 && (
              <div className="px-10 py-4">
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-3">Medicamentos Administrados</p>
                <div className="grid grid-cols-2 gap-3">
                  {nota.medicamentos.map((m, i) => (
                    <div key={i} className="p-3 bg-background-50 border border-secondary-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-foreground-800">{m.nombre}</p>
                        <span className="text-2xs text-foreground-400">{m.hora}</span>
                      </div>
                      <p className="text-2xs text-foreground-600 mt-0.5">{m.dosis} · {m.via}</p>
                      {m.observacion && <p className="text-2xs text-foreground-500 mt-0.5">{m.observacion}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Evolución y Plan */}
            <div className="px-10 py-4">
              <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2">Evolución de Enfermería</p>
              <div className="bg-background-50 border border-secondary-200 rounded-lg p-4">
                <p className="text-xs text-foreground-700 leading-relaxed whitespace-pre-wrap">{nota.evolucionEnfermeria}</p>
              </div>
            </div>

            <div className="px-10 py-4">
              <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2">Plan de Cuidados</p>
              <div className="bg-background-50 border border-secondary-200 rounded-lg p-4">
                <p className="text-xs text-foreground-700 leading-relaxed whitespace-pre-wrap">{nota.planCuidados}</p>
              </div>
            </div>

            {nota.observaciones && (
              <div className="px-10 py-4">
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2">Observaciones</p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-xs text-amber-800 whitespace-pre-wrap">{nota.observaciones}</p>
                </div>
              </div>
            )}

            {/* Firma */}
            <div className="px-10 py-8 mt-4">
              <div className="flex justify-end">
                <div className="text-center">
                  <div className="w-56 border-b border-foreground-400 mb-2"></div>
                  <p className="text-sm font-semibold text-foreground-900">{nota.enfermera}</p>
                  {nota.especialidad && <p className="text-xs text-foreground-500">{nota.especialidad}</p>}
                  <p className="text-xs text-foreground-500">Cédula Profesional: {nota.cedulaEnfermera}</p>
                  <p className="text-2xs text-foreground-400 mt-2">Firma electrónica · {nota.fecha} · {nota.horaFin} hrs</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-10 py-4 border-t border-secondary-200">
              <div className="flex items-center justify-between text-[10px] text-foreground-400">
                <p>Documento conforme a NOM-004-SSA3-2012 Art. 6.3.4. Forma parte del expediente clínico.</p>
                <p>MediCore · {sucursal.telefono}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="sticky bottom-0 left-0 right-0 bg-background-50/95 backdrop-blur border-t border-secondary-200 p-4 flex items-center justify-between gap-3 print:hidden">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-foreground-600 hover:text-foreground-800 hover:bg-secondary-100 rounded-lg transition-base cursor-pointer whitespace-nowrap">
              Cerrar
            </button>
            <div className="flex items-center gap-2">
              <button onClick={handleDownloadPDF} className="px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg transition-base cursor-pointer whitespace-nowrap flex items-center gap-2">
                <i className="ri-file-pdf-line"></i> Descargar PDF
              </button>
              <button onClick={handlePrint} className="px-6 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-base cursor-pointer whitespace-nowrap flex items-center gap-2">
                <i className="ri-printer-line"></i> Imprimir nota
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          html, body { background: #ffffff !important; overflow: visible !important; height: auto !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body.printing-nota-enf #root { display: none !important; }
          .nota-enf-print-modal-root { display: block !important; position: static !important; inset: auto !important; overflow: visible !important; background: none !important; z-index: auto !important; width: 100% !important; height: auto !important; margin: 0 !important; padding: 0 !important; }
          .nota-enf-print-modal-root > div { max-width: none !important; min-height: 0 !important; margin: 0 !important; background: #ffffff !important; box-shadow: none !important; }
          #nota-enf-print-wrapper { display: block !important; position: static !important; width: 100% !important; min-height: 0 !important; background: #ffffff !important; padding: 0 !important; margin: 0 !important; overflow: visible !important; box-shadow: none !important; }
          #nota-enf-print-wrapper, #nota-enf-print-wrapper * { visibility: visible !important; }
        }
      `}</style>
    </>
  );
}

function VitalBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 bg-background-50 border border-secondary-200 rounded-lg">
      <p className="text-2xs text-foreground-400 uppercase">{label}</p>
      <p className="text-sm font-semibold text-foreground-800 font-mono mt-0.5">{value}</p>
    </div>
  );
}