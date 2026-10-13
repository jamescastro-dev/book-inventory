"""Resized versions of the cover images, made on demand by Cloudinary's URL transformations."""

# Covers are shown about 215 px wide in the grid and about 360 px wide in the details view,
# so these widths cover 2x (retina) screens without sending the full-size upload.
THUMB_WIDTH = 400
MEDIUM_WIDTH = 800

_UPLOAD_SEGMENT = "/image/upload/"


def resized_url(url, width):
    """The same Cloudinary image scaled down to at most `width` px wide (never enlarged), in the
    best format and quality the browser supports (f_auto, q_auto: WebP or AVIF instead of PNG/JPEG).

    Cloudinary applies the transformation when the URL is first requested and caches the result.
    Anything that is not a plain Cloudinary image URL (None, an empty value, a local file) is
    returned unchanged, so the caller can use the result without checking.
    """
    if not url or _UPLOAD_SEGMENT not in url:
        return url
    start, rest = url.split(_UPLOAD_SEGMENT, 1)
    return f"{start}{_UPLOAD_SEGMENT}c_limit,w_{width},f_auto,q_auto/{rest}"
