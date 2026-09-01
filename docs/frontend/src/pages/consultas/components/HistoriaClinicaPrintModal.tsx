import { useEffect, useMemo } from 'react';
import { getHistoriaClinicaByPatient, type HistoriaClinica } from '@/mocks/historiaClinica';
import { getPatientById } from '@/mocks/patients';
import { sucursales } from '@/mocks/branches';
import { exportElementToPDF } from '@/utils/exportUtils';
import InstitucionalLogo from '@/components/feature/InstitucionalLogo';
import FirmaDigital from '@/components/feature/FirmaDigital';
import { doctors } from '@/mocks/doctors';

interface HistoriaClinicaPrintModalProps {
  patientId: string;
  isOpen: boolean;
  onClose: () => void;
}

function formatearFecha(fecha: string): string {
  if (!fecha) return '—';
  const [y, m, d] = fecha.split('-');
  const meses = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
  ];
  return `${parseInt(d)} de ${meses[parseInt(m) - 1]} de ${y}`;
}

export default function HistoriaClinicaPrintModal({ patientId, isOpen, onClose }: HistoriaClinicaPrintModalProps) {
  const patient = useMemo(() => getPatientById(patientId), [patientId]);
  const hc = useMemo(() => getHistoriaClinicaByPatient(patientId), [patientId]);
  const sucursal = sucursales[0];
  const doctor = useMemo(() => doctors.find((d) => d.nombre === hc?.creadoPor), [hc?.creadoPor]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('printing-historia-clinica');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('printing-historia-clinica');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('printing-historia-clinica');
    };
  }, [isOpen]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const wrapper = document.getElementById('historia-clinica-print-wrapper');
    if (!wrapper) return;
    await exportElementToPDF(
      wrapper,
      `HistoriaClinica_${patient ? `${patient.nombre}_${patient.apellidos}` : patientId}`.replace(/\s+/g, '_'),
      { title: `Historia Clínica — ${patient ? `${patient.nombre} ${patient.apellidos}` : ''}`, orientation: 'portrait', margin: 0 },
    );
  };

  if (!isOpen) return null;

  if (!hc || !patient) {
    return (
      <>
        <div className="fixed inset-0 bg-black/60 z-[100] print:hidden" />
        <div className="historia-clinica-print-modal-root fixed inset-0 z-[101] flex items-center justify-center print:hidden">
          <div className="bg-background-50 rounded-xl p-8 max-w-sm w-full mx-4 text-center">
            <p className="text-sm text-foreground-600 mb-4">Historia Clínica no disponible para este paciente.</p>
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-secondary-100 text-foreground-700 rounded-lg hover:bg-secondary-200 transition-base cursor-pointer">
              Cerrar
            </button>
          </div>
        </div>
      </>
    );
  }

  const nombreCompleto = `${patient.nombre} ${patient.apellidos}`;

  const tabaqLabel = hc.apnp.tabaquismo === 'negado' ? 'Negado' : hc.apnp.tabaquismo === 'activo' ? 'Activo' : 'Ex-fumador';
  const alcolLabel = hc.apnp.alcoholismo === 'negado' ? 'Negado' : hc.apnp.alcoholismo === 'ocasional' ? 'Ocasional' : 'Frecuente';
  const toxiLabel = hc.apnp.toxicomanias === 'negado' ? 'Negado' : 'Presente';
  const actFisLabel = { sedentario: 'Sedentario', leve: 'Leve', moderado: 'Moderado', intenso: 'Intenso' }[hc.apnp.actividadFisica];
  const inmunLabel = { completo: 'Completo', incompleto: 'Incompleto', desconocido: 'Desconocido' }[hc.apnp.inmunizaciones];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 z-[100] print:hidden" />

      {/* Modal root */}
      <div className="historia-clinica-print-modal-root fixed inset-0 z-[101] flex items-start justify-center overflow-y-auto print:static print:overflow-visible print:z-auto print:block">
        <div className="relative w-full max-w-[210mm] min-h-[297mm] mx-auto my-4 bg-background-50 print:bg-white print:m-0 print:shadow-none print:max-w-none print:w-full print:min-h-0">
          <div id="historia-clinica-print-wrapper" className="bg-background-50 print:bg-white print:text-black">

            {/* Header Institucional */}
            <div className="px-10 pt-10 pb-6 border-b-2 border-primary-500/20 print:border-gray-300">
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-start gap-4">
                  <InstitucionalLogo
                    fallbackIcon="ri-folder-history-line"
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

            {/* Título NOM-004 */}
            <div className="px-10 py-5 text-center border-b border-secondary-200 print:border-gray-300">
              <h1 className="text-2xl font-bold text-foreground-950 tracking-wide font-heading print:text-black">HISTORIA CLÍNICA</h1>
              <p className="text-xs text-foreground-500 mt-1 font-mono print:text-gray-600">NOM-004-SSA3-2012 · Documento clínico completo</p>
              <p className="text-xs text-foreground-500 print:text-gray-600">
                Creada: {formatearFecha(hc.fechaCreacion)} · Actualizada: {formatearFecha(hc.fechaActualizacion)}
              </p>
            </div>

            {/* Ficha de Identificación */}
            <div className="px-10 py-5 grid grid-cols-2 gap-6 print:gap-8">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Datos del Paciente</p>
                <p className="text-sm font-semibold text-foreground-900 print:text-black">{nombreCompleto}</p>
                <div className="text-xs text-foreground-500 mt-1 space-y-0.5 print:text-gray-600">
                  <p>Expediente: <span className="font-medium text-foreground-700 print:text-black">{patient.expediente}</span></p>
                  <p>Edad: <span className="font-medium text-foreground-700 print:text-black">{patient.edad} años</span> · Sexo: <span className="font-medium text-foreground-700 print:text-black">{patient.sexo === 'F' ? 'Femenino' : 'Masculino'}</span></p>
                  <p>CURP: <span className="font-medium text-foreground-700 print:text-black">{patient.curp}</span></p>
                  <p>Fecha Nac.: <span className="font-medium text-foreground-700 print:text-black">{formatearFecha(patient.fechaNacimiento)}</span></p>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 print:text-gray-500">Médico y Aseguradora</p>
                <p className="text-sm font-semibold text-foreground-900 print:text-black">{hc.creadoPor}</p>
                <div className="text-xs text-foreground-500 mt-1 space-y-0.5 print:text-gray-600">
                  {doctor && <p>Especialidad: <span className="font-medium text-foreground-700 print:text-black">{doctor.especialidad}</span></p>}
                  {doctor && <p>Cédula: <span className="font-medium text-foreground-700 print:text-black">{doctor.cedula}</span></p>}
                  <p>Aseguradora: <span className="font-medium text-foreground-700 print:text-black">{patient.aseguradora || 'Particular'}</span></p>
                  {patient.poliza && <p>Póliza: <span className="font-medium text-foreground-700 print:text-black">{patient.poliza}</span></p>}
                  <p>Ocupación: <span className="font-medium text-foreground-700 print:text-black">{hc.apnp.ocupacion || '—'}</span></p>
                </div>
              </div>
            </div>

            {/* Antecedentes Heredofamiliares */}
            <PrintSection title="Antecedentes Heredofamiliares">
              {hc.ahf.length === 0 ? (
                <p className="text-xs text-foreground-500 italic print:text-gray-500">Sin antecedentes heredofamiliares registrados.</p>
              ) : (
                <div className="space-y-2">
                  {hc.ahf.map((a) => (
                    <div key={a.id} className="border-l-2 border-primary-300 pl-3 print:border-gray-400">
                      <p className="text-xs font-semibold text-foreground-800 print:text-black">{a.parentesco}</p>
                      {a.condiciones.length > 0 && (
                        <p className="text-xs text-foreground-600 print:text-gray-600">{a.condiciones.join(', ')}</p>
                      )}
                      {a.detalle && <p className="text-xs text-foreground-500 italic print:text-gray-500">{a.detalle}</p>}
                    </div>
                  ))}
                </div>
              )}
            </PrintSection>

            {/* Antecedentes No Patológicos */}
            <PrintSection title="Antecedentes Personales No Patológicos">
              <div className="grid grid-cols-2 gap-3 print:grid-cols-3">
                <PrintField label="Tabaquismo" value={tabaqLabel + (hc.apnp.tabaquismoDetalle ? ` — ${hc.apnp.tabaquismoDetalle}` : '')} />
                <PrintField label="Alcoholismo" value={alcolLabel + (hc.apnp.alcoholismoDetalle ? ` — ${hc.apnp.alcoholismoDetalle}` : '')} />
                <PrintField label="Toxicomanías" value={toxiLabel + (hc.apnp.toxicomaniasDetalle ? ` — ${hc.apnp.toxicomaniasDetalle}` : '')} />
                <PrintField label="Actividad física" value={actFisLabel} />
                <PrintField label="Horas de sueño" value={hc.apnp.horasSueno || '—'} />
                <PrintField label="Inmunizaciones" value={inmunLabel} />
                <PrintField label="Alimentación" value={hc.apnp.alimentacion || '—'} />
                <PrintField label="Vivienda" value={hc.apnp.vivienda || '—'} />
                <PrintField label="Riesgo laboral" value={hc.apnp.riesgoLaboral || '—'} />
              </div>
            </PrintSection>

            {/* Antecedentes Patológicos */}
            <PrintSection title="Antecedentes Personales Patológicos">
              {hc.app.length === 0 ? (
                <p className="text-xs text-foreground-500 italic print:text-gray-500">Sin antecedentes patológicos registrados.</p>
              ) : (
                <div className="space-y-1.5">
                  {hc.app.map((a) => (
                    <div key={a.id} className="flex items-start gap-3 border-l-2 border-amber-300 pl-3 print:border-gray-400">
                      <span className="text-xs font-semibold text-amber-700 whitespace-nowrap print:text-black">{a.tipo}</span>
                      <span className="text-xs text-foreground-700 print:text-black">{a.descripcion}</span>
                      {a.anio && <span className="text-xs text-foreground-400 whitespace-nowrap ml-auto print:text-gray-500">{a.anio}</span>}
                    </div>
                  ))}
                </div>
              )}
            </PrintSection>

            {/* Antecedentes Gineco-Obstétricos */}
            {hc.ago && patient.sexo === 'F' && (
              <PrintSection title="Antecedentes Gineco-Obstétricos">
                <div className="grid grid-cols-3 gap-3">
                  <PrintField label="Menarca" value={hc.ago.menarca || '—'} />
                  <PrintField label="Ritmo" value={hc.ago.ritmo || '—'} />
                  <PrintField label="FUM" value={hc.ago.fum || '—'} />
                  <PrintField label="G / P / A / C" value={`${hc.ago.gestas}/${hc.ago.partos}/${hc.ago.abortos}/${hc.ago.cesareas}`} />
                  <PrintField label="Anticonceptivo" value={hc.ago.metodoAnticonceptivo || '—'} />
                  <PrintField label="Papanicolau" value={hc.ago.ultimoPapanicolau || '—'} />
                  <PrintField label="Mastografía" value={hc.ago.mastografia || '—'} />
                </div>
              </PrintSection>
            )}

            {/* Interrogatorio por Aparatos y Sistemas */}
            <PrintSection title="Interrogatorio por Aparatos y Sistemas">
              <div className="grid grid-cols-2 gap-2 print:grid-cols-2">
                {hc.interrogatorio.map((s) => (
                  <div key={s.id} className={`p-2 rounded-lg border text-xs print:rounded-none ${s.estado === 'anormal' ? 'bg-red-500/5 border-red-200 print:bg-gray-100 print:border-gray-400' : 'bg-background-50 border-secondary-100 print:bg-white print:border-gray-200'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-foreground-800 print:text-black">{s.sistema}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${s.estado === 'anormal' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'} print:text-black print:bg-transparent`}>
                        {s.estado === 'anormal' ? 'Anormal' : 'Normal'}
                      </span>
                    </div>
                    {s.estado === 'anormal' && s.detalle && (
                      <p className="text-foreground-600 mt-0.5 print:text-gray-600">{s.detalle}</p>
                    )}
                  </div>
                ))}
              </div>
            </PrintSection>

            {/* Observaciones */}
            {hc.observaciones && (
              <PrintSection title="Observaciones Generales">
                <div className="bg-background-50 border border-secondary-100 rounded-lg p-4 print:bg-gray-50 print:border-gray-300 print:rounded-none">
                  <p className="text-xs text-foreground-700 leading-relaxed whitespace-pre-wrap print:text-black">{hc.observaciones}</p>
                </div>
              </PrintSection>
            )}

            {/* Alergias y alertas */}
            {(patient.alergias.length > 0 || patient.alertas.length > 0) && (
              <PrintSection title="Alergias y Alertas Clínicas">
                <div className="flex flex-wrap gap-2">
                  {patient.alergias.map((a) => (
                    <span key={a} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200 print:border-gray-400 print:bg-gray-100 print:text-black">
                      <i className="ri-error-warning-line text-[10px]"></i> Alergia: {a}
                    </span>
                  ))}
                  {patient.alertas.map((a) => (
                    <span key={a} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-800 border border-red-200 print:border-gray-400 print:bg-gray-100 print:text-black">
                      <i className="ri-alert-line text-[10px]"></i> {a}
                    </span>
                  ))}
                </div>
              </PrintSection>
            )}

            {/* Firma */}
            <div className="px-10 py-8 mt-4 print:mt-8">
              <div className="flex justify-end">
                <div className="text-center">
                  <FirmaDigital
                    doctorId={doctor?.id}
                    nombre={hc.creadoPor}
                    cedula={doctor?.cedula}
                    lineClassName="w-56 border-b border-foreground-400 mb-2 print:border-gray-600"
                  />
                  <p className="text-sm font-semibold text-foreground-900 print:text-black">{hc.creadoPor}</p>
                  {doctor && <p className="text-xs text-foreground-500 print:text-gray-600">{doctor.especialidad}</p>}
                  {doctor && <p className="text-xs text-foreground-500 print:text-gray-600">Cédula: {doctor.cedula}</p>}
                  <p className="text-2xs text-foreground-400 mt-2 print:text-gray-500">
                    Firma electrónica · Historia creada el {formatearFecha(hc.fechaCreacion)}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-10 py-4 border-t border-secondary-200 mt-auto print:border-gray-300 print:mt-4">
              <div className="flex items-center justify-between text-[10px] text-foreground-400 print:text-gray-500">
                <p>Documento generado conforme a la NOM-004-SSA3-2012.</p>
                <p>MediCore · {sucursal.telefono} · {sucursal.email}</p>
              </div>
              <p className="text-[10px] text-foreground-400 mt-1 text-center print:text-gray-500">
                Esta Historia Clínica forma parte del expediente clínico electrónico del paciente.
              </p>
            </div>
          </div>

          {/* Actions - hidden on print */}
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
                <i className="ri-printer-line"></i> Imprimir Historia Clínica
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          html, body {
            background: #ffffff !important;
            overflow: visible !important;
            height: auto !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body.printing-historia-clinica #root {
            display: none !important;
          }
          .historia-clinica-print-modal-root {
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
          .historia-clinica-print-modal-root > div {
            max-width: none !important;
            min-height: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
          }
          #historia-clinica-print-wrapper {
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
          #historia-clinica-print-wrapper,
          #historia-clinica-print-wrapper * {
            visibility: visible !important;
          }
          #historia-clinica-print-wrapper .flex {
            display: flex !important;
          }
          #historia-clinica-print-wrapper .grid {
            display: grid !important;
          }
          #historia-clinica-print-wrapper .hidden,
          #historia-clinica-print-wrapper [class*="print:hidden"] {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}

function PrintSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-10 py-4">
      <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-3 print:text-gray-500">{title}</p>
      {children}
    </div>
  );
}

function PrintField({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 bg-background-50 border border-secondary-100 rounded-lg print:bg-gray-50 print:border-gray-200 print:rounded-none">
      <p className="text-2xs text-foreground-400 mb-0.5 print:text-gray-500">{label}</p>
      <p className="text-xs font-medium text-foreground-800 print:text-black">{value}</p>
    </div>
  );
}