import { useState } from 'react';
import type { HojaEgreso } from '@/mocks/egresos';
import { patients } from '@/mocks/patients';
import { doctors } from '@/mocks/doctors';

interface NuevaHojaEgresoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGuardar: (e: HojaEgreso) => void;
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

export default function NuevaHojaEgresoModal({ isOpen, onClose, onGuardar }: NuevaHojaEgresoModalProps) {
  const [patientId, setPatientId] = useState('');
  const [fechaIngreso, setFechaIngreso] = useState('');
  const [horaIngreso, setHoraIngreso] = useState('');
  const [motivoIngreso, setMotivoIngreso] = useState('');
  const [diagnosticoIngreso, setDiagnosticoIngreso] = useState('');
  const [diagnosticosSecundarios, setDiagnosticosSecundarios] = useState('');
  const [resumenEvolucion, setResumenEvolucion] = useState('');
  const [tratamientoRecibido, setTratamientoRecibido] = useState('');
  const [estudiosRealizados, setEstudiosRealizados] = useState('');
  const [diagnosticoEgreso, setDiagnosticoEgreso] = useState('');
  const [estadoAlta, setEstadoAlta] = useState<HojaEgreso['estadoAlta']>('mejorado');
  const [destinoAlta, setDestinoAlta] = useState<HojaEgreso['destinoAlta']>('domicilio');
  const [recomendaciones, setRecomendaciones] = useState('');
  const [medicamentosAlta, setMedicamentosAlta] = useState('');
  const [citaControl, setCitaControl] = useState('');
  const [medicoTratante, setMedicoTratante] = useState('');
  const [cedulaTratante, setCedulaTratante] = useState('');
  const [especialidad, setEspecialidad] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const patient = patients.find((p) => p.id === patientId);

  const estadoAltaColors: Record<HojaEgreso['estadoAlta'], string> = {
    mejorado: 'bg-sky-100 text-sky-700 border-sky-300',
    curado: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    estable: 'bg-secondary-100 text-foreground-700 border-secondary-300',
    inconcluso: 'bg-amber-100 text-amber-700 border-amber-300',
    fallecimiento: 'bg-red-100 text-red-700 border-red-300',
  };

  const handleGuardar = () => {
    if (!patientId || !fechaIngreso || !horaIngreso || !motivoIngreso.trim() || !diagnosticoEgreso.trim() || !medicoTratante.trim()) {
      setError('Paciente, fecha/hora de ingreso, motivo, diagnóstico de egreso y médico tratante son obligatorios.');
      return;
    }
    const now = new Date();
    const fechaEgreso = now.toISOString().split('T')[0];
    const horaEgreso = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const parseMeds = (text: string): HojaEgreso['medicamentosAlta'] => {
      return text.split('\n').filter(Boolean).map((line) => {
        const parts = line.split('|').map((s) => s.trim());
        return { nombre: parts[0] || 'Medicamento', dosis: parts[1] || '—', frecuencia: parts[2] || '—', duracion: parts[3] || '—' };
      });
    };

    const nuevo: HojaEgreso = {
      id: `eg-${patientId}-${Date.now().toString(36)}`,
      patientId,
      patientName: patient ? `${patient.nombre} ${patient.apellidos}` : '',
      patientExpediente: patient?.expediente || '',
      fechaIngreso,
      horaIngreso,
      fechaEgreso,
      horaEgreso,
      motivoIngreso: motivoIngreso.trim(),
      diagnosticoIngreso: diagnosticoIngreso.trim(),
      diagnosticosSecundarios: diagnosticosSecundarios.split('\n').filter(Boolean),
      resumenEvolucion: resumenEvolucion.trim(),
      tratamientoRecibido: tratamientoRecibido.split('\n').filter(Boolean),
      estudiosRealizados: estudiosRealizados.split('\n').filter(Boolean),
      diagnosticoEgreso: diagnosticoEgreso.trim(),
      estadoAlta,
      destinoAlta,
      recomendaciones: recomendaciones.trim(),
      medicamentosAlta: parseMeds(medicamentosAlta),
      citaControl: citaControl.trim() || undefined,
      medicoTratante: medicoTratante.trim(),
      cedulaTratante: cedulaTratante.trim(),
      especialidad: especialidad.trim(),
      firmaPaciente: false,
      firmaMedico: true,
    };
    onGuardar(nuevo);
    reset();
    onClose();
  };

  const reset = () => {
    setPatientId(''); setFechaIngreso(''); setHoraIngreso(''); setMotivoIngreso(''); setDiagnosticoIngreso('');
    setDiagnosticosSecundarios(''); setResumenEvolucion(''); setTratamientoRecibido(''); setEstudiosRealizados('');
    setDiagnosticoEgreso(''); setEstadoAlta('mejorado'); setDestinoAlta('domicilio'); setRecomendaciones('');
    setMedicamentosAlta(''); setCitaControl(''); setMedicoTratante(''); setCedulaTratante(''); setEspecialidad(''); setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
      <div className="bg-background-50 rounded-xl shadow-lg max-w-3xl w-full mx-4 max-h-[92vh] overflow-y-auto">

        <div className="sticky top-0 bg-background-50 z-10 flex items-center justify-between px-6 py-4 border-b border-secondary-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-emerald-100">
              <i className="ri-logout-box-line text-emerald-600"></i>
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground-900">Nueva Hoja de Egreso</h3>
              <p className="text-2xs text-foreground-500">NOM-004 · Art. 6.3.7 · Nota de egreso</p>
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

          <Section icon="ri-user-line" title="Datos del Ingreso" tone="bg-primary-100 text-primary-600">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <RequiredLabel>Paciente</RequiredLabel>
                <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base">
                  <option value="">Seleccionar...</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.nombre} {p.apellidos} · {p.expediente}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-foreground-700 mb-1">Fecha ingreso</label>
                  <input type="date" value={fechaIngreso} onChange={(e) => setFechaIngreso(e.target.value)} className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-700 mb-1">Hora ingreso</label>
                  <input type="time" value={horaIngreso} onChange={(e) => setHoraIngreso(e.target.value)} className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base" />
                </div>
              </div>
            </div>
            <div>
              <RequiredLabel>Motivo de ingreso</RequiredLabel>
              <textarea value={motivoIngreso} onChange={(e) => setMotivoIngreso(e.target.value)} rows={2} maxLength={500} placeholder="Describa el motivo de ingreso..."
                className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none" />
              <CharCount current={motivoIngreso.length} max={500} />
            </div>
          </Section>

          <Section icon="ri-stethoscope-line" title="Diagnósticos" tone="bg-amber-100 text-amber-600">
            <div>
              <label className="block text-xs font-medium text-foreground-700 mb-1">Diagnóstico de ingreso</label>
              <textarea value={diagnosticoIngreso} onChange={(e) => setDiagnosticoIngreso(e.target.value)} rows={2} maxLength={500} placeholder="CIE-10 y descripción al ingreso..."
                className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none" />
              <CharCount current={diagnosticoIngreso.length} max={500} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-700 mb-1">Diagnósticos secundarios (uno por línea)</label>
              <textarea value={diagnosticosSecundarios} onChange={(e) => setDiagnosticosSecundarios(e.target.value)} rows={2} maxLength={300} placeholder="E78.5 - Dislipidemia...&#10;Z87.1 - HTA conocida..."
                className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none" />
              <CharCount current={diagnosticosSecundarios.length} max={300} />
            </div>
          </Section>

          <Section icon="ri-heart-pulse-line" title="Evolución y Tratamiento" tone="bg-sky-100 text-sky-600">
            <div>
              <label className="block text-xs font-medium text-foreground-700 mb-1">Resumen de evolución</label>
              <textarea value={resumenEvolucion} onChange={(e) => setResumenEvolucion(e.target.value)} rows={4} maxLength={1000} placeholder="Describa la evolución durante la estancia..."
                className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none" />
              <CharCount current={resumenEvolucion.length} max={1000} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1">Tratamiento recibido (uno por línea)</label>
                <textarea value={tratamientoRecibido} onChange={(e) => setTratamientoRecibido(e.target.value)} rows={3} maxLength={500} placeholder="AAS 325mg VO carga..."
                  className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none" />
                <CharCount current={tratamientoRecibido.length} max={500} />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1">Estudios realizados (uno por línea)</label>
                <textarea value={estudiosRealizados} onChange={(e) => setEstudiosRealizados(e.target.value)} rows={3} maxLength={500} placeholder="ECG 12D: ritmo sinusal..."
                  className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none" />
                <CharCount current={estudiosRealizados.length} max={500} />
              </div>
            </div>
          </Section>

          <Section icon="ri-door-open-line" title="Condiciones de Egreso" tone="bg-emerald-100 text-emerald-600">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1">Estado de alta</label>
                <div className="grid grid-cols-2 gap-1">
                  {(['mejorado', 'curado', 'estable', 'inconcluso', 'fallecimiento'] as HojaEgreso['estadoAlta'][]).map((e) => (
                    <button key={e} type="button" onClick={() => setEstadoAlta(e)}
                      className={`py-1.5 rounded-lg text-xs font-medium border transition-base cursor-pointer whitespace-nowrap ${estadoAlta === e ? estadoAltaColors[e] : 'bg-background-50 text-foreground-600 border-secondary-200'}`}>
                      {e === 'mejorado' ? 'Mejorado' : e === 'curado' ? 'Curado' : e === 'estable' ? 'Estable' : e === 'inconcluso' ? 'Inconcluso' : 'Fallecimiento'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1">Destino de alta</label>
                <select value={destinoAlta} onChange={(e) => setDestinoAlta(e.target.value as HojaEgreso['destinoAlta'])} className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base">
                  <option value="domicilio">Domicilio</option>
                  <option value="hospital">Hospitalización</option>
                  <option value="otra_unidad">Otra unidad</option>
                  <option value="referencia">Referencia</option>
                  <option value="defuncion">Defunción</option>
                </select>
              </div>
            </div>
            <div>
              <RequiredLabel>Diagnóstico de egreso</RequiredLabel>
              <textarea value={diagnosticoEgreso} onChange={(e) => setDiagnosticoEgreso(e.target.value)} rows={2} maxLength={500} placeholder="Diagnóstico final con CIE-10..."
                className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none" />
              <CharCount current={diagnosticoEgreso.length} max={500} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-700 mb-1">Recomendaciones al alta</label>
              <textarea value={recomendaciones} onChange={(e) => setRecomendaciones(e.target.value)} rows={3} maxLength={500} placeholder="1. Continuar medicamentos...&#10;2. Dieta blanda...&#10;3. Reposo relativo..."
                className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none" />
              <CharCount current={recomendaciones.length} max={500} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-700 mb-1">
                Medicamentos al alta
                <span className="text-2xs text-foreground-400 ml-2 font-normal">(formato: nombre|dosis|frecuencia|duración, uno por línea)</span>
              </label>
              <textarea value={medicamentosAlta} onChange={(e) => setMedicamentosAlta(e.target.value)} rows={3} maxLength={500} placeholder="Aspirina|100mg|c/24h|Indefinido&#10;Metformina|500mg|c/8h|Crónico"
                className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none" />
              <CharCount current={medicamentosAlta.length} max={500} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-700 mb-1">Cita de control</label>
              <input type="text" value={citaControl} onChange={(e) => setCitaControl(e.target.value)} placeholder="Ej. 2026-09-03 — Cardiología" className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base" />
            </div>
          </Section>

          <Section icon="ri-user-star-line" title="Médico Tratante" tone="bg-violet-100 text-violet-600">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <RequiredLabel>Médico tratante</RequiredLabel>
                <select value={medicoTratante} onChange={(e) => {
                  const doc = doctors.find((d) => d.nombre === e.target.value);
                  setMedicoTratante(e.target.value); setCedulaTratante(doc?.cedula || ''); setEspecialidad(doc?.especialidad || '');
                }} className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base">
                  <option value="">Seleccionar...</option>
                  {doctors.map((d) => <option key={d.id} value={d.nombre}>{d.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1">Cédula profesional</label>
                <input type="text" value={cedulaTratante} onChange={(e) => setCedulaTratante(e.target.value)} className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1">Especialidad</label>
                <input type="text" value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base" />
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
              disabled={!patientId || !fechaIngreso || !horaIngreso || !motivoIngreso.trim() || !diagnosticoEgreso.trim() || !medicoTratante.trim()}
              className="px-6 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-base cursor-pointer whitespace-nowrap flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="ri-save-line"></i> Guardar hoja de egreso
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}