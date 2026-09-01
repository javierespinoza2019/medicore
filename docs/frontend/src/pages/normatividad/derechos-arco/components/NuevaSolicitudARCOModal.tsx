import { useState } from 'react';
import type { SolicitudARCO } from '@/mocks/derechosARCO';
import { tipoARCOConfig } from '@/mocks/derechosARCO';
import { patients } from '@/mocks/patients';

interface NuevaSolicitudARCOModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGuardar: (s: SolicitudARCO) => void;
}

function RequiredLabel({ children }: { children: string }) {
  return <label className="block text-xs font-medium text-foreground-700 mb-1">{children} <span className="text-red-500">*</span></label>;
}

function CharCount({ current, max }: { current: number; max: number }) {
  return <p className={`text-2xs mt-0.5 ${current >= max * 0.9 ? 'text-amber-500 font-medium' : 'text-foreground-400'}`}>{current}/{max}</p>;
}

function Section({ icon, title, tone, children }: { icon: string; title: string; tone: string; children: React.ReactNode }) {
  return (
    <div className="p-4 bg-background-50 rounded-xl border border-secondary-200 space-y-3">
      <h4 className="text-sm font-semibold text-foreground-800 flex items-center gap-2">
        <span className={`w-6 h-6 flex items-center justify-center rounded-md ${tone}`}><i className={`${icon} text-xs`}></i></span>
        {title}
      </h4>
      {children}
    </div>
  );
}

const tipoDescripciones: Record<SolicitudARCO['tipo'], { que: string; como: string; placeholder: string }> = {
  acceso: {
    que: 'Conocer qué datos personales tiene la organización sobre usted, para qué los usa y cómo los trata.',
    como: 'Se le proporcionará un resumen de sus datos y el expediente disponible.',
    placeholder: 'Ej. Solicito conocer todos los datos personales que tiene registrados sobre mi persona, incluyendo mi expediente clínico, diagnósticos y tratamientos...',
  },
  rectificacion: {
    que: 'Corregir datos personales inexactos o desactualizados.',
    como: 'Indique exactamente qué dato está incorrecto y cuál es la información correcta.',
    placeholder: 'Ej. Mi número de teléfono está registrado como 55XXXXXXXX, sin embargo el correcto es 55YYYYYYYY. Solicito se actualice...',
  },
  cancelacion: {
    que: 'Que sus datos personales sean eliminados de las bases de datos cuando ya no sean necesarios.',
    como: 'Aplica cuando el tratamiento ya no es necesario para la finalidad para la que fue recabado.',
    placeholder: 'Ej. Solicito la eliminación de mis datos de contacto para fines de marketing, manteniendo únicamente los necesarios para el expediente clínico...',
  },
  oposicion: {
    que: 'Negarse a que sus datos sean tratados para finalidades específicas.',
    como: 'Indique con claridad para qué finalidad se opone al tratamiento de sus datos.',
    placeholder: 'Ej. Me opongo al uso de mi información de salud para fines de investigación y envío de comunicaciones de marketing...',
  },
};

export default function NuevaSolicitudARCOModal({ isOpen, onClose, onGuardar }: NuevaSolicitudARCOModalProps) {
  const [patientId, setPatientId] = useState('');
  const [tipo, setTipo] = useState<SolicitudARCO['tipo']>('acceso');
  const [descripcion, setDescripcion] = useState('');
  const [motivo, setMotivo] = useState('');
  const [medioRespuesta, setMedioRespuesta] = useState<'email' | 'fisico' | 'sistema'>('email');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const patient = patients.find((p) => p.id === patientId);
  const tipoCfg = tipoARCOConfig[tipo];
  const tipoInfo = tipoDescripciones[tipo];

  const handleGuardar = () => {
    if (!patientId || !descripcion.trim()) {
      setError('Paciente y descripción de la solicitud son obligatorios.');
      return;
    }
    const now = new Date();
    const fecha = now.toISOString().split('T')[0];
    const nuevo: SolicitudARCO = {
      id: `arco-${patientId}-${Date.now().toString(36)}`,
      patientId,
      patientName: patient ? `${patient.nombre} ${patient.apellidos}` : '',
      patientExpediente: patient?.expediente || '',
      tipo,
      descripcion: descripcion.trim(),
      motivo: motivo.trim() || undefined,
      fechaSolicitud: fecha,
      estado: 'recibida',
      plazoDias: 20,
      diasRestantes: 20,
    };
    onGuardar(nuevo);
    reset();
    onClose();
  };

  const reset = () => {
    setPatientId(''); setTipo('acceso'); setDescripcion(''); setMotivo(''); setMedioRespuesta('email'); setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
      <div className="bg-background-50 rounded-xl shadow-lg max-w-2xl w-full mx-4 max-h-[92vh] overflow-y-auto">

        <div className="sticky top-0 bg-background-50 z-10 flex items-center justify-between px-6 py-4 border-b border-secondary-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-secondary-100">
              <i className="ri-shield-keyhole-line text-foreground-600"></i>
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground-900">Nueva Solicitud de Derechos ARCO</h3>
              <p className="text-2xs text-foreground-500">LFPDPPP · Art. 22-30 · Plazo de respuesta: 20 días hábiles</p>
            </div>
          </div>
          <button onClick={() => { reset(); onClose(); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary-100 transition-base cursor-pointer">
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
              <i className="ri-error-warning-line flex-shrink-0"></i> {error}
            </div>
          )}

          <Section icon="ri-user-line" title="Datos del Paciente" tone="bg-primary-100 text-primary-600">
            <div>
              <RequiredLabel>Paciente</RequiredLabel>
              <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base">
                <option value="">Seleccionar paciente...</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.nombre} {p.apellidos} · {p.expediente}</option>)}
              </select>
              {patient && (
                <div className="mt-2 p-2 bg-secondary-50 rounded-lg flex items-center gap-2 text-xs text-foreground-600">
                  <i className="ri-check-line text-emerald-600"></i>
                  <span>{patient.nombre} {patient.apellidos} · {patient.curp || 'Sin CURP'} · {patient.email || 'Sin email'}</span>
                </div>
              )}
            </div>
          </Section>

          <Section icon="ri-shield-check-line" title="Tipo de Derecho ARCO" tone="bg-secondary-100 text-foreground-600">
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(tipoARCOConfig) as [SolicitudARCO['tipo'], typeof tipoARCOConfig[SolicitudARCO['tipo']]][]).map(([key, cfg]) => (
                <button
                  key={key} type="button" onClick={() => { setTipo(key); setDescripcion(''); }}
                  className={`flex items-center gap-2 p-3 rounded-lg border transition-all cursor-pointer text-left ${tipo === key ? `${cfg.bg} ${cfg.text} border-current` : 'bg-background-50 text-foreground-600 border-secondary-200 hover:border-secondary-300'}`}
                >
                  <span className={`w-7 h-7 flex items-center justify-center rounded-md ${tipo === key ? 'bg-background-50/70' : 'bg-secondary-100'}`}>
                    <i className={`${cfg.icon} text-sm`}></i>
                  </span>
                  <div>
                    <p className="text-xs font-semibold">{cfg.label}</p>
                    <p className="text-[10px] opacity-70 leading-tight">ARCO</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Info del tipo seleccionado */}
            <div className={`p-3 rounded-lg border ${tipoCfg.bg} mt-1`}>
              <p className={`text-xs font-semibold ${tipoCfg.text} flex items-center gap-1.5 mb-1`}>
                <i className={`${tipoCfg.icon} text-sm`}></i> Derecho de {tipoCfg.label}
              </p>
              <p className={`text-xs ${tipoCfg.text} opacity-80`}>{tipoInfo.que}</p>
              <p className={`text-2xs ${tipoCfg.text} opacity-60 mt-1 italic`}>{tipoInfo.como}</p>
            </div>
          </Section>

          <Section icon="ri-file-text-line" title="Descripción de la Solicitud" tone="bg-sky-100 text-sky-600">
            <div>
              <RequiredLabel>Descripción detallada</RequiredLabel>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={5}
                maxLength={500}
                placeholder={tipoInfo.placeholder}
                className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none"
              />
              <CharCount current={descripcion.length} max={500} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-700 mb-1">Motivo o justificación (opcional)</label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={2}
                maxLength={300}
                placeholder="Motivo adicional por el que ejerce este derecho..."
                className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base resize-none"
              />
              <CharCount current={motivo.length} max={300} />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground-700 mb-1">Medio de respuesta preferido</label>
              <div className="flex gap-2">
                {([
                  { value: 'email', label: 'Email', icon: 'ri-mail-line' },
                  { value: 'fisico', label: 'Físico', icon: 'ri-file-paper-line' },
                  { value: 'sistema', label: 'Sistema', icon: 'ri-computer-line' },
                ] as const).map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setMedioRespuesta(opt.value)}
                    className={`flex-1 flex items-center gap-1.5 justify-center py-2 rounded-lg text-xs font-medium border transition-base cursor-pointer ${medioRespuesta === opt.value ? 'bg-primary-100 text-primary-700 border-primary-300' : 'bg-background-50 text-foreground-600 border-secondary-200'}`}>
                    <i className={opt.icon}></i> {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* Aviso legal */}
          <div className="p-4 rounded-xl bg-secondary-50 border border-secondary-200">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-100 flex-shrink-0">
                <i className="ri-information-line text-amber-600"></i>
              </div>
              <div className="text-xs text-foreground-600 space-y-1">
                <p><strong>Plazo legal de respuesta:</strong> 20 días hábiles contados a partir de su recepción (Art. 29 LFPDPPP).</p>
                <p><strong>Prórroga:</strong> En casos justificados puede extenderse 20 días hábiles adicionales.</p>
                <p><strong>Acreditación:</strong> Se solicitará identificación oficial vigente o CURP para verificar su identidad.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-background-50 border-t border-secondary-200 px-6 py-4 flex items-center justify-between gap-3">
          <div className="text-xs text-foreground-400 flex items-center gap-1.5">
            <i className="ri-calendar-line"></i> Registro con fecha y hora automática
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { reset(); onClose(); }} className="px-4 py-2 text-sm font-medium text-foreground-600 hover:text-foreground-800 hover:bg-secondary-100 rounded-lg transition-base cursor-pointer whitespace-nowrap">
              Cancelar
            </button>
            <button onClick={handleGuardar}
              disabled={!patientId || !descripcion.trim()}
              className="px-6 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-base cursor-pointer whitespace-nowrap flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="ri-save-line"></i> Registrar solicitud ARCO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}