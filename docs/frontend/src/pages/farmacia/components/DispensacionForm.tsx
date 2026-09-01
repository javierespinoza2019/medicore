import { useState, useMemo } from 'react';
import type { Receta, MedicamentoPrescrito } from '@/mocks/recetas';
import { getMedicamentoInfo } from '@/mocks/farmacia';
import type { MedicamentoDispensado, MedicamentoPendiente, DispensacionFarmacia } from '@/mocks/farmacia';
import Card from '@/components/base/Card';
import Button from '@/components/base/Button';

interface DispensacionFormProps {
  receta: Receta;
  onDispensar: (dispensacion: {
    recetaId: string;
    medicamentos: MedicamentoDispensado[];
    subtotal: number;
    descuento: number;
    total: number;
    metodoPago: 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto';
    detallePago: { efectivo?: number; tarjeta?: number; transferencia?: number };
    pendientes?: MedicamentoPendiente[];
    tipoDispensacion: 'completa' | 'parcial';
  }) => void;
  dispensacionPrevia?: DispensacionFarmacia | null;
  pendientesPrevios?: MedicamentoPendiente[] | null;
}

export default function DispensacionForm({ receta, onDispensar, dispensacionPrevia, pendientesPrevios }: DispensacionFormProps) {
  const [cantidadesDeseadas, setCantidadesDeseadas] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    const medicamentos = pendientesPrevios && pendientesPrevios.length > 0 ? pendientesPrevios : receta.medicamentos;
    medicamentos.forEach((m) => {
      if ('cantidadPendiente' in m && (m as MedicamentoPendiente).cantidadPendiente) {
        init[(m as MedicamentoPendiente).medicamentoId] = (m as MedicamentoPendiente).cantidadPendiente;
      } else if ('medicamentoId' in m) {
        init[(m as MedicamentoPrescrito).medicamentoId] = 1;
      }
    });
    return init;
  });
  const [descuento, setDescuento] = useState(0);
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia' | 'mixto'>('efectivo');
  const [efectivo, setEfectivo] = useState<number>(0);
  const [tarjeta, setTarjeta] = useState<number>(0);
  const [transferencia, setTransferencia] = useState<number>(0);
  const [showResumen, setShowResumen] = useState(false);
  const [dispensed, setDispensed] = useState(false);
  const [dispensedPendientes, setDispensedPendientes] = useState<MedicamentoPendiente[] | null>(null);
  const [wasParcial, setWasParcial] = useState(false);

  const medicamentosADispensar = useMemo(() => {
    const source = pendientesPrevios && pendientesPrevios.length > 0
      ? pendientesPrevios.map((p) => ({
          medicamentoId: p.medicamentoId,
          nombre: p.nombre,
          presentacion: p.presentacion,
          concentracion: p.concentracion,
          dosis: p.dosis,
          frecuencia: p.frecuencia,
          via: p.via,
          duracion: '',
          indicaciones: '',
        } as MedicamentoPrescrito))
      : receta.medicamentos;

    return source.map((med) => {
      const info = getMedicamentoInfo(med.medicamentoId);
      return { prescrito: med, inventario: info.inventario, catalogo: info.medicamento };
    });
  }, [receta, pendientesPrevios]);

  const { lineas, subtotal, total, esParcial, pendientes } = useMemo(() => {
    const lines = medicamentosADispensar
      .filter((m) => cantidadesDeseadas[m.prescrito.medicamentoId] > 0)
      .map((m) => {
        const deseada = cantidadesDeseadas[m.prescrito.medicamentoId] || 0;
        const stock = m.inventario?.stock || 0;
        const cantidadDispensada = Math.min(deseada, stock);
        const precio = m.inventario?.precioVenta || 0;
        return {
          medicamentoId: m.prescrito.medicamentoId,
          nombre: m.prescrito.nombre,
          presentacion: m.prescrito.presentacion,
          concentracion: m.prescrito.concentracion,
          dosis: m.prescrito.dosis,
          frecuencia: m.prescrito.frecuencia,
          via: m.prescrito.via,
          cantidadDeseada: deseada,
          cantidadDispensada,
          cantidadPendiente: Math.max(0, deseada - stock),
          precioUnitario: precio,
          subtotal: cantidadDispensada * precio,
          lote: m.inventario?.lote || '',
          stock,
        };
      });

    const sub = lines.reduce((acc, l) => acc + l.subtotal, 0);
    const tot = Math.max(0, sub - descuento);
    const partial = lines.some((l) => l.cantidadPendiente > 0);

    const pends: MedicamentoPendiente[] = lines
      .filter((l) => l.cantidadPendiente > 0)
      .map((l) => ({
        medicamentoId: l.medicamentoId,
        nombre: l.nombre,
        presentacion: l.presentacion,
        concentracion: l.concentracion,
        cantidadPendiente: l.cantidadPendiente,
        cantidadSolicitada: l.cantidadDeseada,
        dosis: l.dosis,
        frecuencia: l.frecuencia,
        via: l.via,
      }));

    return { lineas: lines, subtotal: sub, total: tot, esParcial: partial, pendientes: pends };
  }, [medicamentosADispensar, cantidadesDeseadas, descuento]);

  const canDispense = useMemo(() => {
    if (total <= 0 && subtotal > 0) return false;
    if (descuento > subtotal) return false;
    const hasItem = lineas.some((l) => l.cantidadDispensada > 0);
    if (!hasItem) return false;
    if (metodoPago === 'mixto') {
      const sumDetalle = (efectivo || 0) + (tarjeta || 0) + (transferencia || 0);
      if (Math.abs(sumDetalle - total) > 0.01) return false;
    }
    return true;
  }, [total, subtotal, descuento, lineas, metodoPago, efectivo, tarjeta, transferencia]);

  const updateCantidad = (medId: string, delta: number) => {
    setCantidadesDeseadas((prev) => {
      const current = prev[medId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [medId]: next };
    });
  };

  const handleDispensar = () => {
    if (!canDispense) return;
    const detallePago: { efectivo?: number; tarjeta?: number; transferencia?: number } = {};
    if (metodoPago === 'mixto') {
      if (efectivo > 0) detallePago.efectivo = efectivo;
      if (tarjeta > 0) detallePago.tarjeta = tarjeta;
      if (transferencia > 0) detallePago.transferencia = transferencia;
    }
    onDispensar({
      recetaId: receta.id,
      medicamentos: lineas.filter((l) => l.cantidadDispensada > 0).map((l) => ({
        medicamentoId: l.medicamentoId,
        nombre: l.nombre,
        presentacion: l.presentacion,
        concentracion: l.concentracion,
        cantidad: l.cantidadDispensada,
        precioUnitario: l.precioUnitario,
        subtotal: l.subtotal,
        lote: l.lote,
      })),
      subtotal,
      descuento,
      total,
      metodoPago,
      detallePago,
      pendientes: pendientes.length > 0 ? pendientes : undefined,
      tipoDispensacion: esParcial ? 'parcial' : 'completa',
    });
    setWasParcial(esParcial);
    setDispensedPendientes(pendientes.length > 0 ? pendientes : null);
    setDispensed(true);
  };

  const hoy = '2026-08-07';

  if (dispensed) {
    return (
      <Card padding="lg">
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <span className={`w-16 h-16 flex items-center justify-center rounded-full ${wasParcial ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
            <i className={`${wasParcial ? 'ri-check-line' : 'ri-check-double-line'} text-3xl`}></i>
          </span>
          <div>
            <p className="text-base font-semibold text-foreground-900">
              {wasParcial ? 'Dispensación parcial' : 'Medicamentos dispensados'}
            </p>
            <p className="text-sm text-foreground-500 mt-1">
              {wasParcial
                ? 'Se surtió lo disponible. Los pendientes quedan marcados para cuando llegue más inventario.'
                : 'La receta ha sido surtida y el cobro registrado correctamente'}
            </p>
          </div>
          <div className="w-full max-w-xs bg-background-50 rounded-lg border border-secondary-200 p-4 text-left space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-foreground-500">Paciente</span>
              <span className="font-medium text-foreground-900">{receta.patientName}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-foreground-500">Folio receta</span>
              <span className="font-medium text-foreground-900">RX-{receta.urgenciaId ? 'URG-' : ''}{receta.id.replace(/^ru?/, '').padStart(4, '0')}</span>
            </div>
            {lineas.filter((l) => l.cantidadDispensada > 0).map((l) => (
              <div key={l.medicamentoId} className="flex justify-between text-xs">
                <span className="text-foreground-500">{l.nombre} x{l.cantidadDispensada}</span>
                <span className="font-medium text-foreground-900">${l.subtotal.toFixed(2)}</span>
              </div>
            ))}
            {descuento > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-foreground-500">Descuento</span>
                <span className="font-medium text-red-600">-${descuento.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-secondary-200 pt-2 flex justify-between text-sm">
              <span className="font-semibold text-foreground-800">Total cobrado</span>
              <span className="font-bold text-foreground-950">${total.toFixed(2)}</span>
            </div>

            {wasParcial && dispensedPendientes && dispensedPendientes.length > 0 && (
              <>
                <div className="border-t border-amber-200 pt-2 mt-2">
                  <p className="text-xs font-semibold text-amber-800 flex items-center gap-1 mb-1.5">
                    <i className="ri-timer-line"></i>
                    Pendientes por surtir
                  </p>
                  {dispensedPendientes.map((p) => (
                    <div key={p.medicamentoId} className="flex justify-between text-xs py-0.5">
                      <span className="text-amber-700">{p.nombre} {p.concentracion}</span>
                      <span className="font-medium text-amber-800">{p.cantidadPendiente} und.</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </Card>
    );
  }

  if (dispensacionPrevia) {
    return (
      <Card padding="lg">
        <div className="flex items-center gap-3 mb-4 p-3 bg-sky-50 border border-sky-200 rounded-lg">
          <span className="w-9 h-9 flex items-center justify-center rounded-full bg-sky-100 text-sky-600 flex-shrink-0">
            <i className="ri-information-line text-lg"></i>
          </span>
          <div>
            <p className="text-sm font-semibold text-sky-800">Receta ya surtida</p>
            <p className="text-xs text-sky-600">
              Esta receta fue dispensada el {dispensacionPrevia.fecha} a las {dispensacionPrevia.hora} por {dispensacionPrevia.usuario}
            </p>
            <p className="text-xs text-sky-600">Folio: {dispensacionPrevia.reciboFolio} · Total: ${dispensacionPrevia.total.toFixed(2)}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="lg">
      {/* Header info */}
      <div className="mb-5 pb-4 border-b border-secondary-100">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-10 h-10 flex items-center justify-center rounded-full bg-primary-100 text-primary-600 flex-shrink-0" aria-hidden="true">
                <i className="ri-survey-line"></i>
              </span>
              <div>
                <h3 className="text-base font-semibold text-foreground-900">
                  {pendientesPrevios && pendientesPrevios.length > 0 ? 'Completar dispensación pendiente' : 'Dispensación de medicamentos'}
                </h3>
                <p className="text-2xs text-foreground-400">Folio receta: RX-{receta.urgenciaId ? 'URG-' : ''}{receta.id.replace(/^ru?/, '').padStart(4, '0')}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-2.5 bg-background-50 rounded-lg border border-secondary-100">
            <p className="text-2xs text-foreground-400 mb-0.5">Paciente</p>
            <p className="text-sm font-semibold text-foreground-900">{receta.patientName}</p>
            <p className="text-xs text-foreground-500">{receta.patientExpediente}</p>
          </div>
          <div className="p-2.5 bg-background-50 rounded-lg border border-secondary-100">
            <p className="text-2xs text-foreground-400 mb-0.5">Médico · Diagnóstico</p>
            <p className="text-sm font-semibold text-foreground-900">{receta.doctorName}</p>
            <p className="text-xs text-foreground-500 truncate">{receta.diagnosticoRelacionado}</p>
          </div>
        </div>
      </div>

      {/* Partial banner */}
      {esParcial && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2.5">
            <span className="w-7 h-7 flex items-center justify-center rounded-full bg-amber-100 text-amber-600 flex-shrink-0 mt-0.5">
              <i className="ri-alert-line text-sm"></i>
            </span>
            <div>
              <p className="text-xs font-semibold text-amber-800">Dispensación parcial</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Algunos medicamentos no tienen stock suficiente. Se dispensará lo disponible y el resto quedará como pendiente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pendientes previos banner (when completing a previous partial) */}
      {pendientesPrevios && pendientesPrevios.length > 0 && (
        <div className="mb-4 p-3 bg-primary-500/10 border border-primary-500/20 rounded-lg">
          <div className="flex items-start gap-2.5">
            <span className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 flex-shrink-0 mt-0.5">
              <i className="ri-refresh-line text-sm"></i>
            </span>
            <div>
              <p className="text-xs font-semibold text-blue-800">Completando dispensación anterior</p>
              <p className="text-xs text-blue-600 mt-0.5">
                Se muestran solo los medicamentos que quedaron pendientes en la dispensación anterior.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Medications list */}
      <h4 className="text-xs font-semibold text-foreground-700 mb-3 flex items-center gap-2">
        <i className="ri-capsule-line text-primary-600"></i>
        Medicamentos a dispensar ({lineas.filter((l) => l.cantidadDispensada > 0).length} de {medicamentosADispensar.length})
      </h4>

      <div className="space-y-3 mb-5">
        {medicamentosADispensar.map((m, idx) => {
          const deseada = cantidadesDeseadas[m.prescrito.medicamentoId] || 0;
          const stock = m.inventario?.stock || 0;
          const disponible = Math.min(deseada, stock);
          const faltante = Math.max(0, deseada - stock);
          const precio = m.inventario?.precioVenta || 0;
          const subtotalItem = disponible * precio;
          const isLowStock = stock > 0 && stock <= (m.inventario?.stockMinimo || 5);
          const isOutOfStock = stock === 0;
          const isPartial = faltante > 0;
          const isNearExpiry = m.inventario?.fechaCaducidad && m.inventario.fechaCaducidad < '2026-12-01';

          return (
            <div
              key={m.prescrito.medicamentoId}
              className={`p-3 rounded-lg border transition-base ${
                disponible > 0
                  ? isPartial
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-primary-50/20 border-primary-200'
                  : 'bg-background-50 border-secondary-200 hover:border-secondary-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-2xs font-bold flex-shrink-0 mt-0.5 ${
                    isPartial ? 'bg-amber-100 text-amber-700' : 'bg-secondary-100 text-foreground-500'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground-900">{m.prescrito.nombre}</p>
                      <span className="text-2xs text-foreground-400">{m.prescrito.presentacion} · {m.prescrito.concentracion}</span>
                      {isPartial && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-2xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                          <i className="ri-timer-line text-[10px]"></i>
                          Parcial
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-2xs text-foreground-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <i className="ri-calendar-line"></i>
                        {m.prescrito.dosis} · {m.prescrito.frecuencia}
                      </span>
                      {m.prescrito.duracion && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <i className="ri-timer-line"></i>
                            {m.prescrito.duracion}
                          </span>
                        </>
                      )}
                    </div>
                    {m.prescrito.indicaciones && (
                      <p className="text-xs text-foreground-500 mt-1 italic bg-background-50 p-1.5 rounded border border-secondary-100">
                        {m.prescrito.indicaciones}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-sm font-bold text-foreground-900">${precio.toFixed(2)}</span>
                  <span className="text-2xs text-foreground-400">c/u</span>
                </div>
              </div>

              {/* Stock info */}
              <div className="mt-2.5 ml-8 flex items-center gap-3 flex-wrap">
                <span className={`inline-flex items-center gap-1 text-2xs font-medium px-1.5 py-0.5 rounded ${
                  isOutOfStock
                    ? 'bg-red-100 text-red-700'
                    : isLowStock
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  <i className={`text-[10px] ${isOutOfStock ? 'ri-close-circle-line' : isLowStock ? 'ri-alert-line' : 'ri-check-line'}`}></i>
                  {isOutOfStock ? 'Agotado' : `Stock: ${stock}`}
                </span>
                {isNearExpiry && (
                  <span className="inline-flex items-center gap-1 text-2xs font-medium px-1.5 py-0.5 rounded bg-red-500/10 text-red-500">
                    <i className="ri-timer-flash-line text-[10px]"></i>
                    Caduca: {m.inventario?.fechaCaducidad}
                  </span>
                )}
                <span className="text-2xs text-foreground-400">
                  Lote: {m.inventario?.lote || 'N/A'}
                </span>
              </div>

              {/* Quantity selector */}
              {!isOutOfStock && (
                <>
                  <div className="mt-2.5 ml-8 flex items-center gap-2">
                    <p className="text-2xs text-foreground-400 mr-1" id={`qty-label-${m.prescrito.medicamentoId}`}>Cantidad:</p>
                    <button
                      type="button"
                      onClick={() => updateCantidad(m.prescrito.medicamentoId, -1)}
                      disabled={deseada <= 0}
                      aria-label={`Disminuir cantidad de ${m.prescrito.nombre}`}
                      className="w-7 h-7 flex items-center justify-center rounded-full border border-secondary-200 text-foreground-500 hover:bg-secondary-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-base"
                    >
                      <i className="ri-subtract-line text-xs" aria-hidden="true"></i>
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={deseada}
                      aria-labelledby={`qty-label-${m.prescrito.medicamentoId}`}
                      aria-label={`Cantidad de ${m.prescrito.nombre}`}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setCantidadesDeseadas((prev) => ({
                          ...prev,
                          [m.prescrito.medicamentoId]: Math.max(0, val),
                        }));
                      }}
                      className={`w-14 text-center py-1.5 text-sm font-semibold border rounded-lg outline-none transition-base ${
                        isPartial
                          ? 'bg-amber-500/10 border-amber-500/30 text-foreground-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
                          : 'bg-background-50 border-secondary-200 text-foreground-900 focus:border-primary-400 focus:ring-2 focus:ring-primary-100'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => updateCantidad(m.prescrito.medicamentoId, 1)}
                      aria-label={`Aumentar cantidad de ${m.prescrito.nombre}`}
                      className="w-7 h-7 flex items-center justify-center rounded-full border border-secondary-200 text-foreground-500 hover:bg-secondary-100 cursor-pointer transition-base"
                    >
                      <i className="ri-add-line text-xs" aria-hidden="true"></i>
                    </button>
                    {disponible > 0 && (
                      <span className="text-sm font-bold text-foreground-900 ml-2" aria-live="polite">${subtotalItem.toFixed(2)}</span>
                    )}
                  </div>

                  {/* Partial info: what will be dispensed vs pending */}
                  {isPartial && deseada > 0 && (
                    <div className="mt-1.5 ml-8 flex items-center gap-3 text-2xs">
                      <span className="flex items-center gap-1 text-emerald-700 font-medium">
                        <i className="ri-check-line"></i>
                        Dispensar: {disponible} und.
                      </span>
                      <span className="flex items-center gap-1 text-amber-700 font-medium">
                        <i className="ri-timer-line"></i>
                        Pendiente: {faltante} und.
                      </span>
                    </div>
                  )}
                </>
              )}

              {isOutOfStock && deseada > 0 && (
                <div className="mt-1.5 ml-8 flex items-center gap-2 text-2xs">
                  <span className="flex items-center gap-1 text-red-600 font-medium">
                    <i className="ri-close-circle-line"></i>
                    Sin stock disponible — {deseada} und. quedarán pendientes
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Totals and payment */}
      {subtotal > 0 && (
        <div className="border-t border-secondary-200 pt-4 space-y-3">
          {/* Totals */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-foreground-500">Subtotal (dispensado)</span>
              <span className="font-semibold text-foreground-900">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <label htmlFor="descuento-input" className="text-foreground-500">Descuento</label>
                <button
                  type="button"
                  onClick={() => setShowResumen(!showResumen)}
                  className="text-2xs text-primary-600 hover:text-primary-700 cursor-pointer"
                  aria-expanded={showResumen}
                  aria-controls="descuento-panel"
                >
                  {showResumen ? 'Ocultar' : 'Ajustar'}
                </button>
              </div>
              {showResumen ? (
                <div id="descuento-panel" className="flex items-center gap-1.5">
                  <span className="text-2xs text-foreground-400">$</span>
                  <input
                    id="descuento-input"
                    type="number"
                    min={0}
                    max={subtotal}
                    value={descuento}
                    onChange={(e) => setDescuento(parseFloat(e.target.value) || 0)}
                    aria-label="Monto de descuento en pesos"
                    className="w-20 text-right py-1 px-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base"
                  />
                </div>
              ) : (
                <span className="font-semibold text-red-600">-${descuento.toFixed(2)}</span>
              )}
            </div>
            <div className="flex justify-between text-base pt-2 border-t border-secondary-100">
              <span className="font-semibold text-foreground-800">Total a cobrar</span>
              <span className="font-bold text-foreground-950">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment method */}
          {showResumen && (
            <div className="p-3 bg-background-50 rounded-lg border border-secondary-200 space-y-3">
              <p className="text-xs font-semibold text-foreground-700">Método de pago</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(['efectivo', 'tarjeta', 'transferencia', 'mixto'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMetodoPago(m)}
                    className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium cursor-pointer transition-base whitespace-nowrap ${
                      metodoPago === m
                        ? 'bg-primary-100 text-primary-700 border border-primary-300'
                        : 'bg-background-50 text-foreground-600 border border-secondary-200 hover:border-secondary-300'
                    }`}
                  >
                    <i className={`text-xs ${
                      m === 'efectivo' ? 'ri-cash-line' :
                      m === 'tarjeta' ? 'ri-bank-card-line' :
                      m === 'transferencia' ? 'ri-smartphone-line' : 'ri-exchange-funds-line'
                    }`}></i>
                    {m === 'efectivo' ? 'Efectivo' :
                     m === 'tarjeta' ? 'Tarjeta' :
                     m === 'transferencia' ? 'Transf.' : 'Mixto'}
                  </button>
                ))}
              </div>

              {metodoPago === 'mixto' && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-2xs text-foreground-400">Efectivo</label>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs text-foreground-400">$</span>
                      <input type="number" min={0} value={efectivo || ''} onChange={(e) => setEfectivo(parseFloat(e.target.value) || 0)} className="w-full py-1.5 px-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base" placeholder="0" />
                    </div>
                  </div>
                  <div>
                    <label className="text-2xs text-foreground-400">Tarjeta</label>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs text-foreground-400">$</span>
                      <input type="number" min={0} value={tarjeta || ''} onChange={(e) => setTarjeta(parseFloat(e.target.value) || 0)} className="w-full py-1.5 px-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base" placeholder="0" />
                    </div>
                  </div>
                  <div>
                    <label className="text-2xs text-foreground-400">Transf.</label>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs text-foreground-400">$</span>
                      <input type="number" min={0} value={transferencia || ''} onChange={(e) => setTransferencia(parseFloat(e.target.value) || 0)} className="w-full py-1.5 px-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base" placeholder="0" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action button */}
          <Button
            variant={esParcial ? 'warning' : 'primary'}
            size="lg"
            className="w-full"
            disabled={!canDispense}
            onClick={handleDispensar}
            icon={<i className={esParcial ? 'ri-check-line' : 'ri-check-double-line'}></i>}
          >
            {esParcial ? 'Dispensar disponible ' : 'Dispensar y Cobrar '}${total.toFixed(2)}
          </Button>

          {!canDispense && subtotal > 0 && (
            <p className="text-2xs text-amber-600 text-center">
              Verifica el método de pago
            </p>
          )}

          {esParcial && canDispense && (
            <p className="text-2xs text-amber-600 text-center">
              <i className="ri-information-line"></i> Solo se cobrará lo dispensado. Los pendientes se podrán surtir después.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}