import { useState } from 'react';
import Card from '@/components/base/Card';
import Button from '@/components/base/Button';
import Badge from '@/components/base/Badge';

interface ItemDocSeg {
  id: string;
  seccion: string;
  requisito: string;
  descripcion: string;
  estado: 'cumplido' | 'pendiente' | 'en_proceso' | 'no_aplica';
  norma: string;
  notas?: string;
}

const itemsDocSeg: ItemDocSeg[] = [
  {
    id: 'ds1', seccion: 'Identificación', requisito: 'Datos del responsable del tratamiento',
    descripcion: 'Nombre, denominación o razón social, domicilio y correo electrónico del responsable.',
    estado: 'cumplido', norma: 'Art. 36 Reglamento LFPDPPP',
  },
  {
    id: 'ds2', seccion: 'Identificación', requisito: 'Responsable de privacidad designado',
    descripcion: 'Identificación y datos de contacto del responsable o área encargada de datos personales.',
    estado: 'pendiente', norma: 'Art. 36 Reglamento LFPDPPP',
    notas: 'Se debe designar formalmente a un responsable o DPO.',
  },
  {
    id: 'ds3', seccion: 'Marco normativo', requisito: 'Inventario de bases de datos personales',
    descripcion: 'Descripción de cada base de datos personal que se mantiene: nombre, finalidad, categorías de datos, categorías de titulares.',
    estado: 'en_proceso', norma: 'Art. 37 Reglamento LFPDPPP',
    notas: 'Actualmente se documentan: expediente clínico, nómina, facturación, agenda.',
  },
  {
    id: 'ds4', seccion: 'Marco normativo', requisito: 'Clasificación de datos personales sensibles',
    descripcion: 'Identificación específica de los datos de salud como datos sensibles y medidas reforzadas aplicadas.',
    estado: 'cumplido', norma: 'Art. 3 LFPDPPP',
  },
  {
    id: 'ds5', seccion: 'Medidas de seguridad - Administrativas', requisito: 'Políticas y procedimientos de privacidad',
    descripcion: 'Reglas, manuales y procedimientos para el manejo de datos personales dentro de la organización.',
    estado: 'en_proceso', norma: 'Art. 48 Reglamento LFPDPPP',
    notas: 'Manual de privacidad en elaboración.',
  },
  {
    id: 'ds6', seccion: 'Medidas de seguridad - Administrativas', requisito: 'Capacitación al personal',
    descripcion: 'Programa de capacitación en protección de datos para el personal que tiene acceso a datos personales.',
    estado: 'pendiente', norma: 'Art. 48 Reglamento LFPDPPP',
    notas: 'Programar capacitación inicial y anual.',
  },
  {
    id: 'ds7', seccion: 'Medidas de seguridad - Administrativas', requisito: 'Acuerdos de confidencialidad con personal',
    descripcion: 'Convenios de confidencialidad firmados por empleados, médicos y colaboradores con acceso a datos de salud.',
    estado: 'pendiente', norma: 'Art. 53 Reglamento LFPDPPP',
  },
  {
    id: 'ds8', seccion: 'Medidas de seguridad - Técnicas', requisito: 'Control de acceso al sistema',
    descripcion: 'Mecanismos de autenticación (usuario/contraseña, 2FA) y autorización basada en roles para el acceso al sistema.',
    estado: 'cumplido', norma: 'Art. 57 Reglamento LFPDPPP', notas: 'RBAC de producto existe; el cumplimiento operativo lo valida el establecimiento.',
  },
  {
    id: 'ds9', seccion: 'Medidas de seguridad - Técnicas', requisito: 'Registro de actividad (Bitácora)',
    descripcion: 'Pista de auditoría que registra accesos, modificaciones y eliminaciones de datos personales.',
    estado: 'cumplido', norma: 'Art. 57 Reglamento LFPDPPP', notas: 'Consulta de AuditEvent disponible en Seguridad → Auditoría (no implica certificación).',
  },
  {
    id: 'ds10', seccion: 'Medidas de seguridad - Técnicas', requisito: 'Cifrado en tránsito y en reposo',
    descripcion: 'Cifrado de datos sensibles durante transmisión (TLS/HTTPS) y almacenamiento (AES-256).',
    estado: 'pendiente', norma: 'Art. 57 Reglamento LFPDPPP', notas: 'Depende del hospedaje y política del establecimiento; no afirmar AES-256 desde la UI.',
  },
  {
    id: 'ds11', seccion: 'Medidas de seguridad - Técnicas', requisito: 'Política de respaldo (Backup)',
    descripcion: 'Procedimiento documentado para respaldo periódico de datos personales y plan de recuperación ante desastres.',
    estado: 'pendiente', norma: 'Art. 57, 58 Reglamento LFPDPPP', notas: 'Operación de infraestructura; fuera de esta pantalla.',
  },
  {
    id: 'ds12', seccion: 'Medidas de seguridad - Físicas', requisito: 'Control de acceso físico a instalaciones',
    descripcion: 'Mecanismos para controlar el acceso físico a áreas donde se almacenan datos personales (servidores, archivos).',
    estado: 'no_aplica', norma: 'Art. 60 Reglamento LFPDPPP', notas: 'Aplica cuando hay instalaciones con servidores físicos.',
  },
  {
    id: 'ds13', seccion: 'Medidas de seguridad - Físicas', requisito: 'Destrucción segura de soportes físicos',
    descripcion: 'Procedimiento para destrucción segura de documentos impresos con datos personales (trituración, incineración).',
    estado: 'pendiente', norma: 'Art. 60 Reglamento LFPDPPP',
  },
  {
    id: 'ds14', seccion: 'Gestión de incidentes', requisito: 'Procedimiento de notificación de vulneraciones',
    descripcion: 'Protocolo de respuesta ante incidentes de seguridad y notificación al INAI y a los titulares afectados.',
    estado: 'pendiente', norma: 'Art. 20 LFPDPPP', notas: 'Se debe elaborar protocolo de respuesta a incidentes.',
  },
  {
    id: 'ds15', seccion: 'Derechos ARCO', requisito: 'Procedimiento de atención de Derechos ARCO',
    descripcion: 'Procedimiento documentado para recibir, tramitar y responder solicitudes ARCO dentro de 20 días hábiles.',
    estado: 'pendiente', norma: 'Art. 29 LFPDPPP', notas: 'Pantalla Derechos ARCO aún sin API de trámites.',
  },
  {
    id: 'ds16', seccion: 'Transferencias', requisito: 'Contratos con encargados / terceros',
    descripcion: 'Acuerdos con proveedores de servicios (laboratorios, aseguradoras, cloud) que acceden a datos personales.',
    estado: 'pendiente', norma: 'Art. 50 Reglamento LFPDPPP',
  },
];

const estadoDocConfig: Record<ItemDocSeg['estado'], { label: string; bg: string; text: string; icon: string; variant: 'success' | 'warning' | 'info' | 'secondary' }> = {
  cumplido: { label: 'Cumplido', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'ri-check-double-line', variant: 'success' },
  en_proceso: { label: 'En proceso', bg: 'bg-sky-50', text: 'text-sky-700', icon: 'ri-loader-4-line', variant: 'info' },
  pendiente: { label: 'Pendiente', bg: 'bg-amber-50', text: 'text-amber-700', icon: 'ri-time-line', variant: 'warning' },
  no_aplica: { label: 'No aplica', bg: 'bg-secondary-50', text: 'text-foreground-500', icon: 'ri-subtract-line', variant: 'secondary' },
};

const secciones = [...new Set(itemsDocSeg.map((i) => i.seccion))];

export default function DocumentoSeguridad() {
  const [data, setData] = useState<ItemDocSeg[]>(itemsDocSeg.map((i) => ({ ...i })));
  const [filtroEstado, setFiltroEstado] = useState<ItemDocSeg['estado'] | 'todos'>('todos');
  const [search, setSearch] = useState('');

  const stats = {
    total: data.length,
    cumplidos: data.filter((i) => i.estado === 'cumplido').length,
    enProceso: data.filter((i) => i.estado === 'en_proceso').length,
    pendientes: data.filter((i) => i.estado === 'pendiente').length,
    noAplica: data.filter((i) => i.estado === 'no_aplica').length,
    pct: Math.round((data.filter((i) => i.estado === 'cumplido').length / data.filter((i) => i.estado !== 'no_aplica').length) * 100),
  };

  const filtered = data.filter((i) => {
    const q = search.toLowerCase();
    const matchSearch = !q || i.requisito.toLowerCase().includes(q) || i.norma.toLowerCase().includes(q) || i.seccion.toLowerCase().includes(q);
    const matchEstado = filtroEstado === 'todos' || i.estado === filtroEstado;
    return matchSearch && matchEstado;
  });

  const updateEstado = (id: string, estado: ItemDocSeg['estado']) => {
    setData((prev) => prev.map((i) => i.id === id ? { ...i, estado } : i));
  };

  return (
    <div className="space-y-5" data-testid="page-documento-seguridad">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground-900 font-heading">Documento de Seguridad</h1>
          <p className="text-sm text-foreground-500 mt-1">
            Checklist operativo de referencia (estados solo en esta sesión)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<i className="ri-printer-line"></i>} onClick={() => window.print()}>
            Imprimir
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        Los cambios de estado <strong>no se guardan</strong> en servidor. El porcentaje es una ayuda
        de trabajo, <strong>no una certificación</strong> LFPDPPP ni evidencia ante autoridad.
      </div>

      {/* Progreso */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-foreground-800">Nivel de cumplimiento general</p>
          <span className="text-2xl font-bold text-foreground-900">{stats.pct}%</span>
        </div>
        <div className="w-full h-3 bg-secondary-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${stats.pct >= 80 ? 'bg-emerald-500' : stats.pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${stats.pct}%` }}
          />
        </div>
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <Stat icon="ri-check-double-line" value={stats.cumplidos} label="Cumplidos" color="text-emerald-600" />
          <Stat icon="ri-loader-4-line" value={stats.enProceso} label="En proceso" color="text-sky-600" />
          <Stat icon="ri-time-line" value={stats.pendientes} label="Pendientes" color="text-amber-600" />
          <Stat icon="ri-subtract-line" value={stats.noAplica} label="No aplica" color="text-foreground-400" />
        </div>
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
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as ItemDocSeg['estado'] | 'todos')} className="px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-700 outline-none focus:border-primary-400 transition-base">
          <option value="todos">Todos los estados</option>
          <option value="cumplido">Cumplidos</option>
          <option value="en_proceso">En proceso</option>
          <option value="pendiente">Pendientes</option>
          <option value="no_aplica">No aplica</option>
        </select>
        {(search || filtroEstado !== 'todos') && (
          <button onClick={() => { setSearch(''); setFiltroEstado('todos'); }} className="px-2.5 py-2 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-base cursor-pointer whitespace-nowrap border border-red-200">
            Limpiar
          </button>
        )}
      </div>

      {/* Tabla por sección */}
      <div className="space-y-4">
        {secciones.map((seccion) => {
          const items = filtered.filter((i) => i.seccion === seccion);
          if (!items.length) return null;
          return (
            <Card key={seccion} padding="none">
              <div className="px-4 py-3 border-b border-secondary-200 bg-secondary-50/60">
                <h3 className="text-sm font-semibold text-foreground-800 flex items-center gap-2">
                  <i className="ri-shield-check-line text-primary-600"></i>
                  {seccion}
                  <span className="text-2xs text-foreground-500 font-normal">({items.length} requisitos)</span>
                </h3>
              </div>
              <div className="divide-y divide-secondary-100">
                {items.map((item) => {
                  const estCfg = estadoDocConfig[item.estado];
                  return (
                    <div key={item.id} className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0 mt-0.5 ${estCfg.bg}`}>
                          <i className={`${estCfg.icon} text-sm ${estCfg.text}`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-foreground-800">{item.requisito}</p>
                            <Badge variant={estCfg.variant} size="sm">{estCfg.label}</Badge>
                            <span className="text-2xs text-foreground-400 font-mono">{item.norma}</span>
                          </div>
                          <p className="text-xs text-foreground-600 mt-0.5">{item.descripcion}</p>
                          {item.notas && (
                            <p className="text-2xs text-amber-600 mt-1 flex items-center gap-1">
                              <i className="ri-information-line"></i> {item.notas}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          <select value={item.estado} onChange={(e) => updateEstado(item.id, e.target.value as ItemDocSeg['estado'])}
                            className="px-2 py-1 text-xs bg-background-50 border border-secondary-200 rounded-md text-foreground-700 outline-none focus:border-primary-400 transition-base cursor-pointer">
                            <option value="cumplido">Cumplido</option>
                            <option value="en_proceso">En proceso</option>
                            <option value="pendiente">Pendiente</option>
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
          <strong>Nota legal:</strong> El Documento de Seguridad es un instrumento obligatorio conforme al artículo 36 del Reglamento de la LFPDPPP. 
          Debe mantenerse actualizado, ser de carácter interno y confidencial. Se recomienda revisión y actualización anual.
        </p>
      </div>
    </div>
  );
}

function Stat({ icon, value, label, color }: { icon: string; value: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <i className={`${icon} ${color}`}></i>
      <strong className="text-foreground-900">{value}</strong>
      <span className="text-foreground-500">{label}</span>
    </div>
  );
}