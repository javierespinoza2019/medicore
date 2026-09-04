/**
 * Logo institucional desde API (tenant o sucursal con fallback).
 * Sustituye localStorage como fuente de verdad.
 */

import { useEffect, useState } from 'react';
import { apiFetchBlobUrl } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';

export const BRAND_LOGO_CHANGED_EVENT = 'medicore:brand-logo-changed';

export function notifyBrandLogoChanged(): void {
  window.dispatchEvent(new Event(BRAND_LOGO_CHANGED_EVENT));
}

/**
 * @param branchId — si hay sucursal, GET /api/branches/{id}/logo (fallback a tenant en API).
 *                   sin sucursal / sin sesión → null (icono por defecto).
 */
export function useBrandLogo(branchId?: string | null): string | null {
  const { isAuthenticated } = useAuth();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    const load = async () => {
      if (!isAuthenticated) {
        setUrl(null);
        return;
      }
      const path = branchId?.trim()
        ? `/api/branches/${branchId}/logo`
        : '/api/tenant/logo';
      const next = await apiFetchBlobUrl(path);
      if (cancelled) {
        if (next) URL.revokeObjectURL(next);
        return;
      }
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = next;
      setUrl(next);
    };

    void load();
    const onChange = () => {
      void load();
    };
    window.addEventListener(BRAND_LOGO_CHANGED_EVENT, onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(BRAND_LOGO_CHANGED_EVENT, onChange);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isAuthenticated, branchId]);

  return url;
}
