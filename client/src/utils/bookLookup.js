import { authFetch } from "./authFetch.js";
import { MAX_COVER_BYTES, readApiError } from "./uploads.js";

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
