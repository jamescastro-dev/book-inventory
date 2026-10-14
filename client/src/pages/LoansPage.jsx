import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "@/context/AuthContext.jsx";
import Pagination from "@/components/books/Pagination.jsx";
import { dueLabel, fetchLoans, returnLoan, shortDate } from "@/utils/loans.js";

const API_URL = import.meta.env.VITE_API_BOOKS_URL;

const READER_TABS = [
  { id: "mine-active", label: "On loan", scope: "mine", status: "active", empty: "You have no books on loan." },
  { id: "mine-returned", label: "History", scope: "mine", status: "returned", empty: "You haven’t returned any books yet." },
];
const LIBRARIAN_TABS = [
  ...READER_TABS,
  { id: "all-active", label: "All loans", scope: "all", status: "active", empty: "No books are on loan." },
  { id: "all-overdue", label: "Overdue", scope: "all", status: "overdue", empty: "Nothing is overdue." },
];

export default function LoansPage() {
  const { user } = useContext(AuthContext);
  const tabs = user?.is_librarian ? LIBRARIAN_TABS : READER_TABS;
  const [tabId, setTabId] = useState(tabs[0].id);
  const tab = tabs.find((t) => t.id === tabId) ?? tabs[0];
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchLoans(API_URL, { scope: tab.scope, status: tab.status, page })
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError("");
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => { cancelled = true; };
  }, [tab.scope, tab.status, page, reloadKey]);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(""), 3000);
    return () => clearTimeout(timer);
  }, [success]);

  const selectTab = (id) => {
    setTabId(id);
    setPage(1);
    setData(null);
  };

  const handleReturn = async (loan) => {
    setBusyId(loan.id);
    try {
      await returnLoan(API_URL, loan.id);
      setSuccess(loan.borrower === user.username ? `Returned “${loan.book.title}”. Thank you!` : `Checked in “${loan.book.title}” for ${loan.borrower}.`);
      setError("");
      // the last loan on a later page: step back so the page isn't empty
      if (data.results.length === 1 && page > 1) setPage(page - 1);
      else setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const loans = data?.results ?? [];
  const everyone = tab.scope === "all";

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-(--color-surface) border-b border-(--color-border)">
        <div className="max-w-4xl mx-auto px-5 py-4">
          <h1 className="font-serif text-2xl font-semibold text-(--color-foreground) tracking-tight leading-none">
            Loans
          </h1>
          <p className="mt-1 text-[0.68rem] uppercase tracking-[0.15em] text-(--color-muted-foreground)">
            {data ? `${data.count} ${data.count === 1 ? "book" : "books"}` : "Loading…"}
          </p>

          <div role="tablist" aria-label="Which loans" className="mt-4 -mb-4 flex gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={t.id === tab.id}
                onClick={() => selectTab(t.id)}
                className={`shrink-0 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  t.id === tab.id
                    ? "border-(--color-gold) text-(--color-foreground)"
                    : "border-transparent text-(--color-muted-foreground) hover:text-(--color-foreground)"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-8">
        {error && (
          <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-(--radius) px-4 py-2.5 mb-6 text-center">
            {error}
          </div>
        )}
        {success && (
          <div role="status" className="text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-(--radius) px-4 py-2.5 mb-6 text-center">
            {success}
          </div>
        )}

        {data && loans.length === 0 && (
          <div className="mt-16 text-center">
            <p className="font-serif text-2xl text-(--color-muted-foreground)">{tab.empty}</p>
            {tab.id === "mine-active" && (
              <Link to="/books" className="inline-block mt-4 btn-primary text-sm">Browse the library</Link>
            )}
          </div>
        )}

        <ul className="flex flex-col gap-3">
          {loans.map((loan) => (
            <li key={loan.id} className="flex items-center gap-4 bg-(--color-card) border border-(--color-border) rounded-(--radius) p-3 shadow-sm">
              <img
                src={loan.book.image_thumb || "https://placehold.co/400x600/e5d9c3/a08060?text="}
                alt=""
                className="w-12 shrink-0 rounded object-cover"
                style={{ aspectRatio: "2/3" }}
                loading="lazy"
              />
              <div className="flex-1 min-w-0">
                <p className="font-serif text-base font-semibold text-(--color-foreground) leading-snug truncate">{loan.book.title}</p>
                <p className="text-xs text-(--color-muted-foreground) truncate">{loan.book.author}</p>
                {everyone && (
                  <p className="text-xs text-(--color-muted-foreground) truncate">
                    Borrowed by <span className="font-medium text-(--color-foreground)">{loan.borrower}</span>
                  </p>
                )}
                <p className={`mt-1 text-xs ${loan.is_overdue ? "text-red-700 font-semibold" : "text-(--color-muted-foreground)"}`}>
                  {loan.returned_at
                    ? `Borrowed ${shortDate(loan.borrowed_at)} · returned ${shortDate(loan.returned_at)}`
                    : `${dueLabel(loan.due_at)} · due ${shortDate(loan.due_at)}`}
                </p>
              </div>
              {!loan.returned_at && (
                <button
                  type="button"
                  disabled={busyId === loan.id}
                  onClick={() => handleReturn(loan)}
                  className="btn-primary shrink-0 text-sm disabled:opacity-50"
                >
                  {busyId === loan.id ? "…" : loan.borrower === user.username ? "Return" : "Check in"}
                </button>
              )}
            </li>
          ))}
        </ul>

        {data && <Pagination page={data.page} totalPages={data.total_pages} onChange={setPage} />}
      </div>
    </div>
  );
}
