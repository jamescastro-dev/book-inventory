import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const WIDTHS = { sm: "sm:max-w-md", md: "sm:max-w-2xl", lg: "sm:max-w-3xl" };

// A dialog that slides up from the bottom on phones and sits in the middle on larger screens.
// Closes on Escape, on the close button and on a click outside it, and stops the page behind it
// from scrolling while it is open.
export default function Sheet({ onClose, label, size = "md", children, footer }) {
  const panelRef = useRef(null);
  // Keep the latest onClose without re-running the effect (the parent passes a new function each render)
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onCloseRef.current();
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-6">
      <div className="animate-backdrop-in absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`animate-sheet-in relative w-full ${WIDTHS[size]} max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-(--color-surface) rounded-t-[1.5rem] sm:rounded-[1.25rem] shadow-(--shadow-lg) outline-none overflow-hidden`}
      >
        {/* Grab handle: a phone-sheet cue, not a control */}
        <div className="sm:hidden absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-(--color-border-strong) z-10" aria-hidden="true" />
        <button type="button" onClick={onClose} aria-label="Close" className="icon-btn absolute top-3 right-3 z-20 bg-(--color-surface)/80 backdrop-blur">
          <X className="w-[1.1rem] h-[1.1rem]" />
        </button>
        <div className="overflow-y-auto overscroll-contain">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-(--color-border) bg-(--color-surface) px-5 sm:px-7 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
