import { lazy, Suspense, useState } from "react";
import { ScanBarcode, Search } from "lucide-react";
import { fetchCoverFile, isbnFromText, lookupIsbn } from "@/utils/bookLookup.js";
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

      let text = `Found “${book.title}”. Check the details below, then add it.`;
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
    <section className="rounded-(--radius) border border-(--color-accent)/25 bg-(--color-accent-soft) p-5 sm:p-6">
      <div className="flex items-start gap-3.5">
        <span className="w-10 h-10 shrink-0 rounded-full bg-(--color-surface) text-(--color-accent) flex items-center justify-center shadow-(--shadow-sm)">
          <ScanBarcode className="w-5 h-5" aria-hidden="true" />
        </span>
        <div>
          <label htmlFor="isbn-lookup" className="block text-base font-semibold text-(--color-foreground)">
            Quick fill from an ISBN
          </label>
          <p className="mt-0.5 text-sm text-(--color-muted-foreground)">
            Optional. Paste or type the ISBN{scanAvailable ? ", or scan the barcode," : ""} to fill in the details and cover from Open Library.
          </p>
        </div>
      </div>
      {/* Phones: the ISBN gets its own row so all 13 digits show, with the buttons below */}
      <div className="mt-4 flex flex-wrap sm:flex-nowrap gap-2">
        <input
          id="isbn-lookup"
          type="text"
          inputMode="text"
          autoComplete="off"
          value={isbn}
          onChange={(e) => setIsbn(e.target.value)}
          onPaste={(e) => {
            // Pasting a whole valid ISBN looks it up straight away; anything else just pastes
            const pasted = e.clipboardData.getData("text");
            const pastedIsbn = isbnFromText(pasted);
            if (pastedIsbn) {
              e.preventDefault();
              setIsbn(pastedIsbn);
              search(pastedIsbn);
            }
          }}
          onKeyDown={(e) => {
            // Enter should look the book up, not submit the whole form
            if (e.key === "Enter") {
              e.preventDefault();
              search(isbn);
            }
          }}
          placeholder="e.g. 978-0-547-92822-7"
          className="input w-full sm:w-auto sm:flex-1 min-w-0"
        />
        {scanAvailable && (
          <button
            type="button"
            onClick={() => setScanning(true)}
            disabled={busy}
            aria-label="Scan a barcode with the camera"
            className="btn btn-secondary flex-1 sm:flex-none"
          >
            <ScanBarcode className="w-4 h-4" aria-hidden="true" />
            Scan
          </button>
        )}
        <button
          type="button"
          onClick={() => search(isbn)}
          disabled={busy || !isbn.trim()}
          className="btn btn-primary flex-1 sm:flex-none"
        >
          <Search className="w-4 h-4" aria-hidden="true" />
          {busy ? "Looking up…" : "Look up"}
        </button>
      </div>
      <div role="status" aria-live="polite">
        {message.text && (
          <p className={`text-sm mt-3 ${message.kind === "error" ? "text-(--color-danger)" : "text-(--color-foreground)"}`}>
            {message.text}
          </p>
        )}
      </div>

      {scanning && (
        <Suspense fallback={null}>
          <BarcodeScanner onDetected={handleScanned} onClose={() => setScanning(false)} />
        </Suspense>
      )}
    </section>
  );
}
