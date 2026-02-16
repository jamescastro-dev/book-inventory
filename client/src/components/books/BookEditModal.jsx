import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";

const BookEditModal = ({ book, isOpen, onClose, onSave }) => {
  const modalRef = useRef(null);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [genre, setGenre] = useState("");
  const [releaseYear, setReleaseYear] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (book) {
      setTitle(book.title);
      setAuthor(book.author || "");
      setGenre(book.genre || "");
      setReleaseYear(book.release_year || "");
      setDescription(book.description || "");
      setImage(null);
      setPreview(book.image ? `http://127.0.0.1:8000${book.image}` : "");
    }
  }, [book]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!title || !author) {
      alert("Title and Author are required");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("author", author);
    formData.append("genre", genre);
    formData.append("release_year", releaseYear);
    formData.append("description", description);
    if (image) formData.append("image", image);

    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Modal */}
      <div
        ref={modalRef}
        className="
        relative bg-(--color-surface) rounded-lg shadow-lg w-full max-w-xl md:max-w-3xl p-4 md:p-6
        border border-(--color-border) overflow-auto max-h-[90vh]
      ">
        {/* Close (X) button */}
        <button
          onClick={onClose}
          className="
          absolute top-3 right-3 p-2 rounded
          hover:bg-(--color-card) transition-colors
        "
          aria-label="Close modal">
          <X className="w-5 h-5 text-(--color-foreground)" />
        </button>

        <h2 className="text-xl md:text-2xl font-serif font-bold mb-4 text-(--color-foreground) text-center md:text-left">
          Edit Book
        </h2>

        {/* Layout: image left, form right */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch">
          {/* Left: Image upload + preview */}
          <div
            className="shrink-0 w-full md:w-80 flex flex-col justify-center items-center
                        border border-(--color-border) rounded p-4 cursor-pointer
                        bg-(--color-card) relative h-64 md:h-auto">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                setImage(file);
                setPreview(file ? URL.createObjectURL(file) : "");
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-cover rounded shadow-sm"
                style={{ maxHeight: "400px" }}
              />
            ) : (
              <div className="text-(--color-muted-foreground) text-center flex-1 flex items-center justify-center w-full h-full px-2">
                Tap to select image
              </div>
            )}

            {image && (
              <p className="text-sm text-(--color-foreground) truncate w-full text-center mt-2">
                {image.name}
              </p>
            )}
          </div>

          {/* Right: Form */}
          <div className="flex-1 flex flex-col gap-2">
            {["Title", "Author", "Genre", "Release Year"].map((label, idx) => {
              const stateMap = {
                Title: [title, setTitle],
                Author: [author, setAuthor],
                Genre: [genre, setGenre],
                "Release Year": [releaseYear, setReleaseYear],
              };
              const [value, setValue] = stateMap[label];

              return (
                <div key={idx} className="flex flex-col">
                  <label className="text-(--color-foreground) font-medium -mb-1">
                    {label}
                  </label>
                  <input
                    type={label === "Release Year" ? "number" : "text"}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={label}
                    className="
                    border border-(--color-border) px-3 py-2 rounded w-full
                    bg-(--color-card) text-(--color-foreground)
                    focus:outline-none focus:ring-2 focus:ring-(--color-primary)
                    transition-colors
                  "
                  />
                </div>
              );
            })}

            {/* Description */}
            <div className="flex flex-col mt-2">
              <label className="text-(--color-foreground) font-medium -mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                rows={5}
                className="
                border border-(--color-border) px-3 py-2 resize-none rounded w-full
                bg-(--color-card) text-(--color-foreground)
                focus:outline-none focus:ring-2 focus:ring-(--color-primary)
                transition-colors
              "
              />
            </div>
          </div>
        </div>
        {/* Buttons */}
        <div className="flex flex-col md:flex-row justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="
            bg-(--color-muted) text-(--color-foreground)
            px-4 py-2 rounded hover:bg-(--color-card)
            transition-colors
          ">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="
            bg-(--color-primary) text-(--color-primary-foreground)
            px-4 py-2 rounded hover:bg-(--color-secondary)
            transition-colors
          ">
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookEditModal;
