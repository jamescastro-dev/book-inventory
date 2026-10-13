import { ChevronDown } from "lucide-react";
import { SORT_OPTIONS } from "@/utils/booksQuery.js";

const Select = ({ label, value, onChange, children }) => (
  <label className="relative block flex-1 sm:flex-none sm:w-44">
    <span className="sr-only">{label}</span>
    <select
      value={value}
      onChange={onChange}
      className="
        w-full appearance-none
        bg-(--color-surface)
        border border-(--color-border)
        text-(--color-foreground)
        rounded-(--radius)
        pl-3 pr-8 py-2 text-sm
        shadow-sm
        transition-colors duration-150
        hover:border-(--color-border-strong)
        focus:outline-none focus:border-(--color-gold) focus:ring-2 focus:ring-(--color-gold)/20
      "
    >
      {children}
    </select>
    <ChevronDown
      aria-hidden="true"
      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--color-muted-foreground) pointer-events-none"
    />
  </label>
);

const BookFilters = ({ genres, genre, onGenreChange, sort, onSortChange }) => {
  // Keep the chosen genre selectable even if the genre list has not loaded (or no longer has it)
  const listed = genres.some((g) => g.name.toLowerCase() === genre.toLowerCase());

  return (
    <div className="flex gap-2">
      <Select label="Filter by genre" value={genre} onChange={(e) => onGenreChange(e.target.value)}>
        <option value="">All genres</option>
        {genre && !listed && <option value={genre}>{genre}</option>}
        {genres.map((g) => (
          <option key={g.name} value={g.name}>{g.name} ({g.count})</option>
        ))}
      </Select>
      <Select label="Sort books" value={sort} onChange={(e) => onSortChange(e.target.value)}>
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>
    </div>
  );
};

export default BookFilters;
