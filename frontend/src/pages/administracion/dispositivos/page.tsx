import { useCallback, useEffect, useState } from 'react';
import {
  approveDevice,
  listDevices,
  type DeviceDto,
} from '@/api/devices';
import Button from '@/components/base/Button';
import { useDevice } from '@/hooks/DeviceProvider';

/**
 * Administración de estaciones (dispositivos PWA).
 * Aprobar habilita cola offline + caché clínica (doc 12 / 13 §3.4).
 */
export default function AdminDispositivosPage() {
  const { devicePublicId, refreshDevice } = useDevice();
  const [items, setItems] = useState<DeviceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listDevices(false);
    setLoading(false);
    if (!res.success || !res.data) {
      setError(res.message ?? 'No se pudo cargar el listado de dispositivos.');
      return;
    }
    setItems(res.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onApprove(row: DeviceDto) {
    setBusyId(row.devicePublicId);
    const res = await approveDevice(row.devicePublicId, true);
    setBusyId(null);
    if (!res.success) {
      setError(res.message ?? 'No se pudo aprobar el dispositivo.');
      return;
    }
    await load();
    if (row.devicePublicId === devicePublicId) {
      await refreshDevice();
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dispositivos / estaciones</h1>
        <p className="text-sm text-slate-600 mt-1">
          Cada estación PWA se registra sola al iniciar sesión. Apruebe para habilitar cola
          local y caché clínica con antigüedad. Sin aprobación la estación opera solo en línea.
        </p>
        <p className="text-xs text-slate-500 mt-2 font-mono">
          Esta estación: {devicePublicId}
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 text-red-800 text-sm px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => void load()} disabled={loading}>
          Actualizar
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-3 py-2 font-medium">Nombre</th>
              <th className="px-3 py-2 font-medium">Id público</th>
              <th className="px-3 py-2 font-medium">Plataforma</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2 font-medium">Cola offline</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                  Cargando…
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                  Aún no hay dispositivos registrados.
                </td>
              </tr>
            )}
            {items.map((row) => (
              <tr key={row.deviceId} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  {row.displayName}
                  {row.devicePublicId === devicePublicId && (
                    <span className="ml-2 text-xs text-blue-600">(esta estación)</span>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-xs break-all">{row.devicePublicId}</td>
                <td className="px-3 py-2">{row.platform ?? '—'}</td>
                <td className="px-3 py-2">
                  {row.isApproved ? (
                    <span className="text-emerald-700">Aprobado</span>
                  ) : (
                    <span className="text-amber-700">Pendiente</span>
                  )}
                </td>
                <td className="px-3 py-2">{row.allowsOfflineQueue ? 'Sí' : 'No'}</td>
                <td className="px-3 py-2 text-right">
                  {!row.isApproved && (
                    <Button
                      size="sm"
                      disabled={busyId === row.devicePublicId}
                      onClick={() => void onApprove(row)}
                    >
                      Aprobar
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
