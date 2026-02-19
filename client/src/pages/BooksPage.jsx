import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import BookItem from "@/components/books/BookItem.jsx";
import SearchBar from "@/components/books/SearchBar.jsx";
import BookDetailsModal from "@/components/books/BookDetailsModal.jsx";

const BooksPage = () => {
  const [books, setBooks] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const location = useLocation();

  // Base API URL from .env
  const API_URL = import.meta.env.VITE_API_BOOKS_URL;
  const accessToken = localStorage.getItem("access_token"); // for auth if needed

  // Fetch books from backend
  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/books/`);
      if (!res.ok) throw new Error("Failed to fetch books");
      const data = await res.json();
      setBooks(data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch books. Try again later.");
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchBooks();
  }, [location.pathname, fetchBooks]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Update book
  const updateBook = async (id, updatedBook) => {
    try {
      const res = await fetch(`${API_URL}/books/${id}/`, {
        method: "PUT",
        body: updatedBook, // updatedBook is already FormData from BookEditModal
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Django returned error:", errorData);
        throw new Error("Failed to update book");
      }

      const data = await res.json();
      setBooks((prev) => prev.map((b) => (b.id === id ? data : b)));
      setSuccess("Book updated successfully!");
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to update book.");
      fetchBooks(); // rollback
    }
  };

  // Delete book
  const deleteBook = async (id) => {
    try {
      setBooks((prev) => prev.filter((b) => b.id !== id));
      const res = await fetch(`${API_URL}/books/${id}/`, {
        method: "DELETE",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (!res.ok) throw new Error("Failed to delete book");
    } catch (err) {
      console.error(err);
      setError("Failed to delete book.");
      fetchBooks();
    }
  };

  // Filtered books based on search
  const filteredBooks = books.filter(
    (book) =>
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (book.author &&
        book.author.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  return (
    <div className="max-w-6xl mx-auto p-5">
      {/* Title */}
      <h2 className="text-4xl font-serif font-semibold mb-4 text-(--color-foreground) text-center pb-1">
        List of Books
      </h2>

      {/* Search Bar */}
      <SearchBar
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {/* Error */}
      {error && <p className="text-red-600 text-center mb-4">{error}</p>}

      {/* Success */}
      {success && (
        <p className="text-green-600 text-center mb-4 font-medium">{success}</p>
      )}

      {/* Loading */}
      {loading && (
        <p className="text-gray-500 text-center mb-4">Loading books...</p>
      )}

      {/* Book Grid */}
      {filteredBooks.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {filteredBooks.map((book) => (
            <BookItem
              key={book.id}
              book={book}
              onUpdate={updateBook}
              onDelete={deleteBook}
            />
          ))}
        </div>
      ) : (
        !loading && (
          <p className="mt-10 text-gray-500 text-center text-lg">
            {searchTerm
              ? "No books found matching your search."
              : "No books available. Add a book to get started!"}
          </p>
        )
      )}

      {/* Details Modal */}
      {selectedBook && (
        <BookDetailsModal
          book={selectedBook}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedBook(null);
          }}
        />
      )}
    </div>
  );
};

export default BooksPage;
