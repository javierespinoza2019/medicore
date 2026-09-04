import type { BranchDto } from '@/api/branches';

/** Encabezado de documentos impresos (compatible con layout del prototipo). */
export type BranchLetterhead = {
  id: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  estado: string;
  codigoPostal: string;
  telefono: string;
  email: string;
};

const NO_CAPTURADO = 'No capturado';

export function branchToLetterhead(branch: BranchDto): BranchLetterhead {
  const calle = [branch.addressStreet, branch.addressNumber]
    .filter((p): p is string => !!p && p.trim().length > 0)
    .join(' ');
  const colonia = branch.addressNeighborhood?.trim();
  const direccion =
    [calle, colonia].filter(Boolean).join(', ') || NO_CAPTURADO;

  return {
    id: branch.branchId,
    nombre: branch.name,
    direccion,
    ciudad: branch.addressMunicipality?.trim() || NO_CAPTURADO,
    estado: branch.addressState?.trim() || NO_CAPTURADO,
    codigoPostal: branch.addressPostalCode?.trim() || '',
    telefono: branch.phoneNumber?.trim() || NO_CAPTURADO,
    email: '',
  };
}

export function emptyLetterhead(): BranchLetterhead {
  return {
    id: '',
    nombre: NO_CAPTURADO,
    direccion: NO_CAPTURADO,
    ciudad: NO_CAPTURADO,
    estado: NO_CAPTURADO,
    codigoPostal: '',
    telefono: NO_CAPTURADO,
    email: '',
  };
}
