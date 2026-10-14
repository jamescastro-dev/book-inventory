import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { MAX_COVER_BYTES, MAX_COVER_MB } from "@/utils/uploads.js";

// A book-shaped drop zone for the cover image. Refuses files over the upload limit before they are
// sent; `onPick(file)` only ever gets a file that fits.
export default function CoverPicker({ preview, fileName, onPick, className = "" }) {
  const [error, setError] = useState("");

  return (
    <div className={className}>
      <label className="group relative block aspect-2/3 rounded-(--radius-control) overflow-hidden border-2 border-dashed border-(--color-border-strong) bg-(--color-muted) cursor-pointer hover:border-(--color-accent) transition-colors">
        <input
          type="file"
          accept="image/*"
          aria-label="Cover image"
          onChange={(e) => {
            const file = e.target.files[0];
            if (file && file.size > MAX_COVER_BYTES) {
              setError(`That image is ${(file.size / 1024 / 1024).toFixed(1)}\u00a0MB. Please choose one under ${MAX_COVER_MB}\u00a0MB.`);
              e.target.value = ""; // so choosing the same file again still fires onChange
              return;
            }
            setError("");
            onPick(file || null);
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        {preview ? (
          <>
            <img src={preview} alt="Cover preview" className="w-full h-full object-cover" />
            <span className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm px-3 py-2 text-center text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
              Change cover
            </span>
          </>
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-(--color-muted-foreground) group-hover:text-(--color-accent) transition-colors">
            <ImagePlus className="w-8 h-8" aria-hidden="true" />
            <span className="text-sm font-medium">Add a cover</span>
            <span className="text-xs opacity-80">JPG or PNG, up to {MAX_COVER_MB}&nbsp;MB</span>
          </span>
        )}
      </label>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-(--color-danger)">{error}</p>
      ) : fileName ? (
        <p className="mt-2 text-xs text-(--color-muted-foreground) truncate" title={fileName}>{fileName}</p>
      ) : null}
    </div>
  );
}
