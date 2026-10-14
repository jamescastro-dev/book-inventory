import { useState } from "react";
import Sheet from "@/components/ui/Sheet.jsx";
import CoverPicker from "@/components/books/CoverPicker.jsx";

const BookEditModal = ({ book, isOpen, onClose, onSave }) => {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [genre, setGenre] = useState("");
  const [releaseYear, setReleaseYear] = useState("");
  const [description, setDescription] = useState("");
  const [copies, setCopies] = useState("1");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");

  // Re-sync the form when the `book` prop changes (not when the modal opens), so unsaved
  // edits survive closing and reopening it. Done during render, as React recommends for
  // "adjusting state when a prop changes", instead of in an effect.
  const [syncedBook, setSyncedBook] = useState(null);
  if (book !== syncedBook) {
    setSyncedBook(book);
    if (book) {
      setTitle(book.title);
      setAuthor(book.author || "");
      setGenre(book.genre || "");
      setReleaseYear(book.release_year || "");
      setDescription(book.description || "");
      setCopies(String(book.copies ?? 1));
      setImage(null);
      setPreview(book.image_thumb || book.image || "");
    }
  }

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    if (!title || !author) return;
    const formData = new FormData();
    formData.append("title", title);
    formData.append("author", author);
    formData.append("genre", genre);
    formData.append("release_year", releaseYear);
    formData.append("description", description);
    formData.append("copies", parseInt(copies, 10) || 1);
    if (image) formData.append("image", image);
    onSave(formData);
  };

  const footer = (
    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
      <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
      <button type="submit" form="edit-book-form" className="btn btn-primary">Save changes</button>
    </div>
  );

  return (
    <Sheet onClose={onClose} label="Edit book" size="lg" footer={footer}>
      <form id="edit-book-form" onSubmit={handleSave} className="px-6 sm:px-8 pt-8 pb-6">
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-(--color-foreground)">Edit book</h2>
        <p className="mt-1 text-sm text-(--color-muted-foreground)">Changes are saved for everyone once you press Save.</p>

        <div className="mt-6 grid gap-6 sm:grid-cols-[11rem_1fr]">
          <CoverPicker
            preview={preview}
            fileName={image?.name}
            onPick={(file) => {
              setImage(file);
              setPreview(file ? URL.createObjectURL(file) : "");
            }}
            className="w-40 sm:w-full mx-auto sm:mx-0"
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 content-start">
            <label className="col-span-2 sm:col-span-3">
              <span className="field-label">Title <span className="text-(--color-accent)">*</span></span>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </label>
            <label className="col-span-2 sm:col-span-3">
              <span className="field-label">Author <span className="text-(--color-accent)">*</span></span>
              <input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} required />
            </label>
            <label className="col-span-2 sm:col-span-1">
              <span className="field-label">Genre</span>
              <input className="input" value={genre} onChange={(e) => setGenre(e.target.value)} />
            </label>
            <label>
              <span className="field-label">Year</span>
              <input className="input" type="number" value={releaseYear} onChange={(e) => setReleaseYear(e.target.value)} />
            </label>
            <label>
              <span className="field-label">Copies <span className="text-(--color-accent)">*</span></span>
              <input className="input" type="number" min={1} value={copies} onChange={(e) => setCopies(e.target.value)} required />
            </label>
            <label className="col-span-2 sm:col-span-3">
              <span className="field-label">Description</span>
              <textarea className="input resize-y min-h-28" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
          </div>
        </div>
      </form>
    </Sheet>
  );
};

export default BookEditModal;
