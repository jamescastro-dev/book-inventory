import { useState } from "react";
import BookEditModal from "@/components/books/BookEditModal.jsx";
import BookDetailsModal from "@/components/books/BookDetailsModal.jsx";
import DeleteConfirmation from "@/components/ui/DeleteModal.jsx";

const BookItem = ({ book, onUpdate, onDelete }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const handleSave = (updatedBook) => {
    onUpdate(book.id, updatedBook);
    setIsEditModalOpen(false);
  };

  return (
    <>
      <div
        onClick={() => setIsDetailsModalOpen(true)}
        className="group cursor-pointer"
      >
        {/* Cover */}
        <div className="relative overflow-hidden rounded-(--radius) shadow-sm"
          style={{ aspectRatio: "2/3" }}>

          <img
            src={book.image || "https://placehold.co/400x600/e5d9c3/a08060?text="}
            alt={book.title}
            className="w-full h-full object-cover transition-transform duration-500 will-change-transform group-hover:scale-[1.04]"
            loading="lazy"
          />

          {/* Gradient overlay — always present, intensifies on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Hover info */}
          <div className="absolute inset-x-0 bottom-0 p-3 translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
            {book.author && (
              <p className="text-white/90 text-xs font-medium truncate">{book.author}</p>
            )}
            {book.release_year && (
              <p className="text-white/55 text-[0.68rem] mt-0.5">{book.release_year}</p>
            )}
          </div>

          {/* Genre pill */}
          {book.genre && (
            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <span className="bg-black/50 backdrop-blur-sm text-white/85 text-[0.6rem] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full">
                {book.genre}
              </span>
            </div>
          )}

          {/* Left spine accent */}
          <div className="absolute left-0 inset-y-0 w-[3px] bg-gradient-to-b from-(--color-gold)/60 via-(--color-gold) to-(--color-gold)/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-l-(--radius)" />
        </div>

        {/* Title below */}
        <div className="mt-2.5 px-0.5">
          <p className="font-serif text-sm font-semibold text-(--color-foreground) leading-snug line-clamp-2 group-hover:text-(--color-primary) transition-colors duration-200">
            {book.title}
          </p>
          {book.author && (
            <p className="text-[0.72rem] text-(--color-muted-foreground) mt-0.5 truncate">
              {book.author}
            </p>
          )}
        </div>
      </div>

      {isDetailsModalOpen && (
        <BookDetailsModal
          book={book}
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
        >
          <div className="mt-6 flex justify-end gap-2">
            <DeleteConfirmation
              onConfirm={() => onDelete(book.id)}
              buttonText="Delete"
              className="text-sm"
            />
            <button
              onClick={() => { setIsEditModalOpen(true); setIsDetailsModalOpen(false); }}
              className="btn-primary px-4 py-2 text-sm"
            >
              Edit
            </button>
          </div>
        </BookDetailsModal>
      )}

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