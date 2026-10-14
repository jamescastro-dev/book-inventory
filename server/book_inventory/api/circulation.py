"""Borrowing and returning books. The rules live here so the views stay thin and the tests can
call them directly."""
from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Count, Q
from django.utils import timezone

from .models import Book, Loan

ACTIVE = Q(returned_at__isnull=True)


class CirculationError(Exception):
    """A request that breaks a lending rule. The message is meant to be shown to the person."""


def with_copies_on_loan(books):
    """Annotate a Book queryset with `on_loan`, the number of copies currently lent out."""
    return books.annotate(on_loan=Count("loans", filter=Q(loans__returned_at__isnull=True)))


def copies_on_loan(book):
    on_loan = getattr(book, "on_loan", None)
    return on_loan if on_loan is not None else book.loans.filter(ACTIVE).count()


def borrow(book_id, user):
    """Lend one copy of the book to `user` for LOAN_DAYS days. Raises Book.DoesNotExist or CirculationError."""
    with transaction.atomic():
        # Lock the book row, so two people can't both take its last copy
        book = Book.objects.select_for_update().get(pk=book_id)
        if Loan.objects.filter(ACTIVE, book=book, borrower=user).exists():
            raise CirculationError("You already have this book.")
        if Loan.objects.filter(ACTIVE, book=book).count() >= book.copies:
            raise CirculationError("All copies of this book are on loan.")
        now = timezone.now()
        try:
            with transaction.atomic():
                return Loan.objects.create(book=book, borrower=user, borrowed_at=now, due_at=now + timedelta(days=settings.LOAN_DAYS))
        except IntegrityError:
            # the database's one-active-loan rule caught a duplicate request the check above missed
            raise CirculationError("You already have this book.")


def give_back(loan_id):
    """Mark a loan returned. Raises Loan.DoesNotExist or CirculationError."""
    with transaction.atomic():
        loan = Loan.objects.select_for_update().get(pk=loan_id)
        if loan.returned_at is not None:
            raise CirculationError("This book has already been returned.")
        loan.returned_at = timezone.now()
        loan.save(update_fields=["returned_at"])
        return loan
