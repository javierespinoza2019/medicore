import { reportesClinicos } from '@/mocks/reportes';
import Card from '@/components/base/Card';
import Button from '@/components/base/Button';
import { exportToExcel } from '@/utils/exportUtils';

export default function ClinicosTab() {
  const { kpis, topDiagnosticos, consultasPorEspecialidad, estudiosPorTipo } = reportesClinicos;

  const kpiCards = [
    { label: 'Consultas hoy', value: kpis.consultasHoy, icon: 'ri-file-list-3-line', color: 'text-primary-600 bg-primary-100' },
    { label: 'Completadas', value: kpis.completadas, icon: 'ri-check-double-line', color: 'text-emerald-600 bg-emerald-100' },
    { label: 'Recetas emitidas', value: kpis.recetasEmitidas, icon: 'ri-capsule-line', color: 'text-accent-600 bg-accent-100' },
    { label: 'Estudios solicitados', value: kpis.estudiosSolicitados, icon: 'ri-microscope-line', color: 'text-sky-600 bg-sky-100' },
    { label: 'Con resultado', value: kpis.estudiosCompletados, icon: 'ri-file-check-line', color: 'text-amber-600 bg-amber-100' },
  ];

  const maxDiagnostico = topDiagnosticos.length > 0 ? topDiagnosticos[0].total : 1;
  const maxEsp = consultasPorEspecialidad.length > 0 ? consultasPorEspecialidad[0].total : 1;
  const maxTipo = estudiosPorTipo.length > 0 ? estudiosPorTipo[0].total : 1;

  const handleExport = () => {
    const rows = topDiagnosticos.map((d) => ({
      Código: d.codigo,
      Diagnóstico: d.descripcion,
      Frecuencia: d.total,
    }));
    exportToExcel(rows, 'Reporte_Clinico_Diagnosticos', 'Clínico');
  };

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Top diagnósticos */}
        <Card padding="none">
          <div className="px-5 py-4 border-b border-secondary-100 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center">
                <i className="ri-award-line text-primary-600"></i>
              </span>
              <h3 className="text-base font-semibold text-foreground-900 font-heading">Diagnósticos más frecuentes (CIE-10)</h3>
            </div>
            <Button size="sm" variant="secondary" icon={<i className="ri-file-excel-line"></i>} onClick={handleExport}>
              Exportar Excel
            </Button>
          </div>
          <div className="p-5 space-y-3">
            {topDiagnosticos.map((d) => (
              <div key={d.codigo}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground-800 truncate">
                    <span className="font-mono text-foreground-500 mr-1">{d.codigo}</span>
                    {d.descripcion}
                  </span>
                  <span className="text-xs font-bold text-foreground-900 shrink-0 ml-2">{d.total}</span>
                </div>
                <div className="w-full h-1.5 bg-secondary-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary-500 transition-all duration-700"
                    style={{ width: `${Math.round((d.total / maxDiagnostico) * 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Consultas por especialidad */}
        <Card padding="none">
          <div className="px-5 py-4 border-b border-secondary-100 flex items-center gap-2">
            <span className="w-5 h-5 flex items-center justify-center">
              <i className="ri-hospital-line text-accent-600"></i>
            </span>
            <h3 className="text-base font-semibold text-foreground-900 font-heading">Consultas por especialidad</h3>
          </div>
          <div className="p-5 space-y-3">
            {consultasPorEspecialidad.map((e) => (
              <div key={e.categoria}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground-800">{e.categoria}</span>
                  <span className="text-xs font-bold text-foreground-900">{e.total}</span>
                </div>
                <div className="w-full h-1.5 bg-secondary-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent-500 transition-all duration-700"
                    style={{ width: `${Math.round((e.total / maxEsp) * 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Estudios por tipo */}
      <Card padding="none">
        <div className="px-5 py-4 border-b border-secondary-100 flex items-center gap-2">
          <span className="w-5 h-5 flex items-center justify-center">
            <i className="ri-microscope-line text-sky-600"></i>
          </span>
          <h3 className="text-base font-semibold text-foreground-900 font-heading">Estudios solicitados por tipo</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-5">
          {estudiosPorTipo.map((e) => (
            <div key={e.categoria} className="p-4 rounded-xl border border-secondary-200 bg-background-50">
              <p className="text-2xs text-foreground-400 uppercase tracking-wider mb-1">{e.categoria}</p>
              <p className="text-2xl font-bold text-foreground-900 font-heading">{e.total}</p>
              <div className="w-full h-1.5 bg-secondary-200 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full rounded-full bg-sky-500 transition-all duration-700"
                  style={{ width: `${Math.round((e.total / maxTipo) * 100)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}