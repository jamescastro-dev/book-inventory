"""Create (or repair) the public demo accounts and the sample books.

    python manage.py seed_demo                 # create/repair the demo accounts, restore missing demo books
    python manage.py seed_demo --reset-books   # also revert edited demo books to their original values
    python manage.py seed_demo --reset-loans   # also check in every book the demo accounts have out

Two accounts: "demo" is a librarian (manages books, sees everyone's loans) and "reader" can
borrow and return. Safe to run repeatedly. It never deletes anything.
"""
import json
from pathlib import Path

from django.apps import apps
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from book_inventory.api.models import Book, Loan
from book_inventory.api.permissions import LIBRARIANS_GROUP

# The demo logins are public by design: they are shown on the login page and in the README.
DEMO_USERNAME = "demo"          # librarian
DEMO_PASSWORD = "Library-Demo-2026"
READER_USERNAME = "reader"      # borrows books
READER_PASSWORD = "Reader-Demo-2026"

BOOK_FIELDS = ("title", "author", "genre", "release_year", "description", "image", "copies")


class Command(BaseCommand):
    help = "Create or repair the demo accounts and restore any missing demo books."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset-books",
            action="store_true",
            help="Also revert demo books that were edited back to their original values.",
        )
        parser.add_argument(
            "--reset-loans",
            action="store_true",
            help="Also mark every book the demo accounts have out as returned (nothing is deleted).",
        )

    def handle(self, *args, **options):
        db = settings.DATABASES["default"]
        self.stdout.write(
            f"Target database: {db['ENGINE'].rsplit('.', 1)[-1]} "
            f"{db.get('HOST') or 'local file'} / {db['NAME']}"
        )

        with transaction.atomic():
            librarians, _ = Group.objects.get_or_create(name=LIBRARIANS_GROUP)
            self._seed_user(DEMO_USERNAME, DEMO_PASSWORD, librarians, librarian=True)
            self._seed_user(READER_USERNAME, READER_PASSWORD, librarians, librarian=False)
            self._seed_books(reset=options["reset_books"])
            if options["reset_loans"]:
                self._reset_loans()

    def _seed_user(self, username, password, librarians, librarian):
        User = get_user_model()
        user, created = User.objects.get_or_create(username=username)
        user.set_password(password)
        user.is_active = True
        # Normal users: they can use the app, but cannot open /admin/.
        user.is_staff = False
        user.is_superuser = False
        user.save()
        if librarian:
            user.groups.add(librarians)
        else:
            user.groups.remove(librarians)
        role = "librarian" if librarian else "reader"
        self.stdout.write(f"Demo {role} '{username}': {'created' if created else 'updated'}")

    def _reset_loans(self):
        returned = Loan.objects.filter(
            borrower__username__in=[DEMO_USERNAME, READER_USERNAME], returned_at__isnull=True
        ).update(returned_at=timezone.now())
        self.stdout.write(f"Demo loans: {returned} checked back in")

    def _seed_books(self, reset):
        path = Path(apps.get_app_config("api").path) / "fixtures" / "demo_books.json"
        try:
            with path.open(encoding="utf-8") as fh:
                records = json.load(fh)
        except FileNotFoundError:
            raise CommandError(f"Fixture not found: {path}")

        restored = reverted = present = 0
        for record in records:
            fields = {name: record["fields"].get(name, 1 if name == "copies" else None) for name in BOOK_FIELDS}
            book = Book.objects.filter(title=fields["title"], author=fields["author"]).first()
            if book is None:
                Book.objects.create(**fields)
                restored += 1
                continue
            present += 1
            if reset and any(getattr(book, name) != value for name, value in fields.items()):
                for name, value in fields.items():
                    setattr(book, name, value)
                book.save()
                reverted += 1

        summary = f"Demo books: {restored} restored, {present} already present"
        if reset:
            summary += f", {reverted} reverted to original"
        self.stdout.write(summary)
