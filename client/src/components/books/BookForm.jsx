import React, { useState, useEffect } from "react";
import { ImagePlus } from "lucide-react";

export default function BookForm({ onAdd, initialData = {}, onCancel }) {
  const [title, setTitle] = useState(initialData.title || "");
  const [author, setAuthor] = useState(initialData.author || "");
  const [genre, setGenre] = useState(initialData.genre || "");
  const [releaseYear, setReleaseYear] = useState(initialData.release_year || "");
  const [description, setDescription] = useState(initialData.description || "");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (initialData.image) setPreview(initialData.image);
  }, [initialData.image]);

  useEffect(() => {
    if (!image) return;
    const objectUrl = URL.createObjectURL(image);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !author || !releaseYear) return;

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("author", author.trim());
    formData.append("genre", genre.trim());
    formData.append("release_year", parseInt(releaseYear, 10));
    formData.append("description", description.trim());
    if (image) formData.append("image", image);

    onAdd(formData);

    if (!initialData.id) {
      setTitle(""); setAuthor(""); setGenre("");
      setReleaseYear(""); setDescription("");
      setImage(null); setPreview("");
    }
  };

  const fields = [
    { label: "Title",        value: title,       set: setTitle,       type: "text",   required: true  },
    { label: "Author",       value: author,      set: setAuthor,      type: "text",   required: true  },
    { label: "Genre",        value: genre,       set: setGenre,       type: "text",   required: false },
    { label: "Release Year", value: releaseYear, set: setReleaseYear, type: "number", required: true  },
  ];

  return (
    <div className="flex justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-(--color-surface) border border-(--color-border) rounded-(--radius) shadow-sm w-full p-5 md:p-7"
      >
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">

          {/* Image upload */}
          <label className="
            relative w-full lg:w-72 shrink-0
            flex flex-col items-center justify-center
            border border-dashed border-(--color-border)
            rounded-(--radius) overflow-hidden
            bg-(--color-card) cursor-pointer
            h-64 lg:h-auto
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
                <ImagePlus className="w-8 h-8 opacity-50" />
                <span className="text-sm">Click to upload cover</span>
              </div>
            )}

            {/* Filename badge */}
            {image && (
              <div className="absolute bottom-0 inset-x-0 bg-(--color-primary)/80 px-3 py-1.5">
                <p className="text-xs text-(--color-primary-foreground) truncate text-center">
                  {image.name}
                </p>
              </div>
            )}
          </label>

          {/* Fields */}
          <div className="flex-1 flex flex-col gap-4">
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
                  required={required}
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

            {/* Description */}
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
        <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6 pt-5 border-t border-(--color-border)">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto px-4 py-2 text-sm rounded-(--radius) font-medium
                bg-(--color-muted) text-(--color-foreground)
                hover:bg-(--color-border) transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="btn-primary w-full sm:w-auto text-sm"
          >
            {initialData?.id ? "Save Changes" : "Add Book"}
          </button>
        </div>
      </form>
    </div>
  );
}