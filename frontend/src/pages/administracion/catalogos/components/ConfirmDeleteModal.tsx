import Modal from '@/components/base/Modal';

interface ConfirmDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType: string;
}

export default function ConfirmDeleteModal({ open, onClose, onConfirm, itemName, itemType }: ConfirmDeleteModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} size="sm" role="alertdialog" ariaDescribedBy="delete-desc">
      <div className="text-center">
        <span className="w-14 h-14 flex items-center justify-center mx-auto rounded-full bg-red-100 text-red-500 mb-4">
          <i className="ri-delete-bin-line text-2xl" aria-hidden="true"></i>
        </span>
        <h3 className="text-base font-semibold text-foreground-900 mb-2">Eliminar {itemType}</h3>
        <p className="text-sm text-foreground-600 mb-2" id="delete-desc">
          ¿Estás seguro de que deseas eliminar{' '}
          <strong className="text-foreground-900">{itemName}</strong>?
        </p>
        <p className="text-2xs text-foreground-400">Esta acción no se puede deshacer.</p>
      </div>
      <div className="flex gap-3 mt-6">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-secondary-100 text-foreground-700 hover:bg-secondary-200 transition-base cursor-pointer whitespace-nowrap"
        >
          Cancelar
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 transition-base cursor-pointer whitespace-nowrap"
        >
          Sí, eliminar
        </button>
      </div>
    </Modal>
  );
}