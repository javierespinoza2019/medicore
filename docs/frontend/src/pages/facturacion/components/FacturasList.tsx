import { useState, useMemo } from 'react';
import Badge from '@/components/base/Badge';
import Input from '@/components/base/Input';
import Select from '@/components/base/Select';
import { exportToExcel } from '@/utils/exportUtils';
import type { FacturaCFDI } from '@/mocks/facturacion';

interface FacturasListProps {
  facturas: FacturaCFDI[];
  onView: (factura: FacturaCFDI) => void;
  onCancelar: (factura: FacturaCFDI) => void;
}

function formatMoney(value: number): string {
  return `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function FacturasList({ facturas, onView, onCancelar }: FacturasListProps) {
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');

  const filtered = useMemo(() => {
    let result = facturas;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (f) =>
          f.nombreReceptor.toLowerCase().includes(q) ||
          f.rfcReceptor.toLowerCase().includes(q) ||
          `${f.serie}-${f.folio}`.toLowerCase().includes(q) ||
          f.uuid.toLowerCase().includes(q),
      );
    }
    if (filterEstado) result = result.filter((f) => f.estado === filterEstado);
    return result;
  }, [facturas, search, filterEstado]);

  const totalFacturado = filtered
    .filter((f) => f.estado === 'vigente')
    .reduce((s, f) => s + f.total, 0);

  const handleExport = () => {
    exportToExcel(
      filtered.map((f) => ({
        Serie: f.serie,
        Folio: f.folio,
        UUID: f.uuid,
        Fecha: formatDate(f.fechaEmision),
        Receptor: f.nombreReceptor,
        RFC: f.rfcReceptor,
        UsoCFDI: f.usoCfdi,
        MetodoPago: f.metodoPago,
        FormaPago: f.formaPago,
        Subtotal: f.subtotal,
        Descuento: f.descuento,
        IVA: f.impuestos.traslados.reduce((s, t) => s + t.importe, 0),
        Total: f.total,
        Estado: f.estado,
      })),
      'facturas-cfdi',
      'Facturas',
    );
  };

  return (
    <div className="bg-background-50 border border-secondary-200/70 rounded-xl overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-secondary-200/70">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground-900 font-heading">
            Facturas emitidas
            <span className="ml-2 text-xs font-normal text-foreground-400">{facturas.length} en total</span>
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground-800">
              {formatMoney(totalFacturado)} MXN
            </span>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-primary-700 bg-primary-100/70 hover:bg-primary-100 rounded-lg transition-base cursor-pointer whitespace-nowrap"
            >
              <span className="w-3.5 h-3.5 flex items-center justify-center">
                <i className="ri-file-excel-2-line text-xs"></i>
              </span>
              Exportar
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              placeholder="Buscar por receptor, RFC, folio o UUID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon="ri-search-line"
              className="text-[11px] py-1.5"
            />
          </div>
          <Select
            options={[
              { value: '', label: 'Todos' },
              { value: 'vigente', label: 'Vigentes' },
              { value: 'cancelada', label: 'Canceladas' },
            ]}
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="!w-[130px] text-[11px]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-foreground-400">
            <span className="w-12 h-12 flex items-center justify-center rounded-full bg-secondary-100 mb-3">
              <i className="ri-file-shield-2-line text-xl"></i>
            </span>
            <p className="text-xs">No hay facturas que mostrar</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-secondary-50/95 backdrop-blur">
              <tr className="text-[11px] text-foreground-500 font-semibold">
                <th className="px-5 py-2.5">Folio</th>
                <th className="px-3 py-2.5">Fecha</th>
                <th className="px-3 py-2.5">Receptor</th>
                <th className="px-3 py-2.5">Uso CFDI</th>
                <th className="px-3 py-2.5">Forma de pago</th>
                <th className="px-3 py-2.5 text-right">Total</th>
                <th className="px-3 py-2.5">Estado</th>
                <th className="px-3 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {filtered.map((f) => (
                <tr key={f.id} className="hover:bg-secondary-50/70 transition-base group">
                  <td className="px-5 py-3">
                    <p className="text-xs font-semibold text-foreground-800 font-mono">{f.serie}-{f.folio}</p>
                    <p className="text-[10px] text-foreground-400 font-mono truncate max-w-[180px]">{f.uuid.slice(0, 18)}…</p>
                  </td>
                  <td className="px-3 py-3 text-xs text-foreground-600 whitespace-nowrap">{formatDate(f.fechaEmision)}</td>
                  <td className="px-3 py-3">
                    <p className="text-xs font-medium text-foreground-800 truncate max-w-[200px]">{f.nombreReceptor}</p>
                    <p className="text-[10px] text-foreground-400">{f.rfcReceptor}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded bg-secondary-100 text-secondary-900 text-[10px] font-semibold">
                      {f.usoCfdi}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-foreground-600 whitespace-nowrap">{f.formaPago}</td>
                  <td className="px-3 py-3 text-right">
                    <p className={`text-sm font-bold font-heading ${f.estado === 'vigente' ? 'text-foreground-900' : 'text-foreground-400 line-through'}`}>
                      {formatMoney(f.total)}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant={f.estado === 'vigente' ? 'success' : 'danger'} size="sm" dot>
                      {f.estado === 'vigente' ? 'Vigente' : 'Cancelada'}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onView(f)}
                        title="Ver CFDI"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-foreground-400 hover:text-primary-700 hover:bg-primary-100 transition-base cursor-pointer"
                      >
                        <i className="ri-eye-line text-sm"></i>
                      </button>
                      {f.estado === 'vigente' && (
                        <button
                          onClick={() => onCancelar(f)}
                          title="Cancelar CFDI"
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-foreground-400 hover:text-red-500 hover:bg-red-500/10 transition-base cursor-pointer"
                        >
                          <i className="ri-close-circle-line text-sm"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}