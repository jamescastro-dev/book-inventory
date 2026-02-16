import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function DeleteConfirmation({
  onConfirm,
  buttonText = "Delete",
  className,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const modalContent = (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 p-4"
      onClick={() => setIsOpen(false)}>
      <div
        className="bg-(--color-surface) rounded-lg shadow-lg p-6 max-w-sm w-full border border-(--color-border) relative"
        onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-3 right-3 text-(--color-foreground) hover:text-(--color-primary) transition-colors">
          <X size={20} />
        </button>
        <h3 className="text-xl font-serif font-bold text-(--color-foreground) mb-4 text-center">
          Confirm Delete
        </h3>
        <p className="text-(--color-foreground) text-center mb-6">
          Are you sure you want to delete this item? This action cannot be
          undone.
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setIsOpen(false)}
            className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-100 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              setIsOpen(false);
            }}
            className="bg-red-700 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className={`text-sm px-4 py-1 rounded border border-red-700 text-red-700 hover:bg-red-700 hover:text-white transition-colors ${className}`}>
        {buttonText}
      </button>

      {isOpen && createPortal(modalContent, document.body)}
    </>
  );
}
