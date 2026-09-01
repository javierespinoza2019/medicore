import { useState } from 'react';
import { tipoCertificadoConfig, type CertificadoMedico, type TipoCertificado } from '@/mocks/certificados';

const MAX_DIAGNOSTICO = 300;
const MAX_RECOMENDACIONES = 1000;
const MAX_ACTIVIDAD = 200;
const MAX_PROPOSITO = 300;

interface Props {
  consultaId: string;
  patientId: string;
  patientName: string;
  patientExpediente: string;
  doctorId: string;
  doctorName: string;
  doctorCedula: string;
  doctorEspecialidad: string;
  diagnosticoRelacionado: string;
  onCertificadoCreado: (certificado: CertificadoMedico) => void;
  onCancel: () => void;
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function daysBetween(startStr: string, endStr: string): number {
  const [y1, m1, d1] = startStr.split('-').map(Number);
  const [y2, m2, d2] = endStr.split('-').map(Number);
  const a = new Date(y1, m1 - 1, d1).getTime();
  const b = new Date(y2, m2 - 1, d2).getTime();
  return Math.max(1, Math.round((b - a) / (1000 * 60 * 60 * 24)) + 1);
}

export default function CertificadoMedicoCreator({
  consultaId, patientId, patientName, patientExpediente,
  doctorId, doctorName, doctorCedula, doctorEspecialidad,
  diagnosticoRelacionado, onCertificadoCreado, onCancel,
}: Props) {
  const [tipo, setTipo] = useState<TipoCertificado>('incapacidad');
  const [diagnostico, setDiagnostico] = useState(diagnosticoRelacionado);
  const [diasIncapacidad, setDiasIncapacidad] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [apto, setApto] = useState<boolean | null>(null);
  const [actividad, setActividad] = useState('');
  const [semanasGestacion, setSemanasGestacion] = useState('');
  const [fechaProbableParto, setFechaProbableParto] = useState('');
  const [proposito, setProposito] = useState('');
  const [recomendaciones, setRecomendaciones] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const handleDiasChange = (value: string) => {
    setDiasIncapacidad(value);
    setErrors([]);
    const dias = parseInt(value, 10);
    if (!Number.isNaN(dias) && dias > 0 && fechaInicio) {
      setFechaFin(addDays(fechaInicio, dias - 1));
    }
  };

  const handleInicioChange = (value: string) => {
    setFechaInicio(value);
    setErrors([]);
    const dias = parseInt(diasIncapacidad, 10);
    if (value && !Number.isNaN(dias) && dias > 0) {
      setFechaFin(addDays(value, dias - 1));
    }
  };

  const handleFinChange = (value: string) => {
    setFechaFin(value);
    setErrors([]);
    if (fechaInicio && value) {
      const dias = daysBetween(fechaInicio, value);
      setDiasIncapacidad(String(dias));
    }
  };

  const validar = (): string[] => {
    const errs: string[] = [];
    if (!diagnostico.trim()) errs.push('Diagnóstico (campo obligatorio)');
    switch (tipo) {
      case 'incapacidad':
        if (!diasIncapacidad || parseInt(diasIncapacidad, 10) <= 0) errs.push('Número de días de incapacidad');
        if (!fechaInicio) errs.push('Fecha de inicio del reposo');
        break;
      case 'aptitud':
        if (apto === null) errs.push('Conclusión (Apto / No apto)');
        break;
      case 'embarazo':
        if (!semanasGestacion || parseInt(semanasGestacion, 10) <= 0) errs.push('Semanas de gestación');
        if (!fechaProbableParto) errs.push('Fecha probable de parto');
        break;
      case 'general':
        if (!proposito.trim()) errs.push('Propósito del certificado');
        break;
    }
    return errs;
  };

  const handleSave = () => {
    const errs = validar();
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    setTimeout(() => {
      const now = new Date();
      const fecha = now.toISOString().split('T')[0];
      const hora = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const year = now.getFullYear();
      const seq = String(Date.now()).slice(-4);
      const folio = `CM-${year}-${seq}`;

      const nuevo: CertificadoMedico = {
        id: `cm-${Date.now()}`,
        folio,
        patientId,
        patientName,
        patientExpediente,
        doctorId,
        doctorName,
        doctorCedula,
        doctorEspecialidad,
        consultaId,
        fecha,
        hora,
        tipo,
        diagnostico: diagnostico.trim(),
        estado: 'activo',
        recomendaciones: recomendaciones.trim() || undefined,
      };

      if (tipo === 'incapacidad') {
        nuevo.diasIncapacidad = parseInt(diasIncapacidad, 10);
        nuevo.fechaInicio = fechaInicio;
        nuevo.fechaFin = fechaFin || addDays(fechaInicio, nuevo.diasIncapacidad - 1);
      }
      if (tipo === 'aptitud') {
        nuevo.apto = apto === true;
        nuevo.actividad = actividad.trim() || undefined;
      }
      if (tipo === 'embarazo') {
        nuevo.semanasGestacion = parseInt(semanasGestacion, 10);
        nuevo.fechaProbableParto = fechaProbableParto;
      }
      if (tipo === 'general') {
        nuevo.proposito = proposito.trim();
      }

      onCertificadoCreado(nuevo);
      setSaving(false);
    }, 400);
  };

  return (
    <div className="bg-background-50 rounded-xl border border-secondary-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-200 bg-background-50">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 flex items-center justify-center rounded bg-emerald-100 text-emerald-600">
            <i className="ri-shield-check-line text-sm"></i>
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground-800">Generar Certificado Médico</h3>
            <p className="text-2xs text-foreground-400">{patientName} · {diagnosticoRelacionado || 'Sin diagnóstico'}</p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="w-7 h-7 flex items-center justify-center rounded-full text-foreground-400 hover:text-foreground-600 hover:bg-secondary-100 transition-base cursor-pointer"
        >
          <i className="ri-close-line text-sm"></i>
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Selector de tipo */}
        <div>
          <label className="text-2xs font-semibold text-foreground-500 uppercase tracking-wide mb-1.5 block">
            Tipo de certificado
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(tipoCertificadoConfig) as TipoCertificado[]).map((t) => {
              const cfg = tipoCertificadoConfig[t];
              const active = tipo === t;
              return (
                <button
                  key={t}
                  onClick={() => { setTipo(t); setErrors([]); }}
                  className={`flex items-start gap-2.5 p-3 rounded-lg border text-left cursor-pointer transition-base ${
                    active ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-200' : 'bg-background-50 border-secondary-200 hover:border-secondary-300'
                  }`}
                >
                  <span className={`w-8 h-8 flex items-center justify-center rounded-md flex-shrink-0 ${active ? 'bg-emerald-100 text-emerald-600' : 'bg-secondary-100 text-foreground-400'}`}>
                    <i className={`${cfg.icon} text-sm`}></i>
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-xs font-semibold ${active ? 'text-emerald-700' : 'text-foreground-800'}`}>{cfg.label}</span>
                    <span className="block text-2xs text-foreground-400 mt-0.5">{cfg.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Diagnóstico */}
        <div>
          <label className="text-2xs font-semibold text-foreground-500 uppercase tracking-wide mb-1.5 block">
            Diagnóstico <span className="text-red-500">*</span>
          </label>
          <textarea
            value={diagnostico}
            onChange={(e) => { setDiagnostico(e.target.value); setErrors([]); }}
            rows={2}
            maxLength={MAX_DIAGNOSTICO}
            aria-label="Diagnóstico del certificado"
            className="w-full p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-sm text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 transition-base resize-none font-medium"
          />
        </div>

        {/* Campos por tipo */}
        {tipo === 'incapacidad' && (
          <div className="p-3 bg-background-50 rounded-lg border border-secondary-200 space-y-3">
            <p className="text-2xs font-semibold text-foreground-500 uppercase tracking-wide">Periodo de reposo</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-2xs font-medium text-foreground-500 mb-1 block">Días <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min={1}
                  value={diasIncapacidad}
                  onChange={(e) => handleDiasChange(e.target.value)}
                  placeholder="3"
                  aria-label="Número de días de incapacidad"
                  className="w-full px-2.5 py-1.5 text-xs bg-background-50 border border-secondary-200 rounded-md text-foreground-700 outline-none focus:border-emerald-400 transition-base"
                />
              </div>
              <div>
                <label className="text-2xs font-medium text-foreground-500 mb-1 block">Desde <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => handleInicioChange(e.target.value)}
                  aria-label="Fecha de inicio del reposo"
                  className="w-full px-2.5 py-1.5 text-xs bg-background-50 border border-secondary-200 rounded-md text-foreground-700 outline-none focus:border-emerald-400 transition-base"
                />
              </div>
              <div>
                <label className="text-2xs font-medium text-foreground-500 mb-1 block">Hasta</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => handleFinChange(e.target.value)}
                  aria-label="Fecha de fin del reposo"
                  className="w-full px-2.5 py-1.5 text-xs bg-background-50 border border-secondary-200 rounded-md text-foreground-700 outline-none focus:border-emerald-400 transition-base"
                />
              </div>
            </div>
            <p className="text-2xs text-foreground-400">El campo "Hasta" se calcula automáticamente, pero puedes ajustarlo manualmente.</p>
          </div>
        )}

        {tipo === 'aptitud' && (
          <div className="p-3 bg-background-50 rounded-lg border border-secondary-200 space-y-3">
            <div>
              <label className="text-2xs font-medium text-foreground-500 mb-1 block">Actividad / finalidad</label>
              <input
                type="text"
                value={actividad}
                onChange={(e) => setActividad(e.target.value)}
                placeholder="Ej: Práctica deportiva, ingreso escolar, ingreso laboral..."
                maxLength={MAX_ACTIVIDAD}
                aria-label="Actividad o finalidad del certificado de aptitud"
                className="w-full px-2.5 py-1.5 text-xs bg-background-50 border border-secondary-200 rounded-md text-foreground-700 placeholder:text-foreground-400 outline-none focus:border-emerald-400 transition-base"
              />
            </div>
            <div>
              <label className="text-2xs font-medium text-foreground-500 mb-1.5 block">Conclusión <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <button
                  onClick={() => { setApto(true); setErrors([]); }}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-base whitespace-nowrap ${apto === true ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-background-50 text-foreground-600 border-secondary-200 hover:border-emerald-300'}`}
                >
                  <i className="ri-check-line mr-1"></i>Apto
                </button>
                <button
                  onClick={() => { setApto(false); setErrors([]); }}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-base whitespace-nowrap ${apto === false ? 'bg-red-500 text-white border-red-500' : 'bg-background-50 text-foreground-600 border-secondary-200 hover:border-red-300'}`}
                >
                  <i className="ri-close-line mr-1"></i>No apto
                </button>
              </div>
            </div>
          </div>
        )}

        {tipo === 'embarazo' && (
          <div className="p-3 bg-background-50 rounded-lg border border-secondary-200 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-2xs font-medium text-foreground-500 mb-1 block">Semanas de gestación <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min={1}
                  value={semanasGestacion}
                  onChange={(e) => { setSemanasGestacion(e.target.value); setErrors([]); }}
                  placeholder="28"
                  aria-label="Semanas de gestación"
                  className="w-full px-2.5 py-1.5 text-xs bg-background-50 border border-secondary-200 rounded-md text-foreground-700 outline-none focus:border-emerald-400 transition-base"
                />
              </div>
              <div>
                <label className="text-2xs font-medium text-foreground-500 mb-1 block">Fecha probable de parto <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={fechaProbableParto}
                  onChange={(e) => { setFechaProbableParto(e.target.value); setErrors([]); }}
                  aria-label="Fecha probable de parto"
                  className="w-full px-2.5 py-1.5 text-xs bg-background-50 border border-secondary-200 rounded-md text-foreground-700 outline-none focus:border-emerald-400 transition-base"
                />
              </div>
            </div>
          </div>
        )}

        {tipo === 'general' && (
          <div>
            <label className="text-2xs font-medium text-foreground-500 mb-1 block">Propósito del certificado <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={proposito}
              onChange={(e) => { setProposito(e.target.value); setErrors([]); }}
              placeholder="Ej: Trámite de visa, constancia de salud, trámite administrativo..."
              maxLength={MAX_PROPOSITO}
              aria-label="Propósito del certificado médico"
              className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 placeholder:text-foreground-400 outline-none focus:border-emerald-400 transition-base"
            />
          </div>
        )}

        {/* Recomendaciones */}
        <div>
          <label className="text-2xs font-semibold text-foreground-500 uppercase tracking-wide mb-1.5 block">
            Recomendaciones / indicaciones
          </label>
          <textarea
            value={recomendaciones}
            onChange={(e) => setRecomendaciones(e.target.value)}
            placeholder="Recomendaciones, restricciones o indicaciones para el paciente..."
            rows={3}
            maxLength={MAX_RECOMENDACIONES}
            aria-label="Recomendaciones del certificado"
            className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 placeholder:text-foreground-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-base resize-none"
          />
        </div>

        {/* Errores */}
        {errors.length > 0 && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-xs font-semibold text-red-600 mb-1.5 flex items-center gap-1.5">
              <i className="ri-error-warning-line"></i> Campos obligatorios incompletos
            </p>
            <ul className="space-y-1">
              {errors.map((e, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-red-600">
                  <span className="w-3.5 h-3.5 flex items-center justify-center rounded-full bg-red-100 flex-shrink-0"><i className="ri-close-line text-[10px]"></i></span>
                  {e}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t border-secondary-100">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium text-foreground-500 hover:text-foreground-700 hover:bg-secondary-100 rounded-lg transition-base cursor-pointer whitespace-nowrap"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-base cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {saving ? (
              <><i className="ri-loader-4-line animate-spin"></i> Generando...</>
            ) : (
              <><i className="ri-shield-check-line"></i> Generar certificado</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}