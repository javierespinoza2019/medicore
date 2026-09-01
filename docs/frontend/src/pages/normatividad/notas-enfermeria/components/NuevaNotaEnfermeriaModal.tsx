import { useState } from 'react';
import type { NotaEnfermeria, ActividadEnfermeria, MedicamentoAdministrado } from '@/mocks/notasEnfermeria';
import { actividadTipoConfig } from '@/mocks/notasEnfermeria';
import { patients } from '@/mocks/patients';

interface NuevaNotaEnfermeriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGuardar: (n: NotaEnfermeria) => void;
}

const enfermeras = [
  { nombre: 'Lic. Carmen Vargas Ortega', cedula: 'ENF-2024-0012', especialidad: 'Enfermería Clínica' },
  { nombre: 'Lic. Roberto Méndez Castillo', cedula: 'ENF-2023-0045', especialidad: 'Enfermería General' },
];

const estadoOptions: Array<{ value: NotaEnfermeria['estadoInicio']; label: string }> = [
  { value: 'estable', label: 'Estable' },
  { value: 'mejorando', label: 'Mejorando' },
  { value: 'grave', label: 'Grave' },
  { value: 'critico', label: 'Crítico' },
  { value: 'deterioro', label: 'Deterioro' },
];

const viaOptions = ['vo', 'iv', 'im', 'sc', 'rectal', 'topica', 'inhalatoria'];
const viaLabel: Record<string, string> = {
  vo: 'Vía oral', iv: 'IV', im: 'IM', sc: 'SC', rectal: 'Rectal', topica: 'Tópica', inhalatoria: 'Inhalatoria',
};

function CharCount({ current, max }: { current: number; max: number }) {
  return (
    <p className={`text-2xs mt-0.5 ${current >= max * 0.9 ? 'text-amber-500' : 'text-foreground-400'}`}>
      {current}/{max}
    </p>
  );
}

function RequiredLabel({ children }: { children: string }) {
  return <label className="block text-xs font-medium text-foreground-700 mb-1">{children} <span className="text-red-500">*</span></label>;
}

export default function NuevaNotaEnfermeriaModal({ isOpen, onClose, onGuardar }: NuevaNotaEnfermeriaModalProps) {
  const [patientId, setPatientId] = useState('');
  const [turno, setTurno] = useState<NotaEnfermeria['turno']>('matutino');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [enfermeraIdx, setEnfermeraIdx] = useState('');
  const [estadoInicio, setEstadoInicio] = useState<NotaEnfermeria['estadoInicio']>('estable');
  const [estadoFin, setEstadoFin] = useState<NotaEnfermeria['estadoFin']>('estable');
  const [dolorEva, setDolorEva] = useState('');

  // Signos vitales
  const [temperatura, setTemperatura] = useState('');
  const [presionSis, setPresionSis] = useState('');
  const [presionDia, setPresionDia] = useState('');
  const [fc, setFc] = useState('');
  const [fr, setFr] = useState('');
  const [spo2, setSpo2] = useState('');
  const [glucosa, setGlucosa] = useState('');
  const [peso, setPeso] = useState('');
  const [talla, setTalla] = useState('');

  // Actividades
  const [actividades, setActividades] = useState<ActividadEnfermeria[]>([]);
  const [actTipo, setActTipo] = useState<ActividadEnfermeria['tipo']>('monitoreo');
  const [actDescripcion, setActDescripcion] = useState('');
  const [actHora, setActHora] = useState('');
  const [actResultado, setActResultado] = useState('');

  // Medicamentos
  const [medicamentos, setMedicamentos] = useState<MedicamentoAdministrado[]>([]);
  const [medNombre, setMedNombre] = useState('');
  const [medDosis, setMedDosis] = useState('');
  const [medVia, setMedVia] = useState<string>('vo');
  const [medHora, setMedHora] = useState('');
  const [medObs, setMedObs] = useState('');

  const [evolucion, setEvolucion] = useState('');
  const [planCuidados, setPlanCuidados] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState('');

  const turnoRangos: Record<NotaEnfermeria['turno'], { inicio: string; fin: string }> = {
    matutino: { inicio: '07:00', fin: '15:00' },
    vespertino: { inicio: '15:00', fin: '23:00' },
    nocturno: { inicio: '23:00', fin: '07:00' },
  };

  const handleTurnoChange = (t: NotaEnfermeria['turno']) => {
    setTurno(t);
    setHoraInicio(turnoRangos[t].inicio);
    setHoraFin(turnoRangos[t].fin);
  };

  const addActividad = () => {
    if (!actDescripcion.trim() || !actHora) return;
    const nueva: ActividadEnfermeria = {
      id: `a-${Date.now()}`,
      tipo: actTipo,
      descripcion: actDescripcion.trim(),
      hora: actHora,
      resultado: actResultado.trim() || undefined,
    };
    setActividades((prev) => [...prev, nueva]);
    setActDescripcion('');
    setActHora('');
    setActResultado('');
  };

  const removeActividad = (id: string) => setActividades((prev) => prev.filter((a) => a.id !== id));

  const addMedicamento = () => {
    if (!medNombre.trim() || !medDosis.trim() || !medHora) return;
    const nuevo: MedicamentoAdministrado = {
      nombre: medNombre.trim(),
      dosis: medDosis.trim(),
      via: medVia,
      hora: medHora,
      observacion: medObs.trim() || undefined,
    };
    setMedicamentos((prev) => [...prev, nuevo]);
    setMedNombre('');
    setMedDosis('');
    setMedHora('');
    setMedObs('');
  };

  const removeMedicamento = (i: number) => setMedicamentos((prev) => prev.filter((_, idx) => idx !== i));

  const reset = () => {
    setPatientId(''); setTurno('matutino'); setHoraInicio(''); setHoraFin(''); setEnfermeraIdx('');
    setEstadoInicio('estable'); setEstadoFin('estable'); setDolorEva('');
    setTemperatura(''); setPresionSis(''); setPresionDia(''); setFc(''); setFr(''); setSpo2(''); setGlucosa(''); setPeso(''); setTalla('');
    setActividades([]); setMedicamentos([]);
    setEvolucion(''); setPlanCuidados(''); setObservaciones(''); setError('');
  };

  const handleGuardar = () => {
    if (!patientId || !enfermeraIdx || !evolucion.trim() || !planCuidados.trim()) {
      setError('Paciente, enfermera, evolución y plan de cuidados son obligatorios.');
      return;
    }
    const patient = patients.find((p) => p.id === patientId);
    const enf = enfermeras[parseInt(enfermeraIdx, 10)];
    const now = new Date();
    const fecha = now.toISOString().split('T')[0];
    const nueva: NotaEnfermeria = {
      id: `ne-${patientId}-${Date.now().toString(36)}`,
      patientId,
      patientName: patient ? `${patient.nombre} ${patient.apellidos}` : '',
      patientExpediente: patient?.expediente || '',
      fecha,
      horaInicio: horaInicio || turnoRangos[turno].inicio,
      horaFin: horaFin || turnoRangos[turno].fin,
      turno,
      enfermera: enf.nombre,
      cedulaEnfermera: enf.cedula,
      especialidad: enf.especialidad,
      temperatura: temperatura || '—',
      presionSistolica: presionSis || '—',
      presionDiastolica: presionDia || '—',
      frecuenciaCardiaca: fc || '—',
      frecuenciaRespiratoria: fr || '—',
      saturacionOxigeno: spo2 || '—',
      glucosa: glucosa || '—',
      peso: peso || '—',
      talla: talla || '—',
      estadoInicio,
      estadoFin,
      dolorEva: dolorEva || '0',
      actividades,
      medicamentos,
      evolucionEnfermeria: evolucion.trim(),
      planCuidados: planCuidados.trim(),
      observaciones: observaciones.trim() || undefined,
      firmaEnfermera: true,
    };
    onGuardar(nueva);
    reset();
    onClose();
  };

  if (!isOpen) return null;

  const enf = enfermeraIdx !== '' ? enfermeras[parseInt(enfermeraIdx, 10)] : null;
  const dolorNum = parseInt(dolorEva, 10);
  const dolorColor = Number.isNaN(dolorNum) ? '' : dolorNum <= 3 ? 'text-emerald-600' : dolorNum <= 6 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
      <div className="bg-background-50 rounded-xl shadow-lg max-w-3xl w-full mx-4 max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-background-50 z-10 flex items-center justify-between px-6 py-4 border-b border-secondary-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary-100">
              <i className="ri-nurse-line text-primary-600"></i>
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground-900">Nueva Nota de Enfermería</h3>
              <p className="text-2xs text-foreground-500">NOM-004-SSA3-2012 · Art. 6.3.4</p>
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

          {/* Sección 1: Datos básicos */}
          <Section icon="ri-information-line" title="Datos del Turno" tone="bg-primary-100 text-primary-600">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <RequiredLabel>Paciente</RequiredLabel>
                <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base">
                  <option value="">Seleccionar paciente...</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre} {p.apellidos} · {p.expediente}</option>
                  ))}
                </select>
              </div>
              <div>
                <RequiredLabel>Enfermera responsable</RequiredLabel>
                <select value={enfermeraIdx} onChange={(e) => setEnfermeraIdx(e.target.value)} className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base">
                  <option value="">Seleccionar enfermera...</option>
                  {enfermeras.map((e, i) => (
                    <option key={i} value={String(i)}>{e.nombre} — {e.especialidad}</option>
                  ))}
                </select>
                {enf && <p className="text-2xs text-foreground-500 mt-0.5">Cédula: {enf.cedula}</p>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1">Turno</label>
                <div className="flex gap-1">
                  {(['matutino', 'vespertino', 'nocturno'] as NotaEnfermeria['turno'][]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleTurnoChange(t)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-base cursor-pointer whitespace-nowrap ${turno === t ? 'bg-primary-100 text-primary-700 border-primary-300' : 'bg-background-50 text-foreground-600 border-secondary-200 hover:border-secondary-300'}`}
                    >
                      {t === 'matutino' ? 'Matutino' : t === 'vespertino' ? 'Vespertino' : 'Nocturno'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1">Hora inicio</label>
                <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1">Hora fin</label>
                <input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1">Estado al inicio</label>
                <select value={estadoInicio} onChange={(e) => setEstadoInicio(e.target.value as NotaEnfermeria['estadoInicio'])} className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base">
                  {estadoOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1">Estado al final</label>
                <select value={estadoFin} onChange={(e) => setEstadoFin(e.target.value as NotaEnfermeria['estadoFin'])} className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base">
                  {estadoOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-700 mb-1">Dolor EVA (0–10)</label>
                <div className="flex items-center gap-2">
                  <input type="range" min="0" max="10" value={dolorEva || '0'} onChange={(e) => setDolorEva(e.target.value)} className="flex-1 h-2 accent-primary-500" />
                  <span className={`text-sm font-bold w-6 text-center ${dolorColor}`}>{dolorEva || '0'}</span>
                </div>
              </div>
            </div>
          </Section>

          {/* Sección 2: Signos vitales */}
          <Section icon="ri-heart-pulse-line" title="Signos Vitales" tone="bg-emerald-100 text-emerald-600">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              <SignoInput label="Temperatura" unit="°C" value={temperatura} onChange={setTemperatura} placeholder="36.5" />
              <SignoInput label="P. Sistólica" unit="mmHg" value={presionSis} onChange={setPresionSis} placeholder="120" />
              <SignoInput label="P. Diastólica" unit="mmHg" value={presionDia} onChange={setPresionDia} placeholder="80" />
              <SignoInput label="F. Cardiaca" unit="lpm" value={fc} onChange={setFc} placeholder="72" />
              <SignoInput label="F. Respir." unit="rpm" value={fr} onChange={setFr} placeholder="16" />
              <SignoInput label="SpO₂" unit="%" value={spo2} onChange={setSpo2} placeholder="98" />
              <SignoInput label="Glucosa" unit="mg/dL" value={glucosa} onChange={setGlucosa} placeholder="90" />
              <SignoInput label="Peso" unit="kg" value={peso} onChange={setPeso} placeholder="70" />
              <SignoInput label="Talla" unit="m" value={talla} onChange={setTalla} placeholder="1.65" />
            </div>
          </Section>

          {/* Sección 3: Actividades */}
          <Section icon="ri-clipboard-line" title="Actividades de Enfermería" tone="bg-sky-100 text-sky-600">
            {actividades.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {actividades.map((a) => {
                  const tipoCfg = actividadTipoConfig[a.tipo];
                  return (
                    <div key={a.id} className="flex items-start gap-2 p-2 bg-background-50 rounded-lg border border-secondary-100">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-medium border flex-shrink-0 ${tipoCfg.color}`}>
                        {tipoCfg.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground-700">{a.descripcion} · {a.hora}</p>
                        {a.resultado && <p className="text-2xs text-foreground-500">→ {a.resultado}</p>}
                      </div>
                      <button onClick={() => removeActividad(a.id)} className="w-5 h-5 flex items-center justify-center rounded-full text-foreground-400 hover:text-red-500 hover:bg-red-50 transition-base cursor-pointer flex-shrink-0">
                        <i className="ri-close-line text-xs"></i>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <select value={actTipo} onChange={(e) => setActTipo(e.target.value as ActividadEnfermeria['tipo'])} className="px-2 py-2 text-xs bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 outline-none focus:border-primary-400 transition-base">
                {Object.entries(actividadTipoConfig).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
              <input type="time" value={actHora} onChange={(e) => setActHora(e.target.value)} className="px-2 py-2 text-xs bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 outline-none focus:border-primary-400 transition-base" />
              <input type="text" value={actDescripcion} onChange={(e) => setActDescripcion(e.target.value)} placeholder="Descripción de la actividad" className="col-span-2 sm:col-span-1 px-2 py-2 text-xs bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base" />
              <input type="text" value={actResultado} onChange={(e) => setActResultado(e.target.value)} placeholder="Resultado (opcional)" className="col-span-2 sm:col-span-1 px-2 py-2 text-xs bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base" />
            </div>
            <button
              type="button"
              onClick={addActividad}
              disabled={!actDescripcion.trim() || !actHora}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg cursor-pointer transition-base disabled:opacity-40"
            >
              <i className="ri-add-line"></i> Agregar actividad
            </button>
          </Section>

          {/* Sección 4: Medicamentos */}
          <Section icon="ri-capsule-line" title="Medicamentos Administrados" tone="bg-amber-100 text-amber-600">
            {medicamentos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-3">
                {medicamentos.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-background-50 rounded-lg border border-secondary-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground-800">{m.nombre} · {m.dosis} · {viaLabel[m.via] || m.via} · {m.hora}</p>
                      {m.observacion && <p className="text-2xs text-foreground-500">{m.observacion}</p>}
                    </div>
                    <button onClick={() => removeMedicamento(i)} className="w-5 h-5 flex items-center justify-center rounded-full text-foreground-400 hover:text-red-500 hover:bg-red-50 transition-base cursor-pointer flex-shrink-0">
                      <i className="ri-close-line text-xs"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <input type="text" value={medNombre} onChange={(e) => setMedNombre(e.target.value)} placeholder="Medicamento" className="col-span-2 sm:col-span-1 px-2 py-2 text-xs bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base" />
              <input type="text" value={medDosis} onChange={(e) => setMedDosis(e.target.value)} placeholder="Dosis" className="px-2 py-2 text-xs bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base" />
              <select value={medVia} onChange={(e) => setMedVia(e.target.value)} className="px-2 py-2 text-xs bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 outline-none focus:border-primary-400 transition-base">
                {viaOptions.map((v) => <option key={v} value={v}>{viaLabel[v]}</option>)}
              </select>
              <input type="time" value={medHora} onChange={(e) => setMedHora(e.target.value)} className="px-2 py-2 text-xs bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 outline-none focus:border-primary-400 transition-base" />
              <input type="text" value={medObs} onChange={(e) => setMedObs(e.target.value)} placeholder="Observación" className="col-span-2 sm:col-span-1 px-2 py-2 text-xs bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base" />
            </div>
            <button
              type="button"
              onClick={addMedicamento}
              disabled={!medNombre.trim() || !medDosis.trim() || !medHora}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg cursor-pointer transition-base disabled:opacity-40"
            >
              <i className="ri-add-line"></i> Agregar medicamento
            </button>
          </Section>

          {/* Sección 5: Evolución y plan */}
          <Section icon="ri-file-list-3-line" title="Evolución y Plan de Cuidados" tone="bg-violet-100 text-violet-600">
            <div>
              <RequiredLabel>Evolución de Enfermería</RequiredLabel>
              <textarea
                value={evolucion}
                onChange={(e) => setEvolucion(e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="Describe la evolución del paciente durante el turno..."
                className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none"
              />
              <CharCount current={evolucion.length} max={1000} />
            </div>
            <div>
              <RequiredLabel>Plan de Cuidados</RequiredLabel>
              <textarea
                value={planCuidados}
                onChange={(e) => setPlanCuidados(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="1. Monitoreo cada 4h&#10;2. Continuar medicamentos&#10;3. ..."
                className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none"
              />
              <CharCount current={planCuidados.length} max={500} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-700 mb-1">Observaciones adicionales</label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={2}
                maxLength={300}
                placeholder="Familiar, evento especial, avisos al siguiente turno..."
                className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base resize-none"
              />
              <CharCount current={observaciones.length} max={300} />
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background-50 border-t border-secondary-200 px-6 py-4 flex items-center justify-between gap-3">
          <div className="text-xs text-foreground-400 flex items-center gap-1.5">
            <i className="ri-lock-line"></i> Firma electrónica al guardar
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { reset(); onClose(); }} className="px-4 py-2 text-sm font-medium text-foreground-600 hover:text-foreground-800 hover:bg-secondary-100 rounded-lg transition-base cursor-pointer whitespace-nowrap">
              Cancelar
            </button>
            <button onClick={handleGuardar} className="px-6 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-base cursor-pointer whitespace-nowrap flex items-center gap-2">
              <i className="ri-save-line"></i> Guardar nota
            </button>
          </div>
        </div>
      </div>
    </div>
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

function SignoInput({ label, unit, value, onChange, placeholder }: { label: string; unit: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-2xs font-medium text-foreground-500 mb-1 block">{label} <span className="text-foreground-400">({unit})</span></label>
      <input type="text" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-2 py-2 text-xs bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base" />
    </div>
  );
}