import { useContext } from 'react';
import { CajaContext } from '@/hooks/cajaContext';

export function useCaja() {
  const ctx = useContext(CajaContext);
  if (!ctx) throw new Error('useCaja must be used within CajaProvider');
  return ctx;
}
