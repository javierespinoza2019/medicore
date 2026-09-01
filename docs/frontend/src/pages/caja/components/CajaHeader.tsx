import type { CashTransaction } from '@/mocks/caja';

interface CajaHeaderProps {
  transactions: CashTransaction[];
  fondoApertura: number;
  usuario: string;
  horaApertura: string;
  estado: 'abierta' | 'cerrada';
  onCerrarCaja: () => void;
  onAbrirCaja: () => void;
}

export default function CajaHeader({
  transactions,
  fondoApertura,
  usuario,
  horaApertura,
  estado,
  onCerrarCaja,
  onAbrirCaja,
}: CajaHeaderProps) {
  const pagadas = transactions.filter(t => t.estado === 'pagado');
  const totalPagado = pagadas.reduce((sum, t) => sum + t.total, 0);

  const methodsSummary = () => {
    let ef = 0; let tj = 0; let tr = 0;
    pagadas.forEach(t => {
      if (t.detallePago) {
        ef += t.detallePago.efectivo || 0;
        tj += t.detallePago.tarjeta || 0;
        tr += t.detallePago.transferencia || 0;
      }
    });
    return { efectivo: ef, tarjeta: tj, transferencia: tr };
  };

  const methods = methodsSummary();

  return (
    <div className="mb-5">
      {/* Session status bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {estado === 'abierta' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Caja abierta — {usuario} · {horaApertura} hrs
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              Caja cerrada
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-foreground-500">Fondo inicial: <strong className="text-foreground-800">${fondoApertura.toLocaleString()} MXN</strong></span>
          {estado === 'abierta' ? (
            <button
              onClick={onCerrarCaja}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-500 bg-red-500/10 hover:bg-red-500/15 rounded-lg transition-base cursor-pointer whitespace-nowrap"
            >
              <i className="ri-door-lock-line"></i> Cerrar Caja
            </button>
          ) : (
            <button
              onClick={onAbrirCaja}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-base cursor-pointer whitespace-nowrap"
            >
              <i className="ri-door-open-line"></i> Abrir Caja
            </button>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-background-50 border border-secondary-200/70 rounded-xl p-3.5">
          <p className="text-[11px] text-foreground-500 font-medium mb-1">Total cobrado hoy</p>
          <p className="text-xl font-bold text-foreground-900 font-heading">${totalPagado.toLocaleString()}</p>
          <p className="text-[10px] text-foreground-400 mt-0.5">{pagadas.length} transacciones</p>
        </div>
        {[
          { label: 'Efectivo', value: methods.efectivo, icon: 'ri-cash-line', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Tarjeta', value: methods.tarjeta, icon: 'ri-bank-card-line', color: 'text-accent-600', bg: 'bg-accent-50' },
          { label: 'Transferencia', value: methods.transferencia, icon: 'ri-smartphone-line', color: 'text-primary-600', bg: 'bg-primary-50' },
          { label: 'Monto en caja', value: totalPagado + fondoApertura, icon: 'ri-safe-2-line', color: 'text-foreground-700', bg: 'bg-secondary-100' },
        ].map((item) => (
          <div key={item.label} className="bg-background-50 border border-secondary-200/70 rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-6 h-6 flex items-center justify-center rounded-md ${item.bg} ${item.color}`}>
                <i className={`${item.icon} text-xs`}></i>
              </span>
              <p className="text-[11px] text-foreground-500 font-medium">{item.label}</p>
            </div>
            <p className="text-lg font-bold text-foreground-900 font-heading">${item.value.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}