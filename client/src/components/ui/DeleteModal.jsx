import { useState } from "react";
import { Trash2 } from "lucide-react";
import Sheet from "@/components/ui/Sheet.jsx";

// A Delete button that asks first
export default function DeleteConfirmation({ onConfirm, itemName, buttonText = "Delete", className = "" }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className={`btn btn-danger ${className}`}
      >
        <Trash2 className="w-4 h-4" aria-hidden="true" />
        {buttonText}
      </button>

      {isOpen && (
        <Sheet onClose={() => setIsOpen(false)} label="Confirm delete" size="sm">
          <div className="px-6 pt-8 pb-6 text-center">
            <span className="mx-auto w-12 h-12 rounded-full bg-(--color-danger-soft) text-(--color-danger) flex items-center justify-center">
              <Trash2 className="w-5 h-5" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-serif text-xl font-semibold text-(--color-foreground)">
              {itemName ? <>Delete “{itemName}”?</> : "Delete this item?"}
            </h3>
            <p className="mt-2 text-sm text-(--color-muted-foreground) leading-relaxed">
              It will be removed from the catalogue, along with its loan history. This can’t be undone.
            </p>
            <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-center">
              <button type="button" onClick={() => setIsOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                data-confirm-delete
                onClick={() => {
                  onConfirm();
                  setIsOpen(false);
                }}
                className="btn btn-danger-solid"
              >
                Delete
              </button>
            </div>
          </div>
        </Sheet>
      )}
    </>
  );
}
