import { useState, useMemo } from 'react';
import Card from '@/components/base/Card';
import Badge from '@/components/base/Badge';
import Button from '@/components/base/Button';
import { retencionMock, categoriaRetencionConfig, type PoliticaRetencion } from '@/mocks/retencion';
import { exportToExcel } from '@/utils/exportUtils';

export default function RetencionDocumental() {
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<PoliticaRetencion['estado'] | 'todos'>('todos');

  const filtered = useMemo(() => {
    let list = [...retencionMock];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.descripcion.toLowerCase().includes(q) ||
        r.normaAplicable.toLowerCase().includes(q) ||
        r.responsable.toLowerCase().includes(q)
      );
    }
    if (filtroEstado !== 'todos') list = list.filter((r) => r.estado === filtroEstado);
    return list;
  }, [search, filtroEstado]);

  const stats = useMemo(() => {
    const total = retencionMock.length;
    const vigentes = retencionMock.filter((r) => r.estado === 'vigente').length;
    const enRevision = retencionMock.filter((r) => r.estado === 'en_revision').length;
    const plazos5 = retencionMock.filter((r) => r.plazoAnios === 5).length;
    return { total, vigentes, enRevision, plazos5 };
  }, []);

  const handleExport = () => {
    const rows = filtered.map((r) => ({
      Categoría: categoriaRetencionConfig[r.categoria].label,
      Descripción: r.descripcion,
      'Plazo (años)': r.plazoAnios,
      'Norma Aplicable': r.normaAplicable,
      'Fecha Vigencia': r.fechaInicioVigencia,
      'Última Revisión': r.ultimaRevision,
      'Próxima Revisión': r.proximaRevision,
      Responsable: r.responsable,
      Estado: r.estado === 'vigente' ? 'Vigente' : r.estado === 'en_revision' ? 'En revisión' : 'Actualizada',
    }));
    exportToExcel(rows, `Retencion_MediCore_${new Date().toISOString().split('T')[0]}`, 'Retencion');
  };

  const estadoConfig: Record<PoliticaRetencion['estado'], { label: string; variant: 'success' | 'warning' | 'info' }> = {
    vigente: { label: 'Vigente', variant: 'success' },
    en_revision: { label: 'En revisión', variant: 'warning' },
    actualizada: { label: 'Actualizada', variant: 'info' },
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground-900 font-heading">Retención Documental</h1>
          <p className="text-sm text-foreground-500 mt-1">
            Políticas de conservación de expedientes conforme a NOM-004 y NOM-024
          </p>
        </div>
        <Button variant="ghost" size="sm" icon={<i className="ri-download-2-line"></i>} onClick={handleExport}>
          Exportar
        </Button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-0 rounded-lg border border-secondary-200/70 bg-background-50 overflow-hidden">
        <StatItem icon="ri-folder-shield-line" value={stats.total} label="Políticas" />
        <StatItem icon="ri-check-line" value={stats.vigentes} label="Vigentes" color="text-emerald-600" />
        <StatItem icon="ri-loader-4-line" value={stats.enRevision} label="En revisión" color="text-amber-600" />
        <StatItem icon="ri-time-line" value={stats.plazos5} label="Plazo 5 años" color="text-primary-600" last />
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-2">
        <div className="relative flex-1 min-w-0 lg:max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
            <i className="ri-search-line text-sm"></i>
          </span>
          <input
            type="search"
            placeholder="Buscar política o norma..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-sm bg-background-50 border border-secondary-200/70 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base"
          />
        </div>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as PoliticaRetencion['estado'] | 'todos')}
          className="px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 outline-none focus:border-primary-400 transition-base"
        >
          <option value="todos">Todos los estados</option>
          <option value="vigente">Vigente</option>
          <option value="en_revision">En revisión</option>
          <option value="actualizada">Actualizada</option>
        </select>
        {(search || filtroEstado !== 'todos') && (
          <button
            onClick={() => { setSearch(''); setFiltroEstado('todos'); }}
            className="px-2.5 py-2 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-base cursor-pointer whitespace-nowrap border border-red-200"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((r) => {
          const catCfg = categoriaRetencionConfig[r.categoria];
          const estCfg = estadoConfig[r.estado];
          const diasRestantesRevision = Math.ceil((new Date(r.proximaRevision).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          return (
            <Card key={r.id} padding="md" className="hover:border-primary-300 transition-base">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-secondary-100 flex-shrink-0">
                  <i className={`${catCfg.icon} text-lg text-foreground-500`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-foreground-900">{catCfg.label}</h3>
                    <Badge variant={estCfg.variant} size="sm">{estCfg.label}</Badge>
                  </div>
                  <p className="text-xs text-foreground-600 mt-1">{r.descripcion}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="p-2 rounded-lg bg-secondary-50 border border-secondary-100">
                  <p className="text-2xs text-foreground-500 uppercase tracking-wider">Plazo de retención</p>
                  <p className="text-base font-bold text-foreground-900">{r.plazoAnios} años</p>
                </div>
                <div className="p-2 rounded-lg bg-secondary-50 border border-secondary-100">
                  <p className="text-2xs text-foreground-500 uppercase tracking-wider">Norma aplicable</p>
                  <p className="text-sm font-semibold text-foreground-800">{r.normaAplicable}</p>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground-500">Vigencia desde:</span>
                  <span className="text-foreground-800 font-medium">{r.fechaInicioVigencia}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground-500">Última revisión:</span>
                  <span className="text-foreground-800 font-medium">{r.ultimaRevision}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground-500">Próxima revisión:</span>
                  <span className={`font-medium ${diasRestantesRevision <= 30 ? 'text-red-600' : 'text-foreground-800'}`}>
                    {r.proximaRevision} {diasRestantesRevision <= 30 && `(${diasRestantesRevision} días)`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground-500">Responsable:</span>
                  <span className="text-foreground-800 font-medium">{r.responsable}</span>
                </div>
              </div>

              {r.observaciones && (
                <div className="mt-3 p-2 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-xs text-amber-800">{r.observaciones}</p>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function StatItem({ icon, value, label, color = 'text-foreground-700', last = false }: { icon: string; value: number; label: string; color?: string; last?: boolean }) {
  return (
    <div className={`flex-1 flex items-center gap-2 px-3 py-2 ${!last ? 'border-r border-secondary-200/70' : ''}`}>
      <span className="w-5 h-5 flex items-center justify-center rounded text-sm">
        <i className={`${icon} ${color}`}></i>
      </span>
      <div>
        <p className="text-sm font-bold text-foreground-900">{value}</p>
        <p className="text-[10px] text-foreground-500 uppercase tracking-wide">{label}</p>
      </div>
    </div>
  );
}