import { useEffect, useMemo, useState } from 'react';
import { listBranches, type BranchDto } from '@/api/branches';
import { useAuth } from '@/hooks/useAuth';
import { resolveBranchId } from '@/utils/branchResolution';

export type UserBranchView = {
  id: string;
  nombre: string;
  telefono: string;
};

function toBranchView(dto: BranchDto): UserBranchView {
  return {
    id: dto.branchId,
    nombre: dto.name,
    telefono: dto.phoneNumber ?? '',
  };
}

/** Sucursales asignadas al usuario, resueltas contra el catálogo del API (M11). */
export function useUserBranches() {
  const { user, sucursalActualId } = useAuth();
  const [catalog, setCatalog] = useState<BranchDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await listBranches(true);
      if (!cancelled && res.success && res.data) setCatalog(res.data);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const allowedIds = useMemo(() => {
    return new Set((user?.sucursalIds ?? []).map((id) => id.toLowerCase()));
  }, [user?.sucursalIds]);

  const userBranches = useMemo((): UserBranchView[] => {
    if (allowedIds.size === 0) return [];
    return catalog
      .filter((b) => allowedIds.has(b.branchId.toLowerCase()))
      .map(toBranchView);
  }, [allowedIds, catalog]);

  const resolvedBranchId = resolveBranchId(sucursalActualId, catalog);

  const currentBranch = useMemo((): UserBranchView | null => {
    if (resolvedBranchId) {
      const hit = catalog.find(
        (b) => b.branchId.toLowerCase() === resolvedBranchId.toLowerCase(),
      );
      if (hit) return toBranchView(hit);
    }
    const sessionIdx = user?.sucursalIds?.findIndex(
      (id) => id.toLowerCase() === (sucursalActualId ?? '').toLowerCase(),
    ) ?? -1;
    if (sessionIdx >= 0) {
      const id = user!.sucursalIds[sessionIdx];
      const nombre = user!.sucursales[sessionIdx] ?? 'Sucursal';
      return { id, nombre, telefono: '' };
    }
    return null;
  }, [resolvedBranchId, catalog, user, sucursalActualId]);

  return {
    userBranches,
    currentBranch,
    resolvedBranchId,
    loading,
    catalog,
  };
}
