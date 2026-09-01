import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { recetas, recetasUrgencia, subscribeRecetasUrgencia, updateRecetaUrgenciaGlobal, type Receta } from '@/mocks/recetas';
import { urgenciaConfig, type NivelUrgencia } from '@/mocks/urgencias';
import { getUrgenciasGlobal } from '@/hooks/useUrgenciasState';
import {
  inventarioFarmacia,
  dispensacionesFarmacia,
  getRecetasActivas,
  getStockBajo,
  getDispensacionesByReceta,
  getMedicamentoInfo,
  type DispensacionFarmacia,
  type MedicamentoDispensado,
  type MedicamentoPendiente,
} from '@/mocks/farmacia';
import { useCaja } from '@/hooks/useCajaContext';
import Card from '@/components/base/Card';
import Badge from '@/components/base/Badge';
import DispensacionForm from '@/pages/farmacia/components/DispensacionForm';
import { exportToExcel } from '@/utils/exportUtils';

const estadoRecetaConfig: Record<Receta['estado'], { label: string; color: string }> = {
  activa: { label: 'Activa', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  surtida: { label: 'Surtida', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  parcial: { label: 'Parcial', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  vencida: { label: 'Vencida', color: 'bg-secondary-100 text-foreground-600 border-secondary-200' },
  cancelada: { label: 'Cancelada', color: 'bg-amber-100 text-amber-700 border-amber-200' },
};

export default function Farmacia() {
  const navigate = useNavigate();
  const { addTransaction } = useCaja();
  const [search, setSearch] = useState('');
  const [recetaSeleccionada, setRecetaSeleccionada] = useState<Receta | null>(null);
  const [recetasState, setRecetasState] = useState<Receta[]>([...recetas, ...recetasUrgencia]);
  const [inventarioState, setInventarioState] = useState([...inventarioFarmacia]);
  const [dispensacionesState, setDispensacionesState] = useState<DispensacionFarmacia[]>([...dispensacionesFarmacia]);
  const [showHistorial, setShowHistorial] = useState(false);
  const [dispensacionExitosa, setDispensacionExitosa] = useState<DispensacionFarmacia | null>(null);
  const [tabFarmacia, setTabFarmacia] = useState<'consulta' | 'urgencias'>('consulta');

  // Mantener sincronizadas las recetas de urgencia creadas en el módulo de Urgencias
  useEffect(() => {
    return subscribeRecetasUrgencia(() => {
      setRecetasState((prev) => {
        const ids = new Set(prev.map((r) => r.id));
        const nuevas = recetasUrgencia.filter((r) => !ids.has(r.id));
        return nuevas.length > 0 ? [...prev, ...nuevas] : prev;
      });
    });
  }, []);

  const getUrgenciaPriorityLevel = useCallback((urgenciaId: string): number => {
    if (!urgenciaId) return 99;
    const urg = getUrgenciasGlobal().find((u) => u.id === urgenciaId);
    if (!urg) return 99;
    const order: NivelUrgencia[] = ['rojo', 'naranja', 'amarillo', 'verde'];
    return order.indexOf(urg.nivelUrgencia);
  }, []);

  const getUrgenciaNivel = useCallback((urgenciaId: string): NivelUrgencia | null => {
    const urg = getUrgenciasGlobal().find((u) => u.id === urgenciaId);
    return urg?.nivelUrgencia || null;
  }, []);

  const recetasActivas = useMemo(() => {
    let list = recetasState.filter((r) => r.estado === 'activa' || r.estado === 'parcial');
    if (tabFarmacia === 'consulta') {
      list = list.filter((r) => !r.urgenciaId);
    } else {
      list = list.filter((r) => !!r.urgenciaId);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.patientName.toLowerCase().includes(q) ||
          r.patientExpediente.toLowerCase().includes(q) ||
          r.doctorName.toLowerCase().includes(q) ||
          r.diagnosticoRelacionado.toLowerCase().includes(q) ||
          r.medicamentos.some((m) => m.nombre.toLowerCase().includes(q))
      );
    }
    if (tabFarmacia === 'urgencias') {
      return list.sort((a, b) => {
        const urgAPrio = getUrgenciaPriorityLevel(a.urgenciaId || '');
        const urgBPrio = getUrgenciaPriorityLevel(b.urgenciaId || '');
        if (urgAPrio !== urgBPrio) return urgAPrio - urgBPrio;
        return b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora);
      });
    }
    return list.sort((a, b) => {
      if (a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha);
      return b.hora.localeCompare(a.hora);
    });
  }, [recetasState, search, tabFarmacia]);

  const recetasSurtidasHoy = useMemo(() => {
    return recetasState.filter((r) => r.estado === 'surtida').length;
  }, [recetasState]);

  const ingresosFarmaciaHoy = useMemo(() => {
    const hoy = new Date().toISOString().split('T')[0];
    return dispensacionesState
      .filter((d) => d.fecha === hoy && d.estado === 'completada')
      .reduce((acc, d) => acc + d.total, 0);
  }, [dispensacionesState]);

  const stockBajoCount = useMemo(() => {
    return inventarioState.filter((inv) => inv.stock <= inv.stockMinimo).length;
  }, [inventarioState]);

  const dispensacionPrevia = useMemo(() => {
    if (!recetaSeleccionada) return null;
    const previas = dispensacionesState.filter((d) => d.recetaId === recetaSeleccionada.id);
    return previas.length > 0 ? previas[previas.length - 1] : null;
  }, [recetaSeleccionada, dispensacionesState]);

  const pendientesPrevios = useMemo((): MedicamentoPendiente[] | null => {
    if (!recetaSeleccionada || recetaSeleccionada.estado !== 'parcial') return null;
    const ultimaDisp = dispensacionPrevia;
    if (ultimaDisp?.pendientes && ultimaDisp.pendientes.length > 0) return ultimaDisp.pendientes;
    if (recetaSeleccionada.medicamentosPendientes && recetaSeleccionada.medicamentosPendientes.length > 0) {
      return recetaSeleccionada.medicamentosPendientes.map((mp) => {
        const medPrescrito = recetaSeleccionada.medicamentos.find((m) => m.medicamentoId === mp.medicamentoId);
        return {
          medicamentoId: mp.medicamentoId,
          nombre: medPrescrito?.nombre || '',
          presentacion: medPrescrito?.presentacion || '',
          concentracion: medPrescrito?.concentracion || '',
          cantidadPendiente: mp.cantidadPendiente,
          cantidadSolicitada: mp.cantidadPendiente,
          dosis: medPrescrito?.dosis || '',
          frecuencia: medPrescrito?.frecuencia || '',
          via: medPrescrito?.via || '',
        };
      });
    }
    return null;
  }, [recetaSeleccionada, dispensacionPrevia]);

  const yaSurtida = recetaSeleccionada?.estado === 'surtida';

  const handleSelectReceta = (r: Receta) => {
    if (recetaSeleccionada?.id === r.id) {
      setRecetaSeleccionada(null);
      setShowHistorial(false);
      setDispensacionExitosa(null);
      return;
    }
    setRecetaSeleccionada(r);
    setShowHistorial(false);
    setDispensacionExitosa(null);
  };

  const handleDispensar = useCallback(
    (data: {
      recetaId: string;
      medicamentos: MedicamentoDispensado[];
      subtotal: number;
      descuento: number;
      total: number;
      metodoPago: 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto';
      detallePago: { efectivo?: number; tarjeta?: number; transferencia?: number };
      pendientes?: MedicamentoPendiente[];
      tipoDispensacion: 'completa' | 'parcial';
    }) => {
      const now = new Date();
      const hora = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const reciboNum = String(dispensacionesState.length + 1).padStart(4, '0');
      const receta = recetasState.find((r) => r.id === data.recetaId);
      const esParcial = data.tipoDispensacion === 'parcial';
      const reciboFolio = `FAR-2026-${reciboNum}`;

      const nuevaDispensacion: DispensacionFarmacia = {
        id: `disp-${Date.now()}`,
        recetaId: data.recetaId,
        consultaId: receta?.consultaId || '',
        patientId: receta?.patientId || '',
        patientName: receta?.patientName || '',
        patientExpediente: receta?.patientExpediente || '',
        doctorName: receta?.doctorName || '',
        medicamentos: data.medicamentos,
        subtotal: data.subtotal,
        descuento: data.descuento,
        total: data.total,
        metodoPago: data.metodoPago,
        detallePago: data.detallePago,
        fecha: new Date().toISOString().split('T')[0],
        hora,
        usuario: 'Laura Torres',
        estado: esParcial ? 'parcial' : 'completada',
        reciboFolio,
        pendientes: esParcial ? data.pendientes : undefined,
      };

      setDispensacionesState((prev) => [nuevaDispensacion, ...prev]);

      // Register payment in caja
      addTransaction({
        pacienteId: receta?.patientId || '',
        paciente: receta?.patientName || '',
        concepto: `Medicamentos - ${data.medicamentos.map(m => m.nombre).join(', ')}`,
        subtotal: data.subtotal,
        descuento: data.descuento,
        total: data.total,
        metodoPago: data.metodoPago,
        detallePago: data.detallePago,
        origen: 'farmacia',
        reciboOrigen: reciboFolio,
        notas: esParcial ? `Dispensación parcial - Receta RX-${data.recetaId.replace(/^ru?/, '').padStart(4, '0')}` : undefined,
      });

      setInventarioState((prev) =>
        prev.map((inv) => {
          const med = data.medicamentos.find((m) => m.medicamentoId === inv.medicamentoId);
          if (med) {
            return { ...inv, stock: inv.stock - med.cantidad, ultimoMovimiento: new Date().toISOString().split('T')[0] };
          }
          return inv;
        })
      );

      setRecetasState((prev) =>
        prev.map((r) => {
          if (r.id !== data.recetaId) return r;
          if (esParcial && data.pendientes) {
            return {
              ...r,
              estado: 'parcial' as const,
              medicamentosPendientes: data.pendientes.map((p) => ({
                medicamentoId: p.medicamentoId,
                cantidadPendiente: p.cantidadPendiente,
              })),
            };
          }
          return { ...r, estado: 'surtida' as const, medicamentosPendientes: undefined };
        })
      );

      // Propaga el cambio de estado a la lista global de recetas de urgencia
      // para que Urgencias y Recetas muestren la receta como surtida/parcial.
      if (receta?.urgenciaId) {
        const updatedReceta: Receta = esParcial && data.pendientes
          ? {
              ...receta,
              estado: 'parcial',
              medicamentosPendientes: data.pendientes.map((p) => ({
                medicamentoId: p.medicamentoId,
                cantidadPendiente: p.cantidadPendiente,
              })),
            }
          : { ...receta, estado: 'surtida', medicamentosPendientes: undefined };
        updateRecetaUrgenciaGlobal(updatedReceta);
      }

      setRecetaSeleccionada((prev) => {
        if (!prev) return null;
        if (esParcial && data.pendientes) {
          return {
            ...prev,
            estado: 'parcial' as const,
            medicamentosPendientes: data.pendientes.map((p) => ({
              medicamentoId: p.medicamentoId,
              cantidadPendiente: p.cantidadPendiente,
            })),
          };
        }
        return { ...prev, estado: 'surtida' as const, medicamentosPendientes: undefined };
      });
      setDispensacionExitosa(nuevaDispensacion);
    },
    [recetasState, dispensacionesState, addTransaction]
  );

  const isSelected = (id: string) => recetaSeleccionada?.id === id;

  const handleExportInventario = () => {
    const data = inventarioState.map((inv) => {
      const medInfo = getMedicamentoInfo(inv.medicamentoId);
      return {
        Medicamento: medInfo.medicamento?.nombre || inv.medicamentoId,
        Presentación: medInfo.medicamento?.presentacion || '—',
        Concentración: medInfo.medicamento?.concentracion || '—',
        Stock: inv.stock,
        'Stock Mínimo': inv.stockMinimo,
        Estado: inv.stock === 0 ? 'Agotado' : inv.stock <= inv.stockMinimo ? 'Stock Bajo' : 'Normal',
        'Precio Venta': inv.precioVenta,
        Lote: inv.lote,
        Caducidad: inv.fechaCaducidad,
        Ubicación: inv.ubicacion,
        'Último Movimiento': inv.ultimoMovimiento,
      };
    });
    const dateStr = new Date().toISOString().split('T')[0];
    exportToExcel(data, `Inventario_Farmacia_MediCore_${dateStr}`, 'Inventario');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={handleExportInventario}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground-600 bg-background-50 border border-secondary-200 rounded-lg hover:bg-secondary-100 transition-base cursor-pointer whitespace-nowrap"
        >
          <i className="ri-file-excel-line"></i>
          Exportar Inventario
        </button>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-0 rounded-lg border border-secondary-200/70 bg-background-50 overflow-hidden">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 border-r border-secondary-200/70">
          <span className="w-5 h-5 flex items-center justify-center rounded text-sm text-amber-600"><i className="ri-timer-flash-line"></i></span>
          <div>
            <p className="text-sm font-bold text-foreground-900">{recetasActivas.length}</p>
            <p className="text-[10px] text-foreground-500 uppercase tracking-wide">Por surtir</p>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 border-r border-secondary-200/70">
          <span className="w-5 h-5 flex items-center justify-center rounded text-sm text-sky-600"><i className="ri-check-double-line"></i></span>
          <div>
            <p className="text-sm font-bold text-foreground-900">{recetasSurtidasHoy}</p>
            <p className="text-[10px] text-foreground-500 uppercase tracking-wide">Surtidas</p>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 border-r border-secondary-200/70">
          <span className="w-5 h-5 flex items-center justify-center rounded text-sm text-emerald-600"><i className="ri-cash-line"></i></span>
          <div>
            <p className="text-sm font-bold text-foreground-900">${ingresosFarmaciaHoy.toFixed(0)}</p>
            <p className="text-[10px] text-foreground-500 uppercase tracking-wide">Ingresos hoy</p>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2">
          <span className={`w-5 h-5 flex items-center justify-center rounded text-sm ${stockBajoCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}><i className={stockBajoCount > 0 ? 'ri-alert-line' : 'ri-shield-check-line'}></i></span>
          <div>
            <p className={`text-sm font-bold ${stockBajoCount > 0 ? 'text-red-700' : 'text-foreground-900'}`}>{stockBajoCount}</p>
            <p className="text-[10px] text-foreground-500 uppercase tracking-wide">Stock bajo</p>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Left: Recetas pendientes */}
        <Card className="w-full lg:w-80 flex-shrink-0" padding="none">
          <div className="p-4 border-b border-secondary-200">
            {/* Tab toggle */}
            <div className="flex items-center gap-1 mb-3 bg-secondary-100 rounded-full p-1">
              <button
                onClick={() => { setTabFarmacia('consulta'); setRecetaSeleccionada(null); setShowHistorial(false); setDispensacionExitosa(null); }}
                className={`flex-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-base cursor-pointer whitespace-nowrap ${
                  tabFarmacia === 'consulta'
                    ? 'bg-background-50 text-foreground-900 shadow-sm'
                    : 'text-foreground-500 hover:text-foreground-700'
                }`}
              >
                <i className="ri-stethoscope-line mr-1"></i>
                Consulta
              </button>
              <button
                onClick={() => { setTabFarmacia('urgencias'); setRecetaSeleccionada(null); setShowHistorial(false); setDispensacionExitosa(null); }}
                className={`flex-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-base cursor-pointer whitespace-nowrap ${
                  tabFarmacia === 'urgencias'
                    ? 'bg-background-50 text-foreground-900 shadow-sm'
                    : 'text-foreground-500 hover:text-foreground-700'
                }`}
              >
                <i className="ri-heart-pulse-line mr-1"></i>
                Urgencias
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
                <i className="ri-search-line text-sm"></i>
              </span>
              <input
                type="search"
                aria-label={tabFarmacia === 'urgencias' ? 'Buscar receta de urgencia' : 'Buscar receta pendiente'}
                placeholder={tabFarmacia === 'urgencias' ? 'Buscar paciente, nivel de urgencia...' : 'Buscar paciente, medicamento...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base"
              />
            </div>
          </div>
          <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
            {recetasActivas.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-foreground-400 px-4 text-center">
                <span className="w-12 h-12 flex items-center justify-center rounded-full bg-secondary-100">
                  <i className={`text-xl ${tabFarmacia === 'urgencias' ? 'ri-heart-pulse-line' : 'ri-capsule-line'}`}></i>
                </span>
                <p className="text-sm font-medium text-foreground-500">
                  {tabFarmacia === 'urgencias' ? 'Sin recetas de urgencia' : 'Sin recetas pendientes'}
                </p>
                <p className="text-xs">
                  {tabFarmacia === 'urgencias'
                    ? 'No hay recetas de urgencia activas para dispensar en este momento.'
                    : 'No hay recetas activas para surtir en este momento.'}
                </p>
              </div>
            ) : (
              recetasActivas.map((r) => {
                const selected = isSelected(r.id);
                const isUrgencia = !!r.urgenciaId;
                const nivelUrg = isUrgencia ? getUrgenciaNivel(r.urgenciaId || '') : null;
                const urgCfg = nivelUrg ? urgenciaConfig[nivelUrg] : null;

                return (
                  <button
                    key={r.id}
                    onClick={() => handleSelectReceta(r)}
                    className={`w-full text-left px-4 py-3 border-b border-secondary-100 transition-base cursor-pointer hover:bg-secondary-50/50 ${
                      selected ? 'bg-primary-50/50 border-l-2 border-l-primary-500' : ''
                    } ${isUrgencia && nivelUrg === 'rojo' ? 'border-l-2 border-l-red-500' : ''} ${
                      !isUrgencia && r.estado === 'parcial' && !selected ? 'border-l-2 border-l-amber-400' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium text-foreground-900 truncate">{r.patientName}</p>
                          {isUrgencia && urgCfg ? (
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-medium ${urgCfg.bg} ${urgCfg.text} ${urgCfg.border} border`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${urgCfg.color}`}></span>
                              {urgCfg.label}
                            </span>
                          ) : r.estado === 'parcial' ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                              <i className="ri-timer-line mr-0.5 text-[10px]"></i>
                              Parcial
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                              Pendiente
                            </span>
                          )}
                        </div>
                        <p className="text-2xs text-foreground-500 mt-0.5">
                          {r.patientExpediente} · {r.fecha} {r.hora}
                        </p>
                        <p className="text-xs text-foreground-600 mt-1 line-clamp-1 flex items-center gap-1">
                          <i className="ri-capsule-line text-foreground-400 text-2xs"></i>
                          {r.medicamentos.length} medicamento{r.medicamentos.length > 1 ? 's' : ''}
                          {r.medicamentosPendientes && r.medicamentosPendientes.length > 0 && (
                            <span className="text-amber-600 ml-1">({r.medicamentosPendientes.length} pend.)</span>
                          )}
                        </p>
                        <p className="text-2xs text-foreground-400 mt-0.5 truncate">{r.doctorName} · {r.diagnosticoRelacionado}</p>
                      </div>
                      <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                        <i className={`text-sm ${isUrgencia && nivelUrg === 'rojo' ? 'text-red-500' : r.estado === 'parcial' ? 'text-amber-500' : 'text-foreground-400'} ${selected ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}`}></i>
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* Right: Detail / Dispensation */}
        <div className="flex-1 min-w-0 w-full">
          {!recetaSeleccionada ? (
            <Card>
              <div className="flex flex-col items-center gap-4 py-20 text-foreground-400">
                <span className="w-16 h-16 flex items-center justify-center rounded-full bg-secondary-100">
                  <i className={`text-3xl ${tabFarmacia === 'urgencias' ? 'ri-heart-pulse-line' : 'ri-capsule-line'}`}></i>
                </span>
                <div className="text-center max-w-sm">
                  <p className="text-base font-medium text-foreground-600 mb-1">
                    {tabFarmacia === 'urgencias' ? 'Selecciona una receta de urgencia' : 'Selecciona una receta pendiente'}
                  </p>
                  <p className="text-sm">
                    {tabFarmacia === 'urgencias'
                      ? 'Elige una receta de urgencia del panel izquierdo para revisar los medicamentos y dispensar de inmediato.'
                      : 'Elige una receta del panel izquierdo para revisar los medicamentos, verificar existencias y proceder con la dispensación.'}
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Receta header info */}
              <Card padding="md">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className={`w-12 h-12 flex items-center justify-center rounded-full text-lg font-bold flex-shrink-0 ${
                      recetaSeleccionada.urgenciaId ? 'bg-red-100 text-red-600' : 'bg-primary-100 text-primary-600'
                    }`}>
                      {recetaSeleccionada.patientName.charAt(0)}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-semibold text-foreground-900">{recetaSeleccionada.patientName}</h3>
                        {recetaSeleccionada.urgenciaId && (() => {
                          const niv = getUrgenciaNivel(recetaSeleccionada.urgenciaId);
                          const urgCfg = niv ? urgenciaConfig[niv] : null;
                          return urgCfg ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium ${urgCfg.bg} ${urgCfg.text} ${urgCfg.border} border`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${urgCfg.color}`}></span>
                              {urgCfg.label}
                            </span>
                          ) : null;
                        })()}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium ${estadoRecetaConfig[recetaSeleccionada.estado].color}`}>
                          {estadoRecetaConfig[recetaSeleccionada.estado].label}
                        </span>
                      </div>
                      <p className="text-xs text-foreground-500">{recetaSeleccionada.patientExpediente} · {recetaSeleccionada.doctorName}</p>
                      <p className="text-xs text-foreground-500">
                        RX-{recetaSeleccionada.urgenciaId ? 'URG-' : ''}{recetaSeleccionada.id.replace(/^ru?/, '').padStart(4, '0')} · {recetaSeleccionada.fecha} · {recetaSeleccionada.hora} hrs
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {recetaSeleccionada.urgenciaId ? (
                      <>
                        <button
                          onClick={() => navigate(`/app/recetas?receta=${recetaSeleccionada.id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-secondary-100 text-foreground-600 rounded-lg hover:bg-secondary-200 transition-base cursor-pointer whitespace-nowrap"
                        >
                          <i className="ri-file-text-line"></i>
                          Ver receta
                        </button>
                        <button
                          onClick={() => navigate(`/app/urgencias`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500/15 transition-base cursor-pointer whitespace-nowrap"
                        >
                          <i className="ri-heart-pulse-line"></i>
                          Ver urgencia
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => navigate(`/app/recetas?receta=${recetaSeleccionada.id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-secondary-100 text-foreground-600 rounded-lg hover:bg-secondary-200 transition-base cursor-pointer whitespace-nowrap"
                        >
                          <i className="ri-file-text-line"></i>
                          Ver receta completa
                        </button>
                        <button
                          onClick={() => navigate(`/app/consultas?paciente=${recetaSeleccionada.patientId}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent-50 text-accent-700 border border-accent-200 rounded-lg hover:bg-accent-100 transition-base cursor-pointer whitespace-nowrap"
                        >
                          <i className="ri-stethoscope-line"></i>
                          Ver consulta
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className={`mt-3 p-2.5 rounded-lg ${
                  recetaSeleccionada.urgenciaId ? 'bg-red-500/10 border border-red-500/20' : 'bg-amber-500/10 border border-amber-500/20'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 flex items-center justify-center rounded flex-shrink-0 ${
                      recetaSeleccionada.urgenciaId ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      <i className={`${recetaSeleccionada.urgenciaId ? 'ri-alert-line' : 'ri-award-line'} text-2xs`}></i>
                    </span>
                    <p className="text-xs font-medium text-foreground-800">{recetaSeleccionada.diagnosticoRelacionado}</p>
                  </div>
                </div>
              </Card>

              {/* Tabs: Dispensar | Historial */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowHistorial(false)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-base cursor-pointer whitespace-nowrap ${
                    !showHistorial
                      ? 'bg-primary-100 text-primary-700 border border-primary-300'
                      : 'bg-secondary-100 text-foreground-500 hover:bg-secondary-200/70'
                  }`}
                >
                  <i className={`${recetaSeleccionada.estado === 'parcial' ? 'ri-refresh-line' : 'ri-capsule-line'} mr-1`}></i>
                  {recetaSeleccionada.estado === 'parcial'
                    ? 'Completar dispensación'
                    : yaSurtida
                    ? 'Detalle dispensación'
                    : 'Dispensar'}
                </button>
                <button
                  onClick={() => setShowHistorial(true)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-base cursor-pointer whitespace-nowrap ${
                    showHistorial
                      ? 'bg-primary-100 text-primary-700 border border-primary-300'
                      : 'bg-secondary-100 text-foreground-500 hover:bg-secondary-200/70'
                  }`}
                >
                  <i className="ri-history-line mr-1"></i>
                  Historial de dispensaciones
                </button>
              </div>

              {showHistorial ? (
                <Card padding="none">
                  <div className="px-5 py-3 border-b border-secondary-200">
                    <h4 className="text-sm font-semibold text-foreground-800 flex items-center gap-2">
                      <i className="ri-history-line text-foreground-400"></i>
                      Historial de dispensaciones de esta receta
                    </h4>
                  </div>
                  <div className="divide-y divide-secondary-100">
                    {getDispensacionesByReceta(recetaSeleccionada.id).length === 0 ? (
                      <div className="px-5 py-8 text-center text-sm text-foreground-400">
                        Esta receta aún no ha sido dispensada.
                      </div>
                    ) : (
                      getDispensacionesByReceta(recetaSeleccionada.id).map((d) => (
                        <div key={d.id} className="px-5 py-4">
                          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-foreground-800">{d.fecha} · {d.hora}</span>
                              <Badge variant="success" size="sm">{d.estado}</Badge>
                              <span className="text-2xs text-foreground-400">{d.reciboFolio}</span>
                            </div>
                            <span className="text-xs font-bold text-foreground-900">${d.total.toFixed(2)}</span>
                          </div>
                          <div className="space-y-1">
                            {d.medicamentos.map((m) => (
                              <div key={m.medicamentoId} className="flex items-center justify-between text-xs text-foreground-600">
                                <span>{m.nombre} {m.concentracion} · {m.presentacion} x{m.cantidad}</span>
                                <span className="font-medium">${m.subtotal.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-2xs text-foreground-400">
                            <span className="flex items-center gap-1">
                              <i className="ri-user-line"></i> {d.usuario}
                            </span>
                            <span className="flex items-center gap-1">
                              <i className={
                                d.metodoPago === 'efectivo' ? 'ri-cash-line' :
                                d.metodoPago === 'tarjeta' ? 'ri-bank-card-line' :
                                d.metodoPago === 'transferencia' ? 'ri-smartphone-line' : 'ri-exchange-funds-line'
                              }></i>
                              {d.metodoPago === 'efectivo' ? 'Efectivo' :
                               d.metodoPago === 'tarjeta' ? 'Tarjeta' :
                               d.metodoPago === 'transferencia' ? 'Transferencia' : 'Mixto'}
                            </span>
                            {d.descuento > 0 && (
                              <span className="text-red-500">Desc. ${d.descuento.toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              ) : (
                <DispensacionForm
                  receta={recetaSeleccionada}
                  onDispensar={handleDispensar}
                  dispensacionPrevia={yaSurtida ? getDispensacionesByReceta(recetaSeleccionada.id)[0] || null : null}
                  pendientesPrevios={pendientesPrevios}
                />
              )}

              {/* Dispensation success banner */}
              {dispensacionExitosa && !showHistorial && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <span className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-600 flex-shrink-0">
                      <i className="ri-check-double-line text-lg"></i>
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-emerald-800">Dispensación completada</p>
                      <p className="text-xs text-emerald-600 mt-0.5">
                        Recibo: {dispensacionExitosa.reciboFolio} · Total cobrado: ${dispensacionExitosa.total.toFixed(2)} · {dispensacionExitosa.metodoPago === 'efectivo' ? 'Efectivo' : dispensacionExitosa.metodoPago === 'tarjeta' ? 'Tarjeta' : dispensacionExitosa.metodoPago === 'transferencia' ? 'Transferencia' : 'Mixto'}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => navigate(`/app/caja`)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-emerald-200 text-emerald-800 rounded-lg hover:bg-emerald-300 transition-base cursor-pointer whitespace-nowrap"
                        >
                          <i className="ri-cash-line"></i> Ver en Caja
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Low stock alerts for this receta */}
              {recetaSeleccionada && !yaSurtida && (
                <StockAlertsReceta
                  medicamentoIds={recetaSeleccionada.medicamentos.map((m) => m.medicamentoId)}
                  inventario={inventarioState}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StockAlertsReceta({
  medicamentoIds,
  inventario,
}: {
  medicamentoIds: string[];
  inventario: typeof inventarioFarmacia;
}) {
  const alertas = medicamentoIds
    .map((id) => {
      const info = getMedicamentoInfo(id);
      const inv = inventario.find((i) => i.medicamentoId === id);
      return { nombre: info.medicamento?.nombre || 'Desconocido', inv };
    })
    .filter((a) => a.inv && a.inv.stock <= a.inv.stockMinimo);

  if (alertas.length === 0) return null;

  return (
    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
      <div className="flex items-start gap-2.5">
        <span className="w-7 h-7 flex items-center justify-center rounded-full bg-red-100 text-red-600 flex-shrink-0 mt-0.5">
          <i className="ri-alert-line text-sm"></i>
        </span>
        <div>
          <p className="text-xs font-semibold text-red-800">Alerta de inventario</p>
          <p className="text-xs text-red-600 mt-0.5">
            Los siguientes medicamentos de esta receta tienen stock bajo o agotado:
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {alertas.map((a) => (
              <span key={a.inv!.id} className="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-medium bg-red-100 text-red-700 rounded-full">
                <i className={a.inv!.stock === 0 ? 'ri-close-circle-line' : 'ri-alert-line'}></i>
                {a.nombre}: {a.inv!.stock === 0 ? 'Agotado' : `${a.inv!.stock} und.`}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}