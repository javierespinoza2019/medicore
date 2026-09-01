import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { todayTransactions, currentSession } from '@/mocks/caja';
import type { CashTransaction } from '@/mocks/caja';

interface AddTransactionInput {
  pacienteId: string;
  paciente: string;
  concepto: string;
  subtotal: number;
  descuento: number;
  total: number;
  metodoPago: 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto';
  detallePago?: { efectivo?: number; tarjeta?: number; transferencia?: number };
  notas?: string;
  origen?: string;
  reciboOrigen?: string;
  consultaId?: string;
  consultaDoctor?: string;
}

interface CajaContextType {
  transactions: CashTransaction[];
  setTransactions: React.Dispatch<React.SetStateAction<CashTransaction[]>>;
  paidConsultaIds: Set<string>;
  setPaidConsultaIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  addTransaction: (input: AddTransactionInput) => CashTransaction;
  pendientesCount: number;
}

const CajaContext = createContext<CajaContextType | null>(null);

export function CajaProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<CashTransaction[]>(todayTransactions);
  const [paidConsultaIds, setPaidConsultaIds] = useState<Set<string>>(new Set());

  const addTransaction = useCallback((input: AddTransactionInput): CashTransaction => {
    const now = new Date();
    const hora = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const reciboNum = String(72 + transactions.length).padStart(4, '0');

    const newTrx: CashTransaction = {
      id: `trx-${Date.now()}`,
      sesionId: currentSession.id,
      fecha: currentSession.fecha,
      hora,
      pacienteId: input.pacienteId,
      paciente: input.paciente,
      concepto: input.concepto,
      servicioId: input.origen || 'farmacia',
      consultaId: input.consultaId,
      consultaDoctor: input.consultaDoctor,
      subtotal: input.subtotal,
      descuento: input.descuento,
      total: input.total,
      metodoPago: input.metodoPago,
      detallePago: input.detallePago,
      estado: 'pagado',
      usuario: currentSession.usuario,
      recibo: input.reciboOrigen || `REC-2026-${reciboNum}`,
      notas: input.notas,
      origen: input.origen,
    };

    setTransactions(prev => [newTrx, ...prev]);

    if (input.consultaId) {
      setPaidConsultaIds(prev => new Set(prev).add(input.consultaId));
    }

    return newTrx;
  }, [transactions.length]);

  const pendientesCount = 0;

  return (
    <CajaContext.Provider value={{ transactions, setTransactions, paidConsultaIds, setPaidConsultaIds, addTransaction, pendientesCount }}>
      {children}
    </CajaContext.Provider>
  );
}

export function useCaja() {
  const ctx = useContext(CajaContext);
  if (!ctx) throw new Error('useCaja must be used within CajaProvider');
  return ctx;
}