import { lazy, Suspense, useState } from "react";
import { ScanBarcode, Search } from "lucide-react";
import { fetchCoverFile, lookupIsbn } from "@/utils/bookLookup.js";
import { canScan } from "@/utils/barcode.js";

const API_URL = import.meta.env.VITE_API_BOOKS_URL;

// The camera view and the barcode reader are only downloaded when someone taps Scan
const BarcodeScanner = lazy(() => import("@/components/books/BarcodeScanner.jsx"));

// "Find a book by ISBN": fills the form below from Open Library. `onFound(book, coverFile)` gets the
// details and the cover as a File (null if there is none or it couldn't be fetched).
export default function IsbnLookup({ onFound }) {
  const [isbn, setIsbn] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState({ kind: "", text: "" });
  const [scanAvailable] = useState(canScan);

  const search = async (value) => {
    const wanted = value.trim();
    if (!wanted || busy) return;
    setBusy(true);
    setMessage({ kind: "", text: "" });
    try {
      const book = await lookupIsbn(API_URL, wanted);
      const cover = book.cover_url ? await fetchCoverFile(book.cover_url, book.isbn) : null;
      onFound(book, cover);

      let text = `Found “${book.title}”. Check the details below before saving.`;
      if (!book.cover_url) text += " It has no cover on Open Library, so add one below if you like.";
      else if (!cover) text += " Its cover couldn’t be fetched, so add one below if you like.";
      setMessage({ kind: "ok", text });
    } catch (err) {
      setMessage({ kind: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  };

  // A barcode was read: close the camera, show the ISBN and look it up
  const handleScanned = (scanned) => {
    setScanning(false);
    setIsbn(scanned);
    search(scanned);
  };

  return (
    <div className="mb-6 pb-6 border-b border-(--color-border)">
      <label htmlFor="isbn-lookup" className="text-xs font-medium tracking-widest uppercase text-(--color-muted-foreground)">
        Find a book by ISBN
      </label>
      <p className="text-xs text-(--color-muted-foreground) mt-1 mb-2">
        Optional. Fills in the details below from Open Library{scanAvailable ? ", by typing the ISBN or scanning the barcode" : ""}.
      </p>
      {/* Phones: the ISBN gets its own row so all 13 digits show, with the buttons below */}
      <div className="flex flex-wrap sm:flex-nowrap gap-2">
        <input
          id="isbn-lookup"
          type="text"
          inputMode="text"
          autoComplete="off"
          value={isbn}
          onChange={(e) => setIsbn(e.target.value)}
          onKeyDown={(e) => {
            // Enter should look the book up, not submit the whole form
            if (e.key === "Enter") {
              e.preventDefault();
              search(isbn);
            }
          }}
          placeholder="e.g. 978-0-547-92822-7"
          className="
            w-full sm:w-auto sm:flex-1 min-w-0
            bg-(--color-card) border border-(--color-border)
            text-(--color-foreground) text-sm
            rounded-(--radius) px-3.5 py-2
            placeholder:text-(--color-muted-foreground)
            hover:border-(--color-border-strong)
            focus:outline-none focus:border-(--color-gold) focus:ring-2 focus:ring-(--color-gold)/20
            transition-colors
          "
        />
        {scanAvailable && (
          <button
            type="button"
            onClick={() => setScanning(true)}
            disabled={busy}
            aria-label="Scan a barcode with the camera"
            className="flex-1 sm:flex-none justify-center inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-(--radius) border border-(--color-border) bg-(--color-surface) text-(--color-foreground) hover:border-(--color-border-strong) transition-colors disabled:opacity-50"
          >
            <ScanBarcode className="w-4 h-4" aria-hidden="true" />
            Scan
          </button>
        )}
        <button
          type="button"
          onClick={() => search(isbn)}
          disabled={busy || !isbn.trim()}
          className="btn-primary flex-1 sm:flex-none justify-center inline-flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Search className="w-4 h-4" aria-hidden="true" />
          {busy ? "Looking up…" : "Look up"}
        </button>
      </div>
      <div role="status" aria-live="polite">
        {message.text && (
          <p className={`text-sm mt-2 ${message.kind === "error" ? "text-red-700" : "text-(--color-muted-foreground)"}`}>
            {message.text}
          </p>
        )}
      </div>

      {scanning && (
        <Suspense fallback={null}>
          <BarcodeScanner onDetected={handleScanned} onClose={() => setScanning(false)} />
        </Suspense>
      )}
    </div>
  );
}
