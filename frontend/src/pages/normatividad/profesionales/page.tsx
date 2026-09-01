import { useState, useMemo } from 'react';
import Card from '@/components/base/Card';
import Badge from '@/components/base/Badge';
import Button from '@/components/base/Button';
import {
  profesionalesMock,
  estadoProfesionalConfig,
  calcularDiasRestantes,
  getAlertasVencimiento,
  type ProfesionalSalud,
} from '@/mocks/profesionales';
import { exportToExcel } from '@/utils/exportUtils';

export default function GestionProfesionales() {
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<ProfesionalSalud['estado'] | 'todos'>('todos');
  const [filtroAlerta, setFiltroAlerta] = useState<'todos' | 'con_alerta'>('todos');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = [...profesionalesMock];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.especialidad.toLowerCase().includes(q) ||
        p.cedulaProfesional.toLowerCase().includes(q)
      );
    }
    if (filtroEstado !== 'todos') list = list.filter((p) => p.estado === filtroEstado);
    if (filtroAlerta === 'con_alerta') {
      list = list.filter((p) => getAlertasVencimiento(p).length > 0);
    }
    return list;
  }, [search, filtroEstado, filtroAlerta]);

  const stats = useMemo(() => {
    const total = profesionalesMock.length;
    const activos = profesionalesMock.filter((p) => p.estado === 'activo').length;
    const conAlertas = profesionalesMock.filter((p) => getAlertasVencimiento(p).length > 0).length;
    const alertasAltas = profesionalesMock.filter((p) => getAlertasVencimiento(p).some((a) => a.severidad === 'alta')).length;
    return { total, activos, conAlertas, alertasAltas };
  }, []);

  const handleExport = () => {
    const rows = filtered.map((p) => ({
      Nombre: p.nombre,
      Especialidad: p.especialidad,
      'Cédula Profesional': p.cedulaProfesional,
      'Vigencia Cédula': p.vigenciaCedula,
      'Certificación Consejo': p.certificacionConsejo,
      'Vigencia Certificación': p.vigenciaCertificacion,
      'Licencia Sanitaria': p.licenciaSanitariaEstablecimiento,
      'Vigencia Licencia': p.vigenciaLicencia,
      Estado: estadoProfesionalConfig[p.estado].label,
      Email: p.email,
      Teléfono: p.telefono,
    }));
    exportToExcel(rows, `Profesionales_MediCore_${new Date().toISOString().split('T')[0]}`, 'Profesionales');
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground-900 font-heading">Gestión de Profesionales</h1>
          <p className="text-sm text-foreground-500 mt-1">
            Vigencia de cédulas, certificaciones y licencias sanitarias · NOM-016 / COFEPRIS
          </p>
        </div>
        <Button variant="ghost" size="sm" icon={<i className="ri-download-2-line"></i>} onClick={handleExport}>
          Exportar
        </Button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-0 rounded-lg border border-secondary-200/70 bg-background-50 overflow-hidden">
        <StatItem icon="ri-user-star-line" value={stats.total} label="Total" />
        <StatItem icon="ri-check-line" value={stats.activos} label="Activos" color="text-emerald-600" />
        <StatItem icon="ri-alarm-warning-line" value={stats.conAlertas} label="Con alertas" color="text-amber-600" />
        <StatItem icon="ri-error-warning-line" value={stats.alertasAltas} label="Alerta alta" color="text-red-600" last />
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-2">
        <div className="relative flex-1 min-w-0 lg:max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
            <i className="ri-search-line text-sm"></i>
          </span>
          <input
            type="search"
            placeholder="Buscar nombre, especialidad o cédula..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-sm bg-background-50 border border-secondary-200/70 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 transition-base"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as ProfesionalSalud['estado'] | 'todos')}
            className="px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 outline-none focus:border-primary-400 transition-base"
          >
            <option value="todos">Estado: Todos</option>
            <option value="activo">Activo</option>
            <option value="licencia">En licencia</option>
            <option value="baja">Baja</option>
            <option value="suspendido">Suspendido</option>
          </select>
          <select
            value={filtroAlerta}
            onChange={(e) => setFiltroAlerta(e.target.value as 'todos' | 'con_alerta')}
            className="px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 outline-none focus:border-primary-400 transition-base"
          >
            <option value="todos">Todos</option>
            <option value="con_alerta">Con alertas de vencimiento</option>
          </select>
          {(search || filtroEstado !== 'todos' || filtroAlerta !== 'todos') && (
            <button
              onClick={() => { setSearch(''); setFiltroEstado('todos'); setFiltroAlerta('todos'); }}
              className="px-2.5 py-2 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-base cursor-pointer whitespace-nowrap border border-red-200"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((p) => {
          const estCfg = estadoProfesionalConfig[p.estado];
          const alertas = getAlertasVencimiento(p);
          const isExpanded = expandedId === p.id;
          const diasCedula = calcularDiasRestantes(p.vigenciaCedula);
          const diasCert = calcularDiasRestantes(p.vigenciaCertificacion);
          const diasLic = calcularDiasRestantes(p.vigenciaLicencia);

          return (
            <Card key={p.id} padding="md" className={`${alertas.some((a) => a.severidad === 'alta') ? 'border-red-200' : ''} hover:border-primary-300 transition-base cursor-pointer`} onClick={() => setExpandedId(isExpanded ? null : p.id)}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-50 flex-shrink-0">
                  <i className="ri-user-star-line text-lg text-primary-600"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-foreground-900">{p.nombre}</h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-2xs font-medium ${estCfg.bg} ${estCfg.text}`}>
                      <i className={`${estCfg.icon} text-[10px]`}></i>
                      {estCfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-foreground-600 mt-0.5">{p.especialidad}</p>
                  <p className="text-2xs text-foreground-400">Cédula: {p.cedulaProfesional}</p>
                </div>
                {alertas.length > 0 && (
                  <div className={`w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 ${alertas.some((a) => a.severidad === 'alta') ? 'bg-red-100' : 'bg-amber-100'}`}>
                    <i className={`ri-alarm-warning-line text-xs ${alertas.some((a) => a.severidad === 'alta') ? 'text-red-600' : 'text-amber-600'}`}></i>
                  </div>
                )}
              </div>

              {/* Vigencias */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <VigenciaBox
                  label="Cédula"
                  fecha={p.vigenciaCedula}
                  dias={diasCedula}
                />
                <VigenciaBox
                  label="Certificación"
                  fecha={p.vigenciaCertificacion}
                  dias={diasCert}
                />
                <VigenciaBox
                  label="Lic. Sanitaria"
                  fecha={p.vigenciaLicencia}
                  dias={diasLic}
                />
              </div>

              {/* Alertas */}
              {alertas.length > 0 && (
                <div className="mt-3 space-y-1">
                  {alertas.map((a, i) => (
                    <div key={i} className={`flex items-center gap-2 text-xs ${a.severidad === 'alta' ? 'text-red-700' : 'text-amber-700'} p-1.5 rounded-lg ${a.severidad === 'alta' ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
                      <i className={`ri-alarm-warning-line text-[10px]`}></i>
                      <span><strong>{a.campo}</strong> vence en <strong>{a.dias} días</strong></span>
                    </div>
                  ))}
                </div>
              )}

              {/* Expanded */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-secondary-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InfoRow label="Email" value={p.email} />
                    <InfoRow label="Teléfono" value={p.telefono} />
                    <InfoRow label="Licencia sanitaria" value={p.licenciaSanitariaEstablecimiento} />
                    <InfoRow label="Certificación" value={p.certificacionConsejo} />
                  </div>
                  {p.observaciones && (
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                      <p className="text-xs text-amber-800"><strong>Observaciones:</strong> {p.observaciones}</p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function VigenciaBox({ label, fecha, dias }: { label: string; fecha: string; dias: number }) {
  const color = dias <= 30 ? 'text-red-600 bg-red-50 border-red-200' : dias <= 90 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-foreground-700 bg-secondary-50 border-secondary-100';
  return (
    <div className={`p-2 rounded-lg border text-center ${color}`}>
      <p className="text-[9px] uppercase tracking-wider opacity-70 font-semibold">{label}</p>
      <p className="text-xs font-bold mt-0.5">{fecha}</p>
      <p className="text-[9px] mt-0.5">{dias > 0 ? `${dias}d restantes` : 'Vencido'}</p>
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xs font-semibold text-foreground-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-foreground-800">{value}</p>
    </div>
  );
}