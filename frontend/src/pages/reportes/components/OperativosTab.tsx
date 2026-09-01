import { reportesOperativos } from '@/mocks/reportes';
import Card from '@/components/base/Card';
import Badge from '@/components/base/Badge';
import Button from '@/components/base/Button';
import { exportToExcel } from '@/utils/exportUtils';

export default function OperativosTab() {
  const { kpis, citasPorSucursal, atencionPorMedico } = reportesOperativos;

  const kpiCards = [
    { label: 'Citas hoy', value: kpis.citasHoy, icon: 'ri-calendar-2-line', color: 'text-primary-600 bg-primary-100' },
    { label: 'Atendidas', value: kpis.atendidas, icon: 'ri-check-double-line', color: 'text-emerald-600 bg-emerald-100' },
    { label: 'En espera', value: kpis.enEspera, icon: 'ri-time-line', color: 'text-amber-600 bg-amber-100' },
    { label: 'En consulta', value: kpis.enConsulta, icon: 'ri-stethoscope-line', color: 'text-accent-600 bg-accent-100' },
    { label: 'No acudió', value: kpis.noAcudio, icon: 'ri-user-unfollow-line', color: 'text-red-600 bg-red-100' },
    { label: 'Canceladas', value: kpis.canceladas, icon: 'ri-close-circle-line', color: 'text-secondary-600 bg-secondary-100' },
  ];

  const handleExport = () => {
    const rows = citasPorSucursal.map((s) => ({
      Sucursal: s.sucursal,
      'Citas totales': s.total,
      Atendidas: s.atendidas,
      'En espera': s.enEspera,
      Canceladas: s.canceladas,
      'No acudió': s.noAcudio,
    }));
    exportToExcel(rows, 'Reporte_Operativo_Sucursales', 'Operativo');
  };

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((k) => (
          <div key={k.label} className="p-4 rounded-xl border border-secondary-200 bg-background-50">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-7 h-7 flex items-center justify-center rounded-lg ${k.color}`}>
                <i className={`${k.icon} text-sm`}></i>
              </span>
              <span className="text-2xs text-foreground-400 uppercase tracking-wider whitespace-nowrap">{k.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground-900 font-heading">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tasas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card padding="md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground-700">Tasa de atención</span>
            <span className="text-sm font-bold text-foreground-900">{kpis.tasaAtencion}%</span>
          </div>
          <div className="w-full h-2.5 bg-secondary-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-primary-500 transition-all duration-700"
              style={{ width: `${kpis.tasaAtencion}%` }}
            ></div>
          </div>
          <p className="text-2xs text-foreground-400 mt-2">Pacientes atendidos respecto a citas cerradas (atendidas + no acudió + canceladas).</p>
        </Card>
        <Card padding="md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground-700">Ocupación de agenda</span>
            <span className="text-sm font-bold text-foreground-900">{kpis.ocupacion}%</span>
          </div>
          <div className="w-full h-2.5 bg-secondary-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                kpis.ocupacion > 80 ? 'bg-red-500' : kpis.ocupacion > 60 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${kpis.ocupacion}%` }}
            ></div>
          </div>
          <p className="text-2xs text-foreground-400 mt-2">Proporción de citas efectivamente ocupadas respecto al total del día.</p>
        </Card>
      </div>

      {/* Citas por sucursal */}
      <Card padding="none">
        <div className="px-5 py-4 border-b border-secondary-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 flex items-center justify-center">
              <i className="ri-building-line text-primary-600"></i>
            </span>
            <h3 className="text-base font-semibold text-foreground-900 font-heading">Citas del día por sucursal</h3>
          </div>
          <Button size="sm" variant="secondary" icon={<i className="ri-file-excel-line"></i>} onClick={handleExport}>
            Exportar Excel
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-secondary-200 text-left">
                <th className="px-5 py-2.5 text-xs font-semibold text-foreground-500 uppercase tracking-wider">Sucursal</th>
                <th className="px-5 py-2.5 text-xs font-semibold text-foreground-500 uppercase tracking-wider text-center">Total</th>
                <th className="px-5 py-2.5 text-xs font-semibold text-foreground-500 uppercase tracking-wider text-center">Atendidas</th>
                <th className="px-5 py-2.5 text-xs font-semibold text-foreground-500 uppercase tracking-wider text-center">En espera</th>
                <th className="px-5 py-2.5 text-xs font-semibold text-foreground-500 uppercase tracking-wider text-center">Canceladas</th>
                <th className="px-5 py-2.5 text-xs font-semibold text-foreground-500 uppercase tracking-wider text-center">No acudió</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {citasPorSucursal.map((s) => (
                <tr key={s.sucursalId} className="hover:bg-secondary-50/50 transition-base">
                  <td className="px-5 py-3 font-medium text-foreground-900">{s.sucursal}</td>
                  <td className="px-5 py-3 text-center text-foreground-700 font-semibold">{s.total}</td>
                  <td className="px-5 py-3 text-center text-emerald-600 font-medium">{s.atendidas}</td>
                  <td className="px-5 py-3 text-center text-amber-600 font-medium">{s.enEspera}</td>
                  <td className="px-5 py-3 text-center text-red-500 font-medium">{s.canceladas}</td>
                  <td className="px-5 py-3 text-center text-foreground-500 font-medium">{s.noAcudio}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Atención por médico */}
      <Card padding="none">
        <div className="px-5 py-4 border-b border-secondary-100 flex items-center gap-2">
          <span className="w-5 h-5 flex items-center justify-center">
            <i className="ri-user-star-line text-accent-600"></i>
          </span>
          <h3 className="text-base font-semibold text-foreground-900 font-heading">Atención por médico</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-secondary-200 text-left">
                <th className="px-5 py-2.5 text-xs font-semibold text-foreground-500 uppercase tracking-wider">Médico</th>
                <th className="px-5 py-2.5 text-xs font-semibold text-foreground-500 uppercase tracking-wider">Especialidad</th>
                <th className="px-5 py-2.5 text-xs font-semibold text-foreground-500 uppercase tracking-wider text-center">Atendidas</th>
                <th className="px-5 py-2.5 text-xs font-semibold text-foreground-500 uppercase tracking-wider text-center">En curso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {atencionPorMedico.map((m) => (
                <tr key={m.doctorId} className="hover:bg-secondary-50/50 transition-base">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-full bg-secondary-100 text-secondary-700 flex items-center justify-center text-xs font-semibold">
                        {m.doctor.charAt(0)}
                      </span>
                      <span className="font-medium text-foreground-900">{m.doctor}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant="secondary">{m.especialidad}</Badge>
                  </td>
                  <td className="px-5 py-3 text-center text-foreground-700 font-semibold">{m.atendidas}</td>
                  <td className="px-5 py-3 text-center">
                    {m.enCurso > 0 ? (
                      <span className="inline-flex items-center gap-1 text-accent-600 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse"></span>
                        {m.enCurso}
                      </span>
                    ) : (
                      <span className="text-foreground-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}