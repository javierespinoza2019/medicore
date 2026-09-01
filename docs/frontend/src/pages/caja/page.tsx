import { useState, useCallback, useMemo } from 'react';
import CajaHeader from '@/pages/caja/components/CajaHeader';
import PendientesCobroPanel from '@/pages/caja/components/PendientesCobroPanel';
import NuevoCobroPanel from '@/pages/caja/components/NuevoCobroPanel';
import TransaccionesList from '@/pages/caja/components/TransaccionesList';
import ReciboModal from '@/pages/caja/components/ReciboModal';
import CierreCajaModal from '@/pages/caja/components/CierreCajaModal';
import { currentSession, consultasPendientesCobro } from '@/mocks/caja';
import { useCaja } from '@/hooks/useCajaContext';
import type { CashTransaction, CorteCaja, ConsultaPendienteCobro } from '@/mocks/caja';
import type { MedicalService } from '@/mocks/services';

type CobroTab = 'pendientes' | 'manual';

export default function Caja() {
  const { transactions, paidConsultaIds, addTransaction, setPaidConsultaIds } = useCaja();
  const [selectedTransaction, setSelectedTransaction] = useState<CashTransaction | null>(null);
  const [reciboOpen, setReciboOpen] = useState(false);
  const [cierreOpen, setCierreOpen] = useState(false);
  const [cobroTab, setCobroTab] = useState<CobroTab>('pendientes');
  const [prefillPatientId, setPrefillPatientId] = useState<string | undefined>(undefined);
  const [prefillServices, setPrefillServices] = useState<MedicalService[] | undefined>(undefined);
  const [prefillConsultaId, setPrefillConsultaId] = useState<string | undefined>(undefined);
  const [prefillDoctor, setPrefillDoctor] = useState<string | undefined>(undefined);

  const handleOpenRecibo = useCallback((trx: CashTransaction) => {
    setSelectedTransaction(trx);
    setReciboOpen(true);
  }, []);

  const handleCloseRecibo = useCallback(() => {
    setReciboOpen(false);
    setSelectedTransaction(null);
  }, []);

  const handleCobrarDesdePendiente = useCallback((pendiente: ConsultaPendienteCobro, service: MedicalService) => {
    setPrefillPatientId(pendiente.pacienteId);
    setPrefillServices([service]);
    setPrefillConsultaId(pendiente.consultaId);
    setPrefillDoctor(pendiente.doctor);
    setCobroTab('manual');
  }, []);

  const handleCreateTransaction = useCallback((data: {
    pacienteId: string;
    paciente: string;
    servicios: MedicalService[];
    subtotal: number;
    descuento: number;
    total: number;
    metodoPago: 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto';
    detallePago: { efectivo?: number; tarjeta?: number; transferencia?: number };
    notas?: string;
    consultaId?: string;
    consultaDoctor?: string;
  }) => {
    addTransaction({
      pacienteId: data.pacienteId,
      paciente: data.paciente,
      concepto: data.servicios.map(s => s.nombre).join(' + '),
      subtotal: data.subtotal,
      descuento: data.descuento,
      total: data.total,
      metodoPago: data.metodoPago,
      detallePago: data.detallePago,
      notas: data.notas,
      origen: data.servicios[0].id,
      consultaId: data.consultaId,
      consultaDoctor: data.consultaDoctor,
    });

    // Reset prefill state
    setPrefillPatientId(undefined);
    setPrefillServices(undefined);
    setPrefillConsultaId(undefined);
    setPrefillDoctor(undefined);

    // Switch back to pendientes tab
    setCobroTab('pendientes');
  }, [addTransaction]);

  const handleCerrarCaja = useCallback((corte: CorteCaja) => {
    console.log('Caja cerrada:', corte);
  }, []);

  const pendientesCount = consultasPendientesCobro.filter(p => !paidConsultaIds.has(p.consultaId)).length;

  const pendientesFiltrados = consultasPendientesCobro.filter(p => !paidConsultaIds.has(p.consultaId));

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <CajaHeader
        transactions={transactions}
        fondoApertura={currentSession.montoApertura}
        usuario={currentSession.usuario}
        horaApertura={currentSession.apertura}
        estado={currentSession.estado}
        onCerrarCaja={() => setCierreOpen(true)}
        onAbrirCaja={() => {}}
      />

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Cobro Panel with tabs */}
        <div className="lg:col-span-5 xl:col-span-5 flex flex-col min-h-0">
          {/* Tabs */}
          <div className="flex items-center gap-1 mb-3">
            <button
              onClick={() => setCobroTab('pendientes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-base cursor-pointer whitespace-nowrap ${
                cobroTab === 'pendientes'
                  ? 'bg-primary-500 text-white'
                  : 'bg-secondary-100 text-foreground-500 hover:bg-secondary-200/70'
              }`}
            >
              <span className="w-3.5 h-3.5 flex items-center justify-center">
                <i className={`${cobroTab === 'pendientes' ? 'ri-timer-flash-line' : 'ri-timer-line'} text-xs`}></i>
              </span>
              Pendientes de cobro
              {pendientesCount > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  cobroTab === 'pendientes' ? 'bg-background-50/20 text-white' : 'bg-amber-100 text-amber-700'
                }`}>
                  {pendientesCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setCobroTab('manual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-base cursor-pointer whitespace-nowrap ${
                cobroTab === 'manual'
                  ? 'bg-primary-500 text-white'
                  : 'bg-secondary-100 text-foreground-500 hover:bg-secondary-200/70'
              }`}
            >
              <span className="w-3.5 h-3.5 flex items-center justify-center">
                <i className={`${cobroTab === 'manual' ? 'ri-add-circle-line' : 'ri-add-circle-line'} text-xs`}></i>
              </span>
              Cobro manual
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 min-h-0">
            {cobroTab === 'pendientes' ? (
              <div className="bg-background-50 border border-secondary-200/70 rounded-xl overflow-hidden flex flex-col h-full">
                <div className="px-5 py-3.5 border-b border-secondary-200/70 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-foreground-900 font-heading">
                    Consultas pendientes de cobro
                  </h2>
                  <span className="text-[11px] text-foreground-400">{pendientesCount} pendiente(s)</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <PendientesCobroPanel
                    onCobrarConsulta={handleCobrarDesdePendiente}
                    pendientes={pendientesFiltrados}
                  />
                </div>
              </div>
            ) : (
              <div className="overflow-y-auto h-full">
                <NuevoCobroPanel
                  prefilledPatientId={prefillPatientId}
                  prefilledServices={prefillServices}
                  prefilledConsultaId={prefillConsultaId}
                  prefilledDoctor={prefillDoctor}
                  onTransactionComplete={handleCreateTransaction}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right: Transacciones de Hoy */}
        <div className="lg:col-span-7 xl:col-span-7 min-h-0">
          <TransaccionesList
            transactions={transactions}
            onSelectTransaction={handleOpenRecibo}
          />
        </div>
      </div>

      {/* Modals */}
      <ReciboModal
        open={reciboOpen}
        onClose={handleCloseRecibo}
        transaction={selectedTransaction}
      />

      <CierreCajaModal
        open={cierreOpen}
        onClose={() => setCierreOpen(false)}
        onConfirm={handleCerrarCaja}
        transactions={transactions}
      />
    </div>
  );
}