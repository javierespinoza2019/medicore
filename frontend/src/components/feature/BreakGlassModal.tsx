import { useMemo, useState } from 'react';
import Modal from '@/components/base/Modal';
import Button from '@/components/base/Button';
import Input from '@/components/base/Input';
import { startBreakGlass, breakGlassGrantablePermissions } from '@/api/auth';
import { useAuth } from '@/hooks/useAuth';
import type { PermissionKey } from '@/utils/permissions';
import { getPermissions } from '@/utils/permissions';

interface BreakGlassModalProps {
  open: boolean;
  onClose: () => void;
}

export default function BreakGlassModal({ open, onClose }: BreakGlassModalProps) {
  const { role, permissions, applySessionPermissions } = useAuth();
  const [justification, setJustification] = useState('');
  const [selected, setSelected] = useState<PermissionKey[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const available = useMemo(() => {
    const current = getPermissions(role, permissions);
    return breakGlassGrantablePermissions.filter((p) => !current[p.key]);
  }, [role, permissions]);

  const toggle = (key: PermissionKey) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : prev.length < 5 ? [...prev, key] : prev,
    );
  };

  const handleSubmit = async () => {
    setError(null);
    setSaving(true);
    const res = await startBreakGlass(justification, selected);
    setSaving(false);
    if (!res.success || !res.data) {
      setError(res.message ?? 'No se pudo activar el acceso de emergencia.');
      return;
    }
    applySessionPermissions(
      res.data.permissions,
      (res.data.breakGlassGrants ?? []).map((g) => ({
        grantId: g.grantId,
        permissionKey: g.permissionKey as PermissionKey,
        expiresAtUtc: g.expiresAtUtc,
      })),
    );
    setJustification('');
    setSelected([]);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Acceso de emergencia (break-glass)"
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => void handleSubmit()} disabled={saving || selected.length === 0}>
            {saving ? 'Activando…' : 'Activar acceso'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-foreground-600">
          Use solo en emergencia clínica. Queda registrado en auditoría y notifica al administrador.
          La concesión dura 60 minutos.
        </p>
        <Input
          label="Justificación (mínimo 15 caracteres)"
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          placeholder="Describa la situación de emergencia…"
        />
        {available.length === 0 ? (
          <p className="text-sm text-foreground-500">No hay permisos adicionales disponibles para su rol.</p>
        ) : (
          <div>
            <p className="text-xs font-semibold text-foreground-500 uppercase mb-2">Permisos a conceder (máx. 5)</p>
            <div className="flex flex-wrap gap-2">
              {available.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => toggle(p.key)}
                  className={`px-2.5 py-1 text-xs rounded-full border cursor-pointer ${
                    selected.includes(p.key)
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-background-50 border-secondary-200 text-foreground-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
