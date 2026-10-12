"""Create (or repair) the public demo account and its sample books.

    python manage.py seed_demo                 # create/repair the demo user, restore missing demo books
    python manage.py seed_demo --reset-books   # also revert edited demo books to their original values

Safe to run repeatedly. It never deletes anything.
"""
import json
from pathlib import Path

from django.apps import apps
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from book_inventory.api.models import Book

# The demo login is public by design: it is shown on the login page and in the README.
DEMO_USERNAME = "demo"
DEMO_PASSWORD = "Library-Demo-2026"

BOOK_FIELDS = ("title", "author", "genre", "release_year", "description", "image")


class Command(BaseCommand):
    help = "Create or repair the demo user and restore any missing demo books."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset-books",
            action="store_true",
            help="Also revert demo books that were edited back to their original values.",
        )

    def handle(self, *args, **options):
        db = settings.DATABASES["default"]
        self.stdout.write(
            f"Target database: {db['ENGINE'].rsplit('.', 1)[-1]} "
            f"{db.get('HOST') or 'local file'} / {db['NAME']}"
        )

        with transaction.atomic():
            self._seed_user()
            self._seed_books(reset=options["reset_books"])

    def _seed_user(self):
        User = get_user_model()
        user, created = User.objects.get_or_create(username=DEMO_USERNAME)
        user.set_password(DEMO_PASSWORD)
        user.is_active = True
        # A normal user: can use the app, cannot open /admin/.
        user.is_staff = False
        user.is_superuser = False
        user.save()
        self.stdout.write(f"Demo user '{DEMO_USERNAME}': {'created' if created else 'updated'}")

    def _seed_books(self, reset):
        path = Path(apps.get_app_config("api").path) / "fixtures" / "demo_books.json"
        try:
            with path.open(encoding="utf-8") as fh:
                records = json.load(fh)
        except FileNotFoundError:
            raise CommandError(f"Fixture not found: {path}")

        restored = reverted = present = 0
        for record in records:
            fields = {name: record["fields"][name] for name in BOOK_FIELDS}
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
