from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone

class Book(models.Model):
    title = models.CharField(max_length=255)
    author = models.CharField(max_length=255, default="Unknown Author")
    genre = models.CharField(max_length=100, blank=True, null=True)
    release_year = models.IntegerField()
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='book_images/', blank=True, null=True)
    copies = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)], help_text="How many copies the library owns")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Without an ordering the database may return rows in any order (Postgres moves
        # rows around when they are updated), so the list could reshuffle after an edit.
        ordering = ["id"]

    def __str__(self):
        return self.title


class Loan(models.Model):
    """One copy of a book lent to one reader. It is active until returned_at is set."""

    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="loans")
    borrower = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="loans")
    borrowed_at = models.DateTimeField(default=timezone.now)
    due_at = models.DateTimeField()
    returned_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-borrowed_at", "-id"]
        constraints = [
            # A reader can hold one copy of a book at a time (enforced by the database, so even
            # two simultaneous requests can't both succeed)
            models.UniqueConstraint(
                fields=["book", "borrower"],
                condition=Q(returned_at__isnull=True),
                name="one_active_loan_per_book_and_reader",
            ),
        ]

    def __str__(self):
        return f"{self.book} -> {self.borrower}"

    @property
    def is_overdue(self):
        return self.returned_at is None and self.due_at < timezone.now()
