from django.db import models

class Book(models.Model):
    title = models.CharField(max_length=255)
    author = models.CharField(max_length=255, default="Unknown Author")
    genre = models.CharField(max_length=100, blank=True, null=True)
    release_year = models.IntegerField()
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='book_images/', blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Without an ordering the database may return rows in any order (Postgres moves
        # rows around when they are updated), so the list could reshuffle after an edit.
        ordering = ["id"]

    def __str__(self):
        return self.title
