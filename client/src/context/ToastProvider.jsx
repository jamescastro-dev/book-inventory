import { useCallback, useMemo, useRef, useState } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { ToastContext } from "./ToastContext.js";

// Errors stay up longer: they usually need reading
const DURATION = { success: 3500, error: 7000 };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback((kind, text) => {
    const id = nextId.current++;
    // Only the newest three; an identical message replaces its older copy
    setToasts((list) => [...list.filter((t) => t.text !== text).slice(-2), { id, kind, text }]);
    setTimeout(() => dismiss(id), DURATION[kind]);
  }, [dismiss]);

  const toast = useMemo(() => ({
    success: (text) => show("success", text),
    error: (text) => show("error", text),
  }), [show]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Above the phone tab bar; bottom right on wider screens */}
      <div className="fixed z-[70] inset-x-0 bottom-20 sm:bottom-6 px-4 flex flex-col items-center sm:items-end gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            data-toast={t.kind}
            className="animate-toast-in pointer-events-auto w-full max-w-sm flex items-start gap-3 rounded-(--radius) border border-(--color-border) bg-(--color-card) px-4 py-3 shadow-(--shadow-lg)"
          >
            {t.kind === "error"
              ? <CircleAlert className="w-5 h-5 shrink-0 text-(--color-danger)" aria-hidden="true" />
              : <CircleCheck className="w-5 h-5 shrink-0 text-(--color-success)" aria-hidden="true" />}
            <p className="flex-1 text-sm text-(--color-foreground) leading-snug">{t.text}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="-m-1 p-1 rounded-full text-(--color-muted-foreground) hover:text-(--color-foreground)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
