import { apiFetch } from '@/api/client';

export type DeviceDto = {
  deviceId: string;
  devicePublicId: string;
  displayName: string;
  platform: string | null;
  branchId: string | null;
  isApproved: boolean;
  allowsOfflineQueue: boolean;
  requestedByUserId: string | null;
  createdAtUtc: string;
};

export async function registerDevice(input: {
  devicePublicId: string;
  displayName: string;
  platform?: string;
  branchId?: string | null;
}) {
  return apiFetch<DeviceDto>('/api/devices/register', {
    method: 'POST',
    body: JSON.stringify({
      devicePublicId: input.devicePublicId,
      displayName: input.displayName,
      platform: input.platform ?? null,
      branchId: input.branchId ?? null,
    }),
  });
}

export async function getDevice(devicePublicId: string) {
  return apiFetch<DeviceDto>(`/api/devices/${encodeURIComponent(devicePublicId)}`);
}

export async function listDevices(onlyPending = false) {
  const q = onlyPending ? '?onlyPending=true' : '';
  return apiFetch<DeviceDto[]>(`/api/devices${q}`);
}

export async function approveDevice(devicePublicId: string, allowsOfflineQueue = true) {
  return apiFetch<DeviceDto>(
    `/api/devices/${encodeURIComponent(devicePublicId)}/approve`,
    {
      method: 'POST',
      body: JSON.stringify({ allowsOfflineQueue }),
    },
  );
}
