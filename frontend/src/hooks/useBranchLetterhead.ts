import { useMemo } from 'react';
import { useUserBranches } from '@/hooks/useUserBranches';
import {
  branchToLetterhead,
  emptyLetterhead,
  type BranchLetterhead,
} from '@/utils/branchLetterhead';

/** Sucursal actual resuelta para encabezados de impresión (letterhead). */
export function useBranchLetterhead(): {
  letterhead: BranchLetterhead;
  loading: boolean;
} {
  const { resolvedBranchId, currentBranch, catalog, loading } = useUserBranches();

  const letterhead = useMemo((): BranchLetterhead => {
    if (resolvedBranchId) {
      const hit = catalog.find(
        (b) => b.branchId.toLowerCase() === resolvedBranchId.toLowerCase(),
      );
      if (hit) return branchToLetterhead(hit);
    }
    if (currentBranch) {
      return {
        id: currentBranch.id,
        nombre: currentBranch.nombre,
        direccion: 'No capturado',
        ciudad: 'No capturado',
        estado: 'No capturado',
        codigoPostal: '',
        telefono: currentBranch.telefono || 'No capturado',
        email: '',
      };
    }
    return emptyLetterhead();
  }, [resolvedBranchId, catalog, currentBranch]);

  return { letterhead, loading };
}
