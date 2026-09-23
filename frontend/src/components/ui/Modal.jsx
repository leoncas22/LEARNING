export function Modal({ open, title, onClose, children, wide = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/40 px-4 py-8 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className={`bg-white rounded-2xl border border-border-warm shadow-lg w-full ${wide ? 'max-w-2xl' : 'max-w-md'} my-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-warm">
          <h2 id="modal-title" className="text-lg font-semibold text-espresso">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-espresso/40 hover:text-espresso text-xl leading-none">
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
