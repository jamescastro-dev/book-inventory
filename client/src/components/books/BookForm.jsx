import React, { useState, useEffect } from "react";

export default function BookForm({ onAdd, initialData = {}, onCancel }) {
  const [title, setTitle] = useState(initialData.title || "");
  const [author, setAuthor] = useState(initialData.author || "");
  const [genre, setGenre] = useState(initialData.genre || "");
  const [releaseYear, setReleaseYear] = useState(
    initialData.release_year || "",
  );
  const [description, setDescription] = useState(initialData.description || "");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");

  // Show existing image if editing
  useEffect(() => {
    if (initialData.image) {
      setPreview(`${import.meta.env.VITE_API_BASE_URL}${initialData.image}`);
    }
  }, [initialData.image]);

  // Update preview on new image select
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
      setTitle("");
      setAuthor("");
      setGenre("");
      setReleaseYear("");
      setDescription("");
      setImage(null);
      setPreview("");
    }
  };

  return (
    <div className="flex justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="relative bg-(--color-surface) rounded-lg shadow-lg w-full max-w-4xl lg:min-w-4xl p-4 md:p-6 border border-(--color-border)">
        {/* Layout */}
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          {/* LEFT: Image Upload */}
          <div className="w-full lg:w-90 flex flex-col justify-center items-center border border-(--color-muted-foreground) rounded p-4 cursor-pointer bg-(--color-card) relative h-64 lg:h-auto">
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
              />
            ) : (
              <div className="text-(--color-muted-foreground) text-center flex items-center justify-center w-full h-full px-2">
                Tap to select image
              </div>
            )}

            {image && (
              <p className="text-sm text-(--color-foreground) truncate w-full text-center mt-2 px-1">
                {image.name}
              </p>
            )}
          </div>

          {/* RIGHT: Form Fields */}
          <div className="flex-1 flex flex-col gap-4">
            {["Title", "Author", "Genre", "Release Year"].map((label, idx) => {
              const stateMap = {
                Title: [title, setTitle],
                Author: [author, setAuthor],
                Genre: [genre, setGenre],
                "Release Year": [releaseYear, setReleaseYear],
              };
              const [value, setValue] = stateMap[label];

              return (
                <div key={idx} className="flex flex-col gap-1">
                  <label className="text-(--color-foreground) font-medium">
                    {label}
                  </label>
                  <input
                    type={label === "Release Year" ? "number" : "text"}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={label}
                    className="border border-(--color-muted-foreground) px-4 py-2 rounded w-full bg-(--color-card) text-(--color-foreground) focus:outline-none focus:ring-1 focus:ring-(--color-primary) focus:border-(--color-primary) transition-colors"
                  />
                </div>
              );
            })}

            {/* Description */}
            <div className="flex flex-col gap-1">
              <label className="text-(--color-foreground) font-medium">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                rows={5}
                className="border border-(--color-muted-foreground) px-4 py-2.5 rounded w-full resize-none bg-(--color-card) text-(--color-foreground) focus:outline-none focus:ring-1 focus:ring-(--color-primary) focus:border-(--color-primary) transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto bg-(--color-muted) text-(--color-foreground) px-4 py-2 rounded hover:bg-(--color-card) transition-colors">
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="w-full sm:w-auto bg-(--color-primary) text-(--color-primary-foreground) px-4 py-2 rounded hover:bg-(--color-secondary) transition-colors">
            {initialData?.id ? "Save" : "Add Book"}
          </button>
        </div>
      </form>
    </div>
  );
}
