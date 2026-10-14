from rest_framework import serializers
from .circulation import copies_on_loan
from .images import MEDIUM_WIDTH, THUMB_WIDTH, resized_url
from .models import Book, Loan

# Largest cover image accepted. Covers are shown at roughly 400x600, so this is generous;
# it mainly stops a public demo account from filling the Cloudinary free-plan storage.
# Keep in sync with MAX_COVER_MB in client/src/utils/uploads.js.
MAX_COVER_MB = 5
MAX_COVER_BYTES = MAX_COVER_MB * 1024 * 1024


class BookSerializer(serializers.ModelSerializer):
    # Smaller copies of `image` (null when the book has no cover): use these for display.
    image_thumb = serializers.SerializerMethodField()
    image_medium = serializers.SerializerMethodField()
    available_copies = serializers.SerializerMethodField(help_text="Copies on the shelf right now (copies minus those on loan)")

    class Meta:
        model = Book
        fields = [
            "id", "title", "genre", "author", "release_year",
            "description", "image", "image_thumb", "image_medium",
            "copies", "available_copies",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_image_thumb(self, book) -> str | None:
        return resized_url(book.image.url, THUMB_WIDTH) if book.image else None

    def get_image_medium(self, book) -> str | None:
        return resized_url(book.image.url, MEDIUM_WIDTH) if book.image else None

    def get_available_copies(self, book) -> int:
        return max(book.copies - copies_on_loan(book), 0)

    def validate_copies(self, copies):
        if self.instance is not None:
            on_loan = copies_on_loan(self.instance)
            if copies < on_loan:
                raise serializers.ValidationError(f"{on_loan} copies are on loan, so there can't be fewer than {on_loan}.")
        return copies

    def validate_image(self, image):
        if image and image.size > MAX_COVER_BYTES:
            raise serializers.ValidationError(f"The file is too large (max {MAX_COVER_MB} MB).")
        return image


class GenreCountSerializer(serializers.Serializer):
    name = serializers.CharField()
    count = serializers.IntegerField(help_text="Number of books with this genre")


class BookLookupSerializer(serializers.Serializer):
    """What GET /api/books/lookup/ returns: the Add Book form's fields, filled in from Open Library."""

    isbn = serializers.CharField(help_text="The ISBN-13 of the book")
    title = serializers.CharField()
    author = serializers.CharField(allow_blank=True)
    release_year = serializers.IntegerField(allow_null=True)
    genre = serializers.CharField(allow_null=True, help_text="A suggestion from a fixed list of common genres; null when no subject matched")
    description = serializers.CharField(allow_blank=True)
    cover_url = serializers.URLField(allow_null=True, help_text="Cover image on covers.openlibrary.org, when there is one")


class LoanBookSerializer(serializers.ModelSerializer):
    image_thumb = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = ["id", "title", "author", "image_thumb"]

    def get_image_thumb(self, book) -> str | None:
        return resized_url(book.image.url, THUMB_WIDTH) if book.image else None


class LoanSerializer(serializers.ModelSerializer):
    book = LoanBookSerializer(read_only=True)
    borrower = serializers.CharField(source="borrower.username", read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Loan
        fields = ["id", "book", "borrower", "borrowed_at", "due_at", "returned_at", "is_overdue"]
        read_only_fields = fields
