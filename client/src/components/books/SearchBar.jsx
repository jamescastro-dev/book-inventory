import { Search, X } from "lucide-react";

const SearchBar = ({ value, onChange }) => {
  return (
    <div className="relative w-full">
      <Search
        aria-hidden="true"
        className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-(--color-muted-foreground) pointer-events-none"
      />
      <input
        type="search"
        aria-label="Search books"
        placeholder="Search by title or author"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="
          w-full h-13 rounded-full pl-12 pr-12 text-base
          bg-(--color-surface) text-(--color-foreground)
          border border-(--color-border) shadow-(--shadow-md)
          placeholder:text-(--color-muted-foreground)
          transition-[border-color,box-shadow] duration-150
          hover:border-(--color-border-strong)
          focus:outline-none focus:border-(--color-accent) focus:ring-4 focus:ring-(--color-accent)/15
          [&::-webkit-search-cancel-button]:hidden
        "
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="icon-btn absolute right-2 top-1/2 -translate-y-1/2"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
