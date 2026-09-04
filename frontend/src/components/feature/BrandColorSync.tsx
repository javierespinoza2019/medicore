import { useCallback, useEffect } from 'react';
import { getTenantProfile } from '@/api/branches';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import {
  applyPrimaryScaleToElement,
  BRAND_CHANGED_EVENT,
  buildPrimaryScale,
} from '@/utils/brandColor';

const THEME_ROOT_SELECTOR = '[data-theme-root]';

/**
 * Lee `primaryColorToken` del tenant autenticado y lo aplica a la escala
 * `--primary-*` del contenedor de tema (white-label).
 */
export function BrandColorSync() {
  const { isAuthenticated } = useAuth();
  const { theme } = useTheme();

  const sync = useCallback(async () => {
    const root = document.querySelector(THEME_ROOT_SELECTOR);
    if (!(root instanceof HTMLElement)) return;

    if (!isAuthenticated) {
      applyPrimaryScaleToElement(root, null);
      return;
    }

    const res = await getTenantProfile();
    const token = res.success ? (res.data?.primaryColorToken ?? null) : null;
    applyPrimaryScaleToElement(root, buildPrimaryScale(token));
  }, [isAuthenticated]);

  useEffect(() => {
    void sync();
  }, [sync, theme]);

  useEffect(() => {
    const onBrand = () => {
      void sync();
    };
    window.addEventListener(BRAND_CHANGED_EVENT, onBrand);
    return () => window.removeEventListener(BRAND_CHANGED_EVENT, onBrand);
  }, [sync]);

  return null;
}

export default BrandColorSync;
