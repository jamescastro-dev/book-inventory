import { X } from "lucide-react";

const BookDetailsModal = ({ book, isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="
          bg-(--color-surface) rounded-(--radius) shadow-lg max-w-4xl w-full
          flex flex-col md:flex-row
          max-h-[90vh] overflow-hidden relative
          border border-(--color-border)
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="
            absolute top-3 right-3 z-10
            p-1.5 rounded-(--radius)
            text-(--color-muted-foreground) hover:text-(--color-foreground)
            hover:bg-(--color-muted)
            transition-colors duration-150
          "
        >
          <X size={18} />
        </button>

        {/* Left: Cover */}
        <div className="shrink-0 w-full md:w-2/5 bg-(--color-card) flex items-center justify-center p-6">
          <img
            src={book.image ? book.image : "https://placehold.co/400x600/e5d9c3/7c6a56?text=No+Cover"}
            alt={book.title}
            className="object-cover w-full h-72 md:h-full rounded shadow-sm"
          />
        </div>

        {/* Right: Details */}
        <div className="flex-1 p-7 flex flex-col overflow-y-auto">
          <h2 className="font-serif text-3xl font-semibold text-(--color-foreground) leading-tight mb-1">
            {book.title}
          </h2>

          {book.author && (
            <p className="text-sm text-(--color-muted-foreground) mb-4">
              by {book.author}
            </p>
          )}

          {/* Divider */}
          <div className="border-t border-(--color-border) mb-4" />

          <dl className="space-y-2 text-sm">
            {book.genre && (
              <div className="flex gap-2">
                <dt className="text-(--color-muted-foreground) w-20 shrink-0">Genre</dt>
                <dd className="text-(--color-foreground) font-medium">{book.genre}</dd>
              </div>
            )}
            {book.release_year && (
              <div className="flex gap-2">
                <dt className="text-(--color-muted-foreground) w-20 shrink-0">Year</dt>
                <dd className="text-(--color-foreground) font-medium">{book.release_year}</dd>
              </div>
            )}
          </dl>

          {book.description && (
            <p className="mt-4 text-sm text-(--color-muted-foreground) leading-relaxed whitespace-pre-wrap">
              {book.description}
            </p>
          )}

          {children && <div className="mt-auto pt-4">{children}</div>}
        </div>
      </div>
    </div>
  );
};

export default BookDetailsModal;