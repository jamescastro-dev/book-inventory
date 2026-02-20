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
      {/* Book Card: only image */}
      <div
        onClick={() => setIsDetailsModalOpen(true)}
        className="card cursor-pointer overflow-hidden rounded-md shadow-md hover:shadow-lg transition-shadow duration-200">
        <img
          src={
            book.image
              ? book.image
              : "https://placehold.co/600x400/png"
          }
          alt={book.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Details Modal: contains all info + actions */}
      {isDetailsModalOpen && (
        <BookDetailsModal
          book={book}
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}>
          <div className="mt-6 flex justify-end gap-3">
            {/* Delete button — first */}
            <DeleteConfirmation
              onConfirm={() => onDelete(book.id)}
              buttonText="Delete"
              className="text-sm"
            />

            {/* Edit button — second */}
            <button
              onClick={() => {
                setIsEditModalOpen(true); // open edit modal
                setIsDetailsModalOpen(false); // close details modal
              }}
              className="btn-primary px-4 py-2 rounded text-sm">
              Edit
            </button>
          </div>
        </BookDetailsModal>
      )}

      {/* Edit Modal */}
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
