from rest_framework import serializers
from .models import Book

# Largest cover image accepted. Covers are shown at roughly 400x600, so this is generous;
# it mainly stops a public demo account from filling the Cloudinary free-plan storage.
# Keep in sync with MAX_COVER_MB in client/src/utils/uploads.js.
MAX_COVER_MB = 5
MAX_COVER_BYTES = MAX_COVER_MB * 1024 * 1024


class BookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = [
            "id", "title", "genre", "author", "release_year",
            "description", "image", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_image(self, image):
        if image and image.size > MAX_COVER_BYTES:
            raise serializers.ValidationError(f"The file is too large (max {MAX_COVER_MB} MB).")
        return image
