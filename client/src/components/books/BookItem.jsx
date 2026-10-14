import { useContext, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil } from "lucide-react";
import { AuthContext } from "@/context/AuthContext.jsx";
import BookEditModal from "@/components/books/BookEditModal.jsx";
import BookDetailsModal from "@/components/books/BookDetailsModal.jsx";
import Cover from "@/components/books/Cover.jsx";
import DeleteConfirmation from "@/components/ui/DeleteModal.jsx";
import { availability } from "@/utils/availability.js";

// Spelled out in full so Tailwind finds the class names
const TONE_TEXT = {
  success: "text-(--color-success)",
  accent: "text-(--color-accent)",
  danger: "text-(--color-danger)",
  muted: "text-(--color-muted-foreground)",
};

const BookItem = ({ book, myLoan, onUpdate, onDelete, onBorrow, onReturn }) => {
  const { user } = useContext(AuthContext);
  const isLibrarian = Boolean(user?.is_librarian);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const status = availability(book, myLoan);

  const handleSave = (updatedBook) => {
    onUpdate(book.id, updatedBook);
    setIsEditModalOpen(false);
  };

  const run = async (action) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <p className={`mr-auto text-sm ${status.tone === "danger" ? "text-(--color-danger) font-semibold" : "text-(--color-muted-foreground)"}`}>
        {status.detail}
      </p>

      {isLibrarian && (
        <>
          <DeleteConfirmation onConfirm={() => onDelete(book.id)} itemName={book.title} />
          <button
            type="button"
            onClick={() => { setIsEditModalOpen(true); setIsDetailsModalOpen(false); }}
            className="btn btn-secondary"
          >
            <Pencil className="w-4 h-4" aria-hidden="true" />
            Edit
          </button>
        </>
      )}

      {!user && (
        <Link to="/login" className="btn btn-primary">Sign in to borrow</Link>
      )}

      {user && myLoan && (
        <button type="button" disabled={busy} onClick={() => run(() => onReturn(book, myLoan))} className="btn btn-primary">
          {busy ? "Returning…" : "Return"}
        </button>
      )}

      {user && !myLoan && (
        <button
          type="button"
          disabled={busy || book.available_copies < 1}
          onClick={() => run(() => onBorrow(book))}
          className="btn btn-primary"
        >
          {book.available_copies < 1 ? "All copies on loan" : busy ? "Borrowing…" : "Borrow"}
        </button>
      )}
    </div>
  );

  return (
    <>
      <article className="group flex flex-col" data-book={book.title}>
        <button
          type="button"
          onClick={() => setIsDetailsModalOpen(true)}
          aria-label={`${book.title}${book.author ? ` by ${book.author}` : ""}: details`}
          className="relative block w-full aspect-2/3 rounded-(--radius-control) overflow-hidden cover-shadow bg-(--color-muted) transition duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-(--shadow-lg)"
        >
          <Cover book={book} />
          <span className={`badge badge-on-cover absolute top-2 left-2 ${TONE_TEXT[status.tone]}`}>
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-current" />
            {status.label}
          </span>
        </button>

        <div className="mt-3 px-0.5 min-w-0">
          <h3 className="text-[0.925rem] font-semibold leading-snug text-(--color-foreground) line-clamp-2">
            {book.title}
          </h3>
          {book.author && (
            <p className="mt-0.5 text-sm text-(--color-muted-foreground) truncate">{book.author}</p>
          )}
          <p className="mt-1 text-xs text-(--color-muted-foreground)">
            {[book.genre, book.release_year].filter(Boolean).join(" · ")}
          </p>
        </div>
      </article>

      <BookDetailsModal
        book={book}
        myLoan={myLoan}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
      >
        {actions}
      </BookDetailsModal>

      <BookEditModal
        book={book}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSave}
      />
    </>
  );
};

export default BookItem;
