import { ArrowUpDown } from "lucide-react";
import { SORT_OPTIONS } from "@/utils/booksQuery.js";

// Genre chips, the sort order and the "Available now" switch, in a bar that sticks under the navbar
const BookFilters = ({ genres, genre, onGenreChange, sort, onSortChange, availableOnly, onAvailableOnlyChange }) => {
  // Keep the chosen genre selectable even if the genre list has not loaded (or no longer has it)
  const listed = genres.some((g) => g.name.toLowerCase() === genre.toLowerCase());
  const chips = [{ name: "", label: "All" }, ...(genre && !listed ? [{ name: genre, label: genre }] : []), ...genres.map((g) => ({ name: g.name, label: g.name, count: g.count }))];

  return (
    <div className="sticky top-16 z-30 bg-(--color-background)/85 backdrop-blur-lg border-b border-(--color-border)">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center gap-3">
        <div role="group" aria-label="Filter by genre" className="flex-1 min-w-0 flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 md:mx-0 md:pl-0 md:pr-10 md:[mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)]">
          {chips.map((chip) => {
            const active = chip.name.toLowerCase() === genre.toLowerCase();
            return (
              <button
                key={chip.name || "all"}
                type="button"
                aria-pressed={active}
                onClick={() => onGenreChange(chip.name)}
                className="chip"
              >
                {chip.label}
                {chip.count != null && <span className={active ? "opacity-70" : "text-(--color-muted-foreground)"}>{chip.count}</span>}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
          <label className="relative flex items-center">
            <span className="sr-only">Sort books</span>
            <ArrowUpDown aria-hidden="true" className="absolute left-3 w-4 h-4 text-(--color-muted-foreground) pointer-events-none" />
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value)}
              className="appearance-none rounded-full border border-(--color-border) bg-(--color-surface) pl-9 pr-4 py-2 text-sm font-medium text-(--color-foreground) hover:border-(--color-border-strong) focus:outline-none focus:border-(--color-accent) transition-colors cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          <button
            type="button"
            role="switch"
            aria-checked={availableOnly}
            onClick={() => onAvailableOnlyChange(!availableOnly)}
            className="flex items-center gap-2.5 text-sm font-medium text-(--color-foreground) select-none whitespace-nowrap"
          >
            <span
              aria-hidden="true"
              className={`relative w-10 h-6 rounded-full transition-colors ${availableOnly ? "bg-(--color-accent)" : "bg-(--color-border-strong)"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${availableOnly ? "translate-x-4" : ""}`} />
            </span>
            Available now
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookFilters;
