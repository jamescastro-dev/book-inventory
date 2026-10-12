// Keep in sync with MAX_COVER_MB in server/book_inventory/api/serializers.py
export const MAX_COVER_MB = 5;
export const MAX_COVER_BYTES = MAX_COVER_MB * 1024 * 1024;

const FIELD_LABELS = { image: "Cover image", release_year: "Release year" };

// Turn a failed API response into a message a person can act on,
// e.g. {"image": ["The file is too large (max 5 MB)."]} -> "Cover image: The file is too large (max 5 MB)."
export async function readApiError(res, fallback) {
  let data;
  try {
    data = await res.json();
  } catch {
    // Not JSON: a proxy in front of the API rejected the request.
    return res.status === 413 ? `The upload is too large (max ${MAX_COVER_MB} MB).` : fallback;
  }
  if (data && typeof data === "object") {
    const messages = Object.entries(data).map(([field, errors]) => {
      const text = [].concat(errors).join(" ");
      return field === "detail" || field === "non_field_errors" ? text : `${FIELD_LABELS[field] ?? field}: ${text}`;
    });
    if (messages.length) return messages.join(" | ");
  }
  return fallback;
}
