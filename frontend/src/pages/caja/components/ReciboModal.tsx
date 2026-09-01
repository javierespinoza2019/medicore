import { useNavigate } from 'react-router-dom';
import Modal from '@/components/base/Modal';
import Button from '@/components/base/Button';
import Badge from '@/components/base/Badge';
import { paymentMethodConfig, transactionStatusConfig } from '@/mocks/caja';
import type { CashTransaction } from '@/mocks/caja';

interface ReciboModalProps {
  open: boolean;
  onClose: () => void;
  transaction: CashTransaction | null;
}

export default function ReciboModal({ open, onClose, transaction }: ReciboModalProps) {
  const navigate = useNavigate();

  if (!transaction) return null;

  const methodConf = paymentMethodConfig[transaction.metodoPago];
  const statusConf = transactionStatusConfig[transaction.estado];

  const handlePrint = () => {
    window.print();
  };

  const handleViewPatient = () => {
    onClose();
    navigate(`/app/pacientes/${transaction.pacienteId}`);
  };

  const handleFacturar = () => {
    onClose();
    navigate(`/app/facturacion?trx=${transaction.id}`);
  };

  return (
    <Modal open={open} onClose={onClose} title="Recibo de Pago" size="md">
      <div className="space-y-4">
        {/* Clinic header */}
        <div className="text-center pb-3 border-b border-dashed border-secondary-200">
          <p className="text-xs font-bold text-foreground-900 font-heading">MediCore — Clínica Central CDMX</p>
          <p className="text-[10px] text-foreground-500 mt-0.5">Av. Reforma 234, Col. Juárez, CDMX</p>
          <p className="text-[10px] text-foreground-500">RFC: MCO240101ABC · Tel: 55-1234-5678</p>
        </div>

        {/* Receipt info */}
        <div className="grid grid-cols-2 gap-y-2 text-xs">
          <div>
            <span className="text-foreground-400">Recibo:</span>
            <span className="ml-1 font-semibold text-foreground-800">{transaction.recibo}</span>
          </div>
          <div className="text-right">
            <span className="text-foreground-400">Estado:</span>
            <span className="ml-1">
              <Badge variant={statusConf.variant} size="sm">{statusConf.label}</Badge>
            </span>
          </div>
          <div>
            <span className="text-foreground-400">Fecha:</span>
            <span className="ml-1 text-foreground-700">{transaction.fecha}</span>
          </div>
          <div className="text-right">
            <span className="text-foreground-400">Hora:</span>
            <span className="ml-1 text-foreground-700">{transaction.hora} hrs</span>
          </div>
          <div className="col-span-2">
            <span className="text-foreground-400">Paciente:</span>
            <button
              onClick={handleViewPatient}
              className="ml-1 font-semibold text-primary-700 hover:text-primary-800 underline cursor-pointer"
            >
              {transaction.paciente}
            </button>
          </div>
          <div className="col-span-2">
            <span className="text-foreground-400">Concepto:</span>
            <span className="ml-1 text-foreground-700">{transaction.concepto}</span>
          </div>
          {transaction.consultaDoctor && (
            <div className="col-span-2">
              <span className="text-foreground-400">Médico:</span>
              <span className="ml-1 text-foreground-700">{transaction.consultaDoctor}</span>
            </div>
          )}
          <div className="col-span-2">
            <span className="text-foreground-400">Cobró:</span>
            <span className="ml-1 text-foreground-700">{transaction.usuario}</span>
          </div>
        </div>

        {/* Amounts */}
        <div className="bg-secondary-50/70 rounded-lg p-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-foreground-500">Subtotal</span>
            <span className="text-foreground-700">${transaction.subtotal.toLocaleString()}</span>
          </div>
          {transaction.descuento > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-emerald-600">Descuento</span>
              <span className="text-emerald-600 font-medium">-${transaction.descuento.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-secondary-200/70">
            <span className="text-foreground-900">Total</span>
            <span className="text-foreground-900 font-heading">${transaction.total.toLocaleString()} MXN</span>
          </div>
        </div>

        {/* Payment method detail */}
        <div>
          <p className="text-[11px] text-foreground-500 font-medium mb-1.5">Método de pago</p>
          <div className="flex items-center gap-2 px-3 py-2 bg-secondary-50/70 rounded-lg">
            <span className="w-4 h-4 flex items-center justify-center">
              <i className={`${methodConf.icon} ${methodConf.color} text-sm`}></i>
            </span>
            <span className="text-xs font-medium text-foreground-800">{methodConf.label}</span>
          </div>
          {transaction.detallePago && transaction.metodoPago === 'mixto' && (
            <div className="mt-2 space-y-1 pl-6">
              {transaction.detallePago.efectivo && transaction.detallePago.efectivo > 0 && (
                <p className="text-[11px] text-foreground-500">Efectivo: ${transaction.detallePago.efectivo.toLocaleString()}</p>
              )}
              {transaction.detallePago.tarjeta && transaction.detallePago.tarjeta > 0 && (
                <p className="text-[11px] text-foreground-500">Tarjeta: ${transaction.detallePago.tarjeta.toLocaleString()}</p>
              )}
              {transaction.detallePago.transferencia && transaction.detallePago.transferencia > 0 && (
                <p className="text-[11px] text-foreground-500">Transferencia: ${transaction.detallePago.transferencia.toLocaleString()}</p>
              )}
            </div>
          )}
          {transaction.detallePago && transaction.metodoPago === 'efectivo' && transaction.detallePago.efectivo && transaction.detallePago.efectivo > transaction.total && (
            <p className="mt-1 pl-6 text-[11px] text-emerald-600 font-medium">
              Cambio: ${(transaction.detallePago.efectivo - transaction.total).toLocaleString()} MXN
            </p>
          )}
        </div>

        {/* Notes */}
        {transaction.notas && (
          <div>
            <p className="text-[11px] text-foreground-500 font-medium mb-1">Notas</p>
            <p className="text-xs text-foreground-600 bg-secondary-50/70 rounded-lg p-2.5">{transaction.notas}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-secondary-200/70 pt-3">
          <div className="flex gap-2 print:hidden">
            <Button variant="ghost" size="sm" onClick={handleViewPatient}>
              <i className="ri-user-line"></i> Ver paciente
            </Button>
            <div className="flex-1"></div>
            <Button variant="secondary" size="sm" onClick={handleFacturar}>
              <i className="ri-file-shield-2-line"></i> Facturar (CFDI)
            </Button>
            <Button variant="primary" size="sm" onClick={handlePrint}>
              <i className="ri-printer-line"></i> Imprimir
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>

        {/* Print footer */}
        <div className="hidden print:block text-center pt-3 border-t border-dashed border-secondary-200">
          <p className="text-[10px] text-foreground-500">Gracias por su visita</p>
          <p className="text-[10px] text-foreground-400 mt-0.5">Este recibo no es un comprobante fiscal (CFDI)</p>
          <p className="text-[10px] text-foreground-400">Generado: {transaction.fecha} {transaction.hora} hrs por {transaction.usuario}</p>
        </div>
      </div>
    </Modal>
  );
}