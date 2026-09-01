/**
 * CURP sintética (no persona real) con dígito verificador RENAPO.
 * Diccionario idéntico al de `CurpValidator` (.NET), con Ñ = U+00D1.
 */

const DIC =
  '0123456789ABCDEFGHIJKLMN\u00D1OPQRSTUVWXYZ';

function digitoVerificador(primeros17: string): string {
  if (primeros17.length !== 17) throw new Error('CURP base debe tener 17 caracteres');
  let suma = 0;
  for (let i = 0; i < 17; i++) {
    const idx = DIC.indexOf(primeros17[i]!);
    if (idx < 0) throw new Error(`Carácter CURP no válido: ${primeros17[i]}`);
    suma += idx * (18 - i);
  }
  let d = 10 - (suma % 10);
  if (d === 10) d = 0;
  return String(d);
}

const CONSONANTES = ['LRN', 'PRG', 'MTR', 'NLR', 'TRL', 'BLN', 'CRD', 'FGS'] as const;

/** CURP sintética única por corrida (varía día + consonantes; evita 409 en Dev compartida). */
export function curpSinteticaUnica(seed = Date.now()): string {
  const day = String((seed % 28) + 1).padStart(2, '0');
  const cons = CONSONANTES[seed % CONSONANTES.length]!;
  const homo = String(seed % 10);
  const base17 = `BADD1103${day}HDF${cons}${homo}`;
  if (base17.length !== 17) throw new Error(`base17 length ${base17.length}: ${base17}`);
  return base17 + digitoVerificador(base17);
}
