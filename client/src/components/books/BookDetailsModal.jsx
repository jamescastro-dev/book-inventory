import Sheet from "@/components/ui/Sheet.jsx";
import Cover from "@/components/books/Cover.jsx";
import { availability } from "@/utils/availability.js";

const BookDetailsModal = ({ book, myLoan, isOpen, onClose, children }) => {
  if (!isOpen) return null;
  const status = availability(book, myLoan);

  return (
    <Sheet onClose={onClose} label={book.title} size="lg" footer={children}>
      {/* Header: the cover over a blurred copy of itself */}
      <div className="relative overflow-hidden">
        {(book.image_thumb || book.image) && (
          <img
            src={book.image_thumb || book.image}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover scale-125 blur-3xl opacity-40 dark:opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-b from-transparent to-(--color-surface)" aria-hidden="true" />

        <div className="relative flex flex-col sm:flex-row items-center sm:items-end gap-5 sm:gap-7 px-6 sm:px-8 pt-10 pb-6">
          <div className="w-36 sm:w-44 shrink-0 aspect-2/3 rounded-(--radius-control) overflow-hidden cover-shadow bg-(--color-muted)">
            <Cover book={book} size="medium" eager />
          </div>
          <div className="min-w-0 text-center sm:text-left">
            <span className={`badge badge-${status.tone}`}>{status.label}</span>
            <h2 className="mt-2 font-serif text-2xl sm:text-3xl font-semibold leading-tight tracking-tight text-(--color-foreground)">
              {book.title}
            </h2>
            {book.author && <p className="mt-1 text-(--color-muted-foreground)">by {book.author}</p>}
          </div>
        </div>
      </div>

      <div className="px-6 sm:px-8 pb-7">
        <dl className="grid grid-cols-3 gap-2 text-center sm:text-left">
          {[
            ["Genre", book.genre || "—"],
            ["Published", book.release_year || "—"],
            ["On shelf", book.copies != null ? `${book.available_copies} of ${book.copies}` : "—"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-(--radius-control) bg-(--color-muted) px-3 py-2.5 min-w-0">
              <dt className="text-[0.7rem] font-medium uppercase tracking-wider text-(--color-muted-foreground)">{label}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-(--color-foreground) truncate">{value}</dd>
            </div>
          ))}
        </dl>

        {book.description && (
          <section className="mt-6">
            <h3 className="text-sm font-semibold text-(--color-foreground)">About this book</h3>
            <p className="mt-2 text-sm text-(--color-muted-foreground) leading-relaxed whitespace-pre-wrap">
              {book.description}
            </p>
          </section>
        )}
      </div>
    </Sheet>
  );
};

export default BookDetailsModal;
