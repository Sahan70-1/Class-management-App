import { X } from "lucide-react";
import { useId, useLayoutEffect, useRef, type ReactNode } from "react";

export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const backdropPressed = useRef(false);
  useLayoutEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  function outsidePanel(x: number, y: number) {
    const rect = ref.current!.getBoundingClientRect();
    return x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom;
  }
  return (
    <dialog
      className={"modal " + (wide ? "wide" : "")}
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onClose();
      }}
      onPointerDown={(event) => {
        backdropPressed.current =
          event.target === ref.current &&
          outsidePanel(event.clientX, event.clientY);
      }}
      onClick={(e) => {
        if (
          backdropPressed.current &&
          e.target === ref.current &&
          outsidePanel(e.clientX, e.clientY)
        )
          onClose();
        backdropPressed.current = false;
      }}
    >
      <div className="modal-heading">
        <div>
          <h2 id={titleId}>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}
