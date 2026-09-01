import { reportesFinancieros, currency } from '@/mocks/reportes';
import Card from '@/components/base/Card';
import Badge from '@/components/base/Badge';
import Button from '@/components/base/Button';
import { exportToExcel } from '@/utils/exportUtils';

export default function FinancierosTab() {
  const { kpis, ingresosPorServicio, cortes } = reportesFinancieros;

  const metodoCards = [
    { label: 'Efectivo', value: kpis.efectivo, icon: 'ri-cash-line', color: 'text-emerald-600 bg-emerald-100' },
    { label: 'Tarjeta', value: kpis.tarjeta, icon: 'ri-bank-card-line', color: 'text-accent-600 bg-accent-100' },
    { label: 'Transferencia', value: kpis.transferencia, icon: 'ri-smartphone-line', color: 'text-primary-600 bg-primary-100' },
  ];

  const maxServicio = ingresosPorServicio.length > 0 ? ingresosPorServicio[0].total : 1;

  const handleExport = () => {
    const rows = ingresosPorServicio.map((s) => ({
      Servicio: s.servicio,
      Transacciones: s.transacciones,
      'Ingreso total': s.total,
    }));
    exportToExcel(rows, 'Reporte_Financiero_Ingresos', 'Financiero');
  };

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-secondary-200 bg-background-50">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <i className="ri-money-dollar-circle-line text-sm"></i>
            </span>
            <span className="text-2xs text-foreground-400 uppercase tracking-wider">Ingresos del día</span>
          </div>
          <p className="text-2xl font-bold text-foreground-900 font-heading">{currency(kpis.totalIngresos)}</p>
        </div>

        {metodoCards.map((m) => (
          <div key={m.label} className="p-4 rounded-xl border border-secondary-200 bg-background-50">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-7 h-7 flex items-center justify-center rounded-lg ${m.color}`}>
                <i className={`${m.icon} text-sm`}></i>
              </span>
              <span className="text-2xs text-foreground-400 uppercase tracking-wider">{m.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground-900 font-heading">{currency(m.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Ingresos por servicio */}
        <Card padding="none">
          <div className="px-5 py-4 border-b border-secondary-100 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center">
                <i className="ri-price-tag-3-line text-primary-600"></i>
              </span>
              <h3 className="text-base font-semibold text-foreground-900 font-heading">Ingresos por servicio</h3>
            </div>
            <Button size="sm" variant="secondary" icon={<i className="ri-file-excel-line"></i>} onClick={handleExport}>
              Exportar Excel
            </Button>
          </div>
          <div className="p-5 space-y-3">
            {ingresosPorServicio.map((s) => (
              <div key={s.servicio}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground-800 truncate pr-2">{s.servicio}</span>
                  <span className="text-xs font-bold text-foreground-900 shrink-0">{currency(s.total)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-secondary-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary-500 transition-all duration-700"
                      style={{ width: `${Math.round((s.total / maxServicio) * 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-2xs text-foreground-400 shrink-0">{s.transacciones} cobros</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Cortes de caja */}
        <Card padding="none">
          <div className="px-5 py-4 border-b border-secondary-100 flex items-center gap-2">
            <span className="w-5 h-5 flex items-center justify-center">
              <i className="ri-file-chart-line text-accent-600"></i>
            </span>
            <h3 className="text-base font-semibold text-foreground-900 font-heading">Cortes de caja recientes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-secondary-200 text-left">
                  <th className="px-5 py-2.5 text-xs font-semibold text-foreground-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-5 py-2.5 text-xs font-semibold text-foreground-500 uppercase tracking-wider text-center">Transacciones</th>
                  <th className="px-5 py-2.5 text-xs font-semibold text-foreground-500 uppercase tracking-wider text-right">Ingresos</th>
                  <th className="px-5 py-2.5 text-xs font-semibold text-foreground-500 uppercase tracking-wider text-right">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {cortes.map((c) => (
                  <tr key={c.id} className="hover:bg-secondary-50/50 transition-base">
                    <td className="px-5 py-3 font-medium text-foreground-900 whitespace-nowrap">
                      {new Date(c.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3 text-center text-foreground-700">{c.transacciones}</td>
                    <td className="px-5 py-3 text-right font-semibold text-foreground-900">{currency(c.totalIngresos)}</td>
                    <td className="px-5 py-3 text-right">
                      <Badge variant={c.diferencia === 0 ? 'success' : 'warning'}>
                        {c.diferencia > 0 ? '+' : ''}{currency(c.diferencia)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}