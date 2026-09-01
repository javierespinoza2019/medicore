import { useState } from 'react';
import Modal from '@/components/base/Modal';
import Button from '@/components/base/Button';
import Input from '@/components/base/Input';
import { changePassword } from '@/api/auth';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ChangePasswordModal({ open, onClose, onSuccess }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirm) {
      setError('La confirmación no coincide.');
      return;
    }
    setSaving(true);
    const res = await changePassword(currentPassword, newPassword);
    setSaving(false);
    if (!res.success) {
      setError(res.message ?? 'No se pudo cambiar la contraseña.');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirm('');
    onClose();
    onSuccess();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cambiar contraseña"
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? 'Guardando…' : 'Cambiar'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-foreground-500">
          Al cambiar la contraseña se cerrarán todas sus sesiones (#75).
        </p>
        <Input
          label="Contraseña actual"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
        />
        <Input
          label="Nueva contraseña"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
        />
        <Input
          label="Confirmar nueva contraseña"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
