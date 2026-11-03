import { useEffect, useRef } from "react";

export function Modal({ open, title, onClose, children, wide = false }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    dialogRef.current?.querySelector("button, input, select, textarea, a[href]")?.focus();
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose?.();
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/40 px-4 py-8 overflow-y-auto"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
      role="presentation"
    >
      <div
        className={`bg-white rounded-2xl border border-border-warm shadow-lg w-full ${wide ? "max-w-2xl" : "max-w-md"} my-auto`}
        role="dialog"
        aria-modal="true"
        ref={dialogRef}
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-warm">
          <h2 id="modal-title" className="text-lg font-semibold text-espresso">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg px-2 py-1 text-espresso/50 hover:text-espresso focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
