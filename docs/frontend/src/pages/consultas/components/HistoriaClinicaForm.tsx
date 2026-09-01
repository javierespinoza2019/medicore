import { useState, useEffect } from 'react';
import { getPatientById } from '@/mocks/patients';
import HistoriaClinicaPrintModal from './HistoriaClinicaPrintModal';
import {
  getHistoriaClinicaByPatient,
  createEmptyHistoriaClinica,
  condicionesHeredofamiliares,
  parentescosHeredofamiliares,
  tiposAntecedentePatologico,
  type HistoriaClinica,
  type AntecedenteHeredofamiliar,
  type AntecedentePatologico,
  type InterrogatorioSistema,
} from '@/mocks/historiaClinica';

interface Props {
  patientId: string;
  doctorName: string;
  onDirtyChange?: (dirty: boolean) => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved';

const parentescoColors: Record<string, string> = {
  Padre: 'bg-sky-100 text-sky-700',
  Madre: 'bg-rose-100 text-rose-700',
  Hermanos: 'bg-emerald-100 text-emerald-700',
  'Abuelos paternos': 'bg-amber-100 text-amber-700',
  'Abuelos maternos': 'bg-orange-100 text-orange-700',
  Tíos: 'bg-secondary-100 text-foreground-600',
};

function SectionHeader({ icon, title, tone }: { icon: string; title: string; tone: string }) {
  return (
    <h4 className="text-sm font-semibold text-foreground-800 flex items-center gap-2 mb-3">
      <span className={`w-6 h-6 flex items-center justify-center rounded-md ${tone}`} aria-hidden="true">
        <i className={`${icon} text-xs`}></i>
      </span>
      {title}
    </h4>
  );
}

function ChipMultiSelect({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const isActive = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-base cursor-pointer whitespace-nowrap ${
              isActive
                ? 'bg-primary-100 text-primary-700 border-primary-300'
                : 'bg-background-50 text-foreground-600 border-secondary-200 hover:border-secondary-300'
            }`}
          >
            {isActive && <i className="ri-check-line text-[10px]"></i>}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function RadioPill({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-base cursor-pointer whitespace-nowrap ${
            value === opt.value
              ? 'bg-foreground-900 text-background-50 border-foreground-900'
              : 'bg-background-50 text-foreground-600 border-secondary-200 hover:border-secondary-300'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-2xs font-medium text-foreground-500 mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="text-2xs font-medium text-foreground-500 mb-1 block">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none"
      />
    </div>
  );
}

export default function HistoriaClinicaForm({ patientId, doctorName, onDirtyChange }: Props) {
  const patient = getPatientById(patientId);
  const sexo = patient?.sexo ?? 'F';
  const existing = getHistoriaClinicaByPatient(patientId);

  const [draft, setDraft] = useState<HistoriaClinica>(() =>
    existing ? JSON.parse(JSON.stringify(existing)) : createEmptyHistoriaClinica(patientId, doctorName)
  );
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    onDirtyChange?.(isDirty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]);

  const updateDraft = (updater: (prev: HistoriaClinica) => HistoriaClinica) => {
    setDraft((prev) => updater(prev));
    setIsDirty(true);
    setSaveStatus('idle');
  };

  const handleSave = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setIsDirty(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }, 400);
  };

  // ---- AHF ----
  const toggleCondicionAHF = (ahfId: string, condicion: string) => {
    updateDraft((prev) => ({
      ...prev,
      ahf: prev.ahf.map((a) =>
        a.id === ahfId
          ? {
              ...a,
              condiciones: a.condiciones.includes(condicion)
                ? a.condiciones.filter((c) => c !== condicion)
                : [...a.condiciones, condicion],
            }
          : a
      ),
    }));
  };

  const addFamiliar = () => {
    const nuevo: AntecedenteHeredofamiliar = {
      id: `ahf-${Date.now()}`,
      parentesco: parentescosHeredofamiliares[0],
      condiciones: [],
      detalle: '',
    };
    updateDraft((prev) => ({ ...prev, ahf: [...prev.ahf, nuevo] }));
  };

  const removeFamiliar = (id: string) => {
    updateDraft((prev) => ({ ...prev, ahf: prev.ahf.filter((a) => a.id !== id) }));
  };

  // ---- APP ----
  const addPatologico = () => {
    const nuevo: AntecedentePatologico = {
      id: `app-${Date.now()}`,
      tipo: tiposAntecedentePatologico[0],
      descripcion: '',
      anio: '',
    };
    updateDraft((prev) => ({ ...prev, app: [...prev.app, nuevo] }));
  };

  const removePatologico = (id: string) => {
    updateDraft((prev) => ({ ...prev, app: prev.app.filter((a) => a.id !== id) }));
  };

  // ---- Interrogatorio ----
  const setInterrogatorioEstado = (id: string, estado: 'normal' | 'anormal') => {
    updateDraft((prev) => ({
      ...prev,
      interrogatorio: prev.interrogatorio.map((s) => (s.id === id ? { ...s, estado } : s)),
    }));
  };

  const setInterrogatorioDetalle = (id: string, detalle: string) => {
    updateDraft((prev) => ({
      ...prev,
      interrogatorio: prev.interrogatorio.map((s) => (s.id === id ? { ...s, detalle } : s)),
    }));
  };

  return (
    <div className="space-y-4">
      {/* Save bar */}
      {(isDirty || saveStatus === 'saved') && (
        <div className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border ${saveStatus === 'saved' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
          <div className="flex items-center gap-2">
            {saveStatus === 'saved' ? (
              <>
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><i className="ri-check-line text-xs"></i></span>
                <span className="text-xs font-medium text-emerald-700">Historia Clínica guardada correctamente</span>
              </>
            ) : saveStatus === 'saving' ? (
              <>
                <span className="w-5 h-5 flex items-center justify-center"><i className="ri-loader-4-line text-sm text-amber-600 animate-spin"></i></span>
                <span className="text-xs font-medium text-amber-700">Guardando...</span>
              </>
            ) : (
              <>
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-amber-100 text-amber-600"><i className="ri-edit-line text-xs"></i></span>
                <span className="text-xs font-medium text-amber-700">Tienes cambios sin guardar</span>
              </>
            )}
          </div>
          {saveStatus !== 'saving' && (
            <button
              onClick={handleSave}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-base whitespace-nowrap flex items-center gap-1.5 ${saveStatus === 'saved' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-amber-600 text-white hover:bg-amber-700'}`}
            >
              <i className={saveStatus === 'saved' ? 'ri-check-line' : 'ri-save-line'}></i>
              {saveStatus === 'saved' ? 'Guardado' : 'Guardar cambios'}
            </button>
          )}
        </div>
      )}

      {/* Barra de metadatos con botón de impresión */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 bg-background-50 rounded-xl border border-secondary-200">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-100 text-primary-600">
            <i className="ri-folder-history-line"></i>
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground-900">Historia Clínica</p>
            <p className="text-2xs text-foreground-400">NOM-004-SSA3-2012 · Editando</p>
          </div>
        </div>
        <button
          onClick={() => setShowPrintModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-background-50 border border-secondary-200 text-foreground-600 rounded-lg hover:bg-secondary-100 transition-base cursor-pointer whitespace-nowrap"
        >
          <i className="ri-printer-line"></i> Imprimir Historia Clínica
        </button>
      </div>

      {/* Ficha de identificación */}
      <div className="p-4 bg-background-50 rounded-xl border border-secondary-200">
        <SectionHeader icon="ri-profile-line" title="Ficha de Identificación" tone="bg-primary-100 text-primary-600" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-sm">
          <InfoItem label="Paciente" value={patient ? `${patient.nombre} ${patient.apellidos}` : '—'} />
          <InfoItem label="Edad" value={patient ? `${patient.edad} años` : '—'} />
          <InfoItem label="Sexo" value={sexo === 'F' ? 'Femenino' : 'Masculino'} />
          <InfoItem label="Expediente" value={patient?.expediente ?? '—'} />
          <InfoItem label="CURP" value={patient?.curp ?? '—'} />
          <InfoItem label="Ocupación" value={draft.apnp.ocupacion || 'Sin registro'} />
          <InfoItem label="Aseguradora" value={patient?.aseguradora || 'Particular'} />
          <InfoItem label="Médico tratante" value={doctorName} />
        </div>
      </div>

      {/* Antecedentes Heredofamiliares */}
      <div className="p-4 bg-background-50 rounded-xl border border-secondary-200">
        <SectionHeader icon="ri-parent-line" title="Antecedentes Heredofamiliares" tone="bg-sky-100 text-sky-600" />
        <div className="space-y-3">
          {draft.ahf.map((a) => (
            <div key={a.id} className="p-3 rounded-lg border border-secondary-100 bg-background-50">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <select
                  value={a.parentesco}
                  onChange={(e) => updateDraft((prev) => ({ ...prev, ahf: prev.ahf.map((x) => (x.id === a.id ? { ...x, parentesco: e.target.value } : x)) }))}
                  className="px-2 py-1 text-xs bg-background-50 border border-secondary-200 rounded-md text-foreground-700 outline-none focus:border-primary-400 transition-base"
                >
                  {parentescosHeredofamiliares.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <span className={`text-2xs px-1.5 py-0.5 rounded-full font-medium ${parentescoColors[a.parentesco] || 'bg-secondary-100 text-foreground-600'}`}>
                  {a.condiciones.length} condición{a.condiciones.length !== 1 ? 'es' : ''}
                </span>
                <button
                  onClick={() => removeFamiliar(a.id)}
                  className="ml-auto w-6 h-6 flex items-center justify-center rounded-full text-foreground-400 hover:text-red-500 hover:bg-red-50 transition-base cursor-pointer"
                  aria-label="Eliminar familiar"
                >
                  <i className="ri-close-line text-xs"></i>
                </button>
              </div>
              <ChipMultiSelect
                options={condicionesHeredofamiliares}
                selected={a.condiciones}
                onToggle={(c) => toggleCondicionAHF(a.id, c)}
              />
              <div className="mt-2">
                <input
                  type="text"
                  value={a.detalle}
                  onChange={(e) => updateDraft((prev) => ({ ...prev, ahf: prev.ahf.map((x) => (x.id === a.id ? { ...x, detalle: e.target.value } : x)) }))}
                  placeholder="Detalle (edad de diagnóstico, tratamiento...)"
                  className="w-full px-3 py-1.5 text-xs bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base"
                />
              </div>
            </div>
          ))}
          <button onClick={addFamiliar} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg cursor-pointer transition-base">
            <i className="ri-add-line"></i> Agregar familiar
          </button>
        </div>
      </div>

      {/* Antecedentes Personales No Patológicos */}
      <div className="p-4 bg-background-50 rounded-xl border border-secondary-200 space-y-4">
        <SectionHeader icon="ri-user-settings-line" title="Antecedentes Personales No Patológicos" tone="bg-emerald-100 text-emerald-600" />

        <div className="space-y-3">
          <div>
            <label className="text-2xs font-medium text-foreground-500 mb-1 block">Tabaquismo</label>
            <RadioPill
              options={[{ value: 'negado', label: 'Negado' }, { value: 'activo', label: 'Activo' }, { value: 'ex', label: 'Ex-fumador' }]}
              value={draft.apnp.tabaquismo}
              onChange={(v) => updateDraft((prev) => ({ ...prev, apnp: { ...prev.apnp, tabaquismo: v as typeof prev.apnp.tabaquismo } }))}
            />
            {draft.apnp.tabaquismo !== 'negado' && (
              <div className="mt-2">
                <TextField label="Detalle (cantidad y tiempo)" value={draft.apnp.tabaquismoDetalle} onChange={(v) => updateDraft((prev) => ({ ...prev, apnp: { ...prev.apnp, tabaquismoDetalle: v } }))} placeholder="Ej: 10 cigarrillos/día por 8 años" />
              </div>
            )}
          </div>

          <div>
            <label className="text-2xs font-medium text-foreground-500 mb-1 block">Alcoholismo</label>
            <RadioPill
              options={[{ value: 'negado', label: 'Negado' }, { value: 'ocasional', label: 'Ocasional' }, { value: 'frecuente', label: 'Frecuente' }]}
              value={draft.apnp.alcoholismo}
              onChange={(v) => updateDraft((prev) => ({ ...prev, apnp: { ...prev.apnp, alcoholismo: v as typeof prev.apnp.alcoholismo } }))}
            />
            {draft.apnp.alcoholismo !== 'negado' && (
              <div className="mt-2">
                <TextField label="Detalle" value={draft.apnp.alcoholismoDetalle} onChange={(v) => updateDraft((prev) => ({ ...prev, apnp: { ...prev.apnp, alcoholismoDetalle: v } }))} placeholder="Frecuencia y cantidad" />
              </div>
            )}
          </div>

          <div>
            <label className="text-2xs font-medium text-foreground-500 mb-1 block">Toxicomanías</label>
            <RadioPill
              options={[{ value: 'negado', label: 'Negado' }, { value: 'presente', label: 'Presente' }]}
              value={draft.apnp.toxicomanias}
              onChange={(v) => updateDraft((prev) => ({ ...prev, apnp: { ...prev.apnp, toxicomanias: v as typeof prev.apnp.toxicomanias } }))}
            />
            {draft.apnp.toxicomanias === 'presente' && (
              <div className="mt-2">
                <TextField label="Detalle" value={draft.apnp.toxicomaniasDetalle} onChange={(v) => updateDraft((prev) => ({ ...prev, apnp: { ...prev.apnp, toxicomaniasDetalle: v } }))} placeholder="Sustancia, frecuencia..." />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-2xs font-medium text-foreground-500 mb-1 block">Actividad física</label>
            <select
              value={draft.apnp.actividadFisica}
              onChange={(e) => updateDraft((prev) => ({ ...prev, apnp: { ...prev.apnp, actividadFisica: e.target.value as typeof prev.apnp.actividadFisica } }))}
              className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base appearance-none"
            >
              <option value="sedentario">Sedentario</option>
              <option value="leve">Leve</option>
              <option value="moderado">Moderado</option>
              <option value="intenso">Intenso</option>
            </select>
          </div>
          <TextField label="Horas de sueño" value={draft.apnp.horasSueno} onChange={(v) => updateDraft((prev) => ({ ...prev, apnp: { ...prev.apnp, horasSueno: v } }))} placeholder="Ej: 7" type="number" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField label="Alimentación" value={draft.apnp.alimentacion} onChange={(v) => updateDraft((prev) => ({ ...prev, apnp: { ...prev.apnp, alimentacion: v } }))} placeholder="Tipo de dieta" />
          <TextField label="Vivienda" value={draft.apnp.vivienda} onChange={(v) => updateDraft((prev) => ({ ...prev, apnp: { ...prev.apnp, vivienda: v } }))} placeholder="Tipo y servicios" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-2xs font-medium text-foreground-500 mb-1 block">Inmunizaciones</label>
            <select
              value={draft.apnp.inmunizaciones}
              onChange={(e) => updateDraft((prev) => ({ ...prev, apnp: { ...prev.apnp, inmunizaciones: e.target.value as typeof prev.apnp.inmunizaciones } }))}
              className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base appearance-none"
            >
              <option value="completo">Completo</option>
              <option value="incompleto">Incompleto</option>
              <option value="desconocido">Desconocido</option>
            </select>
          </div>
          <TextField label="Riesgo laboral" value={draft.apnp.riesgoLaboral} onChange={(v) => updateDraft((prev) => ({ ...prev, apnp: { ...prev.apnp, riesgoLaboral: v } }))} placeholder="Exposiciones, posturas..." />
        </div>
      </div>

      {/* Antecedentes Personales Patológicos */}
      <div className="p-4 bg-background-50 rounded-xl border border-secondary-200">
        <SectionHeader icon="ri-mental-health-line" title="Antecedentes Personales Patológicos" tone="bg-amber-100 text-amber-600" />
        <div className="space-y-2">
          {draft.app.map((a) => (
            <div key={a.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-secondary-100 bg-background-50">
              <select
                value={a.tipo}
                onChange={(e) => updateDraft((prev) => ({ ...prev, app: prev.app.map((x) => (x.id === a.id ? { ...x, tipo: e.target.value } : x)) }))}
                className="px-2 py-1.5 text-xs bg-background-50 border border-secondary-200 rounded-md text-foreground-700 outline-none focus:border-primary-400 transition-base flex-shrink-0"
              >
                {tiposAntecedentePatologico.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input
                type="text"
                value={a.descripcion}
                onChange={(e) => updateDraft((prev) => ({ ...prev, app: prev.app.map((x) => (x.id === a.id ? { ...x, descripcion: e.target.value } : x)) }))}
                placeholder="Descripción"
                className="flex-1 px-2.5 py-1.5 text-xs bg-background-50 border border-secondary-200 rounded-md text-foreground-700 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base min-w-0"
              />
              <input
                type="text"
                value={a.anio}
                onChange={(e) => updateDraft((prev) => ({ ...prev, app: prev.app.map((x) => (x.id === a.id ? { ...x, anio: e.target.value } : x)) }))}
                placeholder="Año"
                className="w-20 px-2.5 py-1.5 text-xs bg-background-50 border border-secondary-200 rounded-md text-foreground-700 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base"
              />
              <button
                onClick={() => removePatologico(a.id)}
                className="w-6 h-6 flex items-center justify-center rounded-full text-foreground-400 hover:text-red-500 hover:bg-red-50 transition-base cursor-pointer flex-shrink-0"
                aria-label="Eliminar antecedente"
              >
                <i className="ri-close-line text-xs"></i>
              </button>
            </div>
          ))}
          <button onClick={addPatologico} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg cursor-pointer transition-base">
            <i className="ri-add-line"></i> Agregar antecedente
          </button>
        </div>
      </div>

      {/* Antecedentes Gineco-Obstétricos */}
      {sexo === 'F' && (
        <div className="p-4 bg-background-50 rounded-xl border border-secondary-200">
          <SectionHeader icon="ri-women-line" title="Antecedentes Gineco-Obstétricos" tone="bg-rose-100 text-rose-600" />
          {draft.ago ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <TextField label="Menarca" value={draft.ago.menarca} onChange={(v) => updateDraft((prev) => ({ ...prev, ago: { ...prev.ago!, menarca: v } }))} placeholder="Ej: 12 años" />
              <TextField label="Ritmo" value={draft.ago.ritmo} onChange={(v) => updateDraft((prev) => ({ ...prev, ago: { ...prev.ago!, ritmo: v } }))} placeholder="Ej: 28 x 5" />
              <TextField label="FUM" value={draft.ago.fum} onChange={(v) => updateDraft((prev) => ({ ...prev, ago: { ...prev.ago!, fum: v } }))} placeholder="Fecha" />
              <TextField label="G / P / A / C" value={`${draft.ago.gestas}/${draft.ago.partos}/${draft.ago.abortos}/${draft.ago.cesareas}`} onChange={() => {}} placeholder="" />
              <TextField label="Método anticonceptivo" value={draft.ago.metodoAnticonceptivo} onChange={(v) => updateDraft((prev) => ({ ...prev, ago: { ...prev.ago!, metodoAnticonceptivo: v } }))} placeholder="Ej: DIU" />
              <TextField label="Último Papanicolau" value={draft.ago.ultimoPapanicolau} onChange={(v) => updateDraft((prev) => ({ ...prev, ago: { ...prev.ago!, ultimoPapanicolau: v } }))} placeholder="Año" />
              <TextField label="Mastografía" value={draft.ago.mastografia} onChange={(v) => updateDraft((prev) => ({ ...prev, ago: { ...prev.ago!, mastografia: v } }))} placeholder="Último estudio" />
            </div>
          ) : (
            <button
              onClick={() => updateDraft((prev) => ({ ...prev, ago: { menarca: '', ritmo: '', fum: '', gestas: '', partos: '', abortos: '', cesareas: '', metodoAnticonceptivo: '', ultimoPapanicolau: '', mastografia: '' } }))}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg cursor-pointer transition-base"
            >
              <i className="ri-add-line"></i> Registrar antecedentes gineco-obstétricos
            </button>
          )}
        </div>
      )}

      {/* Interrogatorio por Aparatos y Sistemas */}
      <div className="p-4 bg-background-50 rounded-xl border border-secondary-200">
        <SectionHeader icon="ri-stethoscope-line" title="Interrogatorio por Aparatos y Sistemas" tone="bg-violet-100 text-violet-600" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {draft.interrogatorio.map((s) => (
            <InterrogatorioRow key={s.id} sistema={s} onEstado={setInterrogatorioEstado} onDetalle={setInterrogatorioDetalle} />
          ))}
        </div>
      </div>

      {/* Observaciones */}
      <div className="p-4 bg-background-50 rounded-xl border border-secondary-200">
        <SectionHeader icon="ri-sticky-note-line" title="Observaciones Generales" tone="bg-secondary-100 text-foreground-500" />
        <TextAreaField
          label=""
          value={draft.observaciones}
          onChange={(v) => updateDraft((prev) => ({ ...prev, observaciones: v }))}
          placeholder="Observaciones adicionales sobre la Historia Clínica..."
          rows={3}
        />
      </div>

      {/* Modal de impresión */}
      {showPrintModal && (
        <HistoriaClinicaPrintModal
          patientId={patientId}
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xs text-foreground-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-foreground-800 truncate">{value}</p>
    </div>
  );
}

function InterrogatorioRow({
  sistema,
  onEstado,
  onDetalle,
}: {
  sistema: InterrogatorioSistema;
  onEstado: (id: string, estado: 'normal' | 'anormal') => void;
  onDetalle: (id: string, detalle: string) => void;
}) {
  const isAnormal = sistema.estado === 'anormal';
  return (
    <div className={`p-2.5 rounded-lg border transition-base ${isAnormal ? 'bg-red-500/5 border-red-500/20' : 'bg-background-50 border-secondary-100'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground-700">{sistema.sistema}</p>
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => onEstado(sistema.id, 'normal')}
            className={`px-2 py-0.5 rounded-full text-2xs font-medium border cursor-pointer transition-base ${!isAnormal ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-background-50 text-foreground-400 border-secondary-200'}`}
          >
            Normal
          </button>
          <button
            onClick={() => onEstado(sistema.id, 'anormal')}
            className={`px-2 py-0.5 rounded-full text-2xs font-medium border cursor-pointer transition-base ${isAnormal ? 'bg-red-100 text-red-700 border-red-200' : 'bg-background-50 text-foreground-400 border-secondary-200'}`}
          >
            Anormal
          </button>
        </div>
      </div>
      {isAnormal && (
        <input
          type="text"
          value={sistema.detalle}
          onChange={(e) => onDetalle(sistema.id, e.target.value)}
          placeholder="Describir hallazgo..."
          className="w-full mt-1.5 px-2.5 py-1.5 text-xs bg-background-50 border border-secondary-200 rounded-md text-foreground-700 placeholder:text-foreground-400 outline-none focus:border-red-400 transition-base"
        />
      )}
    </div>
  );
}