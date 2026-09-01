import { useState } from 'react';
import type { ConsentimientoInformado } from '@/mocks/consentimientos';
import { tipoConsentimientoConfig, plantillasConsentimiento } from '@/mocks/consentimientos';
import { patients } from '@/mocks/patients';

interface NuevoConsentimientoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGuardar: (c: ConsentimientoInformado) => void;
}

function CharCount({ current, max }: { current: number; max: number }) {
  return (
    <p className={`text-2xs mt-0.5 ${current >= max * 0.9 ? 'text-amber-500 font-medium' : 'text-foreground-400'}`}>
      {current}/{max}
    </p>
  );
}

function RequiredLabel({ children }: { children: string }) {
  return (
    <label className="block text-xs font-medium text-foreground-700 mb-1">{children} <span className="text-red-500">*</span></label>
  );
}

function Section({ icon, title, tone, children }: { icon: string; title: string; tone: string; children: React.ReactNode }) {
  return (
    <div className="p-4 bg-background-50 rounded-xl border border-secondary-200 space-y-3">
      <h4 className="text-sm font-semibold text-foreground-800 flex items-center gap-2">
        <span className={`w-6 h-6 flex items-center justify-center rounded-md ${tone}`}>
          <i className={`${icon} text-xs`}></i>
        </span>
        {title}
      </h4>
      {children}
    </div>
  );
}

export default function NuevoConsentimientoModal({ isOpen, onClose, onGuardar }: NuevoConsentimientoModalProps) {
  const [patientId, setPatientId] = useState('');
  const [tipo, setTipo] = useState<ConsentimientoInformado['tipo']>('general');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [riesgos, setRiesgos] = useState('');
  const [beneficios, setBeneficios] = useState('');
  const [alternativas, setAlternativas] = useState('');
  const [firmadoPor, setFirmadoPor] = useState('');
  const [testigo, setTestigo] = useState('');
  const [estado, setEstado] = useState<ConsentimientoInformado['estado']>('pendiente');
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const patient = patients.find((p) => p.id === patientId);

  const applyPlantilla = () => {
    const tpl = plantillasConsentimiento[tipo];
    if (!tpl) return;
    const filled = tpl
      .replace('{paciente}', patient ? `${patient.nombre} ${patient.apellidos}` : '[NOMBRE DEL PACIENTE]')
      .replace('{expediente}', patient?.expediente || '[EXPEDIENTE]')
      .replace('{tutor}', '[NOMBRE DEL TUTOR]')
      .replace('{procedimiento}', titulo || '[PROCEDIMIENTO]');
    setDescripcion(filled.substring(0, 500));
  };

  const handleGuardar = () => {
    if (!patientId || !titulo.trim() || !descripcion.trim()) {
      setError('Paciente, título y descripción son obligatorios.');
      return;
    }
    const now = new Date();
    const fecha = now.toISOString().split('T')[0];
    const hora = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const nuevo: ConsentimientoInformado = {
      id: `ci-${patientId}-${Date.now().toString(36)}`,
      patientId,
      patientName: patient ? `${patient.nombre} ${patient.apellidos}` : '',
      patientExpediente: patient?.expediente || '',
      tipo,
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      riesgos: riesgos.trim() || undefined,
      beneficios: beneficios.trim() || undefined,
      alternativas: alternativas.trim() || undefined,
      consentido: estado === 'firmado',
      fechaFirma: estado === 'firmado' ? fecha : '',
      horaFirma: estado === 'firmado' ? hora : '',
      firmadoPor: estado === 'firmado' ? (firmadoPor.trim() || patient?.nombre || '') : '',
      testigo: testigo.trim() || undefined,
      estado,
    };
    onGuardar(nuevo);
    reset();
    onClose();
  };

  const reset = () => {
    setPatientId(''); setTipo('general'); setTitulo(''); setDescripcion(''); setRiesgos('');
    setBeneficios(''); setAlternativas(''); setFirmadoPor(''); setTestigo(''); setEstado('pendiente');
    setError(''); setShowPreview(false);
  };

  if (!isOpen) return null;

  const previewText = plantillasConsentimiento[tipo]
    ? plantillasConsentimiento[tipo]
        .replace('{paciente}', patient ? `${patient.nombre} ${patient.apellidos}` : '________________________')
        .replace('{expediente}', patient?.expediente || '________________')
        .replace('{fecha}', '____/____/______')
        .replace('{hora}', '____:____')
        .replace('{tutor}', firmadoPor || '________________________')
        .replace('{menor}', patient ? `${patient.nombre} ${patient.apellidos}` : '________________________')
        .replace('{procedimiento}', descripcion.substring(0, 60) || '________________________')
    : descripcion;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
      <div className="bg-background-50 rounded-xl shadow-lg max-w-2xl w-full mx-4 max-h-[92vh] overflow-y-auto">

        <div className="sticky top-0 bg-background-50 z-10 flex items-center justify-between px-6 py-4 border-b border-secondary-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary-100">
              <i className="ri-file-shield-line text-primary-600"></i>
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground-900">Nuevo Consentimiento Informado</h3>
              <p className="text-2xs text-foreground-500">NOM-004 · Consentimiento bajo información</p>
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
              <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base">
                <option value="">Seleccionar paciente...</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.nombre} {p.apellidos} · {p.expediente}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1">Tipo de consentimiento</label>
                <select value={tipo} onChange={(e) => setTipo(e.target.value as ConsentimientoInformado['tipo'])} className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base">
                  {Object.entries(tipoConsentimientoConfig).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1">Estado</label>
                <select value={estado} onChange={(e) => setEstado(e.target.value as ConsentimientoInformado['estado'])} className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base">
                  <option value="pendiente">Pendiente</option>
                  <option value="firmado">Firmado</option>
                  <option value="revocado">Revocado</option>
                  <option value="vencido">Vencido</option>
                </select>
              </div>
            </div>
            {plantillasConsentimiento[tipo] && (
              <button
                type="button"
                onClick={applyPlantilla}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg cursor-pointer transition-base"
              >
                <i className="ri-file-copy-line"></i> Aplicar plantilla para {tipoConsentimientoConfig[tipo].label}
              </button>
            )}
          </Section>

          <Section icon="ri-file-text-line" title="Contenido del Consentimiento" tone="bg-sky-100 text-sky-600">
            <div>
              <RequiredLabel>Título</RequiredLabel>
              <input
                type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej. Consentimiento para procedimiento quirúrgico"
                className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base"
              />
            </div>
            <div>
              <RequiredLabel>Descripción / Alcance</RequiredLabel>
              <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={5} maxLength={500}
                placeholder="Describa el alcance, propósito y contenido del consentimiento..."
                className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none"
              />
              <CharCount current={descripcion.length} max={500} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1">Riesgos potenciales</label>
                <textarea value={riesgos} onChange={(e) => setRiesgos(e.target.value)} rows={3} maxLength={500}
                  placeholder="Riesgos y complicaciones posibles..."
                  className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none"
                />
                <CharCount current={riesgos.length} max={500} />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1">Beneficios esperados</label>
                <textarea value={beneficios} onChange={(e) => setBeneficios(e.target.value)} rows={3} maxLength={500}
                  placeholder="Beneficios y resultados esperados..."
                  className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none"
                />
                <CharCount current={beneficios.length} max={500} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-700 mb-1">Alternativas disponibles</label>
              <textarea value={alternativas} onChange={(e) => setAlternativas(e.target.value)} rows={2} maxLength={300}
                placeholder="Otras opciones de tratamiento o procedimiento..."
                className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none"
              />
              <CharCount current={alternativas.length} max={300} />
            </div>
          </Section>

          <Section icon="ri-quill-pen-line" title="Firma y Testigo" tone="bg-emerald-100 text-emerald-600">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1">Firmado por</label>
                <input type="text" value={firmadoPor} onChange={(e) => setFirmadoPor(e.target.value)}
                  placeholder="Nombre completo del firmante"
                  className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1">Testigo (opcional)</label>
                <input type="text" value={testigo} onChange={(e) => setTestigo(e.target.value)}
                  placeholder="Nombre del testigo"
                  className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base"
                />
              </div>
            </div>
          </Section>

          {/* Previsualización */}
          {descripcion && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-foreground-800 flex items-center gap-2">
                  <span className="w-6 h-6 flex items-center justify-center rounded-md bg-secondary-100 text-foreground-600">
                    <i className="ri-eye-line text-xs"></i>
                  </span>
                  Previsualización del documento
                </h4>
                <button onClick={() => setShowPreview(!showPreview)} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer">
                  {showPreview ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              {showPreview && (
                <div className="p-4 bg-secondary-50 border border-secondary-200 rounded-xl text-sm text-foreground-700 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                  <div className="text-center pb-2 border-b border-secondary-200 mb-3">
                    <p className="text-xs text-foreground-500">{patient ? `${patient.nombre} ${patient.apellidos}` : '[Paciente]'} · {patient?.expediente || '[Expediente]'}</p>
                    <p className="font-semibold mt-1">{titulo || '[Título]'}</p>
                  </div>
                  {previewText}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-background-50 border-t border-secondary-200 px-6 py-4 flex items-center justify-between gap-3">
          <div className="text-xs text-foreground-400 flex items-center gap-1.5">
            <i className="ri-lock-line"></i> Firma electrónica al guardar
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { reset(); onClose(); }} className="px-4 py-2 text-sm font-medium text-foreground-600 hover:text-foreground-800 hover:bg-secondary-100 rounded-lg transition-base cursor-pointer whitespace-nowrap">
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={!patientId || !titulo.trim() || !descripcion.trim()}
              className="px-6 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-base cursor-pointer whitespace-nowrap flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="ri-save-line"></i> Guardar consentimiento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}