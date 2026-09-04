import type { BranchDto } from '@/api/branches';

/** Ids prototipo legacy (localStorage E2E / sesiones antiguas). */
export const LEGACY_PROTO_BRANCH_CODE: Record<string, string> = {
  suc1: 'CENTRAL',
  suc2: 'NORTE',
  suc3: 'SUR',
};

/**
 * GUIDs seed demo (tenant demo) para contingencia sin catálogo de sucursales.
 * Evita bloquear ingreso (SC-19) si listBranches no alcanzó a cargar o el Core cayó.
 */
export const LEGACY_PROTO_BRANCH_ID: Record<string, string> = {
  suc1: '22222222-2222-2222-2222-222222222222',
  suc2: '22222222-2222-2222-2222-222222222002',
  suc3: '22222222-2222-2222-2222-222222222003',
};

const SEED_BRANCH_ID_BY_CODE: Record<string, string> = {
  CENTRAL: LEGACY_PROTO_BRANCH_ID.suc1,
  NORTE: LEGACY_PROTO_BRANCH_ID.suc2,
  SUR: LEGACY_PROTO_BRANCH_ID.suc3,
};

/** Resuelve GUID de sucursal: sesión puede traer id prototipo (suc1) o GUID real. */
export function resolveBranchId(
  sucursalActualId: string | null,
  branches: BranchDto[],
): string | null {
  if (sucursalActualId && /^[0-9a-f-]{36}$/i.test(sucursalActualId)) {
    if (!branches.length) return sucursalActualId;
    const hit = branches.find(
      (b) => b.branchId.toLowerCase() === sucursalActualId.toLowerCase(),
    );
    return hit?.branchId ?? sucursalActualId;
  }

  if (!branches.length) {
    return sucursalActualId ? (LEGACY_PROTO_BRANCH_ID[sucursalActualId] ?? null) : null;
  }

  const protoCode = sucursalActualId ? LEGACY_PROTO_BRANCH_CODE[sucursalActualId] : undefined;
  if (protoCode) {
    const byCode = branches.find((b) => b.code.toUpperCase() === protoCode);
    if (byCode) return byCode.branchId;
  }
  const central = branches.find((b) => b.code.toUpperCase() === 'CENTRAL');
  return central?.branchId ?? branches[0].branchId;
}

/** Migra id guardado en localStorage (GUID o suc1) al id de sesión del usuario. */
export function resolveStoredBranchId(
  stored: string,
  userBranchIds: string[],
): string | null {
  const normalized = stored.trim();
  if (!normalized || userBranchIds.length === 0) return null;

  const direct = userBranchIds.find((id) => id.toLowerCase() === normalized.toLowerCase());
  if (direct) return direct;

  const legacyGuid = LEGACY_PROTO_BRANCH_ID[normalized];
  if (legacyGuid) {
    const match = userBranchIds.find((id) => id.toLowerCase() === legacyGuid.toLowerCase());
    if (match) return match;
  }

  return null;
}

/** Contingencia cuando el login trae códigos pero no GUIDs (no debería ocurrir en Core). */
export function branchIdsFromCodes(codes: string[]): string[] {
  return codes
    .map((code) => SEED_BRANCH_ID_BY_CODE[code.toUpperCase()])
    .filter((id): id is string => Boolean(id));
}
