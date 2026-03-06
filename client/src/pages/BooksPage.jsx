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

  const API_URL = import.meta.env.VITE_API_BOOKS_URL;

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      const accessToken = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/books/`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
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

  useEffect(() => { fetchBooks(); }, [location.pathname, fetchBooks]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const updateBook = async (id, updatedBook) => {
    try {
      const accessToken = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/books/${id}/`, {
        method: "PUT",
        body: updatedBook,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (!res.ok) throw new Error("Failed to update book");
      const data = await res.json();
      setBooks((prev) => prev.map((b) => (b.id === id ? data : b)));
      setSuccess("Book updated successfully!");
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to update book.");
      fetchBooks();
    }
  };

  const deleteBook = async (id) => {
    try {
      const accessToken = localStorage.getItem("access_token");
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

  const filteredBooks = books.filter(
    (book) =>
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (book.author && book.author.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const isFiltering = searchTerm.trim().length > 0;

  return (
    <div className="min-h-screen">

      {/* Header */}
      <div className="bg-(--color-surface) border-b border-(--color-border)">
        <div className="max-w-6xl mx-auto px-5 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

            {/* Title + stats — centered on mobile */}
            <div className="text-center sm:text-left">
              <h1 className="font-serif text-2xl font-semibold text-(--color-foreground) tracking-tight leading-none">
                My Library
              </h1>
              <p className="mt-1 text-[0.68rem] uppercase tracking-[0.15em] text-(--color-muted-foreground)">
                {loading ? "Loading…" : (
                  <>
                    {books.length} {books.length === 1 ? "volume" : "volumes"}
                    {isFiltering && (
                      <span className="text-(--color-gold) ml-2">· {filteredBooks.length} match{filteredBooks.length !== 1 ? "es" : ""}</span>
                    )}
                  </>
                )}
              </p>
            </div>

            {/* Search */}
            <div className="w-full sm:w-64">
              <SearchBar value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>

          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-5 py-8">

        {/* Feedback */}
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-(--radius) px-4 py-2.5 mb-6 text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-(--radius) px-4 py-2.5 mb-6 text-center">
            {success}
          </div>
        )}

        {/* Skeletons */}
        {loading && (
          <div className="grid gap-x-4 gap-y-7 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2.5" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="w-full rounded-(--radius) bg-(--color-muted) skeleton" style={{ aspectRatio: "2/3" }} />
                <div className="h-3 w-4/5 rounded bg-(--color-muted) skeleton" />
                <div className="h-2.5 w-3/5 rounded bg-(--color-muted) skeleton" />
              </div>
            ))}
          </div>
        )}

        {/* Grid */}
        {!loading && filteredBooks.length > 0 && (
          <div className="grid gap-x-4 gap-y-7 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filteredBooks.map((book, i) => (
              <div
                key={book.id}
                style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
                className="animate-fade-in"
              >
                <BookItem book={book} onUpdate={updateBook} onDelete={deleteBook} />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredBooks.length === 0 && (
          <div className="mt-24 flex flex-col items-center gap-4 text-center">
            <svg viewBox="0 0 80 56" className="w-16 opacity-15" fill="none" aria-hidden="true">
              <rect x="4" y="8" width="32" height="42" rx="2" fill="var(--color-primary)" />
              <rect x="44" y="8" width="32" height="42" rx="2" fill="var(--color-primary)" />
              <rect x="36" y="6" width="8" height="46" rx="1" fill="var(--color-secondary)" />
              <line x1="10" y1="18" x2="30" y2="18" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
              <line x1="10" y1="23" x2="30" y2="23" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
              <line x1="10" y1="28" x2="25" y2="28" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
              <line x1="50" y1="18" x2="70" y2="18" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
              <line x1="50" y1="23" x2="70" y2="23" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
              <line x1="50" y1="28" x2="65" y2="28" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
            </svg>
            <p className="font-serif text-2xl text-(--color-muted-foreground) font-medium">
              {isFiltering ? "Nothing found" : "The shelves are bare"}
            </p>
            <p className="text-sm text-(--color-muted-foreground) max-w-[26ch] leading-relaxed">
              {isFiltering
                ? `No books match "${searchTerm}". Try a different title or author.`
                : "Add your first book to begin building your collection."}
            </p>
          </div>
        )}
      </div>

      {selectedBook && (
        <BookDetailsModal
          book={selectedBook}
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setSelectedBook(null); }}
        />
      )}
    </div>
  );
};

export default BooksPage;