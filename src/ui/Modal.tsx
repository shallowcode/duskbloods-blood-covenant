import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';

/**
 * Native <dialog> gives focus trapping, Esc handling and top-layer stacking
 * for free. `locked` dialogs (responses, results) cannot be dismissed.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'normal',
  locked = false,
  className = '',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  size?: 'normal' | 'wide' | 'narrow';
  locked?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`modal ${size} ${className}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        if (!locked) onClose();
      }}
    >
      {open && (
        <div className="modal-body">
          <header className="modal-head">
            <div>
              <h2 id={titleId}>{title}</h2>
              {description && <p className="modal-desc">{description}</p>}
            </div>
            {!locked && (
              <button
                type="button"
                className="icon-button"
                onClick={onClose}
                aria-label="关闭"
              >
                <X size={18} />
              </button>
            )}
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}
