import { ChevronLeft, ChevronRight } from "lucide-react";

const buttonClass = `
  inline-flex items-center gap-1 px-3 py-2 text-sm font-medium
  rounded-(--radius) border border-(--color-border)
  bg-(--color-surface) text-(--color-foreground)
  hover:border-(--color-border-strong) transition-colors
  disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-(--color-border)
`;

const Pagination = ({ page, totalPages, onChange, disabled }) => {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-3">
      <button
        type="button"
        className={buttonClass}
        onClick={() => onChange(page - 1)}
        disabled={disabled || page <= 1}
      >
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        Previous
      </button>
      <span className="text-[0.68rem] uppercase tracking-[0.15em] text-(--color-muted-foreground)" aria-live="polite">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        className={buttonClass}
        onClick={() => onChange(page + 1)}
        disabled={disabled || page >= totalPages}
      >
        Next
        <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </nav>
  );
};

export default Pagination;
