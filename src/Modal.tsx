import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector<HTMLElement>('input, button, select, textarea')?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab') return;
      const elements = [
        ...ref.current!.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input, textarea, select, a[href]',
        ),
      ];
      const first = elements[0],
        last = elements[elements.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-button" aria-label="Cerrar ventana" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
