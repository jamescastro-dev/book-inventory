import { useContext, useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Plus, SearchX, ServerCog } from "lucide-react";
import { AuthContext } from "@/context/AuthContext.jsx";
import { useToast } from "@/context/ToastContext.js";
import BookItem from "@/components/books/BookItem.jsx";
import SearchBar from "@/components/books/SearchBar.jsx";
import BookFilters from "@/components/books/BookFilters.jsx";
import Cover from "@/components/books/Cover.jsx";
import Pagination from "@/components/books/Pagination.jsx";
import { authFetch } from "@/utils/authFetch.js";
import { readApiError } from "@/utils/uploads.js";
import { buildBooksQuery } from "@/utils/booksQuery.js";
import { useDebouncedValue } from "@/hooks/useDebouncedValue.js";
import { borrowBook, fetchLoans, returnLoan, shortDate } from "@/utils/loans.js";
import { PAGE_SIZE, SORT_OPTIONS } from "@/utils/booksQuery.js";

// After this long without a first answer, say the free server is probably waking up
const SLOW_START_MS = 4000;

const BooksPage = () => {
  // One page of results from the API: { count, page, page_size, total_pages, results }. Null until the first load.
  const [data, setData] = useState(null);
  const [genres, setGenres] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [fetching, setFetching] = useState(false);
  const [slowStart, setSlowStart] = useState(false);
  // A few covers for the header, taken from the first page that loads (so they don't change as you filter)
  const [featured, setFeatured] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [genre, setGenre] = useState("");
  const [sort, setSort] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  // The signed-in user's books on loan, by book id
  const [myLoans, setMyLoans] = useState({});
  const { user } = useContext(AuthContext);
  const toast = useToast();
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
      const res = await fetch(`${API_URL}/books/?${buildBooksQuery({ search, genre, sort, availableOnly, page, pageSize: PAGE_SIZE })}`, {
        signal: controller.signal,
      });
      if (res.status === 404 && page > 1) {
        // That page no longer exists, e.g. its last book was just deleted
        goToPage(page - 1);
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch books");
      const result = await res.json();
      setData(result);
      setFeatured((current) => current ?? result.results.filter((b) => b.image_thumb).slice(0, 3));
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

  // Until the first page arrives: after a few seconds, explain the wait
  const waitingForFirstPage = data === null && !loadError;
  useEffect(() => {
    if (!waitingForFirstPage) return;
    const timer = setTimeout(() => setSlowStart(true), SLOW_START_MS);
    return () => clearTimeout(timer);
  }, [waitingForFirstPage]);

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
        toast.error(await readApiError(res, "Failed to update book."));
        return;
      }
      toast.success("Book updated.");
      refresh(); // the edit may change where the book sorts, or whether it matches the filters
    } catch (err) {
      console.error(err);
      toast.error("Failed to update book.");
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
        toast.error(await readApiError(res, "Failed to delete book."));
        return;
      }
      toast.success("Book deleted.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete book.");
    } finally {
      refresh(); // pull in the next book to fill the page, or restore the one that failed to delete
    }
  };

  const handleBorrow = async (book) => {
    try {
      const loan = await borrowBook(API_URL, book.id);
      toast.success(`Borrowed “${book.title}”. It’s due back on ${shortDate(loan.due_at)}.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      refresh();
      fetchMyLoans();
    }
  };

  const handleReturn = async (book, loan) => {
    try {
      await returnLoan(API_URL, loan.id);
      toast.success(`Returned “${book.title}”. Thank you!`);
    } catch (err) {
      toast.error(err.message);
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

  const scrollToResults = () => {
    document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const books = data?.results ?? [];
  const isFiltering = search.length > 0 || genre !== "" || availableOnly;
  const showSkeleton = data === null && !loadError;
  const showEmpty = data !== null && books.length === 0;

  const resultsTitle = search
    ? `Results for “${search}”`
    : genre || (availableOnly ? "On the shelf now" : "All books");
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-(--color-border)">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(60rem_30rem_at_85%_-10%,var(--color-accent-soft),transparent_70%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-14 grid lg:grid-cols-[1fr_24rem] gap-10 items-center">
          <div>
            <p className="eyebrow">{user ? `Welcome back, ${user.username}` : "Open to everyone"}</p>
            <h1 className="mt-3 font-serif text-[2.4rem] sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05] text-(--color-foreground) max-w-2xl">
              Find your next great read.
            </h1>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-(--color-muted-foreground) max-w-xl">
              {user?.is_librarian
                ? "Search the catalogue, keep copies up to date and see what’s out on loan."
                : "Search the catalogue, see what’s on the shelf and borrow a book for 14 days."}
            </p>
            <div className="mt-6 sm:mt-7 flex flex-col sm:flex-row gap-3 max-w-2xl">
              <div className="flex-1">
                <SearchBar value={searchText} onChange={setSearchText} />
              </div>
              {user?.is_librarian && (
                <Link to="/add-book" className="btn btn-primary h-13 px-6">
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  Add a book
                </Link>
              )}
            </div>
          </div>

          {/* A fanned stack of covers from the collection */}
          <div aria-hidden="true" className="hidden lg:flex justify-center items-end h-72 pr-4">
            {(featured ?? []).map((book, i) => (
              <div
                key={book.id}
                className="w-36 aspect-2/3 rounded-(--radius-control) overflow-hidden cover-shadow bg-(--color-muted) -mx-5"
                style={{ transform: `rotate(${(i - 1) * 8}deg) translateY(${i === 1 ? -18 : 0}px)`, zIndex: i === 1 ? 2 : 1 }}
              >
                <Cover book={book} eager />
              </div>
            ))}
          </div>
        </div>
      </section>

      <BookFilters
        genres={genres}
        genre={genre}
        onGenreChange={(next) => { setGenre(next); scrollToResults(); }}
        sort={sort}
        onSortChange={setSort}
        availableOnly={availableOnly}
        onAvailableOnlyChange={setAvailableOnly}
      />

      {/* Results */}
      <section id="results" className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 scroll-mt-32">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h2 className="font-serif text-2xl font-semibold tracking-tight text-(--color-foreground) truncate">{resultsTitle}</h2>
            <p className="mt-1 text-sm text-(--color-muted-foreground)" aria-live="polite">
              {data === null
                ? (loadError ? "Unavailable" : "Loading…")
                : `${data.count} ${data.count === 1 ? "title" : "titles"}${sort ? ` · ${sortLabel}` : ""}`}
            </p>
          </div>
          {isFiltering && (
            <button type="button" onClick={clearFilters} className="btn btn-ghost shrink-0">Clear filters</button>
          )}
        </div>

        {loadError && (
          <div role="alert" className="rounded-(--radius-control) border border-(--color-danger)/30 bg-(--color-danger-soft) px-4 py-3 mb-6 text-sm text-(--color-danger) flex items-center justify-between gap-3">
            {loadError}
            <button type="button" onClick={refresh} className="btn btn-secondary shrink-0">Try again</button>
          </div>
        )}

        {/* The free server sleeps when idle; say so instead of leaving a blank wait */}
        {showSkeleton && slowStart && (
          <div role="status" className="panel mb-6 px-4 py-3.5 flex items-start gap-3">
            <ServerCog className="w-5 h-5 shrink-0 text-(--color-accent) animate-pulse" aria-hidden="true" />
            <p className="text-sm text-(--color-foreground)">
              <span className="font-semibold">Waking up the server…</span>{" "}
              <span className="text-(--color-muted-foreground)">It sleeps when nobody’s using it, so the first visit can take up to a minute.</span>
            </p>
          </div>
        )}

        {/* Skeletons */}
        {showSkeleton && (
          <div className="grid gap-x-5 gap-y-9 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2.5">
                <div className="w-full aspect-2/3 rounded-(--radius-control) skeleton" />
                <div className="h-3.5 w-4/5 rounded-full skeleton" />
                <div className="h-3 w-3/5 rounded-full skeleton" />
              </div>
            ))}
          </div>
        )}

        {/* Grid */}
        {books.length > 0 && (
          <div
            aria-busy={fetching}
            className={`grid gap-x-5 gap-y-9 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 transition-opacity duration-150 ${fetching ? "opacity-60" : ""}`}
          >
            {books.map((book, i) => (
              <div
                key={book.id}
                style={{ animationDelay: `${Math.min(i * 35, 350)}ms` }}
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
          <div className="py-20 flex flex-col items-center gap-3 text-center">
            <span className="w-14 h-14 rounded-full bg-(--color-muted) text-(--color-muted-foreground) flex items-center justify-center">
              <SearchX className="w-6 h-6" aria-hidden="true" />
            </span>
            <p className="mt-2 font-serif text-2xl font-semibold text-(--color-foreground)">
              {isFiltering ? "Nothing found" : "The shelves are bare"}
            </p>
            <p className="text-sm text-(--color-muted-foreground) max-w-xs leading-relaxed">
              {isFiltering
                ? "No books match your search or filters. Try different words, or clear the filters."
                : "No books have been added yet."}
            </p>
            {isFiltering && (
              <button type="button" onClick={clearFilters} className="btn btn-primary mt-3">
                Clear search and filters
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default BooksPage;
