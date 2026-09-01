import { useEffect, useMemo } from 'react';
import type { TriagePatient, TriageRecord } from '@/mocks/triage';
import { getPatientById } from '@/mocks/patients';
import { sucursales } from '@/mocks/branches';
import { exportElementToPDF, exportElementToPDFBlob } from '@/utils/exportUtils';
import InstitucionalLogo from '@/components/feature/InstitucionalLogo';

interface VitalFormData {
  peso: string;
  talla: string;
  temperatura: string;
  presionSistolica: string;
  presionDiastolica: string;
  frecuenciaCardiaca: string;
  frecuenciaRespiratoria: string;
  saturacionOxigeno: string;
  glucosa: string;
  dolor: string;
  notas: string;
  nivelUrgencia: TriageRecord['nivelUrgencia'];
}

interface TriagePrintModalProps {
  paciente: TriagePatient;
  form: VitalFormData;
  signosAlarma: Record<string, boolean>;
  fechaTriage: string;
  horaTriage: string;
  isOpen: boolean;
  onClose: () => void;
}

const urgenciaConfig: Record<TriageRecord['nivelUrgencia'], { label: string; color: string; bg: string; border: string; icon: string }> = {
  verde: { label: 'No urgente', color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-300', icon: 'ri-check-double-line' },
  amarillo: { label: 'Urgencia menor', color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-300', icon: 'ri-alert-line' },
  naranja: { label: 'Urgencia', color: 'text-orange-700', bg: 'bg-orange-100', border: 'border-orange-300', icon: 'ri-error-warning-line' },
  rojo: { label: 'Emergencia', color: 'text-red-700', bg: 'bg-red-100', border: 'border-red-300', icon: 'ri-shield-flash-line' },
};

const painLabels: Record<number, string> = {
  0: 'Sin dolor', 1: 'Leve', 2: 'Leve', 3: 'Leve', 4: 'Moderado', 5: 'Moderado',
  6: 'Moderado', 7: 'Intenso', 8: 'Intenso', 9: 'Muy intenso', 10: 'Insoportable',
};

const redFlagsList = [
  { id: 'dificultad_respirar', label: 'Dificultad para respirar' },
  { id: 'dolor_toracico', label: 'Dolor torácico' },
  { id: 'alteracion_conciencia', label: 'Alteración del estado de conciencia' },
  { id: 'hemorragia_activa', label: 'Hemorragia activa' },
  { id: 'convulsiones', label: 'Convulsiones' },
  { id: 'cyanosis', label: 'Cianosis' },
  { id: 'deshidratacion', label: 'Signos de deshidratación severa' },
  { id: 'deficit_neurologico', label: 'Déficit neurológico focal' },
];

function getVitalStatus(value: number, key: string): 'normal' | 'warning' | 'critical' {
  const ranges: Record<string, { normal: [number, number]; warning: [number, number] }> = {
    temperatura: { normal: [36.0, 37.5], warning: [35.5, 38.5] },
    frecuenciaCardiaca: { normal: [60, 100], warning: [50, 120] },
    frecuenciaRespiratoria: { normal: [12, 20], warning: [10, 28] },
    saturacionOxigeno: { normal: [95, 100], warning: [90, 94] },
    presionSistolica: { normal: [90, 139], warning: [80, 159] },
    presionDiastolica: { normal: [60, 89], warning: [50, 99] },
    glucosa: { normal: [70, 110], warning: [50, 180] },
    imc: { normal: [18.5, 24.9], warning: [17, 29.9] },
  };
  const range = ranges[key];
  if (!range) return 'normal';
  if (value < range.warning[0] || value > range.warning[1]) return 'critical';
  if (value < range.normal[0] || value > range.normal[1]) return 'warning';
  return 'normal';
}

function getImcClassification(imc: number): string {
  if (imc < 18.5) return 'Bajo peso';
  if (imc < 25) return 'Peso normal';
  if (imc < 30) return 'Sobrepeso';
  return 'Obesidad';
}

const statusColors: Record<string, { dot: string; text: string }> = {
  normal: { dot: 'bg-emerald-500', text: 'text-emerald-700' },
  warning: { dot: 'bg-amber-500', text: 'text-amber-700' },
  critical: { dot: 'bg-red-500', text: 'text-red-700' },
};

export default function TriagePrintModal({
  paciente, form, signosAlarma, fechaTriage, horaTriage, isOpen, onClose,
}: TriagePrintModalProps) {
  const patient = useMemo(() => getPatientById(paciente.id), [paciente.id]);
  const sucursal = sucursales[0];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('printing-triage');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('printing-triage');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('printing-triage');
    };
  }, [isOpen]);

  const handlePrint = async () => {
    const wrapper = document.getElementById('triage-print-wrapper');
    if (!wrapper) return;

    const folio = `TR-${fechaTriage.replace(/-/g, '')}-${paciente.id.toUpperCase()}`;
    const blob = await exportElementToPDFBlob(wrapper, {
      title: `Hoja de Triage — ${paciente.nombre} ${paciente.apellidos}`,
      orientation: 'portrait',
      margin: 0,
    });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    // Clean up the object URL after a short delay to allow the browser to load it
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const handleDownloadPDF = async () => {
    const wrapper = document.getElementById('triage-print-wrapper');
    if (!wrapper) return;

    const folio = `TR-${fechaTriage.replace(/-/g, '')}-${paciente.id.toUpperCase()}`;
    await exportElementToPDF(wrapper, `Triage_${folio}`, {
      title: `Hoja de Triage — ${paciente.nombre} ${paciente.apellidos}`,
      orientation: 'portrait',
      margin: 0,
    });
  };

  if (!isOpen) return null;

  const peso = parseFloat(form.peso) || 0;
  const talla = parseFloat(form.talla) || 0;
  const imc = peso > 0 && talla > 0 ? (peso / (talla * talla)).toFixed(1) : '';
  const imcStatus = imc ? getVitalStatus(parseFloat(imc), 'imc') : '';
  const urg = urgenciaConfig[form.nivelUrgencia];
  const folio = `TR-${fechaTriage.replace(/-/g, '')}-${paciente.id.toUpperCase()}`;

  const activeFlags = redFlagsList.filter((f) => signosAlarma[f.id]);
  const dolorNum = parseInt(form.dolor, 10);
  const dolorColor = dolorNum <= 3 ? 'text-emerald-600' : dolorNum <= 6 ? 'text-amber-600' : 'text-red-600';

  const vitalData = [
    { label: 'Temperatura', value: form.temperatura, unit: '°C', key: 'temperatura' },
    { label: 'Frecuencia Cardíaca', value: form.frecuenciaCardiaca, unit: 'lpm', key: 'frecuenciaCardiaca' },
    { label: 'Frecuencia Respiratoria', value: form.frecuenciaRespiratoria, unit: 'rpm', key: 'frecuenciaRespiratoria' },
    { label: 'Presión Sistólica', value: form.presionSistolica, unit: 'mmHg', key: 'presionSistolica' },
    { label: 'Presión Diastólica', value: form.presionDiastolica, unit: 'mmHg', key: 'presionDiastolica' },
    { label: 'Saturación O₂', value: form.saturacionOxigeno, unit: '%', key: 'saturacionOxigeno' },
    { label: 'Glucosa Capilar', value: form.glucosa, unit: 'mg/dL', key: 'glucosa' },
    { label: 'IMC', value: imc, unit: 'kg/m²', key: 'imc' },
  ];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 z-[100] print:hidden" />

      {/* Modal */}
      <div className="triage-print-modal-root fixed inset-0 z-[101] flex items-start justify-center overflow-y-auto print:static print:overflow-visible print:z-auto print:block">
        <div className="relative w-full max-w-[210mm] min-h-[297mm] mx-auto my-4 bg-background-50 print:bg-white print:m-0 print:shadow-none print:max-w-none print:w-full print:min-h-0">
          <div id="triage-print-wrapper" className="bg-background-50 print:bg-white">
            {/* Header */}
            <div className="px-10 pt-10 pb-6 border-b-2 border-primary-500/20">
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-start gap-4">
                  <InstitucionalLogo
                    fallbackIcon="ri-heart-pulse-line"
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
                  <p className="text-2xs text-foreground-400">{sucursal.ciudad}, {sucursal.estado} {sucursal.codigoPostal}</p>
                  <p className="text-2xs text-foreground-400 mt-1">Tel: {sucursal.telefono}</p>
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="px-10 py-5 text-center border-b border-secondary-200">
              <h1 className="text-2xl font-bold text-foreground-950 tracking-wide font-heading">HOJA DE TRIAGE Y SIGNOS VITALES</h1>
              <p className="text-xs text-foreground-500 mt-1 font-mono">Folio: {folio}</p>
            </div>

            {/* Patient Info */}
            <div className="px-10 py-5 grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2">Paciente</p>
                <p className="text-sm font-semibold text-foreground-900">{paciente.nombre} {paciente.apellidos}</p>
                <div className="text-xs text-foreground-500 mt-1 space-y-0.5">
                  <p>Expediente: <span className="font-medium text-foreground-700">{paciente.expediente}</span></p>
                  <p>Edad: <span className="font-medium text-foreground-700">{paciente.edad} años</span> · Sexo: <span className="font-medium text-foreground-700">{paciente.genero === 'F' ? 'Femenino' : 'Masculino'}</span></p>
                  {patient && <p>CURP: <span className="font-medium text-foreground-700">{patient.curp}</span></p>}
                </div>
                <p className="text-xs text-foreground-600 mt-2 italic">"{paciente.motivo}"</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2">Información del Triage</p>
                <div className="text-xs text-foreground-500 mt-1 space-y-0.5">
                  <p>Fecha: <span className="font-medium text-foreground-700">{fechaTriage}</span></p>
                  <p>Hora: <span className="font-medium text-foreground-700">{horaTriage}</span></p>
                  <p>Realizado por: <span className="font-medium text-foreground-700">Lic. Carmen Vargas</span></p>
                  <p>Sucursal: <span className="font-medium text-foreground-700">{sucursal.nombre}</span></p>
                </div>
              </div>
            </div>

            {/* Nivel de Urgencia Banner */}
            <div className={`mx-10 mb-4 p-4 rounded-lg border ${urg.bg} ${urg.border} flex items-center gap-3`}>
              <span className="w-10 h-10 flex items-center justify-center rounded-full bg-background-50 print:bg-white/80">
                <i className={`${urg.icon} text-lg ${urg.color}`}></i>
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold">Nivel de Urgencia</p>
                <p className={`text-base font-bold ${urg.color}`}>{urg.label.toUpperCase()}</p>
              </div>
            </div>

            {/* Vital Signs Grid */}
            <div className="px-10 py-5">
              <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-4">Signos Vitales</p>
              <div className="grid grid-cols-2 gap-3">
                {vitalData.map((v) => {
                  const val = parseFloat(v.value);
                  const hasValue = v.value && !Number.isNaN(val);
                  const status = hasValue ? getVitalStatus(val, v.key) : '';
                  const color = status ? statusColors[status] : null;
                  return (
                    <div key={v.key} className="flex items-center gap-3 p-3 bg-background-50 border border-secondary-200 rounded-lg">
                      <div className="flex-1">
                        <p className="text-[10px] text-foreground-400 uppercase">{v.label}</p>
                        <p className="text-base font-bold text-foreground-900 font-mono">
                          {hasValue ? v.value : '—'} <span className="text-xs font-normal text-foreground-500">{v.unit}</span>
                        </p>
                      </div>
                      {color && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-2xs font-medium bg-background-50 print:bg-white border border-secondary-200">
                          <span className={`w-2 h-2 rounded-full ${color.dot}`}></span>
                          <span className={color.text}>
                            {status === 'normal' ? 'Normal' : status === 'warning' ? 'Alterado' : 'Crítico'}
                          </span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* IMC Classification */}
            {imc && (
              <div className="px-10 pb-4">
                <div className="flex items-center gap-3 p-3 bg-background-50 border border-secondary-200 rounded-lg">
                  <div className="flex-1">
                    <p className="text-[10px] text-foreground-400 uppercase">Clasificación IMC</p>
                    <p className="text-base font-bold text-foreground-900 font-mono">{getImcClassification(parseFloat(imc))}</p>
                  </div>
                  {imcStatus && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-2xs font-medium bg-background-50 print:bg-white border border-secondary-200">
                      <span className={`w-2 h-2 rounded-full ${statusColors[imcStatus].dot}`}></span>
                      <span className={statusColors[imcStatus].text}>
                        {imcStatus === 'normal' ? 'Normal' : imcStatus === 'warning' ? 'Alterado' : 'Crítico'}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Dolor */}
            <div className="px-10 pb-4">
              <div className="flex items-center gap-3 p-3 bg-background-50 border border-secondary-200 rounded-lg">
                <div className="flex-1">
                  <p className="text-[10px] text-foreground-400 uppercase">Escala de Dolor (EVA)</p>
                  <p className="text-base font-bold text-foreground-900 font-mono">
                    {form.dolor || '—'}/10 <span className={`text-xs font-normal ml-1 ${dolorColor}`}>{!Number.isNaN(dolorNum) ? painLabels[dolorNum] : ''}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Red Flags */}
            {activeFlags.length > 0 && (
              <div className="px-10 pb-4">
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg print:bg-red-50 print:border-red-200">
                  <p className="text-[10px] uppercase tracking-wider text-red-600 font-semibold mb-2">Signos de Alarma Identificados</p>
                  <div className="space-y-1">
                    {activeFlags.map((f) => (
                      <div key={f.id} className="flex items-center gap-2 text-xs text-red-700">
                        <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></span>
                        {f.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Notas */}
            {form.notas.trim() && (
              <div className="px-10 py-4">
                <p className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2">Notas de Triage</p>
                <div className="bg-background-50 border border-secondary-200 rounded-lg p-4">
                  <p className="text-xs text-foreground-700 leading-relaxed">{form.notas}</p>
                </div>
              </div>
            )}

            {/* Signature */}
            <div className="px-10 py-8 mt-4">
              <div className="flex justify-end">
                <div className="text-center">
                  <div className="w-56 border-b border-foreground-400 mb-2"></div>
                  <p className="text-sm font-semibold text-foreground-900">Lic. Carmen Vargas</p>
                  <p className="text-xs text-foreground-500">Enfermera Clínica — Triage</p>
                  <p className="text-xs text-foreground-500">Cédula Profesional: ENF-2024-0012</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-10 py-4 border-t border-secondary-200 mt-auto">
              <div className="flex items-center justify-between text-[10px] text-foreground-400">
                <p>Este documento forma parte del expediente clínico del paciente.</p>
                <p>MediCore · {sucursal.telefono} · {sucursal.email}</p>
              </div>
              <p className="text-[10px] text-foreground-400 mt-1 text-center">
                Los signos vitales deben interpretarse por un profesional de la salud. Este triage es una valoración inicial.
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
                <i className="ri-printer-line"></i> Imprimir triage
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
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
          body.printing-triage #root { display: none !important; }
          .triage-print-modal-root {
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
          .triage-print-modal-root > div {
            max-width: none !important;
            min-height: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
          }
          #triage-print-wrapper {
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
          #triage-print-wrapper, #triage-print-wrapper * { visibility: visible !important; }
          #triage-print-wrapper .flex { display: flex !important; }
          #triage-print-wrapper .grid { display: grid !important; }
          #triage-print-wrapper .hidden,
          #triage-print-wrapper [class*="print:hidden"] { display: none !important; }
        }
      `}</style>
    </>
  );
}