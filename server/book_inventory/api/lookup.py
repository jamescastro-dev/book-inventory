"""Book details by ISBN, from Open Library (https://openlibrary.org/dev/docs/api/books).

Open Library needs no API key. Its data is crowdsourced and messy, so this module is cautious:
ISBNs are checked before anything is sent, the genre is only ever a suggestion taken from a fixed
list, and the cover URL is only passed on if it points at Open Library's own cover host.
"""
import re
from concurrent.futures import ThreadPoolExecutor

import requests
from django.core.cache import cache

API_URL = "https://openlibrary.org/api/books"
COVER_HOST = "https://covers.openlibrary.org/"
# Open Library asks API users to say who they are
USER_AGENT = "BookInventoryPortfolio/1.0 (+https://github.com/jamescastro-dev/book-inventory)"
TIMEOUT = (3, 6)  # seconds to connect, seconds to wait for the reply
FOUND_CACHE_SECONDS = 24 * 60 * 60
MISSING_CACHE_SECONDS = 60 * 60
MAX_DESCRIPTION_CHARS = 2000


class LookupUnavailable(Exception):
    """Open Library did not give a usable answer (down, slow, or an unexpected reply)."""


# ---------------------------------------------------------------- ISBNs

def normalize_isbn(raw):
    """Hyphens and spaces removed, if `raw` is a valid ISBN-10 or ISBN-13 (checksum included); else None."""
    isbn = re.sub(r"[\s-]", "", raw or "").upper()
    if re.fullmatch(r"\d{9}[\dX]", isbn):
        total = sum((10 - i) * (10 if c == "X" else int(c)) for i, c in enumerate(isbn))
        return isbn if total % 11 == 0 else None
    if re.fullmatch(r"97[89]\d{10}", isbn):
        return isbn if _check_digit_13(isbn[:12]) == int(isbn[12]) else None
    return None


def _check_digit_13(first_twelve):
    total = sum(int(c) * (3 if i % 2 else 1) for i, c in enumerate(first_twelve))
    return (10 - total % 10) % 10


def isbn_variants(isbn):
    """The ISBN-13 first, then the ISBN-10 of the same book when it has one.
    Open Library may list an edition under either, so both are asked for."""
    if len(isbn) == 10:
        first_twelve = "978" + isbn[:9]
        return [first_twelve + str(_check_digit_13(first_twelve)), isbn]
    if isbn.startswith("978"):
        body = isbn[3:12]
        check = (11 - sum((10 - i) * int(c) for i, c in enumerate(body)) % 11) % 11
        return [isbn, body + ("X" if check == 10 else str(check))]
    return [isbn]


# ---------------------------------------------------------------- reading Open Library's answer

# Open Library subjects are free-form tags (one book has 108, in several languages). We only
# recognise subjects spelled like these, and pick the earliest genre in this list that matches:
# specific genres before general ones, and fiction before history, because novels often carry
# a stray "History" subject.
GENRE_SUBJECTS = [
    ("Dystopian Fiction", {"dystopias", "dystopian fiction", "dystopian"}),
    ("Science Fiction", {"science fiction", "science-fiction", "fiction, science fiction, general", "english science fiction", "american science fiction"}),
    ("Fantasy", {"fantasy", "fantasy fiction", "fiction, fantasy, general", "high fantasy", "epic fantasy"}),
    ("Horror", {"horror", "horror fiction", "horror stories", "horror tales", "fiction, horror"}),
    ("Mystery", {"mystery", "mystery fiction", "detective fiction", "mystery and detective stories", "detective and mystery stories"}),
    ("Thriller", {"thriller", "thrillers", "suspense", "fiction, thrillers, general"}),
    ("Classic Fiction", {"classics", "fiction classics", "classic fiction", "classic literature"}),
    ("Historical Fiction", {"historical fiction", "fiction, historical, general"}),
    ("Romance", {"romance", "romance fiction", "love stories", "fiction, romance, general"}),
    ("Fiction", {"fiction", "literary fiction", "fiction, general", "novels"}),
    ("Biography", {"biography", "biographies", "autobiography"}),
    ("History", {"history", "world history"}),
    ("Poetry", {"poetry"}),
    ("Non-Fiction", {"non-fiction", "nonfiction"}),
]


def suggest_genre(subjects):
    """The first genre in GENRE_SUBJECTS that any of the book's subjects matches, or None."""
    wanted = {subject.strip().lower() for subject in subjects}
    for genre, names in GENRE_SUBJECTS:
        if wanted & names:
            return genre
    return None


def extract_year(publish_date):
    """The year in a free-form date such as "1977", "March 3, 2001" or "c1999"; None if there isn't one."""
    match = re.search(r"(?<!\d)(1[4-9]\d\d|20\d\d)(?!\d)", publish_date or "")
    return int(match.group(1)) if match else None


def clean_description(raw):
    """Open Library descriptions are a string or {"value": ...}, often followed by "([source][1])"
    footnotes, link references and a "----------" section. Keep only the description itself."""
    text = raw.get("value", "") if isinstance(raw, dict) else raw
    if not isinstance(text, str):
        return ""
    text = text.replace("\r\n", "\n").split("\n----------")[0]
    text = re.sub(r"\(\[source\]\[\d+\]\)", "", text)
    text = re.sub(r"^\[\d+\]:\s*\S+.*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    if len(text) > MAX_DESCRIPTION_CHARS:
        text = text[:MAX_DESCRIPTION_CHARS].rsplit(" ", 1)[0].rstrip(".,;: ") + "…"
    return text


def parse_book(isbn13, data, details=None):
    """What the Add Book form needs, from Open Library's "data" entry for an edition and,
    optionally, its "details" entry (which is where the description lives)."""
    title = (data.get("title") or "").strip()
    authors = [a["name"].strip() for a in data.get("authors", []) if a.get("name")]
    subjects = [s["name"] for s in data.get("subjects", []) if s.get("name")]
    cover = (data.get("cover") or {}).get("large") or (data.get("cover") or {}).get("medium") or ""
    description = (details or {}).get("details", {}).get("description")
    return {
        "isbn": isbn13,
        "title": title,
        "author": ", ".join(authors[:3]),
        "release_year": extract_year(data.get("publish_date")),
        "genre": suggest_genre(subjects),
        "description": clean_description(description),
        "cover_url": cover if cover.startswith(COVER_HOST) else None,
    }


# ---------------------------------------------------------------- talking to Open Library

def _get(params):
    try:
        response = requests.get(API_URL, params=params, headers={"User-Agent": USER_AGENT}, timeout=TIMEOUT)
        response.raise_for_status()
        data = response.json()
    except (requests.RequestException, ValueError) as error:
        raise LookupUnavailable(str(error)) from error
    if not isinstance(data, dict):
        raise LookupUnavailable("unexpected reply")
    return data


def fetch_book(isbn):
    """Details for a valid ISBN, or None if Open Library doesn't know it. Raises LookupUnavailable."""
    variants = isbn_variants(isbn)
    keys = ",".join(f"ISBN:{v}" for v in variants)
    with ThreadPoolExecutor(max_workers=2) as pool:
        data_reply = pool.submit(_get, {"bibkeys": keys, "format": "json", "jscmd": "data"})
        details_reply = pool.submit(_get, {"bibkeys": keys, "format": "json", "jscmd": "details"})
        data = data_reply.result()
        try:
            details = details_reply.result()
        except LookupUnavailable:
            details = {}  # the description is a nice extra; its absence is not an error

    for variant in variants:
        entry = data.get(f"ISBN:{variant}")
        if isinstance(entry, dict) and entry.get("title"):
            return parse_book(variants[0], entry, details.get(f"ISBN:{variant}"))
    return None


COVER_TIMEOUT = (3, 20)  # covers are bigger than the JSON replies
MAX_COVER_BYTES = 5 * 1024 * 1024  # the same limit as an uploaded cover


def fetch_cover(isbn):
    """The large cover image for an ISBN (bytes), or None if Open Library has none, or it isn't a
    usable image. Raises LookupUnavailable if Open Library can't be reached."""
    try:
        response = requests.get(
            f"{COVER_HOST}b/isbn/{isbn}-L.jpg",
            params={"default": "false"},  # 404 instead of a blank placeholder image
            headers={"User-Agent": USER_AGENT},
            timeout=COVER_TIMEOUT,
        )
    except requests.RequestException as error:
        raise LookupUnavailable(str(error)) from error
    if response.status_code == 404:
        return None
    if not response.ok:
        raise LookupUnavailable(f"covers answered {response.status_code}")
    if not response.headers.get("Content-Type", "").startswith("image/") or not 0 < len(response.content) <= MAX_COVER_BYTES:
        return None
    return response.content


def lookup_isbn(isbn):
    """fetch_book with a cache in front, so a repeated ISBN doesn't hit Open Library again."""
    key = f"isbn-lookup:{isbn}"
    cached = cache.get(key)
    if cached is not None:
        return cached["book"]
    book = fetch_book(isbn)
    cache.set(key, {"book": book}, FOUND_CACHE_SECONDS if book else MISSING_CACHE_SECONDS)
    return book
