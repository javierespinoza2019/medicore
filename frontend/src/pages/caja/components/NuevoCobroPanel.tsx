import { useState, useMemo, useEffect } from 'react';
import Button from '@/components/base/Button';
import Input from '@/components/base/Input';
import { patients, getPatientById } from '@/mocks/patients';
import { medicalServices } from '@/mocks/services';
import type { Patient } from '@/mocks/patients';
import type { MedicalService } from '@/mocks/services';

interface NuevoCobroPanelProps {
  prefilledPatientId?: string;
  prefilledServices?: MedicalService[];
  prefilledConsultaId?: string;
  prefilledDoctor?: string;
  onTransactionComplete: (data: {
    pacienteId: string;
    paciente: string;
    servicios: MedicalService[];
    subtotal: number;
    descuento: number;
    total: number;
    metodoPago: 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto';
    detallePago: { efectivo?: number; tarjeta?: number; transferencia?: number };
    notas?: string;
    consultaId?: string;
    consultaDoctor?: string;
  }) => void;
}

type PasoActual = 'paciente' | 'servicios' | 'pago';

const metodosPago = [
  { key: 'efectivo', label: 'Efectivo', icon: 'ri-cash-line' },
  { key: 'tarjeta', label: 'Tarjeta', icon: 'ri-bank-card-line' },
  { key: 'transferencia', label: 'Transferencia', icon: 'ri-smartphone-line' },
  { key: 'mixto', label: 'Mixto', icon: 'ri-exchange-funds-line' },
] as const;

export default function NuevoCobroPanel({
  prefilledPatientId,
  prefilledServices,
  prefilledConsultaId,
  prefilledDoctor,
  onTransactionComplete,
}: NuevoCobroPanelProps) {
  const initialPatient = prefilledPatientId ? getPatientById(prefilledPatientId) || null : null;
  const initialServices = prefilledServices || [];

  const [paso, setPaso] = useState<PasoActual>(initialPatient ? 'servicios' : 'paciente');
  const [searchTerm, setSearchTerm] = useState(initialPatient ? `${initialPatient.nombre} ${initialPatient.apellidos}` : '');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(initialPatient);
  const [selectedServices, setSelectedServices] = useState<MedicalService[]>(initialServices);
  const [descuento, setDescuento] = useState(0);
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia' | 'mixto'>('efectivo');
  const [detalleMixto, setDetalleMixto] = useState({ efectivo: 0, tarjeta: 0, transferencia: 0 });
  const [notas, setNotas] = useState('');
  const [montoRecibido, setMontoRecibido] = useState('');

  useEffect(() => {
    if (prefilledPatientId) {
      const patient = getPatientById(prefilledPatientId);
      if (patient) {
        setSelectedPatient(patient);
        setSearchTerm(`${patient.nombre} ${patient.apellidos}`);
        setPaso('servicios');
      }
    }
  }, [prefilledPatientId]);

  useEffect(() => {
    if (prefilledServices && prefilledServices.length > 0) {
      setSelectedServices(prefilledServices);
    }
  }, [prefilledServices]);

  const subtotal = selectedServices.reduce((sum, s) => sum + s.precio, 0);
  const total = subtotal - descuento;
  const cambio = metodoPago === 'efectivo' && montoRecibido ? Number(montoRecibido) - total : 0;

  const filteredPatients = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const q = searchTerm.toLowerCase();
    return patients.filter(p =>
      p.estado === 'activo' &&
      (`${p.nombre} ${p.apellidos}`.toLowerCase().includes(q) ||
       p.expediente.toLowerCase().includes(q))
    ).slice(0, 6);
  }, [searchTerm]);

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchTerm(`${patient.nombre} ${patient.apellidos}`);
    setPaso('servicios');
  };

  const toggleService = (service: MedicalService) => {
    setSelectedServices(prev =>
      prev.find(s => s.id === service.id)
        ? prev.filter(s => s.id !== service.id)
        : [...prev, service]
    );
  };

  const handleMixtoChange = (field: 'efectivo' | 'tarjeta' | 'transferencia', value: number) => {
    setDetalleMixto(prev => ({ ...prev, [field]: value }));
  };

  const canProceedToPayment = selectedServices.length > 0 && total > 0;

  const handleCompletePayment = () => {
    if (!selectedPatient) return;

    let detallePago: { efectivo?: number; tarjeta?: number; transferencia?: number } = {};

    if (metodoPago === 'efectivo') {
      detallePago = { efectivo: Number(montoRecibido) || total };
    } else if (metodoPago === 'tarjeta') {
      detallePago = { tarjeta: total };
    } else if (metodoPago === 'transferencia') {
      detallePago = { transferencia: total };
    } else {
      detallePago = { ...detalleMixto };
    }

    onTransactionComplete({
      pacienteId: selectedPatient.id,
      paciente: `${selectedPatient.nombre} ${selectedPatient.apellidos}`,
      servicios: selectedServices,
      subtotal,
      descuento,
      total,
      metodoPago,
      detallePago,
      notas: notas || undefined,
      consultaId: prefilledConsultaId,
      consultaDoctor: prefilledDoctor,
    });

    handleReset();
  };

  const handleReset = () => {
    setPaso('paciente');
    setSearchTerm('');
    setSelectedPatient(null);
    setSelectedServices([]);
    setDescuento(0);
    setMetodoPago('efectivo');
    setDetalleMixto({ efectivo: 0, tarjeta: 0, transferencia: 0 });
    setNotas('');
    setMontoRecibido('');
  };

  const getServiciosConcepto = () => {
    if (selectedServices.length === 0) return '';
    if (selectedServices.length === 1) return selectedServices[0].nombre;
    return `${selectedServices[0].nombre} + ${selectedServices.length - 1} servicio(s) más`;
  };

  return (
    <div className="bg-background-50 border border-secondary-200/70 rounded-xl overflow-hidden">
      {/* Header with steps */}
      <div className="px-5 py-3.5 border-b border-secondary-200/70">
        <h2 className="text-sm font-bold text-foreground-900 font-heading">Nuevo Cobro</h2>
        <div className="flex items-center gap-1.5 mt-2.5">
          {[
            { key: 'paciente', label: 'Paciente', icon: 'ri-user-search-line' },
            { key: 'servicios', label: 'Servicios', icon: 'ri-list-check-3' },
            { key: 'pago', label: 'Cobro', icon: 'ri-cash-line' },
          ].map((step, idx) => (
            <div key={step.key} className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  if (idx === 0) setPaso('paciente');
                  else if (idx === 1 && selectedPatient) setPaso('servicios');
                  else if (idx === 2 && canProceedToPayment) setPaso('pago');
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-base whitespace-nowrap cursor-pointer ${
                  paso === step.key
                    ? 'bg-primary-500 text-white'
                    : idx < ['paciente', 'servicios', 'pago'].indexOf(paso)
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-secondary-100 text-foreground-500'
                }`}
              >
                <span className="w-3.5 h-3.5 flex items-center justify-center">
                  <i className={`${idx < ['paciente', 'servicios', 'pago'].indexOf(paso) ? 'ri-check-line' : step.icon} text-xs`}></i>
                </span>
                {step.label}
              </button>
              {idx < 2 && <span className="text-foreground-300 text-[10px]"><i className="ri-arrow-right-s-line"></i></span>}
            </div>
          ))}
          {selectedPatient && (
            <button
              onClick={handleReset}
              className="ml-auto flex items-center gap-1 text-[10px] text-foreground-400 hover:text-red-500 font-medium transition-base cursor-pointer whitespace-nowrap"
            >
              <i className="ri-restart-line"></i> Reiniciar
            </button>
          )}
        </div>
      </div>

      <div className="p-5">
        {/* ── Consulta context banner ── */}
        {prefilledConsultaId && prefilledDoctor && (
          <div className="mb-4 px-3 py-2.5 bg-primary-50 border border-primary-200/50 rounded-lg flex items-center gap-2.5">
            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-primary-100 text-primary-600">
              <i className="ri-stethoscope-line text-xs"></i>
            </span>
            <div>
              <p className="text-[11px] font-semibold text-primary-700">Cobro vinculado a consulta</p>
              <p className="text-[10px] text-primary-600">Atendida por {prefilledDoctor}</p>
            </div>
          </div>
        )}

        {/* ── Paso 1: Buscar paciente ── */}
        {paso === 'paciente' && (
          <div>
            <div className="relative">
              <Input
                placeholder="Buscar paciente por nombre o expediente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon="ri-search-line"
                autoFocus
              />
            </div>

            {filteredPatients.length > 0 && (
              <div className="mt-3 border border-secondary-200/70 rounded-lg overflow-hidden divide-y divide-secondary-100">
                {filteredPatients.map(patient => (
                  <button
                    key={patient.id}
                    onClick={() => handleSelectPatient(patient)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary-50 transition-base cursor-pointer"
                  >
                    <div className="w-9 h-9 flex items-center justify-center rounded-full bg-primary-100 text-primary-600 font-bold text-sm shrink-0">
                      {patient.nombre.charAt(0)}{patient.apellidos.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground-800">{patient.nombre} {patient.apellidos}</p>
                      <p className="text-[11px] text-foreground-500">Exp. {patient.expediente} · {patient.aseguradora || 'Sin seguro'}</p>
                    </div>
                    <i className="ri-arrow-right-s-line text-foreground-400"></i>
                  </button>
                ))}
              </div>
            )}

            {searchTerm && filteredPatients.length === 0 && (
              <div className="mt-3 text-center py-6 text-xs text-foreground-400">
                <span className="w-10 h-10 flex items-center justify-center mx-auto mb-2 rounded-full bg-secondary-100 text-foreground-400">
                  <i className="ri-user-search-line text-lg"></i>
                </span>
                No se encontraron pacientes con "{searchTerm}"
              </div>
            )}

            {!searchTerm && (
              <div className="mt-4">
                <p className="text-[11px] text-foreground-500 font-medium mb-2">Pacientes recientes</p>
                <div className="space-y-1">
                  {patients.filter(p => p.estado === 'activo').slice(0, 5).map(patient => (
                    <button
                      key={patient.id}
                      onClick={() => handleSelectPatient(patient)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-secondary-50 transition-base cursor-pointer text-left"
                    >
                      <span className="w-6 h-6 flex items-center justify-center rounded-full bg-secondary-100 text-foreground-600 text-2xs font-bold shrink-0">
                        {patient.nombre.charAt(0)}{patient.apellidos.charAt(0)}
                      </span>
                      <span className="text-xs text-foreground-700 font-medium truncate">{patient.nombre} {patient.apellidos}</span>
                      <span className="text-[10px] text-foreground-400 ml-auto shrink-0">{patient.expediente}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Paso 2: Seleccionar servicios ── */}
        {paso === 'servicios' && selectedPatient && (
          <div>
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-secondary-200/70">
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-primary-100 text-primary-600 font-bold text-sm shrink-0">
                {selectedPatient.nombre.charAt(0)}{selectedPatient.apellidos.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground-800">{selectedPatient.nombre} {selectedPatient.apellidos}</p>
                <p className="text-[11px] text-foreground-500">Exp. {selectedPatient.expediente}{selectedPatient.aseguradora ? ` · ${selectedPatient.aseguradora}` : ''}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-1.5 max-h-[280px] overflow-y-auto scrollbar-thin pr-1">
              {medicalServices.filter(s => s.activo).map(service => {
                const isSelected = selectedServices.some(s => s.id === service.id);
                return (
                  <button
                    key={service.id}
                    onClick={() => toggleService(service)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-base cursor-pointer ${
                      isSelected
                        ? 'bg-primary-50 border border-primary-200/60'
                        : 'bg-secondary-50/70 border border-transparent hover:bg-secondary-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-5 h-5 flex items-center justify-center rounded border-2 shrink-0 transition-base ${
                        isSelected ? 'bg-primary-500 border-primary-500 text-white' : 'border-secondary-300 text-transparent'
                      }`}>
                        <i className="ri-check-line text-xs"></i>
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground-700 truncate">{service.nombre}</p>
                        <p className="text-[10px] text-foreground-400">{service.especialidad} · {service.duracionMin} min</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-foreground-800 shrink-0 ml-2">${service.precio}</span>
                  </button>
                );
              })}
            </div>

            {selectedServices.length > 0 && (
              <div className="mt-4 pt-3 border-t border-secondary-200/70">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[11px] text-foreground-500">{selectedServices.length} servicio(s) seleccionado(s)</p>
                    <p className="text-sm text-foreground-700 font-medium truncate max-w-[280px]">{getServiciosConcepto()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-foreground-400">Subtotal: ${subtotal.toLocaleString()}</p>
                    <p className="text-lg font-bold text-foreground-900 font-heading">${total.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <label className="text-[11px] text-foreground-500 font-medium whitespace-nowrap">Descuento:</label>
                  <div className="relative flex-1 max-w-[120px]">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-400 text-xs">$</span>
                    <input
                      type="number"
                      min="0"
                      max={subtotal}
                      value={descuento || ''}
                      onChange={(e) => setDescuento(Number(e.target.value) || 0)}
                      className="w-full pl-5 pr-2 py-1.5 text-xs bg-background-50 border border-secondary-200 rounded-md outline-none focus:border-primary-400"
                    />
                  </div>
                </div>

                <Button variant="primary" size="sm" className="w-full" onClick={() => setPaso('pago')}>
                  Continuar al cobro — ${total.toLocaleString()} MXN
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Paso 3: Realizar cobro ── */}
        {paso === 'pago' && selectedPatient && (
          <div>
            <div className="bg-secondary-50/70 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-foreground-500">Paciente</span>
                <span className="text-xs font-semibold text-foreground-800">{selectedPatient.nombre} {selectedPatient.apellidos}</span>
              </div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-foreground-500">Servicios</span>
                <span className="text-xs text-foreground-700">{selectedServices.length} servicio(s)</span>
              </div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-foreground-500">Subtotal</span>
                <span className="text-xs text-foreground-700">${subtotal.toLocaleString()}</span>
              </div>
              {descuento > 0 && (
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-emerald-600">Descuento</span>
                  <span className="text-xs font-medium text-emerald-600">-${descuento.toLocaleString()}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-secondary-200/70">
                <span className="text-sm font-bold text-foreground-900">Total a cobrar</span>
                <span className="text-lg font-bold text-foreground-900 font-heading">${total.toLocaleString()} MXN</span>
              </div>
            </div>

            <label className="block text-[11px] text-foreground-500 font-medium mb-2">Método de pago</label>
            <div className="grid grid-cols-2 gap-1.5 mb-4">
              {metodosPago.map(method => (
                <button
                  key={method.key}
                  onClick={() => setMetodoPago(method.key)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-base cursor-pointer ${
                    metodoPago === method.key
                      ? 'bg-primary-500 text-white'
                      : 'bg-secondary-50/70 text-foreground-600 hover:bg-secondary-100'
                  }`}
                >
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className={`${method.icon} text-sm`}></i>
                  </span>
                  {method.label}
                </button>
              ))}
            </div>

            {metodoPago === 'efectivo' && (
              <div className="mb-4">
                <label className="block text-[11px] text-foreground-500 font-medium mb-1.5">Monto recibido</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm">$</span>
                  <input
                    type="number"
                    min={total}
                    value={montoRecibido}
                    onChange={(e) => setMontoRecibido(e.target.value)}
                    placeholder={`Mínimo $${total.toLocaleString()}`}
                    className="w-full pl-7 pr-4 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg outline-none focus:border-primary-400"
                  />
                </div>
                {cambio > 0 && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg">
                    <span className="w-4 h-4 flex items-center justify-center text-emerald-600">
                      <i className="ri-arrow-go-back-line"></i>
                    </span>
                    <span className="text-xs font-semibold text-emerald-700">Cambio: ${cambio.toLocaleString()} MXN</span>
                  </div>
                )}
              </div>
            )}

            {metodoPago === 'mixto' && (
              <div className="mb-4 space-y-2">
                {[
                  { key: 'efectivo', label: 'Efectivo', icon: 'ri-cash-line' },
                  { key: 'tarjeta', label: 'Tarjeta', icon: 'ri-bank-card-line' },
                  { key: 'transferencia', label: 'Transferencia', icon: 'ri-smartphone-line' },
                ].map(m => (
                  <div key={m.key} className="flex items-center gap-2">
                    <span className="w-5 h-5 flex items-center justify-center text-foreground-400">
                      <i className={`${m.icon} text-sm`}></i>
                    </span>
                    <label className="text-[11px] text-foreground-500 w-24 whitespace-nowrap">{m.label}</label>
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-400 text-xs">$</span>
                      <input
                        type="number"
                        min="0"
                        value={detalleMixto[m.key as keyof typeof detalleMixto] || ''}
                        onChange={(e) => handleMixtoChange(m.key as 'efectivo' | 'tarjeta' | 'transferencia', Number(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full pl-5 pr-3 py-1.5 text-xs bg-background-50 border border-secondary-200 rounded-md outline-none focus:border-primary-400"
                      />
                    </div>
                  </div>
                ))}
                {detalleMixto.efectivo + detalleMixto.tarjeta + detalleMixto.transferencia !== total && (
                  <p className="text-[10px] text-amber-600">La suma debe ser igual a ${total.toLocaleString()}</p>
                )}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-[11px] text-foreground-500 font-medium mb-1.5">Notas (opcional)</label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: Paciente con descuento por convenio..."
                rows={2}
                maxLength={200}
                className="w-full px-3 py-2 text-xs bg-background-50 border border-secondary-200 rounded-lg outline-none focus:border-primary-400 resize-none"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPaso('servicios')} className="flex-1">
                <i className="ri-arrow-left-line"></i> Atrás
              </Button>
              <Button
                variant="success"
                size="sm"
                className="flex-1"
                onClick={handleCompletePayment}
                disabled={
                  metodoPago === 'efectivo' ? Number(montoRecibido) < total :
                  metodoPago === 'mixto' ? detalleMixto.efectivo + detalleMixto.tarjeta + detalleMixto.transferencia !== total :
                  false
                }
              >
                <i className="ri-check-line"></i> Cobrar ${total.toLocaleString()}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}