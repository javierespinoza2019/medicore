import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { patients } from '@/mocks/patients';
import Button from '@/components/base/Button';
import Card from '@/components/base/Card';
import Input from '@/components/base/Input';
import Select from '@/components/base/Select';
import Badge from '@/components/base/Badge';
import Avatar from '@/components/base/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { sucursales } from '@/mocks/branches';

interface PatientForm {
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  fechaNacimiento: string;
  sexo: string;
  curp: string;
  telefono: string;
  celular: string;
  email: string;
  direccion: string;
  contactoEmergencia: string;
  parentescoEmergencia: string;
  aseguradora: string;
  poliza: string;
  sucursalId: string;
}

const initialForm: PatientForm = {
  nombre: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  fechaNacimiento: '',
  sexo: '',
  curp: '',
  telefono: '',
  celular: '',
  email: '',
  direccion: '',
  contactoEmergencia: '',
  parentescoEmergencia: '',
  aseguradora: '',
  poliza: '',
  sucursalId: '',
};

const steps = [
  { key: 1, label: 'Datos Personales', icon: 'ri-user-line' },
  { key: 2, label: 'Contacto', icon: 'ri-phone-line' },
  { key: 3, label: 'Datos Adicionales', icon: 'ri-file-list-3-line' },
  { key: 4, label: 'Confirmación', icon: 'ri-check-double-line' },
];

// Límites de longitud justificados: nombres/apellidos rara vez superan 50 chars en MX;
// 60 da margen generoso. Dirección 200 permite calle+num+col+ciudad+estado+CP.
const MAX_NOMBRE = 60;
const MAX_APELLIDO = 60;
const MAX_DIRECCION = 200;
const MAX_EMAIL = 100;
const MAX_CONTACTO_EMERGENCIA = 100;
const MAX_POLIZA = 50;
const MAX_TELEFONO = 20;

const NOMBRE_REGEX = /^[A-Za-zÁÉÍÓÚÑáéíóúñÜü][A-Za-zÁÉÍÓÚÑáéíóúñÜü\s'.-]*$/;

// Validación real de CURP (estructura oficial + dígito verificador RENAPO)
function validarCurp(curp: string): string | null {
  const valor = curp.trim().toUpperCase();
  if (!valor) return 'La CURP es obligatoria';
  if (valor.length !== 18) return 'La CURP debe tener exactamente 18 caracteres';

  const re =
    /^[A-Z][AEIOUX][A-Z]{2}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[HM](AS|BC|BS|CC|CS|CH|CL|CM|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z][0-9]$/;
  if (!re.test(valor)) return 'La CURP no tiene un formato válido';

  // Dígito verificador (algoritmo oficial RENAPO)
  const diccionario = '0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
  let suma = 0;
  for (let i = 0; i < 17; i++) {
    suma += diccionario.indexOf(valor[i]) * (18 - i);
  }
  const digito = (10 - (suma % 10)) % 10;
  if (digito !== parseInt(valor[17], 10)) {
    return 'El dígito verificador de la CURP no coincide. Verifica contra el documento oficial.';
  }
  return null;
}

function validarTelefono(telefono: string): boolean {
  return telefono.replace(/\D/g, '').length === 10;
}

function calcularEdadDesdeFecha(fecha: string): number {
  const hoy = new Date();
  const nac = new Date(fecha);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const mes = hoy.getMonth() - nac.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

function formatearFecha(fecha: string): string {
  if (!fecha) return '—';
  const [y, m, d] = fecha.split('-');
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`;
}

export default function PacienteNuevo() {
  const navigate = useNavigate();
  const { sucursalActualId } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<PatientForm>(() => ({ ...initialForm, sucursalId: sucursalActualId || 'suc1' }));
  const [errors, setErrors] = useState<Partial<Record<keyof PatientForm, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [duplicateWarnings, setDuplicateWarnings] = useState<typeof patients>([]);

  // Detección de posibles duplicados cuando cambian nombre o fecha de nacimiento
  const checkDuplicates = useCallback((formData: PatientForm) => {
    const warnings: typeof patients = [];
    const nombreCompleto = `${formData.nombre} ${formData.apellidoPaterno} ${formData.apellidoMaterno}`
      .trim()
      .toLowerCase();

    for (const p of patients) {
      const existingName = `${p.nombre} ${p.apellidos}`.toLowerCase();
      if (nombreCompleto.length > 5 && formData.fechaNacimiento && existingName.includes(nombreCompleto) && p.fechaNacimiento === formData.fechaNacimiento) {
        warnings.push(p);
      } else if (nombreCompleto.length > 8 && existingName.includes(nombreCompleto)) {
        warnings.push(p);
      }
    }
    setDuplicateWarnings(warnings);
  }, []);

  const updateField = (field: keyof PatientForm, value: string) => {
    const updated = { ...form, [field]: value };
    setForm(updated);

    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }

    if (field === 'nombre' || field === 'apellidoPaterno' || field === 'apellidoMaterno' || field === 'fechaNacimiento') {
      checkDuplicates(updated);
    }
  };

  const handleCurpChange = (value: string) => {
    setForm({ ...form, curp: value.toUpperCase() });
  };

  const computeErrors = (stepsToCheck: number[]): Partial<Record<keyof PatientForm, string>> => {
    const e: Partial<Record<keyof PatientForm, string>> = {};

    if (stepsToCheck.includes(1)) {
      if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio';
      else if (form.nombre.trim().length > MAX_NOMBRE) e.nombre = `El nombre no puede superar los ${MAX_NOMBRE} caracteres`;
      else if (/\d/.test(form.nombre.trim())) e.nombre = 'El nombre no debe contener números';
      else if (!NOMBRE_REGEX.test(form.nombre.trim())) e.nombre = 'El nombre contiene caracteres no válidos';

      if (!form.apellidoPaterno.trim()) e.apellidoPaterno = 'El apellido paterno es obligatorio';
      else if (form.apellidoPaterno.trim().length > MAX_APELLIDO) e.apellidoPaterno = `El apellido no puede superar los ${MAX_APELLIDO} caracteres`;
      else if (/\d/.test(form.apellidoPaterno.trim())) e.apellidoPaterno = 'El apellido no debe contener números';
      else if (!NOMBRE_REGEX.test(form.apellidoPaterno.trim())) e.apellidoPaterno = 'El apellido contiene caracteres no válidos';

      if (form.apellidoMaterno.trim()) {
        if (form.apellidoMaterno.trim().length > MAX_APELLIDO) {
          e.apellidoMaterno = `El apellido no puede superar los ${MAX_APELLIDO} caracteres`;
        } else if (/\d/.test(form.apellidoMaterno.trim())) {
          e.apellidoMaterno = 'El apellido no debe contener números';
        } else if (!NOMBRE_REGEX.test(form.apellidoMaterno.trim())) {
          e.apellidoMaterno = 'El apellido contiene caracteres no válidos';
        }
      }

      if (!form.fechaNacimiento) {
        e.fechaNacimiento = 'La fecha de nacimiento es obligatoria';
      } else {
        const nac = new Date(form.fechaNacimiento);
        const hoy = new Date();
        if (isNaN(nac.getTime())) {
          e.fechaNacimiento = 'La fecha de nacimiento no es válida';
        } else if (nac > hoy) {
          e.fechaNacimiento = 'La fecha no puede ser en el futuro';
        } else if (calcularEdadDesdeFecha(form.fechaNacimiento) > 130) {
          e.fechaNacimiento = 'La fecha de nacimiento no es válida';
        }
      }

      if (!form.sexo) e.sexo = 'Selecciona el sexo';

      const curpError = validarCurp(form.curp);
      if (curpError) e.curp = curpError;
    }

    if (stepsToCheck.includes(2)) {
      if (!form.telefono.trim() && !form.celular.trim()) {
        e.telefono = 'Registra al menos un teléfono de contacto';
      } else {
        if (form.telefono.trim() && !validarTelefono(form.telefono)) {
          e.telefono = 'El teléfono debe tener 10 dígitos';
        }
        if (form.celular.trim() && !validarTelefono(form.celular)) {
          e.celular = 'El celular debe tener 10 dígitos';
        }
      }
      if (form.email) {
        if (form.email.length > MAX_EMAIL) {
          e.email = `El correo no puede superar los ${MAX_EMAIL} caracteres`;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
          e.email = 'El correo no es válido';
        }
      }
      if (form.direccion.trim().length > MAX_DIRECCION) {
        e.direccion = `La dirección no puede superar los ${MAX_DIRECCION} caracteres`;
      }
    }

    if (stepsToCheck.includes(3)) {
      if (form.contactoEmergencia.trim().length > MAX_CONTACTO_EMERGENCIA) {
        e.contactoEmergencia = `El contacto no puede superar los ${MAX_CONTACTO_EMERGENCIA} caracteres`;
      }
      if (form.poliza.trim().length > MAX_POLIZA) {
        e.poliza = `La póliza no puede superar los ${MAX_POLIZA} caracteres`;
      }
    }

    return e;
  };

  const validateStep = (step: number): boolean => {
    const e = computeErrors([step]);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) setCurrentStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  const handleSubmit = () => {
    const e = computeErrors([1, 2, 3]);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      if (e.nombre || e.apellidoPaterno || e.apellidoMaterno || e.fechaNacimiento || e.sexo || e.curp) {
        setCurrentStep(1);
      } else if (e.telefono || e.celular || e.email || e.direccion) {
        setCurrentStep(2);
      } else {
        setCurrentStep(3);
      }
      return;
    }
    // En mock: agregar al array de pacientes con sucursal actual
    const newPatient = {
      id: `p${Date.now()}`,
      expediente: `EXP-2026-${String(patients.length + 1).padStart(4, '0')}`,
      nombre: form.nombre.trim(),
      apellidos: `${form.apellidoPaterno.trim()} ${form.apellidoMaterno.trim()}`.trim(),
      fechaNacimiento: form.fechaNacimiento,
      edad: calcularEdadDesdeFecha(form.fechaNacimiento),
      sexo: form.sexo as 'M' | 'F',
      telefono: form.telefono,
      celular: form.celular,
      email: form.email,
      direccion: form.direccion,
      curp: form.curp.toUpperCase(),
      contactoEmergencia: form.contactoEmergencia,
      parentescoEmergencia: form.parentescoEmergencia,
      aseguradora: form.aseguradora,
      poliza: form.poliza,
      medicoAsignado: 'Por asignar',
      ultimaVisita: '',
      alergias: [],
      alertas: [],
      estado: 'activo' as const,
      sucursalId: form.sucursalId || sucursalActualId || 'suc1',
    };
    patients.push(newPatient);
    setSubmitted(true);
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSubmit();
  };

  const stepProgress = ((currentStep - 1) / (steps.length - 1)) * 100;

  if (submitted) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[60vh]">
        <Card padding="lg" className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-emerald-100 mb-4" aria-hidden="true">
            <i className="ri-check-line text-2xl text-emerald-600"></i>
          </div>
          <h2 className="text-xl font-bold text-foreground-900 font-heading mb-2" role="status">
            Paciente Registrado
          </h2>
          <p className="text-sm text-foreground-600 mb-2">El paciente ha sido registrado exitosamente en el sistema.</p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary-100 text-sm text-foreground-700 mb-6">
            <span className="font-mono font-semibold">EXP-2026-{String(patients.length + 1).padStart(4, '0')}</span>
          </div>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button variant="secondary" size="sm" onClick={() => navigate('/app/pacientes')}>
              Ver Lista de Pacientes
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<i className="ri-user-add-line"></i>}
              onClick={() => {
                setForm(initialForm);
                setCurrentStep(1);
                setSubmitted(false);
                setErrors({});
                setDuplicateWarnings([]);
              }}
            >
              Registrar Otro Paciente
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-3xl">
      {/* Step indicator */}
      <Card padding="md">
        <form onSubmit={handleFormSubmit} noValidate>
          {/* Progress bar */}
          <div className="relative mb-6">
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-secondary-200" aria-hidden="true">
              <div className="h-full bg-primary-500 transition-smooth" style={{ width: `${stepProgress}%` }}></div>
            </div>
            <div className="relative flex justify-between">
              {steps.map((step) => {
                const isCompleted = currentStep > step.key;
                const isCurrent = currentStep === step.key;
                return (
                  <div key={step.key} className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold transition-smooth ${
                        isCompleted
                          ? 'bg-primary-500 text-white'
                          : isCurrent
                            ? 'bg-primary-500 text-white ring-4 ring-primary-100'
                            : 'bg-secondary-200 text-foreground-400'
                      }`}
                      aria-current={isCurrent ? 'step' : undefined}
                    >
                      {isCompleted ? (
                        <i className="ri-check-line text-xs" aria-hidden="true"></i>
                      ) : (
                        <span className="w-3.5 h-3.5 flex items-center justify-center" aria-hidden="true">
                          <i className={`${step.icon} text-xs`}></i>
                        </span>
                      )}
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium whitespace-nowrap hidden sm:block ${
                        isCurrent ? 'text-primary-600' : isCompleted ? 'text-foreground-700' : 'text-foreground-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step content */}
          {currentStep === 1 && (
            <Step1DatosPersonales
              form={form}
              updateField={updateField}
              handleCurpChange={handleCurpChange}
              errors={errors}
              duplicateWarnings={duplicateWarnings}
            />
          )}
          {currentStep === 2 && <Step2Contacto form={form} updateField={updateField} errors={errors} />}
          {currentStep === 3 && <Step3Adicionales form={form} updateField={updateField} errors={errors} />}
          {currentStep === 4 && <Step4Confirmacion form={form} errors={errors} />}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8 pt-5 border-t border-secondary-200">
            <div>
              {currentStep > 1 && (
                <Button type="button" variant="ghost" size="sm" icon={<i className="ri-arrow-left-line"></i>} onClick={handleBack}>
                  Anterior
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/app/pacientes')}>
                Cancelar
              </Button>
              {currentStep < 4 ? (
                <Button type="button" variant="primary" size="sm" icon={<i className="ri-arrow-right-line"></i>} onClick={handleNext}>
                  Siguiente
                </Button>
              ) : (
                <Button type="submit" variant="primary" size="sm" icon={<i className="ri-check-line"></i>}>
                  Registrar Paciente
                </Button>
              )}
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}

/* ================ STEP 1: Datos Personales ================ */
function Step1DatosPersonales({
  form,
  updateField,
  handleCurpChange,
  errors,
  duplicateWarnings,
}: {
  form: PatientForm;
  updateField: (f: keyof PatientForm, v: string) => void;
  handleCurpChange: (v: string) => void;
  errors: Partial<Record<keyof PatientForm, string>>;
  duplicateWarnings: typeof patients;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-foreground-900 font-heading">Datos Personales</h3>
        <p className="text-xs text-foreground-500 mt-0.5">
          Nombre, fecha de nacimiento, sexo y CURP. Los campos marcados con <span className="text-red-500">*</span> son obligatorios.
        </p>
      </div>

      {/* Duplicate warnings */}
      {duplicateWarnings.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3" role="alert">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 flex items-center justify-center text-amber-600" aria-hidden="true">
              <i className="ri-error-warning-line"></i>
            </span>
            <p className="text-sm font-semibold text-amber-800">
              Posible{duplicateWarnings.length > 1 ? 's' : ''} duplicado{duplicateWarnings.length > 1 ? 's' : ''} detectado{duplicateWarnings.length > 1 ? 's' : ''}
            </p>
          </div>
          <p className="text-xs text-amber-700 ml-7">
            {duplicateWarnings.length === 1
              ? 'Ya existe un paciente con nombre y fecha de nacimiento similares. Verifica antes de continuar.'
              : 'Existen pacientes con datos similares. Verifica antes de continuar.'}
          </p>
          <div className="space-y-1.5 ml-7">
            {duplicateWarnings.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-sm text-amber-800">
                <Avatar name={`${p.nombre} ${p.apellidos}`} size="xs" />
                <span className="font-medium">{p.nombre} {p.apellidos}</span>
                <span className="text-amber-500 text-xs">({p.expediente})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nombre */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Input
            label="Nombre(s)"
            value={form.nombre}
            onChange={(e) => updateField('nombre', e.target.value)}
            error={errors.nombre}
            required
            autoComplete="given-name"
            spellCheck={false}
            placeholder="María Fernanda"
            maxLength={MAX_NOMBRE}
          />
        </div>
        <div>
          <Input
            label="Apellido Paterno"
            value={form.apellidoPaterno}
            onChange={(e) => updateField('apellidoPaterno', e.target.value)}
            error={errors.apellidoPaterno}
            required
            autoComplete="family-name"
            spellCheck={false}
            placeholder="López"
            maxLength={MAX_APELLIDO}
          />
        </div>
        <div>
          <Input
            label="Apellido Materno"
            value={form.apellidoMaterno}
            onChange={(e) => updateField('apellidoMaterno', e.target.value)}
            error={errors.apellidoMaterno}
            autoComplete="additional-name"
            spellCheck={false}
            placeholder="Hernández"
            maxLength={MAX_APELLIDO}
          />
        </div>
      </div>

      {/* Fecha Nacimiento + Sexo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Fecha de Nacimiento"
          type="date"
          value={form.fechaNacimiento}
          onChange={(e) => updateField('fechaNacimiento', e.target.value)}
          error={errors.fechaNacimiento}
          required
          autoComplete="bday"
        />
        <Select
          label="Sexo"
          value={form.sexo}
          onChange={(e) => updateField('sexo', e.target.value)}
          error={errors.sexo}
          required
          autoComplete="sex"
          options={[
            { value: '', label: 'Seleccionar sexo' },
            { value: 'M', label: 'Masculino' },
            { value: 'F', label: 'Femenino' },
          ]}
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3" aria-hidden="true">
        <div className="flex-1 h-px bg-secondary-200"></div>
        <span className="text-2xs font-medium text-foreground-400 uppercase tracking-wider">Identificación Oficial</span>
        <div className="flex-1 h-px bg-secondary-200"></div>
      </div>

      {/* CURP */}
      <div>
        <Input
          label="CURP"
          value={form.curp}
          onChange={(e) => handleCurpChange(e.target.value)}
          error={errors.curp}
          required
          placeholder="XXXX000000XXXXXX00"
          maxLength={18}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="characters"
          hint="Captúrala tal como aparece en el documento oficial (acta de nacimiento o INE)."
        />
      </div>
    </div>
  );
}

/* ================ STEP 2: Contacto ================ */
function Step2Contacto({
  form,
  updateField,
  errors,
}: {
  form: PatientForm;
  updateField: (f: keyof PatientForm, v: string) => void;
  errors: Partial<Record<keyof PatientForm, string>>;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-foreground-900 font-heading">Datos de Contacto</h3>
        <p className="text-xs text-foreground-500 mt-0.5">Información para contactar al paciente. Al menos un teléfono es obligatorio.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Teléfono Fijo"
          type="tel"
          inputMode="tel"
          value={form.telefono}
          onChange={(e) => updateField('telefono', e.target.value)}
          error={errors.telefono}
          placeholder="55-1234-5678"
          autoComplete="tel"
          leftIcon="ri-phone-line"
          maxLength={MAX_TELEFONO}
        />
        <Input
          label="Teléfono Celular"
          type="tel"
          inputMode="tel"
          value={form.celular}
          onChange={(e) => updateField('celular', e.target.value)}
          error={errors.celular}
          placeholder="55-9876-5432"
          autoComplete="tel-national"
          leftIcon="ri-smartphone-line"
          maxLength={MAX_TELEFONO}
        />
      </div>

      <Input
        label="Correo Electrónico"
        type="email"
        inputMode="email"
        value={form.email}
        onChange={(e) => updateField('email', e.target.value)}
        error={errors.email}
        placeholder="paciente@email.com"
        autoComplete="email"
        leftIcon="ri-mail-line"
        maxLength={MAX_EMAIL}
      />

      <Input
        label="Dirección"
        value={form.direccion}
        onChange={(e) => updateField('direccion', e.target.value)}
        error={errors.direccion}
        placeholder="Calle, Número, Colonia, Ciudad, Estado"
        autoComplete="street-address"
        leftIcon="ri-map-pin-line"
        maxLength={MAX_DIRECCION}
      />
    </div>
  );
}

/* ================ STEP 3: Datos Adicionales ================ */
function Step3Adicionales({
  form,
  updateField,
  errors,
}: {
  form: PatientForm;
  updateField: (f: keyof PatientForm, v: string) => void;
  errors: Partial<Record<keyof PatientForm, string>>;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-foreground-900 font-heading">Datos Adicionales</h3>
        <p className="text-xs text-foreground-500 mt-0.5">Información complementaria (opcional)</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Contacto de Emergencia"
          value={form.contactoEmergencia}
          onChange={(e) => updateField('contactoEmergencia', e.target.value)}
          error={errors.contactoEmergencia}
          placeholder="Nombre y apellidos"
          autoComplete="off"
          maxLength={MAX_CONTACTO_EMERGENCIA}
        />
        <Select
          label="Parentesco"
          value={form.parentescoEmergencia}
          onChange={(e) => updateField('parentescoEmergencia', e.target.value)}
          options={[
            { value: '', label: 'Seleccionar parentesco' },
            { value: 'Esposo/a', label: 'Esposo/a' },
            { value: 'Padre', label: 'Padre' },
            { value: 'Madre', label: 'Madre' },
            { value: 'Hijo/a', label: 'Hijo/a' },
            { value: 'Hermano/a', label: 'Hermano/a' },
            { value: 'Tutor', label: 'Tutor' },
            { value: 'Otro', label: 'Otro' },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Aseguradora"
          value={form.aseguradora}
          onChange={(e) => updateField('aseguradora', e.target.value)}
          options={[
            { value: '', label: 'Particular (sin seguro)' },
            { value: 'AXA Seguros', label: 'AXA Seguros' },
            { value: 'GNP Seguros', label: 'GNP Seguros' },
            { value: 'MetLife', label: 'MetLife' },
            { value: 'Seguros Monterrey', label: 'Seguros Monterrey' },
            { value: 'Otra', label: 'Otra' },
          ]}
        />
        <Input
          label="Número de Póliza"
          value={form.poliza}
          onChange={(e) => updateField('poliza', e.target.value)}
          error={errors.poliza}
          placeholder="XXX-2026-XXXX"
          autoComplete="off"
          disabled={!form.aseguradora}
          hint={!form.aseguradora ? 'Disponible al seleccionar una aseguradora' : undefined}
          maxLength={MAX_POLIZA}
        />
      </div>
    </div>
  );
}

/* ================ STEP 4: Confirmación ================ */
function Step4Confirmacion({ form, errors }: { form: PatientForm; errors: Partial<Record<keyof PatientForm, string>> }) {
  const nombreCompleto = [form.nombre, form.apellidoPaterno, form.apellidoMaterno].filter(Boolean).join(' ');
  const edadEstimada = form.fechaNacimiento ? calcularEdadDesdeFecha(form.fechaNacimiento) : null;
  const branchName = sucursales.find((s) => s.id === form.sucursalId)?.nombre || 'Sin sucursal';

  const hayErroresPendientes = Object.keys(errors).length > 0;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-foreground-900 font-heading">Confirmar Registro</h3>
        <p className="text-xs text-foreground-500 mt-0.5">Revisa que toda la información sea correcta antes de guardar</p>
      </div>

      {hayErroresPendientes && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20" role="alert">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 flex items-center justify-center text-red-600" aria-hidden="true">
              <i className="ri-error-warning-line"></i>
            </span>
            <p className="text-sm font-semibold text-red-800">Hay campos con información incorrecta</p>
          </div>
          <p className="text-xs text-red-700 mt-1 ml-7">
            Corrige los errores marcados antes de registrar. El botón "Registrar Paciente" te regresará al paso afectado.
          </p>
        </div>
      )}

      {/* Sucursal asignada */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-accent-50 border border-accent-200">
        <span className="w-5 h-5 flex items-center justify-center text-accent-600" aria-hidden="true">
          <i className="ri-building-line text-sm"></i>
        </span>
        <p className="text-sm text-accent-800">
          El paciente se registrará en <strong>{branchName}</strong>
        </p>
      </div>

      <div className="p-4 rounded-xl bg-secondary-50 border border-secondary-200 space-y-4">
        {/* Header summary */}
        <div className="flex items-center gap-3 pb-4 border-b border-secondary-200">
          <Avatar name={nombreCompleto || 'Nuevo Paciente'} size="lg" />
          <div>
            <p className="text-base font-bold text-foreground-900 font-heading">{nombreCompleto || '—'}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {form.curp && <Badge variant="secondary" size="sm">{form.curp}</Badge>}
              {edadEstimada !== null && <Badge variant="info" size="sm">{edadEstimada} años</Badge>}
              {form.sexo && (
                <Badge variant={form.sexo === 'F' ? 'accent' : 'info'} size="sm">
                  {form.sexo === 'F' ? 'Femenino' : 'Masculino'}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Section: Datos Personales */}
        <div>
          <p className="text-2xs font-semibold text-foreground-400 uppercase tracking-wider mb-2">Datos Personales</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
            <ConfirmField label="Nombre" value={form.nombre} />
            <ConfirmField label="Ap. Paterno" value={form.apellidoPaterno} />
            <ConfirmField label="Ap. Materno" value={form.apellidoMaterno} />
            <ConfirmField label="Fecha Nac." value={form.fechaNacimiento ? formatearFecha(form.fechaNacimiento) : '—'} />
            <ConfirmField label="Sexo" value={form.sexo === 'M' ? 'Masculino' : form.sexo === 'F' ? 'Femenino' : '—'} />
            <ConfirmField label="CURP" value={form.curp} />
          </div>
        </div>

        {/* Section: Contacto */}
        <div>
          <p className="text-2xs font-semibold text-foreground-400 uppercase tracking-wider mb-2">Contacto</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <ConfirmField label="Teléfono" value={form.telefono} />
            <ConfirmField label="Celular" value={form.celular} />
            <ConfirmField label="Email" value={form.email} />
            <ConfirmField label="Dirección" value={form.direccion} />
          </div>
        </div>

        {/* Section: Adicionales */}
        {(form.contactoEmergencia || form.aseguradora) && (
          <div>
            <p className="text-2xs font-semibold text-foreground-400 uppercase tracking-wider mb-2">Datos Adicionales</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <ConfirmField label="Emergencia" value={form.contactoEmergencia} />
              <ConfirmField label="Parentesco" value={form.parentescoEmergencia} />
              <ConfirmField label="Aseguradora" value={form.aseguradora} />
              <ConfirmField label="Póliza" value={form.poliza} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConfirmField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-2xs text-foreground-400">{label}</span>
      <p className="text-sm font-medium text-foreground-800 truncate">{value || '—'}</p>
    </div>
  );
}