import { useState, useMemo } from 'react';
import Button from '@/components/base/Button';
import { cortesHistorial } from '@/mocks/caja';
import type { CorteCaja } from '@/mocks/caja';
import { exportToExcel } from '@/utils/exportUtils';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/feature/PaginationControls';
import { useSort } from '@/hooks/useSort';

export default function CortesCaja() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterUser, setFilterUser] = useState<string>('');

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const filtered = useMemo(() => {
    let result = cortesHistorial;
    if (filterMonth) {
      result = result.filter(c => c.fecha.startsWith(filterMonth));
    }
    if (filterUser) {
      result = result.filter(c => c.usuario === filterUser);
    }
    return result;
  }, [filterMonth, filterUser]);

  const sorters = useMemo(() => ({
    fecha: (a: CorteCaja, b: CorteCaja) => a.fecha.localeCompare(b.fecha),
    usuario: (a: CorteCaja, b: CorteCaja) => a.usuario.localeCompare(b.usuario),
    horario: (a: CorteCaja, b: CorteCaja) => a.horaApertura.localeCompare(b.horaApertura),
    transacciones: (a: CorteCaja, b: CorteCaja) => a.cantidadTransacciones - b.cantidadTransacciones,
    total: (a: CorteCaja, b: CorteCaja) => a.totalIngresos - b.totalIngresos,
  }), []);

  const { sortedData, sortKey, direction, toggleSort } = useSort(filtered, sorters, 'fecha', 'desc');

  const pagination = usePagination(sortedData, 10);

  const totalGeneral = filtered.reduce((sum, c) => sum + c.totalIngresos, 0);
  const totalTransacciones = filtered.reduce((sum, c) => sum + c.cantidadTransacciones, 0);
  const totalEfectivo = filtered.reduce((sum, c) => sum + c.totalEfectivo, 0);
  const totalTarjeta = filtered.reduce((sum, c) => sum + c.totalTarjeta, 0);
  const totalTransferencia = filtered.reduce((sum, c) => sum + c.totalTransferencia, 0);
  const totalCanceladas = filtered.reduce((sum, c) => sum + c.canceladas, 0);
  const totalReembolsos = filtered.reduce((sum, c) => sum + c.reembolsos, 0);
  const totalMontoApertura = filtered.reduce((sum, c) => sum + c.montoApertura, 0);
  const totalMontoCierre = filtered.reduce((sum, c) => sum + c.montoCierre, 0);
  const totalDiferencia = filtered.reduce((sum, c) => sum + c.diferencia, 0);
  const ingresosCuadran = totalEfectivo + totalTarjeta + totalTransferencia === totalGeneral;
  const cierreCuadra = totalMontoApertura + totalGeneral + totalDiferencia === totalMontoCierre;
  const cuadra = ingresosCuadran && cierreCuadra;

  const uniqueUsers = useMemo(() =>
    [...new Set(cortesHistorial.map(c => c.usuario))],
  []);

  const uniqueMonths = useMemo(() =>
    [...new Set(cortesHistorial.map(c => c.fecha.substring(0, 7)))].sort().reverse(),
  []);

  // ─── Export ───
  const handleExport = () => {
    const rows = filtered.map((c) => ({
      Fecha: new Date(c.fecha + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }),
      Usuario: c.usuario,
      'Hora Apertura': c.horaApertura,
      'Hora Cierre': c.horaCierre,
      Transacciones: c.cantidadTransacciones,
      'Total Efectivo': c.totalEfectivo,
      'Total Tarjeta': c.totalTarjeta,
      'Total Transferencia': c.totalTransferencia,
      'Total Ingresos': c.totalIngresos,
      Canceladas: c.canceladas,
      Reembolsos: c.reembolsos,
      'Fondo Inicial': c.montoApertura,
      'Monto Cierre': c.montoCierre,
      Diferencia: c.diferencia,
      'Sesión ID': c.sesionId,
      Observaciones: c.observaciones || '',
    }));
    const dateStr = new Date().toISOString().split('T')[0];
    exportToExcel(rows, `Cortes_Caja_MediCore_${dateStr}`, 'Cortes de Caja');
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-end mb-4 flex-wrap gap-3">
        <Button variant="secondary" size="sm" onClick={handleExport}>
          <i className="ri-download-2-line"></i> Exportar
        </Button>
      </div>

      {/* Summary cards */}
      <div className="flex items-center gap-0 rounded-lg border border-secondary-200/70 bg-background-50 overflow-hidden mb-4">
        {[
          { label: 'Cortes realizados', value: filtered.length, icon: 'ri-file-chart-line', color: 'text-primary-600' },
          { label: 'Transacciones', value: totalTransacciones, icon: 'ri-swap-box-line', color: 'text-accent-600' },
          { label: 'Ingresos totales', value: `$${totalGeneral.toLocaleString()}`, icon: 'ri-money-dollar-circle-line', color: 'text-emerald-600' },
          { label: 'Promedio por corte', value: `$${filtered.length > 0 ? Math.round(totalGeneral / filtered.length).toLocaleString() : '0'}`, icon: 'ri-line-chart-line', color: 'text-amber-500' },
        ].map((stat, i, arr) => (
          <div key={stat.label} className={`flex-1 flex items-center gap-2 px-3 py-2 ${i < arr.length - 1 ? 'border-r border-secondary-200/70' : ''}`}>
            <span className={`w-5 h-5 flex items-center justify-center text-sm ${stat.color}`}>
              <i className={stat.icon}></i>
            </span>
            <div>
              <p className="text-sm font-bold text-foreground-900 font-heading">{stat.value}</p>
              <p className="text-[10px] text-foreground-500 uppercase tracking-wide">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Conciliación de indicadores */}
      <div className="bg-background-50 border border-secondary-200/70 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h4 className="text-sm font-semibold text-foreground-800 font-heading flex items-center gap-1.5">
            <span className="w-5 h-5 flex items-center justify-center text-primary-600">
              <i className="ri-scales-3-line"></i>
            </span>
            Conciliación de indicadores
          </h4>
          <span className={`text-[11px] font-medium px-2 py-1 rounded-full flex items-center gap-1 ${cuadra ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
            <i className={cuadra ? 'ri-checkbox-circle-line' : 'ri-error-warning-line'}></i>
            {cuadra ? 'Cuadra' : 'Descuadre'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Ingresos por método */}
          <div className="rounded-lg border border-secondary-200/70 p-3.5 bg-secondary-50/30">
            <h5 className="text-[11px] font-semibold text-foreground-500 uppercase tracking-wide mb-2">Ingresos por método</h5>
            <div className="space-y-2">
              {[
                { label: 'Efectivo', value: totalEfectivo, icon: 'ri-cash-line', color: 'text-emerald-600' },
                { label: 'Tarjeta', value: totalTarjeta, icon: 'ri-bank-card-line', color: 'text-accent-600' },
                { label: 'Transferencia', value: totalTransferencia, icon: 'ri-smartphone-line', color: 'text-primary-600' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className={`w-4 h-4 flex items-center justify-center ${item.color}`}>
                    <i className={item.icon}></i>
                  </span>
                  <span className="text-xs text-foreground-600 flex-1">{item.label}</span>
                  <span className="text-xs font-semibold text-foreground-800">${item.value.toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t border-secondary-200/70 pt-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground-700 flex items-center gap-1">
                  Total
                  {ingresosCuadran ? <i className="ri-check-line text-emerald-600"></i> : <i className="ri-error-warning-line text-red-500"></i>}
                </span>
                <span className="text-xs font-bold text-foreground-900">${totalGeneral.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Movimientos */}
          <div className="rounded-lg border border-secondary-200/70 p-3.5 bg-secondary-50/30">
            <h5 className="text-[11px] font-semibold text-foreground-500 uppercase tracking-wide mb-2">Movimientos</h5>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-foreground-600">Completadas</span>
                <span className="text-xs font-semibold text-emerald-600">{totalTransacciones}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-foreground-600">Canceladas</span>
                <span className="text-xs font-semibold text-red-500">{totalCanceladas}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-foreground-600">Reembolsos</span>
                <span className="text-xs font-semibold text-amber-500">{totalReembolsos}</span>
              </div>
              <div className="border-t border-secondary-200/70 pt-2 flex justify-between">
                <span className="text-xs text-foreground-600">Ticket promedio</span>
                <span className="text-xs font-semibold text-foreground-800">
                  ${totalTransacciones > 0 ? Math.round(totalGeneral / totalTransacciones).toLocaleString() : '0'}
                </span>
              </div>
            </div>
          </div>

          {/* Cuadre de cierre */}
          <div className="rounded-lg border border-secondary-200/70 p-3.5 bg-secondary-50/30">
            <h5 className="text-[11px] font-semibold text-foreground-500 uppercase tracking-wide mb-2">Cuadre de cierre</h5>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-foreground-600">Fondo inicial</span>
                <span className="text-xs text-foreground-700">${totalMontoApertura.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-foreground-600">Ingresos</span>
                <span className="text-xs text-foreground-700">${totalGeneral.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-foreground-600">Diferencia</span>
                <span className={`text-xs font-semibold ${totalDiferencia === 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {totalDiferencia === 0 ? 'Sin diferencia' : `$${totalDiferencia.toLocaleString()}`}
                </span>
              </div>
              <div className="border-t border-secondary-200/70 pt-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground-700 flex items-center gap-1">
                  Monto cierre
                  {cierreCuadra ? <i className="ri-check-line text-emerald-600"></i> : <i className="ri-error-warning-line text-red-500"></i>}
                </span>
                <span className="text-xs font-bold text-foreground-900">${totalMontoCierre.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 text-xs bg-background-50 border border-secondary-200 rounded-lg outline-none focus:border-primary-400 cursor-pointer text-foreground-700"
          >
            <option value="">Todos los meses</option>
            {uniqueMonths.map(m => (
              <option key={m} value={m}>
                {new Date(m + '-01').toLocaleDateString('es-MX', { year: 'numeric', month: 'long' })}
              </option>
            ))}
          </select>
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground-400 pointer-events-none">
            <i className="ri-arrow-down-s-line text-xs"></i>
          </span>
        </div>

        <div className="relative">
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 text-xs bg-background-50 border border-secondary-200 rounded-lg outline-none focus:border-primary-400 cursor-pointer text-foreground-700"
          >
            <option value="">Todos los usuarios</option>
            {uniqueUsers.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground-400 pointer-events-none">
            <i className="ri-arrow-down-s-line text-xs"></i>
          </span>
        </div>

        {(filterMonth || filterUser) && (
          <button
            onClick={() => { setFilterMonth(''); setFilterUser(''); }}
            className="text-[11px] text-primary-600 hover:text-primary-700 font-medium cursor-pointer whitespace-nowrap"
          >
            <i className="ri-close-line"></i> Limpiar filtros
          </button>
        )}
      </div>

      {/* Cortes list */}
      <div className="bg-background-50 border border-secondary-200/70 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-5 py-2 border-b border-secondary-200/70 bg-secondary-50/50 text-[11px] font-semibold text-foreground-500 uppercase tracking-wider">
          <div className="col-span-2">
            <CorteSortHeader label="Fecha" sortKeyName="fecha" sortKey={sortKey} direction={direction} onSort={toggleSort} />
          </div>
          <div className="col-span-2">
            <CorteSortHeader label="Usuario" sortKeyName="usuario" sortKey={sortKey} direction={direction} onSort={toggleSort} />
          </div>
          <div className="col-span-3">
            <CorteSortHeader label="Horario" sortKeyName="horario" sortKey={sortKey} direction={direction} onSort={toggleSort} />
          </div>
          <div className="col-span-2">
            <CorteSortHeader label="Transacciones" sortKeyName="transacciones" sortKey={sortKey} direction={direction} onSort={toggleSort} align="right" />
          </div>
          <div className="col-span-2">
            <CorteSortHeader label="Total ingresos" sortKeyName="total" sortKey={sortKey} direction={direction} onSort={toggleSort} align="right" />
          </div>
          <div className="col-span-1"></div>
        </div>

        <div className="divide-y divide-secondary-100">
          {pagination.paginatedData.map((corte) => (
            <div key={corte.id}>
              <button
                onClick={() => toggleExpand(corte.id)}
                className="w-full grid grid-cols-12 gap-3 px-5 py-2 text-left hover:bg-secondary-50/50 transition-base cursor-pointer items-center"
              >
                <div className="col-span-2">
                  <p className="text-xs font-semibold text-foreground-800">
                    {new Date(corte.fecha + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                  </p>
                  <p className="text-[10px] text-foreground-400">Sesión {corte.sesionId.split('-')[1]}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-medium text-foreground-700">{corte.usuario}</p>
                </div>
                <div className="col-span-3">
                  <p className="text-xs text-foreground-600">{corte.horaApertura} – {corte.horaCierre} hrs</p>
                  <p className="text-[10px] text-foreground-400">Fondo: ${corte.montoApertura.toLocaleString()}</p>
                </div>
                <div className="col-span-2 text-right">
                  <p className="text-xs font-semibold text-foreground-800">{corte.cantidadTransacciones}</p>
                  {corte.canceladas > 0 && (
                    <p className="text-[10px] text-red-500">{corte.canceladas} cancel.</p>
                  )}
                </div>
                <div className="col-span-2 text-right">
                  <p className="text-sm font-bold text-foreground-900 font-heading">${corte.totalIngresos.toLocaleString()}</p>
                </div>
                <div className="col-span-1 flex justify-end">
                  <span className={`w-5 h-5 flex items-center justify-center transition-transform ${expandedId === corte.id ? 'rotate-180' : ''}`}>
                    <i className="ri-arrow-down-s-line text-foreground-400"></i>
                  </span>
                </div>
              </button>

              {expandedId === corte.id && (
                <div className="px-5 pb-4 pt-1 bg-secondary-50/30 border-t border-secondary-100">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-background-50 border border-secondary-200/70 rounded-lg p-3.5">
                      <h4 className="text-[11px] font-semibold text-foreground-500 mb-2">Desglose por método de pago</h4>
                      <div className="space-y-2">
                        {[
                          { label: 'Efectivo', value: corte.totalEfectivo, icon: 'ri-cash-line', pct: corte.totalIngresos > 0 ? Math.round((corte.totalEfectivo / corte.totalIngresos) * 100) : 0 },
                          { label: 'Tarjeta', value: corte.totalTarjeta, icon: 'ri-bank-card-line', pct: corte.totalIngresos > 0 ? Math.round((corte.totalTarjeta / corte.totalIngresos) * 100) : 0 },
                          { label: 'Transferencia', value: corte.totalTransferencia, icon: 'ri-smartphone-line', pct: corte.totalIngresos > 0 ? Math.round((corte.totalTransferencia / corte.totalIngresos) * 100) : 0 },
                        ].map(item => (
                          <div key={item.label} className="flex items-center gap-2">
                            <span className="w-4 h-4 flex items-center justify-center text-foreground-400">
                              <i className={`${item.icon} text-sm`}></i>
                            </span>
                            <span className="text-xs text-foreground-600 flex-1">{item.label}</span>
                            <span className="text-xs font-semibold text-foreground-800">${item.value.toLocaleString()}</span>
                            <span className="text-[10px] text-foreground-400 w-8 text-right">{item.pct}%</span>
                          </div>
                        ))}
                        <div className="border-t border-secondary-200/70 pt-2 flex justify-between">
                          <span className="text-xs font-semibold text-foreground-700">Total</span>
                          <span className="text-xs font-bold text-foreground-900">${corte.totalIngresos.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-background-50 border border-secondary-200/70 rounded-lg p-3.5">
                      <h4 className="text-[11px] font-semibold text-foreground-500 mb-2">Resumen de operaciones</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-xs text-foreground-600">Completadas</span>
                          <span className="text-xs font-semibold text-emerald-600">{corte.cantidadTransacciones}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-foreground-600">Canceladas</span>
                          <span className="text-xs font-semibold text-red-500">{corte.canceladas}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-foreground-600">Reembolsos</span>
                          <span className="text-xs font-semibold text-amber-500">{corte.reembolsos}</span>
                        </div>
                        <div className="border-t border-secondary-200/70 pt-2 flex justify-between">
                          <span className="text-xs text-foreground-600">Ticket promedio</span>
                          <span className="text-xs font-semibold text-foreground-800">
                            ${corte.cantidadTransacciones > 0 ? Math.round(corte.totalIngresos / corte.cantidadTransacciones).toLocaleString() : '0'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-background-50 border border-secondary-200/70 rounded-lg p-3.5">
                      <h4 className="text-[11px] font-semibold text-foreground-500 mb-2">Detalles del cierre</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-xs text-foreground-600">Fondo inicial</span>
                          <span className="text-xs text-foreground-700">${corte.montoApertura.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-foreground-600">Monto cierre</span>
                          <span className="text-xs font-bold text-foreground-800">${corte.montoCierre.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-foreground-600">Diferencia</span>
                          <span className={`text-xs font-semibold ${corte.diferencia === 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {corte.diferencia === 0 ? 'Sin diferencia' : `$${corte.diferencia.toLocaleString()}`}
                          </span>
                        </div>
                        {corte.observaciones && (
                          <div className="border-t border-secondary-200/70 pt-2">
                            <span className="text-[10px] text-foreground-400">Observaciones</span>
                            <p className="text-[11px] text-foreground-600 mt-0.5 leading-relaxed">{corte.observaciones}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <PaginationControls {...pagination} />
      </div>

      {filtered.length === 0 && (
        <div className="bg-background-50 border border-secondary-200/70 rounded-xl py-16 text-center">
          <span className="w-14 h-14 flex items-center justify-center mx-auto mb-4 rounded-full bg-secondary-100 text-foreground-400">
            <i className="ri-file-chart-line text-2xl"></i>
          </span>
          <p className="text-sm font-semibold text-foreground-500">No se encontraron cortes</p>
          <p className="text-xs text-foreground-400 mt-1">
            {filterMonth || filterUser ? 'Prueba ajustando los filtros.' : 'Los cortes aparecerán aquí cuando se cierre la caja por primera vez.'}
          </p>
        </div>
      )}
    </div>
  );
}

function CorteSortHeader({
  label,
  sortKeyName,
  sortKey,
  direction,
  onSort,
  align = 'left',
}: {
  label: string;
  sortKeyName: string;
  sortKey: string | null;
  direction: 'asc' | 'desc';
  onSort: (key: string) => void;
  align?: 'left' | 'right';
}) {
  const isActive = sortKey === sortKeyName;
  const icon = !isActive
    ? 'ri-arrow-up-down-line'
    : direction === 'asc'
      ? 'ri-arrow-up-line'
      : 'ri-arrow-down-line';

  return (
    <button
      type="button"
      onClick={() => onSort(sortKeyName)}
      aria-sort={!isActive ? 'none' : direction === 'asc' ? 'ascending' : 'descending'}
      className={`w-full flex items-center gap-1 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap transition-base text-[11px] font-semibold ${
        align === 'right' ? 'justify-end' : 'justify-start'
      } ${isActive ? 'text-foreground-900' : 'text-foreground-500 hover:text-foreground-700'}`}
    >
      <span>{label}</span>
      <span className="w-3 h-3 flex items-center justify-center shrink-0" aria-hidden="true">
        <i className={`${icon} text-2xs`}></i>
      </span>
    </button>
  );
}