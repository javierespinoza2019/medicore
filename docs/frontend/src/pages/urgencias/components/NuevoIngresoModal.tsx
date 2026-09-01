import { useState, useMemo, useCallback } from 'react';
import { patients } from '@/mocks/patients';
import type { NivelUrgencia, Urgencia } from '@/mocks/urgencias';
import { urgenciaConfig } from '@/mocks/urgencias';
import { vitalRanges } from '@/mocks/triage';
import Modal from '@/components/base/Modal';
import {
  validateVital,
  validatePresionPar,
  validateMotivoUrgencia,
  validateNombrePersona,
  validateEdad,
  validateTelefonoContacto,
  validateIMC,
} from '@/utils/vitalValidation';

interface NuevoIngresoModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (urgencia: Urgencia) => void;
}

function calcularIMC(peso: number, talla: number): number {
  if (peso <= 0 || talla <= 0) return 0;
  return peso / (talla * talla);
}

function getVitalStatus(value: number, ranges: { normal: { min: number; max: number }; warning: { min: number; max: number } }): 'normal' | 'warning' | 'critical' {
  if (value >= ranges.normal.min && value <= ranges.normal.max) return 'normal';
  if (value >= ranges.warning.min && value <= ranges.warning.max) return 'warning';
  return 'critical';
}

type FieldError = { message: string; id: string };

export default function NuevoIngresoModal({ open, onClose, onSubmit }: NuevoIngresoModalProps) {
  const [searchPatient, setSearchPatient] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [apellidoNuevo, setApellidoNuevo] = useState('');
  const [generoNuevo, setGeneroNuevo] = useState<'M' | 'F'>('M');
  const [edadNuevo, setEdadNuevo] = useState<number>(0);
  const [motivo, setMotivo] = useState('');
  const [nivelUrgencia, setNivelUrgencia] = useState<NivelUrgencia>('amarillo');
  const [viaAcceso, setViaAcceso] = useState<Urgencia['viaAcceso']>('caminando');
  const [contacto, setContacto] = useState('');
  const [areaUrgencia, setAreaUrgencia] = useState('Área de Urgencias');

  const [peso, setPeso] = useState('');
  const [talla, setTalla] = useState('');
  const [temperatura, setTemperatura] = useState('');
  const [paSistolica, setPaSistolica] = useState('');
  const [paDiastolica, setPaDiastolica] = useState('');
  const [fc, setFc] = useState('');
  const [fr, setFr] = useState('');
  const [spo2, setSpo2] = useState('');
  const [glucosa, setGlucosa] = useState('');
  const [dolor, setDolor] = useState(0);
  const [notasVitales, setNotasVitales] = useState('');

  const [errors, setErrors] = useState<Record<string, FieldError>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const filteredPatients = useMemo(() => {
    if (!searchPatient.trim()) return [];
    const q = searchPatient.toLowerCase();
    return patients.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.apellidos.toLowerCase().includes(q) ||
        p.expediente.toLowerCase().includes(q) ||
        p.curp.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [searchPatient]);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  const isPacienteExistente = selectedPatientId !== '';

  // Validación individual de campo (onBlur)
  const validateField = useCallback((field: string, value: string, opts?: { required?: boolean }) => {
    let result: { valid: boolean; message: string } = { valid: true, message: '' };

    switch (field) {
      case 'nombreNuevo':
        if (!isPacienteExistente) {
          result = validateNombrePersona(value, 'Nombre');
        }
        break;
      case 'apellidoNuevo':
        if (!isPacienteExistente) {
          result = validateNombrePersona(value, 'Apellidos');
        }
        break;
      case 'edadNuevo':
        if (!isPacienteExistente) {
          result = validateEdad(value);
        }
        break;
      case 'motivo':
        result = validateMotivoUrgencia(value);
        break;
      case 'contacto':
        result = validateTelefonoContacto(value);
        break;
      case 'peso':
        result = validateVital('peso', value, { allowEmpty: true });
        break;
      case 'talla':
        result = validateVital('talla', value, { allowEmpty: true });
        break;
      case 'temperatura':
        result = validateVital('temperatura', value, { allowEmpty: true });
        break;
      case 'paSistolica':
        result = validateVital('presionSistolica', value, { allowEmpty: true });
        break;
      case 'paDiastolica':
        result = validateVital('presionDiastolica', value, { allowEmpty: true });
        break;
      case 'fc':
        result = validateVital('frecuenciaCardiaca', value, { allowEmpty: true });
        break;
      case 'fr':
        result = validateVital('frecuenciaRespiratoria', value, { allowEmpty: true });
        break;
      case 'spo2':
        result = validateVital('saturacionOxigeno', value, { allowEmpty: true });
        break;
      case 'glucosa':
        result = validateVital('glucosa', value, { allowEmpty: true });
        break;
      default:
        break;
    }

    setErrors((prev) => {
      const next = { ...prev };
      if (result.valid) {
        delete next[field];
      } else {
        next[field] = { message: result.message, id: `error-${field}` };
      }
      return next;
    });

    return result.valid;
  }, [isPacienteExistente]);

  // Validación cruzada presión arterial + IMC
  const validateCrossFields = useCallback(() => {
    setErrors((prev) => {
      const next = { ...prev };
      const paResult = validatePresionPar(paSistolica, paDiastolica);
      if (!paResult.valid) {
        next['paPar'] = { message: paResult.message, id: 'error-pa-par' };
      } else {
        delete next['paPar'];
      }
      const imcResult = validateIMC(peso, talla);
      if (!imcResult.valid) {
        next['imc'] = { message: imcResult.message, id: 'error-imc' };
      } else {
        delete next['imc'];
      }
      return next;
    });
  }, [paSistolica, paDiastolica, peso, talla]);

  // Validar todo antes de submit
  const validateAll = useCallback((): boolean => {
    const newErrors: Record<string, FieldError> = {};

    if (!isPacienteExistente) {
      const n = validateNombrePersona(nombreNuevo, 'Nombre');
      if (!n.valid) newErrors['nombreNuevo'] = { message: n.message, id: 'error-nombreNuevo' };
      const a = validateNombrePersona(apellidoNuevo, 'Apellidos');
      if (!a.valid) newErrors['apellidoNuevo'] = { message: a.message, id: 'error-apellidoNuevo' };
      const e = validateEdad(edadNuevo.toString());
      if (!e.valid) newErrors['edadNuevo'] = { message: e.message, id: 'error-edadNuevo' };
    }

    const m = validateMotivoUrgencia(motivo);
    if (!m.valid) newErrors['motivo'] = { message: m.message, id: 'error-motivo' };

    const c = validateTelefonoContacto(contacto);
    if (!c.valid) newErrors['contacto'] = { message: c.message, id: 'error-contacto' };

    const fields: Array<{ key: string; value: string }> = [
      { key: 'peso', value: peso },
      { key: 'talla', value: talla },
      { key: 'temperatura', value: temperatura },
      { key: 'paSistolica', value: paSistolica },
      { key: 'paDiastolica', value: paDiastolica },
      { key: 'fc', value: fc },
      { key: 'fr', value: fr },
      { key: 'spo2', value: spo2 },
      { key: 'glucosa', value: glucosa },
    ];

    fields.forEach(({ key, value }) => {
      const r = validateVital(key === 'paSistolica' ? 'presionSistolica' : key === 'paDiastolica' ? 'presionDiastolica' : key, value, { allowEmpty: true });
      if (!r.valid) newErrors[key] = { message: r.message, id: `error-${key}` };
    });

    const paResult = validatePresionPar(paSistolica, paDiastolica);
    if (!paResult.valid) newErrors['paPar'] = { message: paResult.message, id: 'error-pa-par' };

    const imcResult = validateIMC(peso, talla);
    if (!imcResult.valid) newErrors['imc'] = { message: imcResult.message, id: 'error-imc' };

    setErrors(newErrors);
    setTouched({
      nombreNuevo: true, apellidoNuevo: true, edadNuevo: true,
      motivo: true, contacto: true,
      peso: true, talla: true, temperatura: true,
      paSistolica: true, paDiastolica: true,
      fc: true, fr: true, spo2: true, glucosa: true,
    });

    return Object.keys(newErrors).length === 0;
  }, [isPacienteExistente, nombreNuevo, apellidoNuevo, edadNuevo, motivo, contacto, peso, talla, temperatura, paSistolica, paDiastolica, fc, fr, spo2, glucosa]);

  const pacienteValido = isPacienteExistente
    ? selectedPatient !== undefined
    : nombreNuevo.trim().length >= 2 && apellidoNuevo.trim().length >= 2 && edadNuevo > 0 && edadNuevo <= 120;
  const motivoValido = motivo.trim().length >= 5 && !/^\d+$/.test(motivo.trim());
  const hayErrores = Object.keys(errors).length > 0;
  const formValid = pacienteValido && motivoValido && !hayErrores;

  const imc = calcularIMC(parseFloat(peso) || 0, parseFloat(talla) || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    if (!formValid) return;

    const now = new Date();
    const fecha = now.toISOString().split('T')[0];
    const hora = now.toTimeString().slice(0, 5);

    const idNum = Math.floor(Math.random() * 900) + 100;
    const newId = `urg-${idNum}`;
    const expediente = isPacienteExistente && selectedPatient ? selectedPatient.expediente : `URG-TEMP-${idNum}`;
    const patientId = isPacienteExistente && selectedPatient ? selectedPatient.id : `urg-p-${idNum}`;
    const patientName = isPacienteExistente && selectedPatient
      ? `${selectedPatient.nombre} ${selectedPatient.apellidos}`
      : `${nombreNuevo.trim()} ${apellidoNuevo.trim()}`;
    const genero = isPacienteExistente && selectedPatient ? selectedPatient.sexo : generoNuevo;
    const edad = isPacienteExistente && selectedPatient ? selectedPatient.edad : edadNuevo;

    const pesoNum = parseFloat(peso) || 0;
    const tallaNum = parseFloat(talla) || 0;
    const tempNum = parseFloat(temperatura) || 0;
    const psNum = parseFloat(paSistolica) || 0;
    const pdNum = parseFloat(paDiastolica) || 0;
    const fcNum = parseFloat(fc) || 0;
    const frNum = parseFloat(fr) || 0;
    const spo2Num = parseFloat(spo2) || 0;
    const gluNum = parseFloat(glucosa) || null;
    const dolorNum = dolor;

    const triageRecord = pesoNum > 0 && tallaNum > 0
      ? {
          id: `tri-${newId}`,
          patientId,
          fecha,
          hora,
          peso: pesoNum,
          talla: tallaNum,
          imc,
          temperatura: tempNum,
          presionSistolica: psNum,
          presionDiastolica: pdNum,
          frecuenciaCardiaca: fcNum,
          frecuenciaRespiratoria: frNum,
          saturacionOxigeno: spo2Num,
          glucosa: gluNum,
          dolor: dolorNum,
          notas: notasVitales,
          realizadoPor: 'Lic. Carmen Vargas',
          nivelUrgencia,
        }
      : null;

    const nuevaUrgencia: Urgencia = {
      id: newId,
      patientId,
      patientName,
      patientExpediente: expediente,
      fecha,
      horaLlegada: hora,
      nivelUrgencia,
      estado: 'esperando',
      motivo,
      areaUrgencia,
      signosVitales: triageRecord,
      notaMedica: '',
      destinoAlta: null,
      contactoEmergencia: contacto,
      genero,
      edad,
      viaAcceso,
    };

    onSubmit(nuevaUrgencia);
    resetForm();
  };

  const resetForm = () => {
    setSearchPatient('');
    setSelectedPatientId('');
    setNombreNuevo('');
    setApellidoNuevo('');
    setGeneroNuevo('M');
    setEdadNuevo(0);
    setMotivo('');
    setNivelUrgencia('amarillo');
    setViaAcceso('caminando');
    setContacto('');
    setAreaUrgencia('Área de Urgencias');
    setPeso('');
    setTalla('');
    setTemperatura('');
    setPaSistolica('');
    setPaDiastolica('');
    setFc('');
    setFr('');
    setSpo2('');
    setGlucosa('');
    setDolor(0);
    setNotasVitales('');
    setErrors({});
    setTouched({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const nivelOrder: NivelUrgencia[] = ['rojo', 'naranja', 'amarillo', 'verde'];

  // Helper para input con error
  const inputErrorClass = (field: string) => {
    const hasErr = touched[field] && errors[field];
    return hasErr
      ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
      : 'border-secondary-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100';
  };

  const renderError = (field: string) => {
    if (!touched[field] || !errors[field]) return null;
    return (
      <p id={errors[field].id} className="text-2xs text-red-500 mt-1" role="alert">
        {errors[field].message}
      </p>
    );
  };

  return (
    <Modal open={open} onClose={handleClose} title="Nuevo ingreso de urgencias" size="lg">
      <form onSubmit={handleSubmit} id="nuevo-ingreso-form" className="space-y-5" noValidate>
        {/* Paciente */}
        <div>
          <h4 className="text-sm font-semibold text-foreground-800 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 flex items-center justify-center rounded bg-primary-100 text-primary-600">
              <i className="ri-user-line text-2xs" aria-hidden="true"></i>
            </span>
            Paciente
          </h4>
          <div className="relative mb-3">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
              <i className="ri-search-line text-sm" aria-hidden="true"></i>
            </span>
            <input
              type="search"
              placeholder="Buscar paciente por nombre, expediente o CURP..."
              aria-label="Buscar paciente existente por nombre, expediente o CURP"
              value={searchPatient}
              onChange={(e) => { setSearchPatient(e.target.value); setSelectedPatientId(''); }}
              maxLength={100}
              className="w-full pl-10 pr-3 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base"
            />
          </div>
          {filteredPatients.length > 0 && !selectedPatientId && (
            <div className="border border-secondary-200 rounded-lg overflow-hidden mb-3 bg-background-50" role="listbox" aria-label="Resultados de búsqueda de paciente">
              {filteredPatients.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={selectedPatientId === p.id}
                  onClick={() => { setSelectedPatientId(p.id); setSearchPatient(`${p.nombre} ${p.apellidos}`); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-secondary-50 transition-base cursor-pointer flex items-center gap-3 border-b border-secondary-100 last:border-b-0"
                >
                  <span className={`w-8 h-8 flex items-center justify-center rounded-full text-white text-xs font-bold flex-shrink-0 ${p.sexo === 'F' ? 'bg-rose-400' : 'bg-sky-500'}`}>
                    {p.nombre.charAt(0)}{p.apellidos.charAt(0)}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground-800">{p.nombre} {p.apellidos}</p>
                    <p className="text-2xs text-foreground-500">{p.expediente} · {p.edad} años · {p.sexo === 'F' ? 'Femenino' : 'Masculino'}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {selectedPatient && (
            <div className="flex items-center gap-3 p-3 bg-primary-50 border border-primary-200 rounded-lg mb-3">
              <span className={`w-9 h-9 flex items-center justify-center rounded-full text-white text-sm font-bold flex-shrink-0 ${selectedPatient.sexo === 'F' ? 'bg-rose-400' : 'bg-sky-500'}`}>
                {selectedPatient.nombre.charAt(0)}{selectedPatient.apellidos.charAt(0)}
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground-900">{selectedPatient.nombre} {selectedPatient.apellidos}</p>
                <p className="text-2xs text-foreground-500">{selectedPatient.expediente} · {selectedPatient.edad} años</p>
              </div>
              <button
                type="button"
                aria-label="Quitar paciente seleccionado"
                onClick={() => { setSelectedPatientId(''); setSearchPatient(''); }}
                className="w-6 h-6 flex items-center justify-center rounded-full text-foreground-400 hover:text-red-500 hover:bg-red-500/10 transition-base cursor-pointer"
              >
                <i className="ri-close-line text-xs" aria-hidden="true"></i>
              </button>
            </div>
          )}
          {!selectedPatientId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  placeholder="Nombre(s)"
                  aria-label="Nombre(s) del paciente nuevo"
                  aria-invalid={touched['nombreNuevo'] && !!errors['nombreNuevo']}
                  aria-describedby={errors['nombreNuevo']?.id}
                  maxLength={60}
                  value={nombreNuevo}
                  onChange={(e) => setNombreNuevo(e.target.value)}
                  onBlur={(e) => validateField('nombreNuevo', e.target.value)}
                  autoComplete="given-name"
                  className={`w-full px-3 py-2.5 text-sm bg-background-50 border rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none transition-base ${inputErrorClass('nombreNuevo')}`}
                />
                {renderError('nombreNuevo')}
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Apellidos"
                  aria-label="Apellidos del paciente nuevo"
                  aria-invalid={touched['apellidoNuevo'] && !!errors['apellidoNuevo']}
                  aria-describedby={errors['apellidoNuevo']?.id}
                  maxLength={60}
                  value={apellidoNuevo}
                  onChange={(e) => setApellidoNuevo(e.target.value)}
                  onBlur={(e) => validateField('apellidoNuevo', e.target.value)}
                  autoComplete="family-name"
                  className={`w-full px-3 py-2.5 text-sm bg-background-50 border rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none transition-base ${inputErrorClass('apellidoNuevo')}`}
                />
                {renderError('apellidoNuevo')}
              </div>
              <select
                value={generoNuevo}
                onChange={(e) => setGeneroNuevo(e.target.value as 'M' | 'F')}
                aria-label="Género del paciente"
                className="w-full px-3 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base"
              >
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
              <div>
                <input
                  type="number"
                  min={0}
                  max={120}
                  placeholder="Edad (años)"
                  aria-label="Edad del paciente en años"
                  aria-invalid={touched['edadNuevo'] && !!errors['edadNuevo']}
                  aria-describedby={errors['edadNuevo']?.id}
                  value={edadNuevo || ''}
                  onChange={(e) => setEdadNuevo(parseInt(e.target.value, 10) || 0)}
                  onBlur={(e) => validateField('edadNuevo', e.target.value)}
                  className={`w-full px-3 py-2.5 text-sm bg-background-50 border rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none transition-base ${inputErrorClass('edadNuevo')}`}
                />
                {renderError('edadNuevo')}
              </div>
            </div>
          )}
        </div>

        {/* Motivo y prioridad */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="motivo-urgencia" className="block text-sm font-semibold text-foreground-800 mb-2">
              Motivo de urgencia <span className="text-red-500">*</span>
            </label>
            <textarea
              id="motivo-urgencia"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              onBlur={(e) => validateField('motivo', e.target.value)}
              placeholder="Describe el motivo de ingreso de manera clara y concisa..."
              aria-label="Motivo de urgencia"
              aria-invalid={touched['motivo'] && !!errors['motivo']}
              aria-describedby={errors['motivo']?.id || 'motivo-hint'}
              rows={4}
              maxLength={500}
              className={`w-full p-3 bg-background-50 border rounded-lg text-sm text-foreground-700 placeholder:text-foreground-400 outline-none transition-base resize-none ${inputErrorClass('motivo')}`}
            />
            <p id="motivo-hint" className="text-2xs text-foreground-400 mt-1">Mínimo 5 caracteres. No solo números.</p>
            {renderError('motivo')}
            <p className="text-2xs text-foreground-400 mt-1 text-right" aria-live="polite">{motivo.length}/500</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground-800 mb-2">Clasificación de urgencia</label>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Clasificación de nivel de urgencia">
              {nivelOrder.map((nivel) => {
                const config = urgenciaConfig[nivel];
                const isSelected = nivelUrgencia === nivel;
                return (
                  <button
                    key={nivel}
                    type="button"
                    role="radio"
                    aria-checked={nivelUrgencia === nivel}
                    aria-label={config.label}
                    onClick={() => setNivelUrgencia(nivel)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border cursor-pointer transition-base ${
                      isSelected
                        ? `${config.bg} ${config.border} ring-1`
                        : 'bg-background-50 border-secondary-200 hover:border-secondary-300'
                    }`}
                  >
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full ${config.color} text-white`}>
                      <i className={`${config.icon} text-xs`} aria-hidden="true"></i>
                    </span>
                    <span className={`text-xs font-semibold ${isSelected ? config.text : 'text-foreground-600'}`}>{config.label}</span>
                    <span className="text-[10px] text-foreground-400 text-center leading-tight">{config.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Vía de acceso y contacto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="via-acceso" className="block text-xs font-medium text-foreground-600 mb-1.5">Vía de acceso</label>
            <select
              id="via-acceso"
              value={viaAcceso}
              onChange={(e) => setViaAcceso(e.target.value as Urgencia['viaAcceso'])}
              aria-label="Vía de acceso a urgencias"
              className="w-full px-3 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base"
            >
              <option value="caminando">Caminando</option>
              <option value="ambulancia">Ambulancia</option>
              <option value="referencia">Referencia médica</option>
              <option value="policia">Policía / Seguridad</option>
            </select>
          </div>
          <div>
            <label htmlFor="contacto-emergencia" className="block text-xs font-medium text-foreground-600 mb-1.5">Contacto de emergencia</label>
            <input
              id="contacto-emergencia"
              type="text"
              value={contacto}
              onChange={(e) => setContacto(e.target.value)}
              onBlur={(e) => validateField('contacto', e.target.value)}
              placeholder="Nombre y teléfono del contacto..."
              aria-label="Contacto de emergencia"
              aria-invalid={touched['contacto'] && !!errors['contacto']}
              aria-describedby={errors['contacto']?.id}
              maxLength={100}
              className={`w-full px-3 py-2.5 text-sm bg-background-50 border rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none transition-base ${inputErrorClass('contacto')}`}
            />
            {renderError('contacto')}
          </div>
        </div>

        {/* Signos vitales rápidos */}
        <div>
          <h4 className="text-sm font-semibold text-foreground-800 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 flex items-center justify-center rounded bg-emerald-100 text-emerald-600">
              <i className="ri-heart-pulse-line text-2xs" aria-hidden="true"></i>
            </span>
            Signos vitales rápidos (opcional pero recomendado)
          </h4>

          {errors['paPar'] && touched['paSistolica'] && touched['paDiastolica'] && (
            <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg" role="alert">
              <p className="text-xs text-red-700 flex items-center gap-1.5">
                <i className="ri-error-warning-line" aria-hidden="true"></i>
                {errors['paPar'].message}
              </p>
            </div>
          )}
          {errors['imc'] && touched['peso'] && touched['talla'] && (
            <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg" role="alert">
              <p className="text-xs text-red-700 flex items-center gap-1.5">
                <i className="ri-error-warning-line" aria-hidden="true"></i>
                {errors['imc'].message}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Peso */}
            <div>
              <label htmlFor="sv-peso" className="block text-2xs text-foreground-500 mb-1">Peso (kg)</label>
              <input
                id="sv-peso"
                type="number"
                step="0.1"
                value={peso}
                onChange={(e) => { setPeso(e.target.value); validateCrossFields(); }}
                onBlur={(e) => validateField('peso', e.target.value)}
                placeholder="0.0–300"
                aria-label="Peso en kilogramos"
                aria-invalid={touched['peso'] && !!errors['peso']}
                aria-describedby={errors['peso']?.id}
                className={`w-full px-2.5 py-2 text-sm bg-background-50 border rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none transition-base ${inputErrorClass('peso')}`}
              />
              {renderError('peso')}
            </div>
            {/* Talla */}
            <div>
              <label htmlFor="sv-talla" className="block text-2xs text-foreground-500 mb-1">Talla (m)</label>
              <input
                id="sv-talla"
                type="number"
                step="0.01"
                value={talla}
                onChange={(e) => { setTalla(e.target.value); validateCrossFields(); }}
                onBlur={(e) => validateField('talla', e.target.value)}
                placeholder="0.30–2.50"
                aria-label="Talla en metros"
                aria-invalid={touched['talla'] && !!errors['talla']}
                aria-describedby={errors['talla']?.id}
                className={`w-full px-2.5 py-2 text-sm bg-background-50 border rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none transition-base ${inputErrorClass('talla')}`}
              />
              {renderError('talla')}
            </div>
            {/* Temperatura */}
            <div>
              <label htmlFor="sv-temp" className="block text-2xs text-foreground-500 mb-1">Temperatura (°C)</label>
              <input
                id="sv-temp"
                type="number"
                step="0.1"
                value={temperatura}
                onChange={(e) => setTemperatura(e.target.value)}
                onBlur={(e) => validateField('temperatura', e.target.value)}
                placeholder="30–44"
                aria-label="Temperatura corporal en grados Celsius"
                aria-invalid={touched['temperatura'] && !!errors['temperatura']}
                aria-describedby={errors['temperatura']?.id}
                className={`w-full px-2.5 py-2 text-sm bg-background-50 border rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none transition-base ${
                  temperatura ? (getVitalStatus(parseFloat(temperatura), vitalRanges.temperatura) === 'normal' ? inputErrorClass('temperatura') : getVitalStatus(parseFloat(temperatura), vitalRanges.temperatura) === 'warning' ? 'border-amber-300 focus:border-amber-400 focus:ring-amber-100' : 'border-red-300 focus:border-red-400 focus:ring-red-100') : inputErrorClass('temperatura')
                }`}
              />
              {renderError('temperatura')}
            </div>
            {/* Presión */}
            <div>
              <label className="block text-2xs text-foreground-500 mb-1">Presión arterial (mmHg)</label>
              <div className="flex items-center gap-1.5">
                <div className="flex-1">
                  <input
                    id="sv-pa-sis"
                    type="number"
                    value={paSistolica}
                    onChange={(e) => { setPaSistolica(e.target.value); validateCrossFields(); }}
                    onBlur={(e) => validateField('paSistolica', e.target.value)}
                    placeholder="Sys"
                    aria-label="Presión sistólica en mmHg"
                    aria-invalid={touched['paSistolica'] && !!errors['paSistolica']}
                    aria-describedby={errors['paSistolica']?.id}
                    className={`w-full px-2 py-2 text-sm bg-background-50 border rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none transition-base text-center font-mono font-bold ${inputErrorClass('paSistolica')}`}
                  />
                  <p className="text-2xs text-foreground-400 text-center mt-0.5">Sistólica</p>
                  {renderError('paSistolica')}
                </div>
                <span className="text-foreground-400">/</span>
                <div className="flex-1">
                  <input
                    id="sv-pa-dia"
                    type="number"
                    value={paDiastolica}
                    onChange={(e) => { setPaDiastolica(e.target.value); validateCrossFields(); }}
                    onBlur={(e) => validateField('paDiastolica', e.target.value)}
                    placeholder="Dia"
                    aria-label="Presión diastólica en mmHg"
                    aria-invalid={touched['paDiastolica'] && !!errors['paDiastolica']}
                    aria-describedby={errors['paDiastolica']?.id}
                    className={`w-full px-2 py-2 text-sm bg-background-50 border rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none transition-base text-center font-mono font-bold ${inputErrorClass('paDiastolica')}`}
                  />
                  <p className="text-2xs text-foreground-400 text-center mt-0.5">Diastólica</p>
                  {renderError('paDiastolica')}
                </div>
              </div>
            </div>
            {/* FC */}
            <div>
              <label htmlFor="sv-fc" className="block text-2xs text-foreground-500 mb-1">FC (lpm)</label>
              <input
                id="sv-fc"
                type="number"
                value={fc}
                onChange={(e) => setFc(e.target.value)}
                onBlur={(e) => validateField('fc', e.target.value)}
                placeholder="20–220"
                aria-label="Frecuencia cardíaca en latidos por minuto"
                aria-invalid={touched['fc'] && !!errors['fc']}
                aria-describedby={errors['fc']?.id}
                className={`w-full px-2.5 py-2 text-sm bg-background-50 border rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none transition-base ${
                  fc ? (getVitalStatus(parseFloat(fc), vitalRanges.frecuenciaCardiaca) === 'normal' ? inputErrorClass('fc') : getVitalStatus(parseFloat(fc), vitalRanges.frecuenciaCardiaca) === 'warning' ? 'border-amber-300 focus:border-amber-400 focus:ring-amber-100' : 'border-red-300 focus:border-red-400 focus:ring-red-100') : inputErrorClass('fc')
                }`}
              />
              {renderError('fc')}
            </div>
            {/* FR */}
            <div>
              <label htmlFor="sv-fr" className="block text-2xs text-foreground-500 mb-1">FR (rpm)</label>
              <input
                id="sv-fr"
                type="number"
                value={fr}
                onChange={(e) => setFr(e.target.value)}
                onBlur={(e) => validateField('fr', e.target.value)}
                placeholder="4–60"
                aria-label="Frecuencia respiratoria en respiraciones por minuto"
                aria-invalid={touched['fr'] && !!errors['fr']}
                aria-describedby={errors['fr']?.id}
                className={`w-full px-2.5 py-2 text-sm bg-background-50 border rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none transition-base ${
                  fr ? (getVitalStatus(parseFloat(fr), vitalRanges.frecuenciaRespiratoria) === 'normal' ? inputErrorClass('fr') : getVitalStatus(parseFloat(fr), vitalRanges.frecuenciaRespiratoria) === 'warning' ? 'border-amber-300 focus:border-amber-400 focus:ring-amber-100' : 'border-red-300 focus:border-red-400 focus:ring-red-100') : inputErrorClass('fr')
                }`}
              />
              {renderError('fr')}
            </div>
            {/* SpO2 */}
            <div>
              <label htmlFor="sv-spo2" className="block text-2xs text-foreground-500 mb-1">SpO₂ (%)</label>
              <input
                id="sv-spo2"
                type="number"
                value={spo2}
                onChange={(e) => setSpo2(e.target.value)}
                onBlur={(e) => validateField('spo2', e.target.value)}
                placeholder="50–100"
                aria-label="Saturación de oxígeno en porcentaje"
                aria-invalid={touched['spo2'] && !!errors['spo2']}
                aria-describedby={errors['spo2']?.id}
                className={`w-full px-2.5 py-2 text-sm bg-background-50 border rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none transition-base ${
                  spo2 ? (getVitalStatus(parseFloat(spo2), vitalRanges.saturacionOxigeno) === 'normal' ? inputErrorClass('spo2') : getVitalStatus(parseFloat(spo2), vitalRanges.saturacionOxigeno) === 'warning' ? 'border-amber-300 focus:border-amber-400 focus:ring-amber-100' : 'border-red-300 focus:border-red-400 focus:ring-red-100') : inputErrorClass('spo2')
                }`}
              />
              {renderError('spo2')}
            </div>
            {/* Glucosa */}
            <div>
              <label htmlFor="sv-glucosa" className="block text-2xs text-foreground-500 mb-1">Glucosa (mg/dL)</label>
              <input
                id="sv-glucosa"
                type="number"
                value={glucosa}
                onChange={(e) => setGlucosa(e.target.value)}
                onBlur={(e) => validateField('glucosa', e.target.value)}
                placeholder="20–600"
                aria-label="Glucosa capilar en mg por dL"
                aria-invalid={touched['glucosa'] && !!errors['glucosa']}
                aria-describedby={errors['glucosa']?.id}
                className={`w-full px-2.5 py-2 text-sm bg-background-50 border rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none transition-base ${
                  glucosa ? (getVitalStatus(parseFloat(glucosa), vitalRanges.glucosa) === 'normal' ? inputErrorClass('glucosa') : getVitalStatus(parseFloat(glucosa), vitalRanges.glucosa) === 'warning' ? 'border-amber-300 focus:border-amber-400 focus:ring-amber-100' : 'border-red-300 focus:border-red-400 focus:ring-red-100') : inputErrorClass('glucosa')
                }`}
              />
              {renderError('glucosa')}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="sv-dolor" className="block text-2xs text-foreground-500 mb-1">Dolor (EVA 0–10)</label>
              <input
                id="sv-dolor"
                type="range"
                min={0}
                max={10}
                value={dolor}
                onChange={(e) => setDolor(parseInt(e.target.value, 10))}
                aria-label="Escala visual analógica de dolor del 0 al 10"
                className="w-full accent-primary-500"
              />
              <div className="flex justify-between text-[10px] text-foreground-400 mt-1">
                <span>0</span>
                <span className="font-semibold text-primary-600">{dolor}</span>
                <span>10</span>
              </div>
            </div>
            <div>
              <label htmlFor="sv-notas" className="block text-2xs text-foreground-500 mb-1">Notas de triage</label>
              <input
                id="sv-notas"
                type="text"
                value={notasVitales}
                onChange={(e) => setNotasVitales(e.target.value)}
                placeholder="Observaciones del triage..."
                aria-label="Notas adicionales del triage"
                maxLength={500}
                className="w-full px-2.5 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base"
              />
              <p className="text-2xs text-foreground-400 mt-1 text-right" aria-live="polite">{notasVitales.length}/500</p>
            </div>
          </div>

          {peso && talla && imc > 0 && (
            <p className="text-xs text-foreground-500 mt-2">
              IMC calculado: <strong className="text-foreground-800">{imc.toFixed(1)} kg/m²</strong>
              {imc > 80 || imc < 5 ? (
                <span className="text-red-500 ml-2 text-2xs">— IMC fuera de rango clínico. Verifica peso y talla.</span>
              ) : null}
            </p>
          )}
        </div>
      </form>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-secondary-200 mt-4">
        <button
          type="button"
          onClick={handleClose}
          className="px-4 py-2 text-sm font-medium text-foreground-600 hover:text-foreground-800 hover:bg-secondary-100 rounded-lg transition-base cursor-pointer whitespace-nowrap"
        >
          Cancelar
        </button>
        <button
          type="submit"
          form="nuevo-ingreso-form"
          disabled={!formValid}
          aria-disabled={!formValid}
          className="px-5 py-2.5 text-sm font-semibold bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-base cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="flex items-center gap-2">
            <i className="ri-save-line" aria-hidden="true"></i>
            Registrar ingreso
          </span>
        </button>
      </div>
    </Modal>
  );
}