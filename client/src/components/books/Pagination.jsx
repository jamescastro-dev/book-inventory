import { ChevronLeft, ChevronRight } from "lucide-react";

// Page numbers to show: all of them when there are few, otherwise the first, the last and the
// neighbours of the current page, with "…" for the gaps
function pageList(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? ["…", p] : [p]));
}

const Pagination = ({ page, totalPages, onChange, disabled }) => {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-1.5">
      <button
        type="button"
        className="btn btn-ghost px-3"
        onClick={() => onChange(page - 1)}
        disabled={disabled || page <= 1}
      >
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        <span className="hidden sm:inline">Previous</span>
        <span className="sr-only sm:hidden">Previous page</span>
      </button>
      {pageList(page, totalPages).map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="w-9 text-center text-(--color-muted-foreground)">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            disabled={disabled}
            aria-current={p === page ? "page" : undefined}
            aria-label={`Page ${p}`}
            className={`w-9 h-9 rounded-full text-sm font-semibold transition-colors ${
              p === page
                ? "bg-(--color-primary) text-(--color-primary-foreground)"
                : "text-(--color-foreground) hover:bg-(--color-muted)"
            }`}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        className="btn btn-ghost px-3"
        onClick={() => onChange(page + 1)}
        disabled={disabled || page >= totalPages}
      >
        <span className="hidden sm:inline">Next</span>
        <span className="sr-only sm:hidden">Next page</span>
        <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </nav>
  );
};

export default Pagination;
