import { useState, useEffect } from "react";
import IsbnLookup from "@/components/books/IsbnLookup.jsx";
import CoverPicker from "@/components/books/CoverPicker.jsx";

// The Add Book form. It keeps what was typed until the page moves on, so a failed save loses nothing.
export default function BookForm({ onAdd, onCancel, saving = false }) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [genre, setGenre] = useState("");
  const [releaseYear, setReleaseYear] = useState("");
  const [description, setDescription] = useState("");
  const [copies, setCopies] = useState("1");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");

  // Release the blob URL of a selected image once it is replaced or the form unmounts
  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // Fill the form from an ISBN lookup. Only fields the lookup has a value for are replaced.
  const handleFound = (book, coverFile) => {
    if (book.title) setTitle(book.title);
    if (book.author) setAuthor(book.author);
    if (book.genre) setGenre(book.genre);
    if (book.release_year) setReleaseYear(String(book.release_year));
    if (book.description) setDescription(book.description);
    if (coverFile) {
      setImage(coverFile);
      setPreview(URL.createObjectURL(coverFile));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !author || !releaseYear || saving) return;

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("author", author.trim());
    formData.append("genre", genre.trim());
    formData.append("release_year", parseInt(releaseYear, 10));
    formData.append("description", description.trim());
    formData.append("copies", parseInt(copies, 10) || 1);
    if (image) formData.append("image", image);

    onAdd(formData);
  };

  return (
    <div className="flex flex-col gap-6">
      <IsbnLookup onFound={handleFound} />

      <form onSubmit={handleSubmit} className="panel">
        <div className="p-5 sm:p-7">
          <h2 className="text-base font-semibold text-(--color-foreground)">Book details</h2>
          <p className="mt-0.5 text-sm text-(--color-muted-foreground)">Fields marked * are required.</p>

          <div className="mt-6 grid gap-6 md:grid-cols-[13rem_1fr]">
            <CoverPicker
              preview={preview}
              fileName={image?.name}
              onPick={(file) => {
                setImage(file);
                setPreview(file ? URL.createObjectURL(file) : "");
              }}
              className="w-44 md:w-full mx-auto md:mx-0"
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 content-start">
              <label className="col-span-2 sm:col-span-3">
                <span className="field-label">Title <span className="text-(--color-accent)">*</span></span>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. The Hobbit" required />
              </label>
              <label className="col-span-2 sm:col-span-3">
                <span className="field-label">Author <span className="text-(--color-accent)">*</span></span>
                <input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="e.g. J.R.R. Tolkien" required />
              </label>
              <label className="col-span-2 sm:col-span-1">
                <span className="field-label">Genre</span>
                <input className="input" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="e.g. Fantasy" />
              </label>
              <label>
                <span className="field-label">Year <span className="text-(--color-accent)">*</span></span>
                <input className="input" type="number" value={releaseYear} onChange={(e) => setReleaseYear(e.target.value)} placeholder="e.g. 1937" required />
              </label>
              <label>
                <span className="field-label">Copies <span className="text-(--color-accent)">*</span></span>
                <input className="input" type="number" min={1} value={copies} onChange={(e) => setCopies(e.target.value)} required />
              </label>
              <label className="col-span-2 sm:col-span-3">
                <span className="field-label">Description</span>
                <textarea
                  className="input resize-y min-h-32"
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A short description…"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-(--color-border) px-5 sm:px-7 py-4">
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
          )}
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? "Adding…" : "Add book"}
          </button>
        </div>
      </form>
    </div>
  );
}
