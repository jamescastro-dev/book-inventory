from django.contrib import admin

from .models import Book, Loan


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ("title", "author", "genre", "release_year", "copies")
    search_fields = ("title", "author")
    list_filter = ("genre",)


@admin.register(Loan)
class LoanAdmin(admin.ModelAdmin):
    list_display = ("book", "borrower", "borrowed_at", "due_at", "returned_at", "is_overdue")
    list_filter = ("returned_at",)
    search_fields = ("book__title", "borrower__username")
    autocomplete_fields = ("book",)

    @admin.display(boolean=True)
    def is_overdue(self, loan):
        return loan.is_overdue
