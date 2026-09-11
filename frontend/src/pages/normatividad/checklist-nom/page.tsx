import { useState, useMemo, useEffect } from 'react';
import Card from '@/components/base/Card';
import Badge from '@/components/base/Badge';
import Button from '@/components/base/Button';
import { useUserBranches } from '@/hooks/useUserBranches';
import { exportToExcel } from '@/utils/exportUtils';

interface ChecklistItem {
  id: string;
  categoria: string;
  descripcion: string;
  norma: string;
  estado: 'cumple' | 'no_cumple' | 'en_proceso' | 'no_aplica';
  notas?: string;
  prioridad: 'alta' | 'media' | 'baja';
}

const checklistBase: ChecklistItem[] = [
  // NOM-005 Infraestructura general
  { id: 'c1', categoria: 'Infraestructura — NOM-005', descripcion: 'Sala de espera con capacidad adecuada (sillas suficientes)', norma: 'NOM-005-SSA3-2018', estado: 'cumple', prioridad: 'media' },
  { id: 'c2', categoria: 'Infraestructura — NOM-005', descripcion: 'Sanitarios separados para pacientes y personal', norma: 'NOM-005-SSA3-2018', estado: 'cumple', prioridad: 'media' },
  { id: 'c3', categoria: 'Infraestructura — NOM-005', descripcion: 'Señalética de emergencia y rutas de evacuación visibles', norma: 'NOM-005-SSA3-2018', estado: 'en_proceso', prioridad: 'alta', notas: 'Falta señal de evacuación en ala norte.' },
  { id: 'c4', categoria: 'Infraestructura — NOM-005', descripcion: 'Extintores con vigencia en zonas de riesgo', norma: 'NOM-005-SSA3-2018', estado: 'cumple', prioridad: 'alta' },
  { id: 'c5', categoria: 'Infraestructura — NOM-005', descripcion: 'Iluminación adecuada en todas las áreas de atención', norma: 'NOM-005-SSA3-2018', estado: 'cumple', prioridad: 'media' },
  { id: 'c6', categoria: 'Infraestructura — NOM-005', descripcion: 'Ventilación natural o artificial en consultorios', norma: 'NOM-005-SSA3-2018', estado: 'cumple', prioridad: 'baja' },
  { id: 'c7', categoria: 'Infraestructura — NOM-005', descripcion: 'Área de esterilización y manejo de residuos peligrosos (RPBI)', norma: 'NOM-005-SSA3-2018', estado: 'en_proceso', prioridad: 'alta', notas: 'RPBI: verificar última actualización del manifiesto.' },
  { id: 'c8', categoria: 'Infraestructura — NOM-005', descripcion: 'Lavamanos en cada consultorio o área de atención', norma: 'NOM-005-SSA3-2018', estado: 'cumple', prioridad: 'alta' },
  { id: 'c9', categoria: 'Infraestructura — NOM-005', descripcion: 'Acceso para personas con discapacidad (rampa o elevador)', norma: 'NOM-005-SSA3-2018', estado: 'no_aplica', prioridad: 'media', notas: 'Planta baja sin escalones.' },
  // NOM-016 Equipamiento y funcionamiento
  { id: 'c10', categoria: 'Equipamiento — NOM-016', descripcion: 'Camilla o mesa de exploración por consultorio', norma: 'NOM-016-SSA3-2012', estado: 'cumple', prioridad: 'alta' },
  { id: 'c11', categoria: 'Equipamiento — NOM-016', descripcion: 'Esfigmomanómetro calibrado por consultorio', norma: 'NOM-016-SSA3-2012', estado: 'cumple', prioridad: 'alta' },
  { id: 'c12', categoria: 'Equipamiento — NOM-016', descripcion: 'Estetoscopio disponible en cada área de atención', norma: 'NOM-016-SSA3-2012', estado: 'cumple', prioridad: 'alta' },
  { id: 'c13', categoria: 'Equipamiento — NOM-016', descripcion: 'Termómetros de uso clínico', norma: 'NOM-016-SSA3-2012', estado: 'cumple', prioridad: 'media' },
  { id: 'c14', categoria: 'Equipamiento — NOM-016', descripcion: 'Báscula con tallímetro disponible', norma: 'NOM-016-SSA3-2012', estado: 'cumple', prioridad: 'media' },
  { id: 'c15', categoria: 'Equipamiento — NOM-016', descripcion: 'Glucómetro calibrado con insumos vigentes', norma: 'NOM-016-SSA3-2012', estado: 'cumple', prioridad: 'alta' },
  { id: 'c16', categoria: 'Equipamiento — NOM-016', descripcion: 'Botiquín de urgencias con insumos vigentes (adrenalina, glucosa, O₂)', norma: 'NOM-016-SSA3-2012', estado: 'en_proceso', prioridad: 'alta', notas: 'Verificar vigencia de adrenalina e insulina en carro rojo.' },
  { id: 'c17', categoria: 'Equipamiento — NOM-016', descripcion: 'ECG (electrocardiograma) si se ofrece cardiología', norma: 'NOM-016-SSA3-2012', estado: 'cumple', prioridad: 'alta' },
  { id: 'c18', categoria: 'Equipamiento — NOM-016', descripcion: 'Desfibrilador automático (DEA) disponible', norma: 'NOM-016-SSA3-2012', estado: 'no_cumple', prioridad: 'alta', notas: 'Adquirir DEA para urgencias.' },
  // Documentación
  { id: 'c19', categoria: 'Documentación COFEPRIS', descripcion: 'Aviso de funcionamiento vigente ante COFEPRIS', norma: 'Reglamento LGSS', estado: 'cumple', prioridad: 'alta' },
  { id: 'c20', categoria: 'Documentación COFEPRIS', descripcion: 'Responsable sanitario designado y registrado', norma: 'Reglamento LGSS', estado: 'cumple', prioridad: 'alta' },
  { id: 'c21', categoria: 'Documentación COFEPRIS', descripcion: 'Licencia sanitaria municipal/estatal vigente', norma: 'Reglamento LGSS', estado: 'cumple', prioridad: 'alta' },
  { id: 'c22', categoria: 'Documentación COFEPRIS', descripcion: 'Manifiesto de residuos peligrosos biológico-infecciosos (RPBI) actualizado', norma: 'NOM-087-SEMARNAT', estado: 'en_proceso', prioridad: 'alta' },
  { id: 'c23', categoria: 'Documentación COFEPRIS', descripcion: 'Contratos con empresa de recolección de RPBI vigentes', norma: 'NOM-087-SEMARNAT', estado: 'cumple', prioridad: 'alta' },
  // Personal
  { id: 'c24', categoria: 'Personal y acreditación', descripcion: 'Cédulas profesionales de todos los médicos visibles en área de atención', norma: 'NOM-016-SSA3-2012', estado: 'cumple', prioridad: 'alta' },
  { id: 'c25', categoria: 'Personal y acreditación', descripcion: 'Uniformes e identificación del personal clínico', norma: 'NOM-016-SSA3-2012', estado: 'cumple', prioridad: 'baja' },
  { id: 'c26', categoria: 'Personal y acreditación', descripcion: 'Certificaciones de especialistas vigentes', norma: 'NOM-016-SSA3-2012', estado: 'en_proceso', prioridad: 'alta', notas: 'Verificar vigencia de consejos de especialidad en módulo de Profesionales.' },
];

const estadoCheck: Record<ChecklistItem['estado'], { label: string; bg: string; text: string; icon: string; variant: 'success' | 'danger' | 'info' | 'secondary' }> = {
  cumple: { label: 'Cumple', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'ri-check-double-line', variant: 'success' },
  no_cumple: { label: 'No cumple', bg: 'bg-red-50', text: 'text-red-700', icon: 'ri-close-circle-line', variant: 'danger' },
  en_proceso: { label: 'En proceso', bg: 'bg-amber-50', text: 'text-amber-700', icon: 'ri-loader-4-line', variant: 'info' },
  no_aplica: { label: 'No aplica', bg: 'bg-secondary-50', text: 'text-foreground-500', icon: 'ri-subtract-line', variant: 'secondary' },
};

const prioridadColors: Record<ChecklistItem['prioridad'], { label: string; color: string }> = {
  alta: { label: 'Alta', color: 'text-red-600' },
  media: { label: 'Media', color: 'text-amber-600' },
  baja: { label: 'Baja', color: 'text-foreground-400' },
};

const categorias = [...new Set(checklistBase.map((i) => i.categoria))];

export default function ChecklistNOM() {
  const { userBranches, resolvedBranchId } = useUserBranches();
  const [sucursalId, setSucursalId] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(checklistBase.map((i) => ({ ...i })));
  const [filtroEstado, setFiltroEstado] = useState<ChecklistItem['estado'] | 'todos'>('todos');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (resolvedBranchId && !sucursalId) {
      setSucursalId(resolvedBranchId);
    } else if (!sucursalId && userBranches.length > 0) {
      setSucursalId(userBranches[0].id);
    }
  }, [resolvedBranchId, sucursalId, userBranches]);

  const sucursal = userBranches.find((s) => s.id === sucursalId);

  const filtered = useMemo(() => checklist.filter((i) => {
    const q = search.toLowerCase();
    const matchSearch = !q || i.descripcion.toLowerCase().includes(q) || i.norma.toLowerCase().includes(q) || i.categoria.toLowerCase().includes(q);
    const matchEstado = filtroEstado === 'todos' || i.estado === filtroEstado;
    return matchSearch && matchEstado;
  }), [checklist, search, filtroEstado]);

  const stats = useMemo(() => {
    const total = checklist.length;
    const cumple = checklist.filter((i) => i.estado === 'cumple').length;
    const noCumple = checklist.filter((i) => i.estado === 'no_cumple').length;
    const enProceso = checklist.filter((i) => i.estado === 'en_proceso').length;
    const noAplica = checklist.filter((i) => i.estado === 'no_aplica').length;
    const aplicables = total - noAplica;
    const pct = aplicables > 0 ? Math.round((cumple / aplicables) * 100) : 0;
    return { total, cumple, noCumple, enProceso, noAplica, pct };
  }, [checklist]);

  const updateEstado = (id: string, estado: ChecklistItem['estado']) => {
    setChecklist((prev) => prev.map((i) => i.id === id ? { ...i, estado } : i));
  };

  return (
    <div className="space-y-5" data-testid="page-checklist-nom">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground-900 font-heading">Checklist NOM-005/NOM-016</h1>
          <p className="text-sm text-foreground-500 mt-1">
            Ayuda operativa por sucursal (estados solo en esta sesión)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<i className="ri-download-2-line"></i>} onClick={() => {
            const rows = checklist.map((item) => ({
              Categoria: item.categoria,
              Requisito: item.descripcion,
              Norma: item.norma,
              Estado: estadoCheck[item.estado].label,
              Prioridad: prioridadColors[item.prioridad].label,
              Notas: item.notas || '',
            }));
            const suc = userBranches.find((s) => s.id === sucursalId);
            exportToExcel(rows, `Checklist_NOM_${suc?.nombre?.replace(/\s+/g, '_') || 'Establecimiento'}_${new Date().toISOString().split('T')[0]}`, 'ChecklistNOM');
          }}>
            Exportar Excel
          </Button>
          <Button variant="ghost" size="sm" icon={<i className="ri-printer-line"></i>} onClick={() => window.print()}>
            Imprimir checklist
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        Plantilla de referencia interna. Cambios de estado <strong>no persisten</strong> en API.
        El % y los avisos de esta pantalla <strong>no certifican</strong> cumplimiento ante
        COFEPRIS; las NOM citadas deben verificarse con fuente oficial vigente.
      </div>

      {/* Selector de sucursal */}
      <div className="flex items-center gap-3 p-3 bg-secondary-50 border border-secondary-200 rounded-xl">
        <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-100 flex-shrink-0">
          <i className="ri-building-line text-primary-600"></i>
        </div>
        <div className="flex-1">
          <label className="text-2xs font-semibold text-foreground-500 uppercase tracking-wider">Establecimiento evaluado</label>
          <select value={sucursalId} onChange={(e) => setSucursalId(e.target.value)} className="block w-full px-3 py-1.5 mt-1 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 outline-none focus:border-primary-400 transition-base">
            {userBranches.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>
        {sucursal && (
          <div className="text-right text-xs text-foreground-500">
            <p className="font-medium">{sucursal.nombre}</p>
            {sucursal.telefono && <p className="text-2xs">{sucursal.telefono}</p>}
          </div>
        )}
      </div>

      {/* Progreso */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-foreground-800">Cumplimiento del establecimiento</p>
          <span className={`text-2xl font-bold ${stats.pct >= 80 ? 'text-emerald-600' : stats.pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{stats.pct}%</span>
        </div>
        <div className="w-full h-3 bg-secondary-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${stats.pct >= 80 ? 'bg-emerald-500' : stats.pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${stats.pct}%` }}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <StatBox value={stats.cumple} label="Cumple" color="text-emerald-700" bg="bg-emerald-50" icon="ri-check-double-line" />
          <StatBox value={stats.noCumple} label="No cumple" color="text-red-700" bg="bg-red-50" icon="ri-close-circle-line" />
          <StatBox value={stats.enProceso} label="En proceso" color="text-amber-700" bg="bg-amber-50" icon="ri-loader-4-line" />
          <StatBox value={stats.noAplica} label="No aplica" color="text-foreground-500" bg="bg-secondary-50" icon="ri-subtract-line" />
        </div>
        {stats.noCumple > 0 && (
          <div className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-200">
            <p className="text-xs text-red-700 flex items-center gap-1.5">
              <i className="ri-error-warning-line"></i>
              <strong>{stats.noCumple} ítem{stats.noCumple > 1 ? 's' : ''} marcado{stats.noCumple > 1 ? 's' : ''} como «No cumple»</strong>
              {' '}— revisar con el responsable sanitario del establecimiento (no es dictamen de inspección).
            </p>
          </div>
        )}
      </Card>

      {/* Filtros */}
      <div className="flex flex-col lg:flex-row gap-2">
        <div className="relative flex-1 min-w-0 lg:max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
            <i className="ri-search-line text-sm"></i>
          </span>
          <input type="search" placeholder="Buscar requisito o norma..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-sm bg-background-50 border border-secondary-200/70 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base" />
        </div>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as ChecklistItem['estado'] | 'todos')} className="px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 outline-none focus:border-primary-400 transition-base">
          <option value="todos">Todos los estados</option>
          <option value="cumple">Cumple</option>
          <option value="no_cumple">No cumple</option>
          <option value="en_proceso">En proceso</option>
          <option value="no_aplica">No aplica</option>
        </select>
        {(search || filtroEstado !== 'todos') && (
          <button onClick={() => { setSearch(''); setFiltroEstado('todos'); }} className="px-2.5 py-2 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-base cursor-pointer whitespace-nowrap border border-red-200">
            Limpiar
          </button>
        )}
      </div>

      {/* Checklist por categoría */}
      <div className="space-y-4">
        {categorias.map((cat) => {
          const items = filtered.filter((i) => i.categoria === cat);
          if (!items.length) return null;
          const cumplidos = items.filter((i) => i.estado === 'cumple').length;
          const total = items.filter((i) => i.estado !== 'no_aplica').length;
          return (
            <Card key={cat} padding="none">
              <div className="px-4 py-3 border-b border-secondary-200 bg-secondary-50/60 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground-800 flex items-center gap-2">
                  <i className="ri-building-line text-primary-600"></i>
                  {cat}
                </h3>
                <span className={`text-xs font-bold ${cumplidos === total ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {cumplidos}/{total} cumplidos
                </span>
              </div>
              <div className="divide-y divide-secondary-100">
                {items.map((item) => {
                  const estCfg = estadoCheck[item.estado];
                  const prioCfg = prioridadColors[item.prioridad];
                  return (
                    <div key={item.id} className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0 mt-0.5 ${estCfg.bg}`}>
                          <i className={`${estCfg.icon} text-sm ${estCfg.text}`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm text-foreground-800 font-medium">{item.descripcion}</p>
                            <Badge variant={estCfg.variant} size="sm">{estCfg.label}</Badge>
                            <span className={`text-2xs font-medium ${prioCfg.color}`}>
                              <i className="ri-flag-line"></i> {prioCfg.label}
                            </span>
                            <span className="text-2xs text-foreground-400 font-mono">{item.norma}</span>
                          </div>
                          {item.notas && (
                            <p className="text-2xs text-amber-600 mt-0.5 flex items-center gap-1">
                              <i className="ri-information-line"></i> {item.notas}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          <select value={item.estado} onChange={(e) => updateEstado(item.id, e.target.value as ChecklistItem['estado'])}
                            className="px-2 py-1 text-xs bg-background-50 border border-secondary-200 rounded-md text-foreground-700 outline-none focus:border-primary-400 transition-base cursor-pointer">
                            <option value="cumple">Cumple</option>
                            <option value="no_cumple">No cumple</option>
                            <option value="en_proceso">En proceso</option>
                            <option value="no_aplica">No aplica</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="p-4 rounded-xl bg-secondary-50 border border-secondary-200">
        <p className="text-xs text-foreground-600">
          <strong>Nota:</strong> Este checklist es de referencia interna. Los requisitos pueden variar según el tipo de establecimiento, 
          especialidad y entidad federativa. Consulte las disposiciones locales y los lineamientos actualizados de COFEPRIS.
        </p>
      </div>
    </div>
  );
}

function StatBox({ value, label, color, bg, icon }: { value: number; label: string; color: string; bg: string; icon: string }) {
  return (
    <div className={`p-3 rounded-lg border border-secondary-100 ${bg}`}>
      <div className={`flex items-center gap-1.5 ${color}`}>
        <i className={`${icon} text-sm`}></i>
        <span className="text-base font-bold">{value}</span>
      </div>
      <p className="text-2xs text-foreground-500 mt-0.5">{label}</p>
    </div>
  );
}