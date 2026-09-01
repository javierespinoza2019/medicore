import type { ConsultaPendienteCobro } from '@/mocks/caja';
import type { MedicalService } from '@/mocks/services';

interface PendientesCobroPanelProps {
  onCobrarConsulta: (pendiente: ConsultaPendienteCobro, service: MedicalService) => void;
  pendientes: ConsultaPendienteCobro[];
}

export default function PendientesCobroPanel({ onCobrarConsulta, pendientes }: PendientesCobroPanelProps) {
  if (pendientes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-foreground-400">
        <span className="w-12 h-12 flex items-center justify-center rounded-full bg-secondary-100 mb-3">
          <i className="ri-check-double-line text-xl"></i>
        </span>
        <p className="text-sm font-medium text-foreground-500">Todas las consultas están cobradas</p>
        <p className="text-[11px] text-foreground-400 mt-0.5">No hay consultas pendientes de cobro por el momento</p>
      </div>
    );
  }

  const parciales = pendientes.filter(p => p.estado === 'cobro_parcial');
  const pendientesNormales = pendientes.filter(p => p.estado === 'pendiente_cobro');

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-secondary-100">
        {/* Cobros parciales first - they're more urgent */}
        {parciales.length > 0 && (
          <>
            <div className="px-5 py-2 bg-amber-50/70">
              <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">Cobros parciales — completar</p>
            </div>
            {parciales.map(pend => (
              <PendienteRow key={pend.id} pendiente={pend} onCobrar={onCobrarConsulta} />
            ))}
          </>
        )}

        {pendientesNormales.length > 0 && (
          <>
            <div className="px-5 py-2 bg-secondary-50/70">
              <p className="text-[10px] font-semibold text-foreground-500 uppercase tracking-wider">Pendientes de cobro — {pendientesNormales.length} consulta(s)</p>
            </div>
            {pendientesNormales.map(pend => (
              <PendienteRow key={pend.id} pendiente={pend} onCobrar={onCobrarConsulta} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function PendienteRow({ pendiente, onCobrar }: { pendiente: ConsultaPendienteCobro; onCobrar: PendientesCobroPanelProps['onCobrarConsulta'] }) {
  const isParcial = pendiente.estado === 'cobro_parcial';
  const restante = isParcial ? pendiente.precio - (pendiente.cobrado || 0) : pendiente.precio;

  const handleCobrar = () => {
    const service: MedicalService = {
      id: pendiente.servicioId,
      codigo: '',
      nombre: pendiente.servicio,
      especialidadId: '',
      especialidad: pendiente.especialidad,
      precio: isParcial ? restante : pendiente.precio,
      duracionMin: 0,
      tipo: 'consulta',
      requiereCita: false,
      activo: true,
      descripcion: '',
    };
    onCobrar(pendiente, service);
  };

  return (
    <div className={`px-5 py-3.5 hover:bg-secondary-50/50 transition-base ${
      isParcial ? 'bg-amber-500/10' : ''
    }`}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-9 h-9 flex items-center justify-center rounded-full bg-primary-100 text-primary-600 font-bold text-xs shrink-0">
          {pendiente.paciente.split(' ').map(n => n.charAt(0)).slice(0, 2).join('')}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-semibold text-foreground-800 truncate">{pendiente.paciente}</span>
            {isParcial && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold whitespace-nowrap">
                <i className="ri-time-line"></i> Parcial
              </span>
            )}
          </div>
          <p className="text-[11px] text-foreground-500">{pendiente.servicio} · {pendiente.especialidad}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-foreground-400">{pendiente.doctor}</span>
            <span className="text-[10px] text-foreground-300">·</span>
            <span className="text-[10px] text-foreground-400">{pendiente.horaAtencion}</span>
            <span className="text-[10px] text-foreground-300">·</span>
            <span className="text-[10px] text-foreground-400">{pendiente.consultorio}</span>
          </div>
        </div>

        {/* Price + Action */}
        <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
          <div>
            <p className="text-sm font-bold text-foreground-900 font-heading">${restante.toLocaleString()}</p>
            {isParcial && (
              <p className="text-[10px] text-amber-600">
                Cobrado: ${pendiente.cobrado?.toLocaleString()} · Resta: ${restante.toLocaleString()}
              </p>
            )}
          </div>
          <button
            onClick={handleCobrar}
            className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-background-50 bg-primary-500 hover:bg-primary-600 rounded-lg transition-base cursor-pointer whitespace-nowrap"
          >
            <i className="ri-cash-line text-xs"></i>
            {isParcial ? 'Completar cobro' : 'Cobrar ahora'}
          </button>
        </div>
      </div>
    </div>
  );
}