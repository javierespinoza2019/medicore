import { useState, useMemo } from 'react';
import Badge from '@/components/base/Badge';
import Input from '@/components/base/Input';
import Select from '@/components/base/Select';
import { paymentMethodConfig, transactionStatusConfig } from '@/mocks/caja';
import type { CashTransaction } from '@/mocks/caja';

interface TransaccionesListProps {
  transactions: CashTransaction[];
  onSelectTransaction: (transaction: CashTransaction) => void;
}

export default function TransaccionesList({ transactions, onSelectTransaction }: TransaccionesListProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMethod, setFilterMethod] = useState('');

  const filtered = useMemo(() => {
    let result = transactions;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t => t.paciente.toLowerCase().includes(q) || t.concepto.toLowerCase().includes(q) || t.recibo.toLowerCase().includes(q));
    }
    if (filterStatus) result = result.filter(t => t.estado === filterStatus);
    if (filterMethod) result = result.filter(t => t.metodoPago === filterMethod);
    return result;
  }, [transactions, search, filterStatus, filterMethod]);

  const totalFiltrado = filtered.filter(t => t.estado === 'pagado').reduce((sum, t) => sum + t.total, 0);

  return (
    <div className="bg-background-50 border border-secondary-200/70 rounded-xl overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-secondary-200/70">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground-900 font-heading">
            Transacciones de Hoy
            <span className="ml-2 text-xs font-normal text-foreground-400">{transactions.length} en total</span>
          </h2>
          <span className="text-xs font-semibold text-foreground-800">
            ${totalFiltrado.toLocaleString()} MXN
          </span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon="ri-search-line"
              className="text-[11px] py-1.5"
            />
          </div>
          <Select
            options={[
              { value: '', label: 'Todos' },
              { value: 'pagado', label: 'Pagado' },
              { value: 'cancelado', label: 'Cancelado' },
              { value: 'reembolsado', label: 'Reembolsado' },
            ]}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="!w-[100px] text-[11px]"
          />
          <Select
            options={[
              { value: '', label: 'Método' },
              { value: 'efectivo', label: 'Efectivo' },
              { value: 'tarjeta', label: 'Tarjeta' },
              { value: 'transferencia', label: 'Transferencia' },
              { value: 'mixto', label: 'Mixto' },
            ]}
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="!w-[100px] text-[11px]"
          />
        </div>
      </div>

      {/* Transactions list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-secondary-100">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-foreground-400">
            <span className="w-12 h-12 flex items-center justify-center rounded-full bg-secondary-100 mb-3">
              <i className="ri-receipt-line text-xl"></i>
            </span>
            <p className="text-xs">No hay transacciones que mostrar</p>
          </div>
        ) : (
          filtered.map(trx => {
            const methodConf = paymentMethodConfig[trx.metodoPago];
            const statusConf = transactionStatusConfig[trx.estado];

            return (
              <button
                key={trx.id}
                onClick={() => onSelectTransaction(trx)}
                className="w-full flex items-start gap-3 px-5 py-3 text-left hover:bg-secondary-50/70 transition-base cursor-pointer group"
              >
                {/* Method icon */}
                <div className={`w-8 h-8 flex items-center justify-center rounded-lg shrink-0 mt-0.5 ${
                  trx.estado === 'pagado' ? 'bg-secondary-100' : 'bg-red-500/10'
                }`}>
                  <i className={`${methodConf.icon} ${trx.estado === 'pagado' ? methodConf.color : 'text-red-400'} text-sm`}></i>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-semibold text-foreground-800 truncate">{trx.paciente}</span>
                    <Badge variant={statusConf.variant} size="sm" dot>{statusConf.label}</Badge>
                  </div>
                  <p className="text-[11px] text-foreground-500 truncate">{trx.concepto}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] text-foreground-400">{trx.hora} hrs</span>
                    <span className="text-[10px] text-foreground-300">·</span>
                    <span className="text-[10px] text-foreground-400">{trx.recibo}</span>
                    {trx.consultaDoctor && (
                      <>
                        <span className="text-[10px] text-foreground-300">·</span>
                        <span className="text-[10px] text-foreground-400 truncate max-w-[180px]">{trx.consultaDoctor}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold font-heading ${trx.estado === 'pagado' ? 'text-foreground-900' : 'text-red-500 line-through'}`}>
                    ${trx.total.toLocaleString()}
                  </p>
                  {trx.descuento > 0 && (
                    <p className="text-[10px] text-emerald-600">-${trx.descuento} desc.</p>
                  )}
                </div>

                {/* Arrow on hover */}
                <span className="hidden group-hover:flex w-5 h-5 items-center justify-center text-foreground-300 shrink-0 mt-1">
                  <i className="ri-arrow-right-s-line"></i>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}