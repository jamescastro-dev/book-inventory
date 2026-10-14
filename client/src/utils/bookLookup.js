import { authFetch } from "./authFetch.js";
import { MAX_COVER_BYTES, readApiError } from "./uploads.js";

// The ISBN in a piece of text such as "978-0-547-92822-7" or "ISBN 054792822X", without spaces or
// hyphens, if it is a valid ISBN-10 or ISBN-13 (check digit included); otherwise null. The same
// rules as the API's normalize_isbn, so a pasted ISBN can be looked up straight away.
export function isbnFromText(text) {
  const isbn = String(text ?? "").replace(/^\s*isbn(?:-1[03])?:?/i, "").replace(/[\s-]/g, "").toUpperCase();
  if (/^\d{9}[\dX]$/.test(isbn)) {
    const total = [...isbn].reduce((sum, c, i) => sum + (10 - i) * (c === "X" ? 10 : Number(c)), 0);
    return total % 11 === 0 ? isbn : null;
  }
  if (/^97[89]\d{10}$/.test(isbn)) {
    const total = [...isbn.slice(0, 12)].reduce((sum, c, i) => sum + Number(c) * (i % 2 ? 3 : 1), 0);
    return (10 - (total % 10)) % 10 === Number(isbn[12]) ? isbn : null;
  }
  return null;
}

// Details for an ISBN, looked up by our API (which asks Open Library).
// Resolves to { isbn, title, author, release_year, genre, description, cover_url };
// rejects with an Error whose message can be shown as it is.
export async function lookupIsbn(apiUrl, isbn) {
  let res;
  try {
    res = await authFetch(`${apiUrl}/books/lookup/?${new URLSearchParams({ isbn })}`);
  } catch {
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  }
  if (!res.ok) throw new Error(await readApiError(res, "The lookup failed. Please try again."));
  return res.json();
}

// The cover as a File, so it is uploaded like a cover picked from the device (same size limit,
// same Cloudinary copy). Open Library's cover host allows cross-origin reads, so the browser can
// fetch it directly. Resolves to null when it can't be had: offline, not an image, too large.
export async function fetchCoverFile(url, isbn) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/") || blob.size > MAX_COVER_BYTES) return null;
    const extension = blob.type === "image/png" ? "png" : "jpg";
    return new File([blob], `cover-${isbn}.${extension}`, { type: blob.type });
  } catch {
    return null;
  }
}
