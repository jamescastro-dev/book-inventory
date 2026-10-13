from rest_framework import serializers
from .images import MEDIUM_WIDTH, THUMB_WIDTH, resized_url
from .models import Book

# Largest cover image accepted. Covers are shown at roughly 400x600, so this is generous;
# it mainly stops a public demo account from filling the Cloudinary free-plan storage.
# Keep in sync with MAX_COVER_MB in client/src/utils/uploads.js.
MAX_COVER_MB = 5
MAX_COVER_BYTES = MAX_COVER_MB * 1024 * 1024


class BookSerializer(serializers.ModelSerializer):
    # Smaller copies of `image` (null when the book has no cover): use these for display.
    image_thumb = serializers.SerializerMethodField()
    image_medium = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = [
            "id", "title", "genre", "author", "release_year",
            "description", "image", "image_thumb", "image_medium",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_image_thumb(self, book) -> str | None:
        return resized_url(book.image.url, THUMB_WIDTH) if book.image else None

    def get_image_medium(self, book) -> str | None:
        return resized_url(book.image.url, MEDIUM_WIDTH) if book.image else None

    def validate_image(self, image):
        if image and image.size > MAX_COVER_BYTES:
            raise serializers.ValidationError(f"The file is too large (max {MAX_COVER_MB} MB).")
        return image
