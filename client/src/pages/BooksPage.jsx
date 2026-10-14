import { useContext, useEffect, useState, useCallback, useRef } from "react";
import { AuthContext } from "@/context/AuthContext.jsx";
import BookItem from "@/components/books/BookItem.jsx";
import SearchBar from "@/components/books/SearchBar.jsx";
import BookFilters from "@/components/books/BookFilters.jsx";
import Pagination from "@/components/books/Pagination.jsx";
import { authFetch } from "@/utils/authFetch.js";
import { readApiError } from "@/utils/uploads.js";
import { buildBooksQuery } from "@/utils/booksQuery.js";
import { useDebouncedValue } from "@/hooks/useDebouncedValue.js";
import { borrowBook, fetchLoans, returnLoan, shortDate } from "@/utils/loans.js";

const BooksPage = () => {
  // One page of results from the API: { count, page, page_size, total_pages, results }. Null until the first load.
  const [data, setData] = useState(null);
  const [genres, setGenres] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");
  const [fetching, setFetching] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [genre, setGenre] = useState("");
  const [sort, setSort] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  // The signed-in user's books on loan, by book id
  const [myLoans, setMyLoans] = useState({});
  const { user } = useContext(AuthContext);
  const abortRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_BOOKS_URL;

  // Wait for typing to pause before asking the API
  const search = useDebouncedValue(searchText.trim(), 300);

  // A page number only makes sense for one combination of search/genre/sort, so changing
  // any of them starts again at page 1.
  const filterKey = JSON.stringify([search, genre, sort, availableOnly]);
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  if (pageState.key !== filterKey) setPageState({ key: filterKey, page: 1 }); // adjust during render, not in an effect
  const page = pageState.key === filterKey ? pageState.page : 1;
  const goToPage = useCallback((next) => setPageState({ key: filterKey, page: next }), [filterKey]);

  const fetchBooks = useCallback(async () => {
    // Only the newest request counts, so a slow answer can't overwrite a newer one
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setFetching(true);
    try {
      // Reading is public, so send no token: an expired one would make the API answer 401.
      const res = await fetch(`${API_URL}/books/?${buildBooksQuery({ search, genre, sort, availableOnly, page })}`, {
        signal: controller.signal,
      });
      if (res.status === 404 && page > 1) {
        // That page no longer exists, e.g. its last book was just deleted
        goToPage(page - 1);
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch books");
      setData(await res.json());
      setLoadError("");
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error(err);
      setLoadError("Failed to fetch books. Try again later.");
    } finally {
      if (abortRef.current === controller) setFetching(false);
    }
  }, [API_URL, search, genre, sort, availableOnly, page, goToPage]);

  const fetchGenres = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/books/genres/`);
      if (res.ok) setGenres(await res.json());
    } catch (err) {
      console.error(err); // the genre filter just stays short
    }
  }, [API_URL]);

  useEffect(() => {
    fetchBooks();
    return () => abortRef.current?.abort();
  }, [fetchBooks]);

  useEffect(() => { fetchGenres(); }, [fetchGenres]);

  const fetchMyLoans = useCallback(async () => {
    if (!user) {
      setMyLoans({});
      return;
    }
    try {
      const data = await fetchLoans(API_URL, { status: "active" });
      setMyLoans(Object.fromEntries(data.results.map((loan) => [loan.book.id, loan])));
    } catch (err) {
      console.error(err); // the buttons fall back to Borrow; the API still enforces the rules
    }
  }, [API_URL, user]);

  useEffect(() => { fetchMyLoans(); }, [fetchMyLoans]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const refresh = () => {
    fetchBooks();
    fetchGenres();
  };

  const updateBook = async (id, updatedBook) => {
    try {
      const res = await authFetch(`${API_URL}/books/${id}/`, {
        method: "PUT",
        body: updatedBook,
      });
      if (!res.ok) {
        setActionError(await readApiError(res, "Failed to update book."));
        return;
      }
      setSuccess("Book updated successfully!");
      setActionError("");
      refresh(); // the edit may change where the book sorts, or whether it matches the filters
    } catch (err) {
      console.error(err);
      setActionError("Failed to update book.");
    }
  };

  const deleteBook = async (id) => {
    try {
      setData((d) => d && { ...d, count: d.count - 1, results: d.results.filter((b) => b.id !== id) });
      const res = await authFetch(`${API_URL}/books/${id}/`, {
        method: "DELETE",
      });
      if (!res.ok) {
        // e.g. 409: copies are still on loan
        setActionError(await readApiError(res, "Failed to delete book."));
        return;
      }
      setActionError("");
    } catch (err) {
      console.error(err);
      setActionError("Failed to delete book.");
    } finally {
      refresh(); // pull in the next book to fill the page, or restore the one that failed to delete
    }
  };

  const handleBorrow = async (book) => {
    try {
      const loan = await borrowBook(API_URL, book.id);
      setSuccess(`Borrowed “${book.title}”. It’s due back on ${shortDate(loan.due_at)}.`);
      setActionError("");
    } catch (err) {
      setActionError(err.message);
    } finally {
      refresh();
      fetchMyLoans();
    }
  };

  const handleReturn = async (book, loan) => {
    try {
      await returnLoan(API_URL, loan.id);
      setSuccess(`Returned “${book.title}”. Thank you!`);
      setActionError("");
    } catch (err) {
      setActionError(err.message);
    } finally {
      refresh();
      fetchMyLoans();
    }
  };

  const changePage = (next) => {
    goToPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearFilters = () => {
    setSearchText("");
    setGenre("");
    setAvailableOnly(false);
  };

  const books = data?.results ?? [];
  const error = actionError || loadError;
  const isFiltering = search.length > 0 || genre !== "" || availableOnly;
  const showSkeleton = data === null && !loadError;
  const showEmpty = data !== null && books.length === 0;

  return (
    <div className="min-h-screen">

      {/* Header */}
      <div className="bg-(--color-surface) border-b border-(--color-border)">
        <div className="max-w-6xl mx-auto px-5 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">

            {/* Title + stats — centered on mobile */}
            <div className="text-center lg:text-left">
              <h1 className="font-serif text-2xl font-semibold text-(--color-foreground) tracking-tight leading-none">
                My Library
              </h1>
              <p className="mt-1 text-[0.68rem] uppercase tracking-[0.15em] text-(--color-muted-foreground)">
                {data === null ? (loadError ? "Unavailable" : "Loading…") : (
                  <>
                    {data.count}{" "}
                    {isFiltering
                      ? (data.count === 1 ? "match" : "matches")
                      : (data.count === 1 ? "volume" : "volumes")}
                  </>
                )}
              </p>
            </div>

            {/* Search, genre filter and sort */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap lg:flex-nowrap sm:items-center sm:justify-center lg:justify-end gap-2">
              <div className="w-full sm:w-64">
                <SearchBar value={searchText} onChange={(e) => setSearchText(e.target.value)} />
              </div>
              <BookFilters
                genres={genres}
                genre={genre}
                onGenreChange={setGenre}
                sort={sort}
                onSortChange={setSort}
                availableOnly={availableOnly}
                onAvailableOnlyChange={setAvailableOnly}
              />
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
        {showSkeleton && (
          <div className="grid gap-x-4 gap-y-7 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2.5" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="w-full rounded-(--radius) bg-(--color-muted) skeleton" style={{ aspectRatio: "2/3" }} />
                <div className="h-3 w-4/5 rounded bg-(--color-muted) skeleton" />
                <div className="h-2.5 w-3/5 rounded bg-(--color-muted) skeleton" />
              </div>
            ))}
          </div>
        )}

        {/* Grid */}
        {books.length > 0 && (
          <div
            aria-busy={fetching}
            className={`grid gap-x-4 gap-y-7 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 transition-opacity duration-150 ${fetching ? "opacity-60" : ""}`}
          >
            {books.map((book, i) => (
              <div
                key={book.id}
                style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
                className="animate-fade-in"
              >
                <BookItem
                  book={book}
                  myLoan={myLoans[book.id]}
                  onUpdate={updateBook}
                  onDelete={deleteBook}
                  onBorrow={handleBorrow}
                  onReturn={handleReturn}
                />
              </div>
            ))}
          </div>
        )}

        {data && (
          <Pagination page={data.page} totalPages={data.total_pages} onChange={changePage} disabled={fetching} />
        )}

        {/* Empty state */}
        {showEmpty && (
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
                ? "No books match your search or filters. Try different words."
                : "Add your first book to begin building your collection."}
            </p>
            {isFiltering && (
              <button type="button" onClick={clearFilters} className="btn-primary text-sm">
                Clear search and filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BooksPage;
