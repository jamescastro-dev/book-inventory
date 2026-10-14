// Sort choices for the book list. `value` is sent as ?ordering=; "" means the API's own order (oldest first).
export const SORT_OPTIONS = [
  { value: "", label: "Oldest added" },
  { value: "-created_at", label: "Newest added" },
  { value: "title", label: "Title A–Z" },
  { value: "-title", label: "Title Z–A" },
  { value: "author", label: "Author A–Z" },
  { value: "-release_year", label: "Year: newest" },
  { value: "release_year", label: "Year: oldest" },
];

// Books per page: fills a grid of 2, 3, 4 or 6 columns evenly
export const PAGE_SIZE = 12;

// Query string for GET /api/books/, leaving out everything that is at its default.
export function buildBooksQuery({ search = "", genre = "", sort = "", availableOnly = false, page = 1, pageSize } = {}) {
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  if (genre) params.set("genre", genre);
  if (sort) params.set("ordering", sort);
  if (availableOnly) params.set("available", "true");
  if (page > 1) params.set("page", String(page));
  if (pageSize) params.set("page_size", String(pageSize));
  return params.toString();
}
