import { useState } from 'react';
import Modal from '@/components/base/Modal';
import Button from '@/components/base/Button';
import { currentSession } from '@/mocks/caja';
import { paymentMethodConfig } from '@/mocks/caja';
import type { CashTransaction, CorteCaja } from '@/mocks/caja';

interface CierreCajaModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (corte: CorteCaja) => void;
  transactions: CashTransaction[];
}

export default function CierreCajaModal({ open, onClose, onConfirm, transactions }: CierreCajaModalProps) {
  const [observaciones, setObservaciones] = useState('');
  const [confirmado, setConfirmado] = useState(false);

  const pagadas = transactions.filter(t => t.estado === 'pagado');
  const canceladas = transactions.filter(t => t.estado === 'cancelado').length;
  const reembolsos = transactions.filter(t => t.estado === 'reembolsado').length;

  const totalEfectivo = pagadas.reduce((sum, t) => sum + (t.detallePago?.efectivo || 0), 0);
  const totalTarjeta = pagadas.reduce((sum, t) => sum + (t.detallePago?.tarjeta || 0), 0);
  const totalTransferencia = pagadas.reduce((sum, t) => sum + (t.detallePago?.transferencia || 0), 0);
  const totalIngresos = pagadas.reduce((sum, t) => sum + t.total, 0);

  const montoCierre = currentSession.montoApertura + totalIngresos;

  const handleConfirmar = () => {
    const now = new Date();
    const horaCierre = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const corte: CorteCaja = {
      id: `corte-${String(Date.now()).slice(-6)}`,
      sesionId: currentSession.id,
      fecha: currentSession.fecha,
      horaApertura: currentSession.apertura,
      horaCierre,
      usuario: currentSession.usuario,
      montoApertura: currentSession.montoApertura,
      totalEfectivo,
      totalTarjeta,
      totalTransferencia,
      totalIngresos,
      cantidadTransacciones: pagadas.length,
      canceladas,
      reembolsos,
      montoCierre,
      diferencia: 0,
      observaciones: observaciones || 'Cierre sin observaciones.',
    };

    onConfirm(corte);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cierre de Caja"
      size="lg"
      footer={
        <div className="flex items-center gap-2 w-full">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <div className="flex-1"></div>
          {!confirmado ? (
            <Button variant="warning" size="sm" onClick={() => setConfirmado(true)}>
              <i className="ri-alert-line"></i> Iniciar Cierre
            </Button>
          ) : (
            <Button variant="danger" size="sm" onClick={handleConfirmar}>
              <i className="ri-door-lock-line"></i> Confirmar Cierre Definitivo
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        {!confirmado ? (
          <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200/60 rounded-lg">
            <span className="w-5 h-5 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
              <i className="ri-alert-line"></i>
            </span>
            <div>
              <p className="text-xs font-semibold text-amber-800">Está por cerrar la caja del día</p>
              <p className="text-[11px] text-amber-700 mt-0.5">Una vez cerrada no podrá registrar más cobros en esta sesión. Revise que todas las transacciones estén correctas antes de continuar.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-3.5 bg-red-500/10 border border-red-500/20 rounded-lg">
            <span className="w-5 h-5 flex items-center justify-center text-red-600 shrink-0 mt-0.5">
              <i className="ri-error-warning-line"></i>
            </span>
            <div>
              <p className="text-xs font-semibold text-red-800">Confirmación final requerida</p>
              <p className="text-[11px] text-red-700 mt-0.5">Esta acción es irreversible. Verifique que todos los montos sean correctos.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-secondary-50/70 rounded-lg p-2.5">
            <p className="text-[10px] text-foreground-400">Sesión</p>
            <p className="text-xs font-semibold text-foreground-800">{currentSession.id.toUpperCase()}</p>
          </div>
          <div className="bg-secondary-50/70 rounded-lg p-2.5">
            <p className="text-[10px] text-foreground-400">Usuario</p>
            <p className="text-xs font-semibold text-foreground-800">{currentSession.usuario}</p>
          </div>
          <div className="bg-secondary-50/70 rounded-lg p-2.5">
            <p className="text-[10px] text-foreground-400">Apertura</p>
            <p className="text-xs font-semibold text-foreground-800">{currentSession.fecha} · {currentSession.apertura} hrs</p>
          </div>
          <div className="bg-secondary-50/70 rounded-lg p-2.5">
            <p className="text-[10px] text-foreground-400">Fondo inicial</p>
            <p className="text-xs font-semibold text-foreground-800">${currentSession.montoApertura.toLocaleString()}</p>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-foreground-900 mb-2">Resumen del día</h4>
          <div className="bg-secondary-50/70 rounded-lg p-3 space-y-2">
            {[
              { label: 'Efectivo', value: totalEfectivo, icon: 'ri-cash-line', color: 'text-emerald-600' },
              { label: 'Tarjeta', value: totalTarjeta, icon: 'ri-bank-card-line', color: 'text-accent-600' },
              { label: 'Transferencia', value: totalTransferencia, icon: 'ri-smartphone-line', color: 'text-primary-600' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 flex items-center justify-center ${item.color}`}>
                    <i className={`${item.icon} text-sm`}></i>
                  </span>
                  <span className="text-xs text-foreground-600">{item.label}</span>
                </div>
                <span className="text-xs font-semibold text-foreground-800">${item.value.toLocaleString()}</span>
              </div>
            ))}
            <div className="border-t border-secondary-200/70 pt-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground-800">Total ingresos</span>
              <span className="text-sm font-bold text-foreground-900 font-heading">${totalIngresos.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="text-center bg-secondary-50/70 rounded-lg p-2.5">
            <p className="text-lg font-bold text-foreground-900 font-heading">{pagadas.length}</p>
            <p className="text-[10px] text-foreground-400">Transacciones</p>
          </div>
          <div className="text-center bg-secondary-50/70 rounded-lg p-2.5">
            <p className="text-lg font-bold text-red-600 font-heading">{canceladas}</p>
            <p className="text-[10px] text-foreground-400">Canceladas</p>
          </div>
          <div className="text-center bg-secondary-50/70 rounded-lg p-2.5">
            <p className="text-lg font-bold text-amber-600 font-heading">{reembolsos}</p>
            <p className="text-[10px] text-foreground-400">Reembolsos</p>
          </div>
        </div>

        <div className="bg-primary-50 border border-primary-200/50 rounded-lg p-3.5">
          <p className="text-[10px] text-primary-600 font-medium">Monto total en caja (fondo + ingresos)</p>
          <p className="text-xl font-bold text-primary-700 font-heading">${montoCierre.toLocaleString()} MXN</p>
        </div>

        {confirmado && (
          <div>
            <label className="block text-[11px] text-foreground-500 font-medium mb-1.5">Observaciones</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas del cierre, discrepancias, novedades..."
              rows={2}
              maxLength={200}
              className="w-full px-3 py-2 text-xs bg-background-50 border border-secondary-200 rounded-lg outline-none focus:border-primary-400 resize-none"
            />
          </div>
        )}
      </div>
    </Modal>
  );
}