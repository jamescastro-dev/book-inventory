import json
from io import StringIO
from pathlib import Path
from unittest import mock

from django.apps import apps
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import override_settings
from rest_framework.test import APITestCase

from book_inventory.accounts.management.commands import seed_demo
from book_inventory.accounts.management.commands.seed_demo import DEMO_PASSWORD, DEMO_USERNAME
from book_inventory.api.lookup import LookupUnavailable
from book_inventory.api.models import Book
from book_inventory.api.test_books_write import DISCARD_UPLOADS

User = get_user_model()

FIXTURE = json.loads((Path(apps.get_app_config("api").path) / "fixtures" / "demo_books.json").read_text(encoding="utf-8"))
SAMPLE_COUNT = len(FIXTURE)
WITH_ISBN = [r["fields"] for r in FIXTURE if r["fields"].get("isbn") and not r["fields"].get("image")]


def seed(*args, cover=None):
    """Run seed_demo. Open Library is never contacted: every cover fetch answers `cover`
    (None means "Open Library has no cover")."""
    out = StringIO()
    with mock.patch.object(seed_demo, "fetch_cover", return_value=cover):
        call_command("seed_demo", *args, stdout=out)
    return out.getvalue()


class SeedDemoUserTests(APITestCase):
    def test_creates_a_normal_user_with_the_public_password(self):
        seed()
        user = User.objects.get(username=DEMO_USERNAME)
        self.assertTrue(user.check_password(DEMO_PASSWORD))
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

    def test_repairs_a_tampered_demo_user(self):
        seed()
        user = User.objects.get(username=DEMO_USERNAME)
        user.set_password("something-else")
        user.is_staff = user.is_superuser = True
        user.is_active = False
        user.save()

        seed()

        user.refresh_from_db()
        self.assertTrue(user.check_password(DEMO_PASSWORD))
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

    def test_does_not_touch_other_users(self):
        other = User.objects.create_superuser("owner", password="Owner-pass-123")
        seed()
        other.refresh_from_db()
        self.assertTrue(other.check_password("Owner-pass-123"))
        self.assertTrue(other.is_superuser)

    def test_demo_user_can_log_in_and_keeps_create_edit_delete_rights(self):
        seed()
        login = self.client.post(
            "/api/auth/login/",
            {"username": DEMO_USERNAME, "password": DEMO_PASSWORD},
            format="json",
        )
        self.assertEqual(login.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        created = self.client.post(
            "/api/books/create/", {"title": "Temp", "author": "Me", "release_year": 2024}, format="json"
        )
        self.assertEqual(created.status_code, 201)
        book_id = created.data["id"]
        edited = self.client.put(f"/api/books/{book_id}/", {"title": "Temp 2"}, format="json")
        self.assertEqual(edited.status_code, 200)
        deleted = self.client.delete(f"/api/books/{book_id}/")
        self.assertEqual(deleted.status_code, 204)


class SeedDemoBooksTests(APITestCase):
    def test_restores_every_sample_book_and_is_idempotent(self):
        seed()
        self.assertEqual(Book.objects.count(), SAMPLE_COUNT)
        seed()
        self.assertEqual(Book.objects.count(), SAMPLE_COUNT)
        self.assertEqual(User.objects.filter(username=DEMO_USERNAME).count(), 1)

    def test_restores_only_missing_books(self):
        seed()
        Book.objects.filter(title__in=["Dune", "1984"]).delete()
        self.assertEqual(Book.objects.count(), SAMPLE_COUNT - 2)

        output = seed()

        self.assertEqual(Book.objects.count(), SAMPLE_COUNT)
        self.assertIn(f"2 restored, {SAMPLE_COUNT - 2} already present", output)

    def test_never_deletes_books_it_does_not_know_about(self):
        seed()
        Book.objects.create(title="My Own Book", author="Someone", release_year=2024)
        seed()
        seed("--reset-books")
        self.assertTrue(Book.objects.filter(title="My Own Book").exists())

    def test_edits_survive_by_default_and_are_reverted_with_flag(self):
        seed()
        dune = Book.objects.get(title="Dune")
        original_description = dune.description
        dune.description = "vandalised"
        dune.genre = "Spam"
        dune.save()

        seed()
        dune.refresh_from_db()
        self.assertEqual(dune.description, "vandalised")

        output = seed("--reset-books")
        dune.refresh_from_db()
        self.assertEqual(dune.description, original_description)
        self.assertNotEqual(dune.genre, "Spam")
        self.assertIn("1 reverted to original", output)
        self.assertEqual(Book.objects.filter(title="Dune").count(), 1)

    def test_keeps_cloudinary_image_names(self):
        seed()
        hobbit = Book.objects.get(title="The Hobbit")
        self.assertTrue(hobbit.image.name.startswith("media/book_images/the-hobbit"))


@override_settings(STORAGES=DISCARD_UPLOADS)  # covers are "uploaded" to a storage that keeps nothing
class SeedDemoCoverTests(APITestCase):
    def covered(self):
        return Book.objects.filter(title__in=[f["title"] for f in WITH_ISBN]).exclude(image="").exclude(image=None)

    def test_the_fixture_gives_every_new_sample_book_a_valid_isbn(self):
        from book_inventory.api.lookup import normalize_isbn

        self.assertGreater(len(WITH_ISBN), 0)
        for fields in WITH_ISBN:
            self.assertEqual(normalize_isbn(fields["isbn"]), fields["isbn"], fields["title"])

    def test_fetches_missing_covers_once(self):
        output = seed(cover=b"jpeg bytes")

        self.assertEqual(self.covered().count(), len(WITH_ISBN))
        self.assertIn(f"Demo covers: {len(WITH_ISBN)} fetched from Open Library", output)
        circe = Book.objects.get(title="Circe")
        self.assertTrue(circe.image.name.startswith("book_images/circe"))

        with mock.patch.object(seed_demo, "fetch_cover") as fetch:
            call_command("seed_demo", stdout=StringIO())
        fetch.assert_not_called()  # every cover is already there

    def test_a_reset_keeps_fetched_covers(self):
        seed(cover=b"jpeg bytes")
        circe = Book.objects.get(title="Circe")
        cover = circe.image.name
        circe.description = "vandalised"
        circe.save()

        seed("--reset-books", cover=b"other bytes")

        circe.refresh_from_db()
        self.assertNotEqual(circe.description, "vandalised")
        self.assertEqual(circe.image.name, cover)

    def test_books_without_a_cover_on_open_library_are_still_added(self):
        output = seed(cover=None)

        self.assertEqual(Book.objects.count(), SAMPLE_COUNT)
        self.assertEqual(self.covered().count(), 0)
        self.assertIn(f"{len(WITH_ISBN)} not on Open Library", output)

    def test_an_unreachable_open_library_is_reported_and_retried_next_time(self):
        out = StringIO()
        with mock.patch.object(seed_demo, "fetch_cover", side_effect=LookupUnavailable("down")):
            call_command("seed_demo", stdout=out)

        self.assertEqual(Book.objects.count(), SAMPLE_COUNT)
        self.assertIn("failed (run again to retry)", out.getvalue())

        seed(cover=b"jpeg bytes")
        self.assertEqual(self.covered().count(), len(WITH_ISBN))

    def test_skip_covers_does_not_contact_open_library(self):
        with mock.patch.object(seed_demo, "fetch_cover") as fetch:
            call_command("seed_demo", "--skip-covers", stdout=StringIO())

        fetch.assert_not_called()
        self.assertEqual(Book.objects.count(), SAMPLE_COUNT)

    def test_the_original_sample_covers_are_left_alone(self):
        seed(cover=b"jpeg bytes")
        hobbit = Book.objects.get(title="The Hobbit")
        self.assertTrue(hobbit.image.name.startswith("media/book_images/the-hobbit"))
