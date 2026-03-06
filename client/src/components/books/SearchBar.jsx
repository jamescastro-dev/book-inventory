import { Search } from "lucide-react";

const SearchBar = ({ value, onChange }) => {
  return (
    <div className="flex justify-center">
      <div className="relative w-full max-w-md">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--color-muted-foreground) pointer-events-none"
        />
        <input
          type="text"
          placeholder="Search by title or author…"
          value={value}
          onChange={onChange}
          className="
            w-full
            bg-(--color-surface)
            border border-(--color-border)
            text-(--color-foreground)
            rounded-(--radius)
            pl-9 pr-4 py-2 text-sm
            shadow-sm
            transition-colors duration-150
            hover:border-(--color-border-strong)
            focus:outline-none focus:border-(--color-gold) focus:ring-2 focus:ring-(--color-gold)/20
            placeholder:text-(--color-muted-foreground)
          "
        />
      </div>
    </div>
  );
};

export default SearchBar;