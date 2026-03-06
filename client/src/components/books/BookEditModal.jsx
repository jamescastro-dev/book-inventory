import { useState, useEffect, useRef } from "react";
import { X, ImagePlus } from "lucide-react";

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
      setPreview(book.image || "");
    }
  }, [book]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const fields = [
    { label: "Title",        value: title,       set: setTitle,       type: "text",   required: true  },
    { label: "Author",       value: author,      set: setAuthor,      type: "text",   required: true  },
    { label: "Genre",        value: genre,       set: setGenre,       type: "text",   required: false },
    { label: "Release Year", value: releaseYear, set: setReleaseYear, type: "number", required: false },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Modal */}
      <div
        ref={modalRef}
        className="
          relative bg-(--color-surface) rounded-(--radius) shadow-lg
          w-full max-w-xl md:max-w-3xl
          border border-(--color-border) overflow-auto max-h-[90vh]
          p-5 md:p-7
        "
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-3 right-3 p-1.5 rounded-(--radius) text-(--color-muted-foreground) hover:text-(--color-foreground) hover:bg-(--color-muted) transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="font-serif text-2xl font-semibold text-(--color-foreground) mb-5">
          Edit Book
        </h2>

        {/* Layout */}
        <div className="flex flex-col md:flex-row gap-5 items-stretch">

          {/* Image upload */}
          <label className="
            relative shrink-0 w-full md:w-64
            flex flex-col items-center justify-center
            border border-dashed border-(--color-border)
            rounded-(--radius) overflow-hidden
            bg-(--color-card) cursor-pointer
            h-64 md:h-auto
            hover:border-(--color-gold) transition-colors group
          ">
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
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-(--color-muted-foreground) group-hover:text-(--color-gold) transition-colors px-4 text-center">
                <ImagePlus className="w-7 h-7 opacity-50" />
                <span className="text-sm">Click to upload cover</span>
              </div>
            )}
            {image && (
              <div className="absolute bottom-0 inset-x-0 bg-(--color-primary)/80 px-3 py-1.5">
                <p className="text-xs text-(--color-primary-foreground) truncate text-center">
                  {image.name}
                </p>
              </div>
            )}
          </label>

          {/* Fields */}
          <div className="flex-1 flex flex-col gap-3.5">
            {fields.map(({ label, value, set, type, required }) => (
              <div key={label} className="flex flex-col gap-1">
                <label className="text-xs font-medium tracking-widest uppercase text-(--color-muted-foreground)">
                  {label}
                  {required && <span className="text-(--color-gold) ml-0.5">*</span>}
                </label>
                <input
                  type={type}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={label}
                  className="
                    bg-(--color-card) border border-(--color-border)
                    text-(--color-foreground) text-sm
                    rounded-(--radius) px-3.5 py-2
                    placeholder:text-(--color-muted-foreground)
                    hover:border-(--color-border-strong)
                    focus:outline-none focus:border-(--color-gold) focus:ring-2 focus:ring-(--color-gold)/20
                    transition-colors
                  "
                />
              </div>
            ))}

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium tracking-widest uppercase text-(--color-muted-foreground)">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A short description…"
                rows={5}
                className="
                  bg-(--color-card) border border-(--color-border)
                  text-(--color-foreground) text-sm
                  rounded-(--radius) px-3.5 py-2.5 resize-none
                  placeholder:text-(--color-muted-foreground)
                  hover:border-(--color-border-strong)
                  focus:outline-none focus:border-(--color-gold) focus:ring-2 focus:ring-(--color-gold)/20
                  transition-colors
                "
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col md:flex-row justify-end gap-2 mt-6 pt-5 border-t border-(--color-border)">
          <button
            onClick={onClose}
            className="w-full md:w-auto px-4 py-2 text-sm rounded-(--radius) font-medium
              bg-(--color-muted) text-(--color-foreground)
              hover:bg-(--color-border) transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn-primary w-full md:w-auto text-sm"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookEditModal;