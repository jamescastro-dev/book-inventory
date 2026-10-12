from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from rest_framework.test import APITestCase

from book_inventory.accounts.management.commands.seed_demo import DEMO_PASSWORD, DEMO_USERNAME
from book_inventory.api.models import Book

User = get_user_model()


def seed(*args):
    out = StringIO()
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
    def test_restores_the_ten_demo_books_and_is_idempotent(self):
        seed()
        self.assertEqual(Book.objects.count(), 10)
        seed()
        self.assertEqual(Book.objects.count(), 10)
        self.assertEqual(User.objects.filter(username=DEMO_USERNAME).count(), 1)

    def test_restores_only_missing_books(self):
        seed()
        Book.objects.filter(title__in=["Dune", "1984"]).delete()
        self.assertEqual(Book.objects.count(), 8)

        output = seed()

        self.assertEqual(Book.objects.count(), 10)
        self.assertIn("2 restored, 8 already present", output)

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
