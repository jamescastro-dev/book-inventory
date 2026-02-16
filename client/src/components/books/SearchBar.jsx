import { Search } from "lucide-react";

const SearchBar = ({ value, onChange }) => {
  return (
    <div className="mb-6 flex justify-center">
      <div className="relative w-full max-w-md">
        {/* Search icon */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-(--color-muted-foreground)" />
        </div>

        <input
          type="text"
          placeholder="Search by title or author..."
          value={value}
          onChange={onChange}
          className="
            w-full
            bg-(--color-surface)
            border border-(--color-primary)
            text-(--color-foreground)
            rounded-md
            pl-4 pr-10 py-2
            shadow-sm
            focus:outline-none
            focus:ring-1 focus:ring-(--color-primary)
            placeholder:text-(--color-muted-foreground)
            transition-colors
          "
        />
      </div>
    </div>
  );
};

export default SearchBar;
