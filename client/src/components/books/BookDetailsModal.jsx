import { X } from "lucide-react";

const BookDetailsModal = ({ book, isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 p-4"
      onClick={onClose} // close on backdrop click
    >
      <div
        className="
          bg-(--color-surface) rounded-lg shadow-lg max-w-4xl w-full
          flex flex-col md:flex-row
          max-h-[90vh] overflow-hidden relative
          border border-(--color-border)
        "
        onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="
            absolute top-3 right-3 text-(--color-foreground)
            hover:text-(--color-primary) transition-colors
          "
        >
          <X size={24} />
        </button>

        {/* Left side: Book Cover */}
        <div className="shrink-0 w-full md:w-1/2 bg-(--color-card) flex items-center justify-center p-4">
          <img
            src={
              book.image
                ? `${import.meta.env.VITE_API_URL}${book.image}`
                : "https://placehold.co/600x400/png"
            }
            alt={book.title}
            className="object-cover w-full h-80 md:h-full rounded shadow-sm"
          />
        </div>

        {/* Right side: Book Details */}
        <div className="flex-1 p-6 flex flex-col overflow-y-auto">
          <h2 className="text-3xl font-serif font-bold mb-4 text-(--color-foreground)">
            {book.title}
          </h2>

          {book.author && (
            <p className="mb-2 text-(--color-foreground)">
              <strong>Author:</strong> {book.author}
            </p>
          )}
          {book.genre && (
            <p className="mb-2 text-(--color-foreground)">
              <strong>Genre:</strong> {book.genre}
            </p>
          )}
          {book.release_year && (
            <p className="mb-2 text-(--color-foreground)">
              <strong>Year:</strong> {book.release_year}
            </p>
          )}
          {book.description && (
            <p className="mt-4 text-(--color-foreground) leading-relaxed whitespace-pre-wrap">
              {book.description}
            </p>
          )}

          {/* Footer Actions */}
          {children && <div className="mt-auto">{children}</div>}
        </div>
      </div>
    </div>
  );
};

export default BookDetailsModal;
