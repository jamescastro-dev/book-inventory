"""Create (or repair) the public demo accounts and the sample books.

    python manage.py seed_demo                 # create/repair the demo accounts, restore missing demo books
    python manage.py seed_demo --reset-books   # also revert edited demo books to their original values
    python manage.py seed_demo --reset-loans   # also check in every book the demo accounts have out
    python manage.py seed_demo --skip-covers   # don't fetch missing covers from Open Library

Two accounts: "demo" is a librarian (manages books, sees everyone's loans) and "reader" can
borrow and return. Safe to run repeatedly. It never deletes anything.

Sample books that list an "isbn" in the fixture instead of an "image" get their cover from Open
Library, once: the cover is uploaded to the media storage (Cloudinary in production) the first time
the book is found without one, and kept after that, even by --reset-books.
"""
import json
from pathlib import Path

import cloudinary.exceptions

from django.apps import apps
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from book_inventory.api.lookup import LookupUnavailable, fetch_cover
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
        parser.add_argument(
            "--skip-covers",
            action="store_true",
            help="Don't fetch missing sample covers from Open Library.",
        )

    def handle(self, *args, **options):
        db = settings.DATABASES["default"]
        self.stdout.write(
            f"Target database: {db['ENGINE'].rsplit('.', 1)[-1]} "
            f"{db.get('HOST') or 'local file'} / {db['NAME']}"
        )

        records = self._load_fixture()
        with transaction.atomic():
            librarians, _ = Group.objects.get_or_create(name=LIBRARIANS_GROUP)
            self._seed_user(DEMO_USERNAME, DEMO_PASSWORD, librarians, librarian=True)
            self._seed_user(READER_USERNAME, READER_PASSWORD, librarians, librarian=False)
            self._seed_books(records, reset=options["reset_books"])
            if options["reset_loans"]:
                self._reset_loans()
        # Outside the transaction: downloads can be slow, and each saved cover should stay saved
        if not options["skip_covers"]:
            self._fetch_covers(records)

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

    def _load_fixture(self):
        path = Path(apps.get_app_config("api").path) / "fixtures" / "demo_books.json"
        try:
            with path.open(encoding="utf-8") as fh:
                return json.load(fh)
        except FileNotFoundError:
            raise CommandError(f"Fixture not found: {path}")

    def _seed_books(self, records, reset):
        restored = reverted = present = 0
        for record in records:
            fields = {name: record["fields"].get(name, 1 if name == "copies" else None) for name in BOOK_FIELDS}
            if "isbn" in record["fields"] and not fields["image"]:
                del fields["image"]  # the cover comes from Open Library; a reset keeps the one fetched
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

    def _fetch_covers(self, records):
        fetched = missing = failed = 0
        for record in records:
            isbn = record["fields"].get("isbn")
            if not isbn or record["fields"].get("image"):
                continue
            book = Book.objects.filter(title=record["fields"]["title"], author=record["fields"]["author"]).first()
            if book is None or book.image:
                continue
            try:
                data = fetch_cover(isbn)
            except LookupUnavailable:
                failed += 1
                continue
            if data is None:
                missing += 1
                continue
            try:
                book.image.save(f"{slugify(book.title)}.jpg", ContentFile(data), save=False)
            except cloudinary.exceptions.Error:
                failed += 1
                continue
            Book.objects.filter(pk=book.pk).update(image=book.image.name)  # only the cover; nothing else changes
            fetched += 1

        if fetched or missing or failed:
            summary = f"Demo covers: {fetched} fetched from Open Library"
            if missing:
                summary += f", {missing} not on Open Library"
            if failed:
                summary += f", {failed} failed (run again to retry)"
            self.stdout.write(summary)
