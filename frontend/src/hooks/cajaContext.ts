import { createContext } from 'react';
import type { CashTransaction } from '@/mocks/caja';

export interface AddTransactionInput {
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

export interface CajaContextType {
  transactions: CashTransaction[];
  setTransactions: React.Dispatch<React.SetStateAction<CashTransaction[]>>;
  paidConsultaIds: Set<string>;
  setPaidConsultaIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  addTransaction: (input: AddTransactionInput) => CashTransaction;
  pendientesCount: number;
}

export const CajaContext = createContext<CajaContextType | null>(null);
