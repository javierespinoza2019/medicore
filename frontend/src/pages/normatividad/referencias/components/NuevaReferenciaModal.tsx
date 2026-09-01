import { useState } from 'react';
import type { ReferenciaMedica } from '@/mocks/referencias';
import { patients } from '@/mocks/patients';
import { doctors } from '@/mocks/doctors';

interface NuevaReferenciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGuardar: (r: ReferenciaMedica) => void;
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

export default function NuevaReferenciaModal({ isOpen, onClose, onGuardar }: NuevaReferenciaModalProps) {
  const [patientId, setPatientId] = useState('');
  const [tipo, setTipo] = useState<ReferenciaMedica['tipo']>('referencia');
  const [origen, setOrigen] = useState('MediCore Clínica');
  const [destino, setDestino] = useState('');
  const [motivo, setMotivo] = useState('');
  const [diagnosticoResumen, setDiagnosticoResumen] = useState('');
  const [tratamientoPrevio, setTratamientoPrevio] = useState('');
  const [estudiosRealizados, setEstudiosRealizados] = useState('');
  const [estudiosPendientes, setEstudiosPendientes] = useState('');
  const [recomendaciones, setRecomendaciones] = useState('');
  const [medicoRemitente, setMedicoRemitente] = useState('');
  const [cedulaRemitente, setCedulaRemitente] = useState('');
  const [medicoReceptor, setMedicoReceptor] = useState('');
  const [cedulaReceptor, setCedulaReceptor] = useState('');
  const [urgencia, setUrgencia] = useState<ReferenciaMedica['urgencia']>('programada');
  const [transporte, setTransporte] = useState<ReferenciaMedica['transporte']>('particular');
  const [acompanante, setAcompanante] = useState('');
  const [contactoDestino, setContactoDestino] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const patient = patients.find((p) => p.id === patientId);

  const urgenciaColor: Record<ReferenciaMedica['urgencia'], string> = {
    programada: 'bg-sky-100 text-sky-700 border-sky-300',
    urgente: 'bg-amber-100 text-amber-700 border-amber-300',
    emergencia: 'bg-red-100 text-red-700 border-red-300',
  };

  const handleGuardar = () => {
    if (!patientId || !destino.trim() || !motivo.trim() || !diagnosticoResumen.trim() || !medicoRemitente.trim()) {
      setError('Paciente, destino, motivo, diagnóstico y médico remitente son obligatorios.');
      return;
    }
    const now = new Date();
    const fecha = now.toISOString().split('T')[0];
    const hora = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const nuevo: ReferenciaMedica = {
      id: `${tipo === 'referencia' ? 'ref' : 'contra'}-${patientId}-${Date.now().toString(36)}`,
      patientId,
      patientName: patient ? `${patient.nombre} ${patient.apellidos}` : '',
      patientExpediente: patient?.expediente || '',
      tipo,
      fecha,
      hora,
      origen: origen.trim(),
      destino: destino.trim(),
      motivo: motivo.trim(),
      diagnosticoResumen: diagnosticoResumen.trim(),
      tratamientoPrevio: tratamientoPrevio.trim(),
      estudiosRealizados: estudiosRealizados.split('\n').filter(Boolean),
      estudiosPendientes: estudiosPendientes.split('\n').filter(Boolean),
      recomendaciones: recomendaciones.trim(),
      medicoRemitente: medicoRemitente.trim(),
      cedulaRemitente: cedulaRemitente.trim(),
      medicoReceptor: medicoReceptor.trim() || undefined,
      cedulaReceptor: cedulaReceptor.trim() || undefined,
      urgencia,
      transporte,
      acompanante: acompanante.trim(),
      estado: 'enviada',
      contactoDestino: contactoDestino.trim(),
    };
    onGuardar(nuevo);
    reset();
    onClose();
  };

  const reset = () => {
    setPatientId(''); setTipo('referencia'); setOrigen('MediCore Clínica'); setDestino(''); setMotivo('');
    setDiagnosticoResumen(''); setTratamientoPrevio(''); setEstudiosRealizados(''); setEstudiosPendientes('');
    setRecomendaciones(''); setMedicoRemitente(''); setCedulaRemitente(''); setMedicoReceptor(''); setCedulaReceptor('');
    setUrgencia('programada'); setTransporte('particular'); setAcompanante(''); setContactoDestino(''); setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
      <div className="bg-background-50 rounded-xl shadow-lg max-w-3xl w-full mx-4 max-h-[92vh] overflow-y-auto">

        <div className="sticky top-0 bg-background-50 z-10 flex items-center justify-between px-6 py-4 border-b border-secondary-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-accent-100">
              <i className="ri-arrow-left-right-line text-accent-600"></i>
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground-900">Nueva {tipo === 'referencia' ? 'Referencia' : 'Contrarreferencia'} Médica</h3>
              <p className="text-2xs text-foreground-500">NOM-004 · Nota de referencia entre unidades</p>
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

          <Section icon="ri-user-line" title="Datos del Paciente y Tipo" tone="bg-primary-100 text-primary-600">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <RequiredLabel>Paciente</RequiredLabel>
                <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base">
                  <option value="">Seleccionar...</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.nombre} {p.apellidos}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1">Tipo</label>
                <div className="flex gap-1">
                  {(['referencia', 'contrarreferencia'] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setTipo(t)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-base cursor-pointer whitespace-nowrap ${tipo === t ? 'bg-accent-100 text-accent-700 border-accent-300' : 'bg-background-50 text-foreground-600 border-secondary-200'}`}>
                      {t === 'referencia' ? 'Referencia' : 'Contrarref.'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1">Urgencia</label>
                <div className="flex gap-1">
                  {(['programada', 'urgente', 'emergencia'] as ReferenciaMedica['urgencia'][]).map((u) => (
                    <button key={u} type="button" onClick={() => setUrgencia(u)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-base cursor-pointer whitespace-nowrap ${urgencia === u ? urgenciaColor[u] : 'bg-background-50 text-foreground-600 border-secondary-200'}`}>
                      {u === 'programada' ? 'Program.' : u === 'urgente' ? 'Urgente' : 'Emerg.'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          <Section icon="ri-hospital-line" title="Origen y Destino" tone="bg-violet-100 text-violet-600">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1">Origen</label>
                <input type="text" value={origen} onChange={(e) => setOrigen(e.target.value)} className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base" />
              </div>
              <div>
                <RequiredLabel>Destino</RequiredLabel>
                <input type="text" value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Ej. Hospital General de Zona 27" className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base" />
              </div>
            </div>
          </Section>

          <Section icon="ri-file-list-3-line" title="Motivo y Diagnóstico" tone="bg-sky-100 text-sky-600">
            <div>
              <RequiredLabel>Motivo de la referencia</RequiredLabel>
              <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} maxLength={500} placeholder="Describa el motivo de la referencia..."
                className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none" />
              <CharCount current={motivo.length} max={500} />
            </div>
            <div>
              <RequiredLabel>Diagnóstico resumen</RequiredLabel>
              <textarea value={diagnosticoResumen} onChange={(e) => setDiagnosticoResumen(e.target.value)} rows={3} maxLength={500} placeholder="Resumen del diagnóstico con código CIE-10..."
                className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none" />
              <CharCount current={diagnosticoResumen.length} max={500} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-700 mb-1">Tratamiento previo / recibido</label>
              <textarea value={tratamientoPrevio} onChange={(e) => setTratamientoPrevio(e.target.value)} rows={3} maxLength={500} placeholder="Describa el tratamiento..."
                className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none" />
              <CharCount current={tratamientoPrevio.length} max={500} />
            </div>
          </Section>

          <Section icon="ri-microscope-line" title="Estudios y Recomendaciones" tone="bg-amber-100 text-amber-600">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1">Estudios realizados (uno por línea)</label>
                <textarea value={estudiosRealizados} onChange={(e) => setEstudiosRealizados(e.target.value)} rows={3} maxLength={500} placeholder="ECG: ritmo sinusal&#10;Troponina: normal..."
                  className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none" />
                <CharCount current={estudiosRealizados.length} max={500} />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1">Estudios pendientes (uno por línea)</label>
                <textarea value={estudiosPendientes} onChange={(e) => setEstudiosPendientes(e.target.value)} rows={3} maxLength={500} placeholder="Eco transtorácica&#10;Test de esfuerzo..."
                  className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none" />
                <CharCount current={estudiosPendientes.length} max={500} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-700 mb-1">Recomendaciones</label>
              <textarea value={recomendaciones} onChange={(e) => setRecomendaciones(e.target.value)} rows={3} maxLength={500} placeholder="Recomendaciones para la unidad receptora..."
                className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none" />
              <CharCount current={recomendaciones.length} max={500} />
            </div>
          </Section>

          <Section icon="ri-user-star-line" title="Médicos y Logística" tone="bg-emerald-100 text-emerald-600">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <RequiredLabel>Médico remitente</RequiredLabel>
                <select value={medicoRemitente} onChange={(e) => {
                  const doc = doctors.find((d) => d.nombre === e.target.value);
                  setMedicoRemitente(e.target.value); setCedulaRemitente(doc?.cedula || '');
                }} className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base">
                  <option value="">Seleccionar médico...</option>
                  {doctors.map((d) => <option key={d.id} value={d.nombre}>{d.nombre} — {d.especialidad}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1">Cédula remitente</label>
                <input type="text" value={cedulaRemitente} onChange={(e) => setCedulaRemitente(e.target.value)} className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1">Médico receptor</label>
                <input type="text" value={medicoReceptor} onChange={(e) => setMedicoReceptor(e.target.value)} placeholder="Nombre del médico de destino (opcional)" className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1">Cédula receptor</label>
                <input type="text" value={cedulaReceptor} onChange={(e) => setCedulaReceptor(e.target.value)} className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1">Transporte</label>
                <select value={transporte} onChange={(e) => setTransporte(e.target.value as ReferenciaMedica['transporte'])} className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base">
                  <option value="particular">Particular</option>
                  <option value="ambulancia">Ambulancia</option>
                  <option value="publico">Transporte público</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1">Acompañante</label>
                <input type="text" value={acompanante} onChange={(e) => setAcompanante(e.target.value)} placeholder="Nombre y parentesco" className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1">Contacto destino</label>
                <input type="text" value={contactoDestino} onChange={(e) => setContactoDestino(e.target.value)} placeholder="Teléfono / Email" className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base" />
              </div>
            </div>
          </Section>
        </div>

        <div className="sticky bottom-0 bg-background-50 border-t border-secondary-200 px-6 py-4 flex items-center justify-between gap-3">
          <div className="text-xs text-foreground-400 flex items-center gap-1.5">
            <i className="ri-lock-line"></i> Firma electrónica al guardar
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { reset(); onClose(); }} className="px-4 py-2 text-sm font-medium text-foreground-600 hover:text-foreground-800 hover:bg-secondary-100 rounded-lg transition-base cursor-pointer whitespace-nowrap">
              Cancelar
            </button>
            <button onClick={handleGuardar}
              disabled={!patientId || !destino.trim() || !motivo.trim() || !diagnosticoResumen.trim() || !medicoRemitente.trim()}
              className="px-6 py-2 text-sm font-medium text-white bg-accent-500 hover:bg-accent-600 rounded-lg transition-base cursor-pointer whitespace-nowrap flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="ri-save-line"></i> Guardar {tipo === 'referencia' ? 'referencia' : 'contrarreferencia'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}