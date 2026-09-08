import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getDevice, registerDevice, type DeviceDto } from '@/api/devices';
import { useAuth } from '@/hooks/useAuth';
import {
  defaultDeviceDisplayName,
  getOrCreateDevicePublicId,
  guessPlatformLabel,
} from '@/sync/deviceIdentity';
import { clearClinicalCache } from '@/sync/clinicalReadCache';

type DeviceContextValue = {
  devicePublicId: string;
  device: DeviceDto | null;
  /** Aprobado y autorizado a cola/caché clínica offline. */
  allowsClinicalCache: boolean;
  isPendingApproval: boolean;
  refreshDevice: () => Promise<void>;
};

const DeviceContext = createContext<DeviceContextValue | null>(null);

export function DeviceProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, sucursalActualId } = useAuth();
  const [devicePublicId] = useState(() => getOrCreateDevicePublicId());
  const [device, setDevice] = useState<DeviceDto | null>(null);

  const refreshDevice = useCallback(async () => {
    if (!isAuthenticated) {
      setDevice(null);
      return;
    }
    const existing = await getDevice(devicePublicId);
    if (existing.success && existing.data) {
      setDevice(existing.data);
      return;
    }
    const registered = await registerDevice({
      devicePublicId,
      displayName: defaultDeviceDisplayName(),
      platform: guessPlatformLabel(),
      branchId: sucursalActualId,
    });
    if (registered.success && registered.data) {
      setDevice(registered.data);
    }
  }, [devicePublicId, isAuthenticated, sucursalActualId]);

  useEffect(() => {
    void refreshDevice();
  }, [refreshDevice]);

  useEffect(() => {
    if (!isAuthenticated) {
      void clearClinicalCache();
    }
  }, [isAuthenticated]);

  const value = useMemo<DeviceContextValue>(() => {
    const approved = Boolean(device?.isApproved);
    const allows = Boolean(device?.isApproved && device?.allowsOfflineQueue);
    return {
      devicePublicId,
      device,
      allowsClinicalCache: allows,
      isPendingApproval: Boolean(device && !approved),
      refreshDevice,
    };
  }, [device, devicePublicId, refreshDevice]);

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
}

export function useDevice(): DeviceContextValue {
  const ctx = useContext(DeviceContext);
  if (!ctx) {
    return {
      devicePublicId: getOrCreateDevicePublicId(),
      device: null,
      allowsClinicalCache: false,
      isPendingApproval: false,
      refreshDevice: async () => undefined,
    };
  }
  return ctx;
}
