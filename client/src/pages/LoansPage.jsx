import { useCallback, useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlarmClock, BookCheck, BookOpen, Library } from "lucide-react";
import { AuthContext } from "@/context/AuthContext.jsx";
import { useToast } from "@/context/ToastContext.js";
import Pagination from "@/components/books/Pagination.jsx";
import Cover from "@/components/books/Cover.jsx";
import { dueLabel, dueTone, fetchLoans, loanProgress, returnLoan, shortDate } from "@/utils/loans.js";

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

// Spelled out in full so Tailwind finds the class names
const TONES = {
  overdue: { badge: "badge-danger", bar: "bg-(--color-danger)" },
  soon: { badge: "badge-warning", bar: "bg-(--color-warning)" },
  ok: { badge: "badge-success", bar: "bg-(--color-accent)" },
};

// A number at a glance. With `onClick` it is a button that opens the matching tab.
function StatCard({ icon, label, value, tone = "", onClick, active = false }) {
  const content = (
    <>
      <span className={`inline-flex w-9 h-9 rounded-full items-center justify-center [&>svg]:w-[1.1rem] [&>svg]:h-[1.1rem] ${tone || "bg-(--color-muted) text-(--color-muted-foreground)"}`}>
        {icon}
      </span>
      <p className="mt-3 font-serif text-3xl font-semibold text-(--color-foreground) tabular-nums">{value ?? "–"}</p>
      <p className="text-sm text-(--color-muted-foreground)">{label}</p>
    </>
  );
  if (!onClick) return <div className="panel p-4 sm:p-5">{content}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`panel text-left p-4 sm:p-5 transition-colors hover:border-(--color-border-strong) ${active ? "ring-2 ring-(--color-accent)/40 border-(--color-accent)/50" : ""}`}
    >
      {content}
    </button>
  );
}

function LoanRow({ loan, everyone, isMine, busy, onReturn }) {
  const returned = Boolean(loan.returned_at);
  const tone = TONES[dueTone(loan.due_at)];

  return (
    <li className="panel p-3 sm:p-4 flex gap-4" data-loan={loan.book.title}>
      <div className="w-14 sm:w-16 shrink-0 aspect-2/3 rounded-md overflow-hidden bg-(--color-muted) shadow-(--shadow-sm)">
        <Cover book={loan.book} />
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-(--color-foreground) leading-snug truncate">{loan.book.title}</p>
            <p className="text-sm text-(--color-muted-foreground) truncate">{loan.book.author}</p>
          </div>
          {!returned && (
            <button type="button" disabled={busy} onClick={() => onReturn(loan)} className="btn btn-secondary shrink-0 px-3.5 py-1.5">
              {busy ? "…" : isMine ? "Return" : "Check in"}
            </button>
          )}
        </div>

        {everyone && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-(--color-muted-foreground)">
            <span className="w-4 h-4 rounded-full bg-(--color-accent-soft) text-(--color-accent) text-[0.6rem] font-bold uppercase flex items-center justify-center" aria-hidden="true">
              {loan.borrower.slice(0, 1)}
            </span>
            Borrowed by <span className="font-semibold text-(--color-foreground)">{loan.borrower}</span>
          </p>
        )}

        <div className="mt-auto pt-2.5">
          {returned ? (
            <p className="text-xs text-(--color-muted-foreground)">
              <span className="badge badge-muted mr-1.5">Returned</span>
              Borrowed {shortDate(loan.borrowed_at)} · returned {shortDate(loan.returned_at)}
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className={`badge ${tone.badge}`}>{dueLabel(loan.due_at)}</span>
                <span className="text-(--color-muted-foreground)">due {shortDate(loan.due_at)}</span>
              </div>
              <div
                className="mt-2 h-1.5 rounded-full bg-(--color-muted) overflow-hidden"
                role="progressbar"
                aria-label="Loan period used"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(loanProgress(loan.borrowed_at, loan.due_at) * 100)}
              >
                <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.max(4, loanProgress(loan.borrowed_at, loan.due_at) * 100)}%` }} />
              </div>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

export default function LoansPage() {
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const isLibrarian = Boolean(user?.is_librarian);
  const tabs = isLibrarian ? LIBRARIAN_TABS : READER_TABS;
  const [tabId, setTabId] = useState(tabs[0].id);
  const tab = tabs.find((t) => t.id === tabId) ?? tabs[0];
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [stats, setStats] = useState({});

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

  // The numbers on the cards: only the counts are needed, so ask for one-loan pages
  const loadStats = useCallback(() => {
    const scope = isLibrarian ? "all" : "mine";
    const count = (status) => fetchLoans(API_URL, { scope, status, pageSize: 1 }).then((r) => r.count).catch(() => null);
    Promise.all([count("active"), count("overdue"), count("returned")]).then(([active, overdue, returned]) => {
      setStats({ active, overdue, returned });
    });
  }, [isLibrarian]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const selectTab = (id) => {
    if (id === tab.id) return;
    setTabId(id);
    setPage(1);
    setData(null);
  };

  const handleReturn = async (loan) => {
    setBusyId(loan.id);
    try {
      await returnLoan(API_URL, loan.id);
      toast.success(loan.borrower === user.username ? `Returned “${loan.book.title}”. Thank you!` : `Checked in “${loan.book.title}” for ${loan.borrower}.`);
      // the last loan on a later page: step back so the page isn't empty
      if (data.results.length === 1 && page > 1) setPage(page - 1);
      else setReloadKey((k) => k + 1);
      loadStats();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const loans = data?.results ?? [];
  const everyone = tab.scope === "all";
  const activeTab = isLibrarian ? "all-active" : "mine-active";
  const overdueTab = isLibrarian ? "all-overdue" : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <p className="eyebrow">{isLibrarian ? "Circulation" : "Your library card"}</p>
      <h1 className="mt-2 font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-(--color-foreground)">
        {isLibrarian ? "Loans" : "My loans"}
      </h1>
      <p className="mt-2 text-(--color-muted-foreground)">
        {isLibrarian
          ? "Everything that’s out, what’s overdue, and your own books."
          : "Books are lent for 14 days. Return them here when you’re done."}
      </p>

      {/* At a glance */}
      <div className="mt-7 grid grid-cols-3 gap-3">
        <StatCard
          icon={<BookOpen aria-hidden="true" />}
          label="On loan"
          value={stats.active}
          tone="bg-(--color-accent-soft) text-(--color-accent)"
          onClick={() => selectTab(activeTab)}
          active={tab.id === activeTab}
        />
        <StatCard
          icon={<AlarmClock aria-hidden="true" />}
          label="Overdue"
          value={stats.overdue}
          tone={stats.overdue ? "bg-(--color-danger-soft) text-(--color-danger)" : ""}
          onClick={overdueTab ? () => selectTab(overdueTab) : undefined}
          active={tab.id === overdueTab}
        />
        <StatCard
          icon={<BookCheck aria-hidden="true" />}
          label="Returned"
          value={stats.returned}
          // A librarian's count is the whole library's, but the History tab is their own: no link
          onClick={isLibrarian ? undefined : () => selectTab("mine-returned")}
          active={!isLibrarian && tab.id === "mine-returned"}
        />
      </div>
      {isLibrarian && (
        <p className="mt-2 text-xs text-(--color-muted-foreground)">Counts are for the whole library.</p>
      )}

      {/* Tabs */}
      <div role="tablist" aria-label="Which loans" className="mt-8 flex w-full sm:w-fit gap-1 overflow-x-auto scrollbar-none rounded-full bg-(--color-muted) p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === tab.id}
            onClick={() => selectTab(t.id)}
            className={`flex-1 sm:flex-none shrink-0 whitespace-nowrap rounded-full px-3 sm:px-4 py-2 text-sm font-semibold transition-colors ${
              t.id === tab.id
                ? "bg-(--color-surface) text-(--color-foreground) shadow-(--shadow-sm)"
                : "text-(--color-muted-foreground) hover:text-(--color-foreground)"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm text-(--color-muted-foreground)" aria-live="polite">
        {data ? `${data.count} ${data.count === 1 ? "book" : "books"}` : error ? "" : "Loading…"}
      </p>

      {error && (
        <div role="alert" className="mt-4 rounded-(--radius-control) border border-(--color-danger)/30 bg-(--color-danger-soft) px-4 py-3 text-sm text-(--color-danger)">
          {error}
        </div>
      )}

      {!data && !error && (
        <ul className="mt-4 flex flex-col gap-3" aria-hidden="true">
          {[0, 1, 2].map((i) => <li key={i} className="h-28 rounded-(--radius) skeleton" />)}
        </ul>
      )}

      {data && loans.length === 0 && (
        <div className="mt-6 panel py-14 px-6 flex flex-col items-center text-center">
          <span className="w-14 h-14 rounded-full bg-(--color-muted) text-(--color-muted-foreground) flex items-center justify-center">
            <Library className="w-6 h-6" aria-hidden="true" />
          </span>
          <p className="mt-4 font-serif text-xl font-semibold text-(--color-foreground)">{tab.empty}</p>
          {tab.id === "mine-active" && (
            <Link to="/books" className="btn btn-primary mt-5">Browse the catalogue</Link>
          )}
        </div>
      )}

      <ul className="mt-4 flex flex-col gap-3">
        {loans.map((loan) => (
          <LoanRow
            key={loan.id}
            loan={loan}
            everyone={everyone}
            isMine={loan.borrower === user.username}
            busy={busyId === loan.id}
            onReturn={handleReturn}
          />
        ))}
      </ul>

      {data && <Pagination page={data.page} totalPages={data.total_pages} onChange={setPage} />}
    </div>
  );
}
