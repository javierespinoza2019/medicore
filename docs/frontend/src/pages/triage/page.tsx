import { useState, useMemo, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { triagePacientes, type TriagePatient, type TriageRecord, type VitalStatus, vitalRanges } from '@/mocks/triage';
import {
  validateVital,
  validatePresionPar,
  validateIMC,
} from '@/utils/vitalValidation';
import { consultas } from '@/mocks/consultas';
import { getPatientById } from '@/mocks/patients';
import { addUrgenciaGlobal } from '@/hooks/useUrgenciasState';
import type { Urgencia } from '@/mocks/urgencias';
import Button from '@/components/base/Button';
import Card from '@/components/base/Card';
import Badge from '@/components/base/Badge';
import Modal from '@/components/base/Modal';
import TriagePrintModal from './components/TriagePrintModal';

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

const emptyVitalForm: VitalFormData = {
  peso: '',
  talla: '',
  temperatura: '',
  presionSistolica: '',
  presionDiastolica: '',
  frecuenciaCardiaca: '',
  frecuenciaRespiratoria: '',
  saturacionOxigeno: '',
  glucosa: '',
  dolor: '',
  notas: '',
  nivelUrgencia: 'verde',
};

const urgenciaConfig: Record<TriageRecord['nivelUrgencia'], { label: string; color: string; bg: string; border: string; icon: string; priority: number }> = {
  verde: { label: 'No urgente', color: 'text-emerald-500', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', icon: 'ri-check-double-line', priority: 4 },
  amarillo: { label: 'Urgencia menor', color: 'text-amber-500', bg: 'bg-amber-500/15', border: 'border-amber-500/30', icon: 'ri-alert-line', priority: 3 },
  naranja: { label: 'Urgencia', color: 'text-orange-500', bg: 'bg-orange-500/15', border: 'border-orange-500/30', icon: 'ri-error-warning-line', priority: 2 },
  rojo: { label: 'Emergencia', color: 'text-red-500', bg: 'bg-red-500/15', border: 'border-red-300', icon: 'ri-shield-flash-line', priority: 1 },
};

const estadoConfig: Record<TriagePatient['estado'], { label: string; variant: 'success' | 'warning' | 'info' | 'secondary' }> = {
  espera: { label: 'En espera', variant: 'warning' },
  en_triage: { label: 'En triage', variant: 'info' },
  completado: { label: 'Triageado', variant: 'success' },
  derivado: { label: 'Derivado', variant: 'secondary' },
};

function getVitalStatus(value: number, key: string): VitalStatus {
  const range = vitalRanges[key];
  if (!range) return 'normal';
  if (value < range.warning.min || value > range.warning.max) return 'critical';
  if (value < range.normal.min || value > range.normal.max) return 'warning';
  return 'normal';
}

function getImcClassification(imc: number): { label: string; color: string } {
  if (imc < 18.5) return { label: 'Bajo peso', color: 'text-sky-500' };
  if (imc < 25) return { label: 'Peso normal', color: 'text-emerald-500' };
  if (imc < 30) return { label: 'Sobrepeso', color: 'text-amber-500' };
  return { label: 'Obesidad', color: 'text-red-500' };
}

function calcularMinutosEspera(horaRegistro: string): number {
  const [h, m] = horaRegistro.split(':').map(Number);
  const registro = new Date();
  registro.setHours(h, m, 0, 0);
  const ahora = new Date();
  return Math.max(0, Math.floor((ahora.getTime() - registro.getTime()) / 60000));
}

function formatEspera(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const statusColors: Record<VitalStatus, { dot: string; text: string }> = {
  normal: { dot: 'bg-emerald-500/100', text: 'text-emerald-500' },
  warning: { dot: 'bg-amber-500/100', text: 'text-amber-500' },
  critical: { dot: 'bg-red-500/100', text: 'text-red-500' },
};

const statusLabels: Record<VitalStatus, string> = {
  normal: 'Normal',
  warning: 'Alterado',
  critical: 'Crítico',
};

const normalValues: VitalFormData = {
  peso: '70',
  talla: '1.70',
  temperatura: '36.5',
  presionSistolica: '120',
  presionDiastolica: '80',
  frecuenciaCardiaca: '72',
  frecuenciaRespiratoria: '16',
  saturacionOxigeno: '98',
  glucosa: '90',
  dolor: '0',
  notas: '',
  nivelUrgencia: 'verde',
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

export default function Triage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pacienteParam = searchParams.get('paciente') || '';
  const [pacientes, setPacientes] = useState<TriagePatient[]>(triagePacientes);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<TriagePatient | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<VitalFormData>(emptyVitalForm);
  const [lastSavedForm, setLastSavedForm] = useState<VitalFormData>(emptyVitalForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof VitalFormData, string>>>({});
  const [savedToast, setSavedToast] = useState(false);
  const [showPostSaveModal, setShowPostSaveModal] = useState(false);
  const [filterEstado, setFilterEstado] = useState<TriagePatient['estado'] | 'todas'>('todas');
  const [showHistory, setShowHistory] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingPatient, setPendingPatient] = useState<TriagePatient | null>(null);
  const [signosAlarma, setSignosAlarma] = useState<Record<string, boolean>>({});
  const [waitTimes, setWaitTimes] = useState<Record<string, number>>({});
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Live wait time timer
  useEffect(() => {
    const tick = () => {
      const times: Record<string, number> = {};
      pacientes.forEach((p) => {
        times[p.id] = calcularMinutosEspera(p.horaRegistro);
      });
      setWaitTimes(times);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [pacientes]);

  // Auto-select patient when arriving from Sala de Espera
  useEffect(() => {
    if (!pacienteParam) return;
    let found = pacientes.find((p) => p.id === pacienteParam);

    // Auto-register patient from catalog if not yet in triage list
    if (!found) {
      const patientRecord = getPatientById(pacienteParam);
      if (patientRecord) {
        const newTriagePatient: TriagePatient = {
          id: patientRecord.id,
          nombre: patientRecord.nombre,
          apellidos: patientRecord.apellidos,
          edad: patientRecord.edad,
          genero: patientRecord.sexo,
          expediente: patientRecord.expediente,
          motivo: 'Consulta general',
          estado: 'en_triage',
          horaRegistro: new Date().toTimeString().slice(0, 5),
          ultimoTriage: null,
          historialTriage: [],
        };
        setPacientes((prev) => [...prev, newTriagePatient]);
        found = newTriagePatient;
      }
    }

    if (found && (!pacienteSeleccionado || pacienteSeleccionado.id !== found.id)) {
      doSelectPatient(found, true);
    }
  }, [pacienteParam]);

  const hasUnsavedChanges = useMemo(() => {
    const keys = Object.keys(emptyVitalForm) as (keyof VitalFormData)[];
    return keys.some((k) => form[k] !== lastSavedForm[k]);
  }, [form, lastSavedForm]);

  const filtered = useMemo(() => {
    let list = pacientes.filter((p) => {
      const matchSearch = `${p.nombre} ${p.apellidos} ${p.expediente}`.toLowerCase().includes(search.toLowerCase());
      const matchEstado = filterEstado === 'todas' || p.estado === filterEstado;
      return matchSearch && matchEstado;
    });
    // Sort: patients without triage first, then by urgency priority, then by registration time
    return list.sort((a, b) => {
      const hasTriageA = !!a.ultimoTriage;
      const hasTriageB = !!b.ultimoTriage;
      if (hasTriageA !== hasTriageB) return hasTriageA ? 1 : -1;
      const urgA = a.ultimoTriage ? urgenciaConfig[a.ultimoTriage.nivelUrgencia].priority : 4;
      const urgB = b.ultimoTriage ? urgenciaConfig[b.ultimoTriage.nivelUrgencia].priority : 4;
      if (urgA !== urgB) return urgA - urgB;
      return a.horaRegistro.localeCompare(b.horaRegistro);
    });
  }, [pacientes, search, filterEstado]);

  const stats = useMemo(() => {
    const total = pacientes.length;
    const enEspera = pacientes.filter((p) => p.estado === 'espera').length;
    const enTriage = pacientes.filter((p) => p.estado === 'en_triage').length;
    const urgentes = pacientes.filter((p) => p.ultimoTriage && (p.ultimoTriage.nivelUrgencia === 'naranja' || p.ultimoTriage.nivelUrgencia === 'rojo')).length;
    const completados = pacientes.filter((p) => p.estado === 'completado').length;
    return { total, enEspera, enTriage, urgentes, completados };
  }, [pacientes]);

  const imcCalculado = useMemo(() => {
    const peso = parseFloat(form.peso);
    const talla = parseFloat(form.talla);
    if (peso > 0 && talla > 0) {
      return (peso / (talla * talla)).toFixed(1);
    }
    return '';
  }, [form.peso, form.talla]);

  const imcClass = useMemo(() => {
    const v = parseFloat(imcCalculado);
    if (!v) return null;
    return getImcClassification(v);
  }, [imcCalculado]);

  const selectPatient = (p: TriagePatient) => {
    if (hasUnsavedChanges && pacienteSeleccionado && pacienteSeleccionado.id !== p.id) {
      setPendingPatient(p);
      setShowUnsavedModal(true);
      return;
    }
    doSelectPatient(p);
  };

  const doSelectPatient = (p: TriagePatient, newTriage?: boolean) => {
    const wasTriage = p.ultimoTriage;
    setPacienteSeleccionado(p);
    setShowHistory(false);
    setShowPostSaveModal(false);
    setSignosAlarma({});
    if (wasTriage && !newTriage) {
      const newForm: VitalFormData = {
        peso: wasTriage.peso.toString(),
        talla: wasTriage.talla.toString(),
        temperatura: wasTriage.temperatura.toString(),
        presionSistolica: wasTriage.presionSistolica.toString(),
        presionDiastolica: wasTriage.presionDiastolica.toString(),
        frecuenciaCardiaca: wasTriage.frecuenciaCardiaca.toString(),
        frecuenciaRespiratoria: wasTriage.frecuenciaRespiratoria.toString(),
        saturacionOxigeno: wasTriage.saturacionOxigeno.toString(),
        glucosa: wasTriage.glucosa ? wasTriage.glucosa.toString() : '',
        dolor: wasTriage.dolor.toString(),
        notas: '',
        nivelUrgencia: wasTriage.nivelUrgencia,
      };
      setForm(newForm);
      setLastSavedForm(newForm);
    } else {
      setForm(emptyVitalForm);
      setLastSavedForm(emptyVitalForm);
    }
    if (newTriage) {
      setPacientes((prev) =>
        prev.map((pt) => (pt.id === p.id ? { ...pt, estado: 'en_triage' as const } : pt))
      );
      setPacienteSeleccionado((prev) => (prev ? { ...prev, estado: 'en_triage' as const } : null));
    }
    setFormErrors({});
    setPendingPatient(null);
    setShowUnsavedModal(false);
  };

  const handleDiscardAndSwitch = () => {
    if (pendingPatient) {
      doSelectPatient(pendingPatient);
    }
  };

  const validate = (): boolean => {
    const errors: Partial<Record<keyof VitalFormData, string>> = {};

    const requiredFields: (keyof VitalFormData)[] = [
      'peso', 'talla', 'temperatura', 'presionSistolica', 'presionDiastolica',
      'frecuenciaCardiaca', 'frecuenciaRespiratoria', 'saturacionOxigeno', 'dolor',
    ];

    requiredFields.forEach((key) => {
      if (!form[key].trim()) {
        errors[key] = 'Este campo es obligatorio';
        return;
      }
      const rangeKey = key === 'presionSistolica' ? 'presionSistolica' : key === 'presionDiastolica' ? 'presionDiastolica' : key;
      const r = validateVital(rangeKey, form[key], { required: true });
      if (!r.valid) errors[key] = r.message;
    });

    // Validación cruzada: presión diastólica < sistólica
    const paResult = validatePresionPar(form.presionSistolica, form.presionDiastolica);
    if (!paResult.valid) {
      errors['presionDiastolica'] = paResult.message;
    }

    // Validación cruzada: IMC
    const imcResult = validateIMC(form.peso, form.talla);
    if (!imcResult.valid) {
      errors['peso'] = imcResult.message;
    }

    // Glucosa opcional pero con rango
    if (form.glucosa.trim()) {
      const g = validateVital('glucosa', form.glucosa, { allowEmpty: true });
      if (!g.valid) errors['glucosa'] = g.message;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (!validate() || !pacienteSeleccionado) return;

    const newRecord: TriageRecord = {
      id: `tri${Date.now()}`,
      patientId: pacienteSeleccionado.id,
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toTimeString().slice(0, 5),
      peso: parseFloat(form.peso),
      talla: parseFloat(form.talla),
      imc: parseFloat(imcCalculado),
      temperatura: parseFloat(form.temperatura),
      presionSistolica: parseInt(form.presionSistolica, 10),
      presionDiastolica: parseInt(form.presionDiastolica, 10),
      frecuenciaCardiaca: parseInt(form.frecuenciaCardiaca, 10),
      frecuenciaRespiratoria: parseInt(form.frecuenciaRespiratoria, 10),
      saturacionOxigeno: parseInt(form.saturacionOxigeno, 10),
      glucosa: form.glucosa.trim() ? parseInt(form.glucosa, 10) : null,
      dolor: parseInt(form.dolor, 10),
      notas: form.notas.trim(),
      realizadoPor: 'Lic. Carmen Vargas',
      nivelUrgencia: form.nivelUrgencia,
    };

    const savedForm = { ...form, notas: '' };

    // Actualizar estado local
    setPacientes((prev) =>
      prev.map((p) => {
        if (p.id !== pacienteSeleccionado.id) return p;
        return {
          ...p,
          estado: 'completado' as const,
          ultimoTriage: newRecord,
          historialTriage: [newRecord, ...p.historialTriage],
        };
      })
    );

    // Actualizar mock global para que Consultas pueda encontrarlo
    const mockIndex = triagePacientes.findIndex((p) => p.id === pacienteSeleccionado.id);
    if (mockIndex >= 0) {
      triagePacientes[mockIndex] = {
        ...triagePacientes[mockIndex],
        estado: 'completado',
        ultimoTriage: newRecord,
        historialTriage: [newRecord, ...triagePacientes[mockIndex].historialTriage],
      };
    }

    setPacienteSeleccionado((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        estado: 'completado',
        ultimoTriage: newRecord,
        historialTriage: [newRecord, ...prev.historialTriage],
      };
    });

    setLastSavedForm(savedForm);
    setSavedToast(true);
    setShowPostSaveModal(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const handleNuevoTriage = () => {
    setForm(emptyVitalForm);
    setLastSavedForm(emptyVitalForm);
    setFormErrors({});
    setSignosAlarma({});
    setShowPostSaveModal(false);
    if (pacienteSeleccionado) {
      setPacientes((prev) =>
        prev.map((p) => (p.id === pacienteSeleccionado.id ? { ...p, estado: 'en_triage' } : p))
      );
      setPacienteSeleccionado((prev) => prev ? { ...prev, estado: 'en_triage' } : null);
    }
  };

  const handleFillNormalValues = () => {
    setForm(normalValues);
    setFormErrors({});
  };

  const handlePrint = () => {
    setShowPrintModal(true);
  };

  const handleGoToListado = () => {
    setShowPostSaveModal(false);
    setPacienteSeleccionado(null);
    setForm(emptyVitalForm);
    setLastSavedForm(emptyVitalForm);
    setFormErrors({});
    setSignosAlarma({});
    setFilterEstado('espera');
  };

  const handleImprimirFromSave = () => {
    setShowPostSaveModal(false);
    setShowPrintModal(true);
  };

  const handleEnviarConsulta = () => {
    if (!pacienteSeleccionado || !pacienteSeleccionado.ultimoTriage) return;
    const triageId = pacienteSeleccionado.ultimoTriage.id;
    const patientId = pacienteSeleccionado.id;
    setPacientes((prev) =>
      prev.map((p) => (p.id === pacienteSeleccionado.id ? { ...p, estado: 'completado' } : p))
    );
    setPacienteSeleccionado((prev) => prev ? { ...prev, estado: 'completado' } : null);
    setShowPostSaveModal(false);
    navigate(`/app/consultas?paciente=${patientId}&triage=${triageId}`);
  };

  const handleDerivar = () => {
    if (!pacienteSeleccionado || !pacienteSeleccionado.ultimoTriage) return;

    const triage = pacienteSeleccionado.ultimoTriage;
    const patientRecord = getPatientById(pacienteSeleccionado.id);
    const now = new Date();
    const idNum = Math.floor(Math.random() * 900) + 100;

    const nuevaUrgencia: Urgencia = {
      id: `urg-der-${idNum}`,
      patientId: pacienteSeleccionado.id,
      patientName: `${pacienteSeleccionado.nombre} ${pacienteSeleccionado.apellidos}`,
      patientExpediente: pacienteSeleccionado.expediente,
      fecha: now.toISOString().split('T')[0],
      horaLlegada: now.toTimeString().slice(0, 5),
      nivelUrgencia: triage.nivelUrgencia,
      estado: 'esperando',
      motivo: triage.notas || pacienteSeleccionado.motivo,
      areaUrgencia: triage.nivelUrgencia === 'rojo' ? 'Shock Room' : 'Área de Urgencias',
      signosVitales: triage,
      notaMedica: '',
      destinoAlta: null,
      contactoEmergencia: patientRecord?.contactoEmergencia || 'No registrado',
      genero: pacienteSeleccionado.genero,
      edad: pacienteSeleccionado.edad,
      viaAcceso: 'caminando',
    };

    addUrgenciaGlobal(nuevaUrgencia);

    setPacientes((prev) =>
      prev.map((p) => (p.id === pacienteSeleccionado.id ? { ...p, estado: 'derivado' } : p))
    );
    setPacienteSeleccionado((prev) => prev ? { ...prev, estado: 'derivado' } : null);
    setShowPostSaveModal(false);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const updateForm = (field: keyof VitalFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    // Validación individual inmediata (solo si hay valor)
    if (value.trim()) {
      const rangeKey = field === 'presionSistolica' ? 'presionSistolica' : field === 'presionDiastolica' ? 'presionDiastolica' : field;
      const rangeResult = validateVital(rangeKey, value, { allowEmpty: true });
      if (!rangeResult.valid) {
        setFormErrors((prev) => ({ ...prev, [field]: rangeResult.message }));
        return;
      }
    }

    // Si pasó la validación individual, borrar error de ese campo
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });

    // Validación cruzada: presión
    if (field === 'presionSistolica' || field === 'presionDiastolica') {
      const otherField = field === 'presionSistolica' ? 'presionDiastolica' : 'presionSistolica';
      const paResult = validatePresionPar(
        field === 'presionSistolica' ? value : form.presionSistolica,
        field === 'presionDiastolica' ? value : form.presionDiastolica
      );
      if (!paResult.valid) {
        setFormErrors((prev) => ({ ...prev, [otherField]: paResult.message }));
      } else {
        setFormErrors((prev) => {
          const next = { ...prev };
          delete next['presionSistolica'];
          delete next['presionDiastolica'];
          return next;
        });
      }
    }

    // Validación cruzada: IMC
    if (field === 'peso' || field === 'talla') {
      const imcResult = validateIMC(
        field === 'peso' ? value : form.peso,
        field === 'talla' ? value : form.talla
      );
      if (!imcResult.valid) {
        setFormErrors((prev) => ({ ...prev, peso: imcResult.message }));
      } else {
        setFormErrors((prev) => {
          const next = { ...prev };
          delete next['peso'];
          delete next['talla'];
          return next;
        });
      }
    }
  };

  const toggleRedFlag = (id: string) => {
    setSignosAlarma((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const par = useCallback((val: string) => parseFloat(val), []);

  const renderVitalIndicator = (field: string, value: number) => {
    const status = getVitalStatus(value, field);
    return (
      <span className="inline-flex items-center gap-1">
        <span className={`w-2 h-2 rounded-full ${statusColors[status].dot}`}></span>
        <span className={`text-2xs font-medium ${statusColors[status].text}`}>{statusLabels[status]}</span>
      </span>
    );
  };

  const checkedFlags = useMemo(() => Object.entries(signosAlarma || {}).filter(([, v]) => v).length, [signosAlarma]);

  const consultaStatusMap = useMemo(() => {
    const map: Record<string, { tieneConsulta: boolean; consultaActiva: boolean; consultaId: string | null }> = {};
    pacientes.forEach((p) => {
      const pacienteConsultas = consultas.filter((c) => c.patientId === p.id);
      const activa = pacienteConsultas.find((c) => c.estado === 'en_curso' || c.estado === 'pendiente');
      map[p.id] = {
        tieneConsulta: pacienteConsultas.length > 0,
        consultaActiva: !!activa,
        consultaId: activa ? activa.id : null,
      };
    });
    return map;
  }, [pacientes]);

  return (
    <div className="space-y-5 print:space-y-2">
      {/* Stats */}
      <div className="flex items-center gap-0 rounded-lg border border-secondary-200/70 bg-background-50 overflow-hidden print:hidden">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 border-r border-secondary-200/70">
          <span className="w-5 h-5 flex items-center justify-center rounded text-sm text-foreground-500"><i className="ri-user-line"></i></span>
          <div>
            <p className="text-sm font-bold text-foreground-900">{stats.total}</p>
            <p className="text-[10px] text-foreground-500 uppercase tracking-wide">Pacientes hoy</p>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 border-r border-secondary-200/70">
          <span className="w-5 h-5 flex items-center justify-center rounded text-sm text-amber-500"><i className="ri-time-line"></i></span>
          <div>
            <p className="text-sm font-bold text-foreground-900">{stats.enEspera}</p>
            <p className="text-[10px] text-foreground-500 uppercase tracking-wide">En espera</p>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 border-r border-secondary-200/70">
          <span className="w-5 h-5 flex items-center justify-center rounded text-sm text-sky-500"><i className="ri-heart-pulse-line"></i></span>
          <div>
            <p className="text-sm font-bold text-foreground-900">{stats.enTriage}</p>
            <p className="text-[10px] text-foreground-500 uppercase tracking-wide">En triage</p>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 border-r border-secondary-200/70">
          <span className="w-5 h-5 flex items-center justify-center rounded text-sm text-red-500"><i className="ri-shield-flash-line"></i></span>
          <div>
            <p className="text-sm font-bold text-foreground-900">{stats.urgentes}</p>
            <p className="text-[10px] text-foreground-500 uppercase tracking-wide">Urgentes</p>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2">
          <span className="w-5 h-5 flex items-center justify-center rounded text-sm text-emerald-500"><i className="ri-check-double-line"></i></span>
          <div>
            <p className="text-sm font-bold text-foreground-900">{stats.completados}</p>
            <p className="text-[10px] text-foreground-500 uppercase tracking-wide">Triageados</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Patient List Sidebar */}
        <Card className="w-full lg:w-80 flex-shrink-0 print:hidden" padding="none">
          <div className="p-3 border-b border-secondary-200">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-foreground-800">Pacientes en espera</h2>
              <span className="text-2xs text-foreground-400">{filtered.length} total</span>
            </div>
            <div className="relative mb-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
                <i className="ri-search-line text-sm" aria-hidden="true"></i>
              </span>
              <input
                type="search"
                placeholder="Buscar paciente..."
                aria-label="Buscar paciente por nombre o expediente"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                maxLength={100}
                className="w-full pl-10 pr-3 py-1.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {(['todas', 'espera', 'en_triage', 'completado', 'derivado'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterEstado(f)}
                  className={`px-2 py-0.5 text-[10px] rounded-full cursor-pointer transition-base whitespace-nowrap ${
                    filterEstado === f
                      ? 'bg-primary-100 text-primary-700 border border-primary-300'
                      : 'bg-secondary-100 text-foreground-600 border border-secondary-200 hover:border-secondary-300'
                  }`}
                >
                  {f === 'todas' ? 'Todas' : estadoConfig[f].label}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[calc(100vh-240px)] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-foreground-400 px-4">
                <span className="w-8 h-8 flex items-center justify-center">
                  <i className="ri-user-search-line text-lg"></i>
                </span>
                <p className="text-xs text-center">No se encontraron pacientes</p>
              </div>
            ) : (
              filtered.map((p) => {
                const isSelected = pacienteSeleccionado?.id === p.id;
                const urg = p.ultimoTriage?.nivelUrgencia;
                const urgBar = urg && urg !== 'verde' ? urgenciaConfig[urg] : null;
                const esperaMin = waitTimes?.[p.id] ?? 0;
                const isUrgentWait = esperaMin > 45;
                const consStatus = consultaStatusMap[p.id];
                return (
                  <button
                    key={p.id}
                    onClick={() => selectPatient(p)}
                    className={`w-full text-left px-4 py-3 border-b border-secondary-100 transition-base cursor-pointer hover:bg-secondary-50/50 ${
                      isSelected ? 'bg-primary-50/50 border-l-2 border-l-primary-500' : ''
                    } ${p.estado === 'completado' ? 'opacity-75' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 text-white text-xs font-bold ${
                        p.genero === 'F' ? 'bg-rose-400' : 'bg-sky-500'
                      }`}>
                        {p.nombre.charAt(0)}{p.apellidos.charAt(0)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium text-foreground-900 truncate">{p.nombre} {p.apellidos}</p>
                          <Badge variant={estadoConfig[p.estado].variant} size="sm">{estadoConfig[p.estado].label}</Badge>
                        </div>
                        <p className="text-2xs text-foreground-500 mt-0.5">{p.expediente} · {p.edad} años</p>
                        <p className="text-2xs text-foreground-400 mt-1 truncate">{p.motivo}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          {urgBar && (
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs ${urgBar.bg} ${urgBar.color}`}>
                              <i className={`${urgBar.icon} text-[10px]`}></i>
                              {urgBar.label}
                            </span>
                          )}
                          <span className={`text-2xs ${isUrgentWait ? 'text-red-500 font-medium' : 'text-foreground-400'}`}>
                            {formatEspera(esperaMin)}
                          </span>
                          {consStatus?.consultaActiva && (
                            <span
                              onClick={(e) => { e.stopPropagation(); if (consStatus.consultaId) navigate(`/app/consultas?paciente=${p.id}`); }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs bg-sky-500/15 text-sky-700 border border-sky-200 cursor-pointer hover:bg-sky-200 transition-base"
                              title="Ir a consulta activa"
                            >
                              <i className="ri-stethoscope-line text-[10px]"></i>
                              En consulta
                            </span>
                          )}
                          {consStatus?.tieneConsulta && !consStatus?.consultaActiva && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs bg-emerald-500/10 text-emerald-500 border border-emerald-100">
                              <i className="ri-check-line text-[10px]"></i>
                              Consulta previa
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-foreground-400 flex-shrink-0">{p.horaRegistro}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* Triage Form Area */}
        <div className="flex-1 min-w-0 w-full">
          {!pacienteSeleccionado ? (
            <Card>
              <div className="flex flex-col items-center gap-4 py-16 text-foreground-400 print:hidden">
                <span className="w-16 h-16 flex items-center justify-center rounded-full bg-secondary-100">
                  <i className="ri-heart-pulse-line text-3xl"></i>
                </span>
                <div className="text-center max-w-sm">
                  <p className="text-base font-medium text-foreground-600 mb-1">Selecciona un paciente</p>
                  <p className="text-sm">
                    Elige un paciente de la lista para registrar sus signos vitales y realizar la valoración de triage.
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <>
              {/* Patient Header Card */}
              <Card padding="md" className="mb-4 print:mb-2">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className={`w-10 h-10 flex items-center justify-center rounded-full text-white text-sm font-bold flex-shrink-0 ${
                      pacienteSeleccionado.genero === 'F' ? 'bg-rose-400' : 'bg-sky-500'
                    }`}>
                      {pacienteSeleccionado.nombre.charAt(0)}{pacienteSeleccionado.apellidos.charAt(0)}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-semibold text-foreground-900">{pacienteSeleccionado.nombre} {pacienteSeleccionado.apellidos}</h3>
                        <Badge variant={estadoConfig[pacienteSeleccionado.estado].variant} size="sm">{estadoConfig[pacienteSeleccionado.estado].label}</Badge>
                      </div>
                      <p className="text-xs text-foreground-500">{pacienteSeleccionado.expediente} · {pacienteSeleccionado.edad} años · {pacienteSeleccionado.genero === 'F' ? 'Femenino' : 'Masculino'}</p>
                      <p className="text-xs text-foreground-600 mt-1 italic">"{pacienteSeleccionado.motivo}"</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 print:hidden">
                    {pacienteSeleccionado.historialTriage.length > 0 && (
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<i className="ri-history-line"></i>}
                        onClick={() => setShowHistory(!showHistory)}
                      >
                        {showHistory ? 'Ocultar historial' : 'Ver historial'}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<i className="ri-refresh-line"></i>}
                      onClick={handleNuevoTriage}
                    >
                      Nuevo triage
                    </Button>
                    {hasUnsavedChanges && (
                      <span className="inline-flex items-center gap-1 text-2xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/20">
                        <i className="ri-information-line"></i>
                        Cambios sin guardar
                      </span>
                    )}
                  </div>
                </div>
              </Card>



              {/* Vital Signs Form */}
              <div className="space-y-4 print:space-y-2">
                {/* Quick fill bar */}
                <div className="flex items-center justify-end print:hidden">
                  <button
                    type="button"
                    onClick={handleFillNormalValues}
                    className="inline-flex items-center gap-1.5 text-2xs text-secondary-600 bg-secondary-50 hover:bg-secondary-100 px-2.5 py-1.5 rounded-md border border-secondary-200 transition-base cursor-pointer"
                  >
                    <i className="ri-magic-line"></i>
                    Autocompletar valores normales
                  </button>
                </div>

                {/* Row 1: Peso, Talla, IMC */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <VitalInput
                    icon="ri-weight-line"
                    label="Peso"
                    unit="kg"
                    value={form.peso}
                    onChange={(v) => updateForm('peso', v)}
                    error={formErrors.peso}
                    placeholder="0.5–300"
                    hint="Rango: 0.5–300 kg"
                  />
                  <VitalInput
                    icon="ri-ruler-line"
                    label="Talla"
                    unit="m"
                    value={form.talla}
                    onChange={(v) => updateForm('talla', v)}
                    error={formErrors.talla}
                    placeholder="1.62"
                    step="0.01"
                    hint="Rango: 0.30–2.50 m"
                  />
                  <div className="p-3.5 bg-background-50 rounded-lg border border-secondary-200">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 flex items-center justify-center rounded-md bg-secondary-100 text-secondary-600">
                        <i className="ri-body-scan-line text-xs"></i>
                      </span>
                      <span className="text-xs font-medium text-foreground-600">IMC</span>
                    </div>
                    <p className="text-xl font-bold text-foreground-900">{imcCalculado || '—'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-2xs text-foreground-500">kg/m²</p>
                      {imcClass && (
                        <span className={`text-2xs font-semibold ${imcClass.color}`}>{imcClass.label}</span>
                      )}
                    </div>
                    {imcCalculado && renderVitalIndicator('imc', parseFloat(imcCalculado))}
                  </div>
                </div>

                {/* Row 2: Temperatura, FC, FR */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <VitalInput
                    icon="ri-temp-hot-line"
                    label="Temperatura"
                    unit="°C"
                    value={form.temperatura}
                    onChange={(v) => updateForm('temperatura', v)}
                    error={formErrors.temperatura}
                    placeholder="36.5"
                    step="0.1"
                    indicator={par(form.temperatura) > 0 ? renderVitalIndicator('temperatura', par(form.temperatura)) : null}
                    hint="Rango: 30–44°C"
                  />
                  <VitalInput
                    icon="ri-heart-pulse-line"
                    label="Frec. Cardíaca"
                    unit="lpm"
                    value={form.frecuenciaCardiaca}
                    onChange={(v) => updateForm('frecuenciaCardiaca', v)}
                    error={formErrors.frecuenciaCardiaca}
                    placeholder="72"
                    indicator={par(form.frecuenciaCardiaca) > 0 ? renderVitalIndicator('frecuenciaCardiaca', par(form.frecuenciaCardiaca)) : null}
                    hint="Rango: 20–220 lpm"
                  />
                  <VitalInput
                    icon="ri-lungs-line"
                    label="Frec. Respiratoria"
                    unit="rpm"
                    value={form.frecuenciaRespiratoria}
                    onChange={(v) => updateForm('frecuenciaRespiratoria', v)}
                    error={formErrors.frecuenciaRespiratoria}
                    placeholder="16"
                    indicator={par(form.frecuenciaRespiratoria) > 0 ? renderVitalIndicator('frecuenciaRespiratoria', par(form.frecuenciaRespiratoria)) : null}
                    hint="Rango: 4–60 rpm"
                  />
                </div>

                {/* Row 3: Presión Arterial + SpO2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-background-50 rounded-lg border border-secondary-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 flex items-center justify-center rounded-md bg-secondary-100 text-secondary-600">
                        <i className="ri-heart-line text-xs"></i>
                      </span>
                      <span className="text-xs font-medium text-foreground-600">Presión Arterial</span>
                      <span className="text-2xs text-foreground-400">Rango: 40–250 / 20–150 mmHg</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <input
                          type="number"
                          placeholder="120"
                          value={form.presionSistolica}
                          onChange={(e) => updateForm('presionSistolica', e.target.value)}
                          className={`w-full px-3 py-2 text-sm bg-background-50 border rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none transition-base text-center font-mono font-bold ${
                            formErrors.presionSistolica ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-secondary-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100'
                          }`}
                        />
                        <p className="text-2xs text-foreground-400 text-center mt-0.5">Sistólica</p>
                        {formErrors.presionSistolica && <p className="text-2xs text-red-500 text-center mt-0.5">{formErrors.presionSistolica}</p>}
                      </div>
                      <span className="text-foreground-400 font-bold text-sm">/</span>
                      <div className="flex-1">
                        <input
                          type="number"
                          placeholder="80"
                          value={form.presionDiastolica}
                          onChange={(e) => updateForm('presionDiastolica', e.target.value)}
                          className={`w-full px-3 py-2 text-sm bg-background-50 border rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none transition-base text-center font-mono font-bold ${
                            formErrors.presionDiastolica ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-secondary-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100'
                          }`}
                        />
                        <p className="text-2xs text-foreground-400 text-center mt-0.5">Diastólica</p>
                        {formErrors.presionDiastolica && <p className="text-2xs text-red-500 text-center mt-0.5">{formErrors.presionDiastolica}</p>}
                      </div>
                      <span className="text-xs text-foreground-400 flex-shrink-0">mmHg</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {par(form.presionSistolica) > 0 && renderVitalIndicator('presionSistolica', par(form.presionSistolica))}
                      {par(form.presionDiastolica) > 0 && (
                        <span className="text-2xs text-foreground-400">|</span>
                      )}
                      {par(form.presionDiastolica) > 0 && renderVitalIndicator('presionDiastolica', par(form.presionDiastolica))}
                    </div>
                  </div>
                  <VitalInput
                    icon="ri-drop-line"
                    label="Saturación O₂"
                    unit="%"
                    value={form.saturacionOxigeno}
                    onChange={(v) => updateForm('saturacionOxigeno', v)}
                    error={formErrors.saturacionOxigeno}
                    placeholder="98"
                    indicator={par(form.saturacionOxigeno) > 0 ? renderVitalIndicator('saturacionOxigeno', par(form.saturacionOxigeno)) : null}
                    hint="Rango: 50–100%"
                  />
                </div>

                {/* Row 4: Glucosa + Dolor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <VitalInput
                    icon="ri-test-tube-line"
                    label="Glucosa Capilar"
                    unit="mg/dL"
                    value={form.glucosa}
                    onChange={(v) => updateForm('glucosa', v)}
                    placeholder="Opcional"
                    indicator={par(form.glucosa) > 0 ? renderVitalIndicator('glucosa', par(form.glucosa)) : null}
                    hint="Rango: 20–600 mg/dL · Opcional"
                  />
                  <div className="p-3.5 bg-background-50 rounded-lg border border-secondary-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 flex items-center justify-center rounded-md bg-secondary-100 text-secondary-600">
                        <i className="ri-emotion-line text-xs"></i>
                      </span>
                      <span className="text-xs font-medium text-foreground-600">Escala de Dolor (EVA)</span>
                      {form.dolor && (
                        <span className={`text-2xs font-semibold ml-auto ${
                          parseInt(form.dolor, 10) <= 3 ? 'text-emerald-500' : parseInt(form.dolor, 10) <= 6 ? 'text-amber-500' : 'text-red-500'
                        }`}>
                          {painLabels[parseInt(form.dolor, 10)]}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 11 }, (_, i) => {
                        const isSelected = form.dolor === i.toString();
                        const colorClass = i <= 3 ? 'bg-emerald-500/100' : i <= 6 ? 'bg-amber-500/100' : 'bg-red-500/100';
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => updateForm('dolor', i.toString())}
                            className={`flex-1 h-8 rounded-md cursor-pointer transition-all ${
                              isSelected
                                ? `${colorClass} text-white font-bold shadow-sm scale-110 z-10`
                                : 'bg-secondary-100 text-foreground-500 hover:bg-secondary-200 text-xs'
                            }`}
                            title={`Dolor ${i}/10 — ${painLabels[i]}`}
                          >
                            {i}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <span className="text-2xs text-emerald-500">Sin dolor</span>
                      <span className="text-2xs text-red-500">Insoportable</span>
                    </div>
                    {formErrors.dolor && <p className="text-2xs text-red-500 text-center mt-1">{formErrors.dolor}</p>}
                  </div>
                </div>

                {/* Red Flags Checklist */}
                <div className="p-3.5 bg-background-50 rounded-lg border border-secondary-200 print:hidden">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 flex items-center justify-center rounded-md bg-secondary-100 text-secondary-600">
                      <i className="ri-alert-line text-xs"></i>
                    </span>
                    <span className="text-xs font-medium text-foreground-600">Signos de Alarma</span>
                    {checkedFlags > 0 && (
                      <Badge variant="warning" size="sm">{checkedFlags} marcado{checkedFlags > 1 ? 's' : ''}</Badge>
                    )}
                    <span className="text-2xs text-foreground-400 ml-auto">Selecciona los presentes</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {redFlagsList.map((flag) => (
                      <button
                        key={flag.id}
                        type="button"
                        onClick={() => toggleRedFlag(flag.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-left cursor-pointer transition-base ${
                          signosAlarma[flag.id]
                            ? 'bg-red-500/10 border-red-300 text-red-500'
                            : 'bg-background-50 border-secondary-200 text-foreground-600 hover:border-secondary-300'
                        }`}
                      >
                        <span className={`w-5 h-5 flex items-center justify-center rounded border text-xs ${
                          signosAlarma[flag.id]
                            ? 'bg-red-500/100 border-red-500 text-white'
                            : 'bg-background-50 border-secondary-300 text-transparent'
                        }`}>
                          <i className="ri-check-line"></i>
                        </span>
                        <span className="text-xs font-medium">{flag.label}</span>
                      </button>
                    ))}
                  </div>
                  {checkedFlags > 0 && (
                    <div className="mt-2 p-2 bg-red-500/10 rounded-md border border-red-500/20 flex items-start gap-2">
                      <span className="w-4 h-4 flex items-center justify-center text-red-500 flex-shrink-0 mt-0.5">
                        <i className="ri-error-warning-line text-xs"></i>
                      </span>
                      <p className="text-2xs text-red-500">
                        {checkedFlags} signo{checkedFlags > 1 ? 's' : ''} de alarma identificado{checkedFlags > 1 ? 's' : ''}. Considere elevar el nivel de urgencia y notificar al médico de guardia.
                      </p>
                    </div>
                  )}
                </div>

                {/* Nivel de Urgencia */}
                <div className="p-3.5 bg-background-50 rounded-lg border border-secondary-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 flex items-center justify-center rounded-md bg-secondary-100 text-secondary-600">
                      <i className="ri-flag-line text-xs" aria-hidden="true"></i>
                    </span>
                    <span className="text-xs font-medium text-foreground-600">Nivel de Urgencia</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Seleccionar nivel de urgencia">
                    {(Object.entries(urgenciaConfig) as [TriageRecord['nivelUrgencia'], typeof urgenciaConfig['verde']][]).map(([key, cfg]) => (
                      <button
                        key={key}
                        type="button"
                        role="radio"
                        aria-checked={form.nivelUrgencia === key}
                        aria-label={cfg.label}
                        onClick={() => updateForm('nivelUrgencia', key)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-base ${
                          form.nivelUrgencia === key
                            ? `${cfg.bg} ${cfg.color} ${cfg.border}`
                            : 'border-secondary-200 bg-background-50 text-foreground-600 hover:border-secondary-300'
                        }`}
                      >
                        <span className={`w-6 h-6 flex items-center justify-center rounded-full ${form.nivelUrgencia === key ? '' : 'bg-secondary-100'}`}>
                          <i className={`${cfg.icon} text-xs`} aria-hidden="true"></i>
                        </span>
                        <span className="text-xs font-medium whitespace-nowrap">{cfg.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notas */}
                <div className="p-3.5 bg-background-50 rounded-lg border border-secondary-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 flex items-center justify-center rounded-md bg-secondary-100 text-secondary-600">
                      <i className="ri-sticky-note-line text-xs"></i>
                    </span>
                    <span className="text-xs font-medium text-foreground-600">Notas de Triage</span>
                    <span className="text-2xs text-foreground-400">Opcional</span>
                  </div>
                  <textarea
                    placeholder="Observaciones, antecedentes relevantes, hallazgos durante la valoración..."
                    aria-label="Notas de triage"
                    value={form.notas}
                    onChange={(e) => updateForm('notas', e.target.value)}
                    rows={3}
                    maxLength={500}
                    className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base resize-none"
                  ></textarea>
                  <p className="text-2xs text-foreground-400 mt-1 text-right" aria-live="polite">{form.notas.length}/500</p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-3 flex-wrap print:hidden">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="md"
                      icon={<i className="ri-save-line"></i>}
                      onClick={handleSave}
                    >
                      Guardar Triage
                    </Button>
                    <Button
                      size="md"
                      variant="secondary"
                      icon={<i className="ri-printer-line"></i>}
                      onClick={handlePrint}
                    >
                      Imprimir
                    </Button>
                    <Button
                      size="md"
                      variant="ghost"
                      icon={<i className="ri-magic-line"></i>}
                      onClick={handleFillNormalValues}
                    >
                      Valores normales
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-foreground-500">
                    <span className="inline-flex items-center gap-1">
                      <i className="ri-user-line"></i>
                      Realizado por: Lic. Carmen Vargas
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <i className="ri-calendar-line"></i>
                      {new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Triage History */}
              {showHistory && pacienteSeleccionado.historialTriage.length > 0 && (
                <Card className="mt-5 print:hidden" padding="none">
                  <div className="px-5 py-3 border-b border-secondary-200">
                    <h3 className="text-sm font-semibold text-foreground-800">
                      Historial de Triage ({pacienteSeleccionado.historialTriage.length})
                    </h3>
                  </div>
                  <div className="divide-y divide-secondary-100">
                    {pacienteSeleccionado.historialTriage.map((t) => {
                      const urg = urgenciaConfig[t.nivelUrgencia];
                      return (
                        <div key={t.id} className="px-5 py-3 hover:bg-secondary-50/50 transition-base">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-foreground-700">
                                {new Date(t.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                              <span className="text-xs text-foreground-400">{t.hora}</span>
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs ${urg.bg} ${urg.color}`}>
                                <i className={`${urg.icon} text-[10px]`}></i>
                                {urg.label}
                              </span>
                            </div>
                            <span className="text-2xs text-foreground-400">{t.realizadoPor}</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs">
                            <HistoryVital label="Temp" value={`${t.temperatura}°C`} status={getVitalStatus(t.temperatura, 'temperatura')} />
                            <HistoryVital label="FC" value={`${t.frecuenciaCardiaca} lpm`} status={getVitalStatus(t.frecuenciaCardiaca, 'frecuenciaCardiaca')} />
                            <HistoryVital label="FR" value={`${t.frecuenciaRespiratoria} rpm`} status={getVitalStatus(t.frecuenciaRespiratoria, 'frecuenciaRespiratoria')} />
                            <HistoryVital label="PA" value={`${t.presionSistolica}/${t.presionDiastolica}`} status={getVitalStatus(t.presionSistolica, 'presionSistolica') === 'critical' || getVitalStatus(t.presionDiastolica, 'presionDiastolica') === 'critical' ? 'critical' : getVitalStatus(t.presionSistolica, 'presionSistolica') === 'warning' || getVitalStatus(t.presionDiastolica, 'presionDiastolica') === 'warning' ? 'warning' : 'normal'} />
                            <HistoryVital label="SpO₂" value={`${t.saturacionOxigeno}%`} status={getVitalStatus(t.saturacionOxigeno, 'saturacionOxigeno')} />
                            <HistoryVital label="IMC" value={t.imc.toFixed(1)} status={getVitalStatus(t.imc, 'imc')} />
                          </div>
                          {t.notas && <p className="text-xs text-foreground-500 mt-2 italic">"{t.notas}"</p>}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* Unsaved Changes Modal */}
      <Modal
        open={showUnsavedModal}
        onClose={() => { setShowUnsavedModal(false); setPendingPatient(null); }}
        title="Cambios sin guardar"
        size="sm"
        role="alertdialog"
        ariaDescribedBy="unsaved-desc"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 flex items-center justify-center rounded-full bg-amber-500/15 text-amber-500 flex-shrink-0">
              <i className="ri-error-warning-line" aria-hidden="true"></i>
            </span>
            <div>
              <p id="unsaved-desc" className="text-sm text-foreground-700">
                Tienes cambios sin guardar para <strong>{pacienteSeleccionado?.nombre} {pacienteSeleccionado?.apellidos}</strong>.
              </p>
              <p className="text-2xs text-foreground-500 mt-1">
                Si cambias de paciente, perderás los signos vitales que ya capturaste.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => { setShowUnsavedModal(false); setPendingPatient(null); }}>
              Cancelar
            </Button>
            <Button size="sm" variant="secondary" icon={<i className="ri-save-line"></i>} onClick={() => { handleSave(); if (pendingPatient) doSelectPatient(pendingPatient); }}>
              Guardar y cambiar
            </Button>
            <Button size="sm" variant="danger" icon={<i className="ri-delete-bin-line"></i>} onClick={handleDiscardAndSwitch}>
              Descartar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Post-Save Action Modal */}
      <Modal
        open={showPostSaveModal}
        onClose={() => setShowPostSaveModal(false)}
        title="Triage guardado correctamente"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground-600">
            Los signos vitales de <strong>{pacienteSeleccionado?.nombre} {pacienteSeleccionado?.apellidos}</strong> se registraron con éxito. ¿Qué deseas hacer a continuación?
          </p>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={handleGoToListado}
              className="flex items-center gap-4 p-4 bg-background-50 border border-secondary-200 rounded-xl hover:border-primary-300 hover:bg-primary-50/30 transition-base cursor-pointer text-left group"
            >
              <span className="w-10 h-10 flex items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 group-hover:bg-amber-200 transition-base flex-shrink-0">
                <i className="ri-list-check-2 text-lg"></i>
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground-900">Ir al listado de triage pendientes</p>
                <p className="text-xs text-foreground-500 mt-0.5">Volver a la lista de pacientes en espera de triage</p>
              </div>
              <span className="w-5 h-5 flex items-center justify-center text-foreground-400 group-hover:text-primary-500 transition-base flex-shrink-0">
                <i className="ri-arrow-right-s-line"></i>
              </span>
            </button>

            <button
              onClick={() => { setShowPostSaveModal(false); handleEnviarConsulta(); }}
              className="flex items-center gap-4 p-4 bg-background-50 border border-secondary-200 rounded-xl hover:border-primary-300 hover:bg-primary-50/30 transition-base cursor-pointer text-left group"
            >
              <span className="w-10 h-10 flex items-center justify-center rounded-xl bg-sky-500/15 text-sky-500 group-hover:bg-sky-200 transition-base flex-shrink-0">
                <i className="ri-stethoscope-line text-lg"></i>
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground-900">Ir a consulta</p>
                <p className="text-xs text-foreground-500 mt-0.5">Abrir el consultorio con el expediente de este paciente</p>
              </div>
              <span className="w-5 h-5 flex items-center justify-center text-foreground-400 group-hover:text-primary-500 transition-base flex-shrink-0">
                <i className="ri-arrow-right-s-line"></i>
              </span>
            </button>

            <button
              onClick={handleImprimirFromSave}
              className="flex items-center gap-4 p-4 bg-background-50 border border-secondary-200 rounded-xl hover:border-primary-300 hover:bg-primary-50/30 transition-base cursor-pointer text-left group"
            >
              <span className="w-10 h-10 flex items-center justify-center rounded-xl bg-secondary-100 text-secondary-600 group-hover:bg-secondary-200 transition-base flex-shrink-0">
                <i className="ri-printer-line text-lg"></i>
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground-900">Imprimir</p>
                <p className="text-xs text-foreground-500 mt-0.5">Generar hoja de triage para imprimir o descargar PDF</p>
              </div>
              <span className="w-5 h-5 flex items-center justify-center text-foreground-400 group-hover:text-primary-500 transition-base flex-shrink-0">
                <i className="ri-arrow-right-s-line"></i>
              </span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Saved Toast */}
      {savedToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in print:hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-600 text-white rounded-lg shadow-lg">
            <span className="w-5 h-5 flex items-center justify-center">
              <i className="ri-check-line"></i>
            </span>
            <div>
              <p className="text-sm font-medium">Triage guardado correctamente</p>
              <p className="text-xs text-emerald-200">Los signos vitales se registraron con éxito</p>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {pacienteSeleccionado && showPrintModal && (
        <TriagePrintModal
          paciente={pacienteSeleccionado}
          form={form}
          signosAlarma={signosAlarma}
          fechaTriage={new Date().toISOString().split('T')[0]}
          horaTriage={new Date().toTimeString().slice(0, 5)}
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
}

/* Sub-components */

function VitalInput({
  icon, label, unit, value, onChange, error, placeholder, step, indicator, hint,
}: {
  icon: string;
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  step?: string;
  indicator?: ReactNode;
  hint?: string;
}) {
  return (
    <div className="p-3.5 bg-background-50 rounded-lg border border-secondary-200">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-6 h-6 flex items-center justify-center rounded-md bg-secondary-100 text-secondary-600">
          <i className={`${icon} text-xs`}></i>
        </span>
        <span className="text-xs font-medium text-foreground-600">{label}</span>
        {hint && <span className="text-2xs text-foreground-400 ml-auto">{hint}</span>}
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          placeholder={placeholder}
          step={step || '1'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`flex-1 px-3 py-2 text-sm bg-background-50 border rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none transition-base font-mono font-bold ${
            error ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-secondary-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100'
          }`}
        />
        <span className="text-xs font-medium text-foreground-500 w-16 flex-shrink-0">{unit}</span>
      </div>
      <div className="flex items-center justify-between mt-1.5 min-h-[18px]">
        {indicator}
        {error && <p className="text-2xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}

function HistoryVital({ label, value, status }: { label: string; value: string; status: VitalStatus }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusColors[status].dot}`}></span>
      <span className="text-foreground-700"><strong>{label}:</strong> {value}</span>
    </div>
  );
}