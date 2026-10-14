import io

import cloudinary.exceptions
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.files.storage import Storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from PIL import Image
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Book, Loan
from .permissions import LIBRARIANS_GROUP
from .serializers import MAX_COVER_BYTES



class DiscardingStorage(Storage):
    """Takes the place of Cloudinary: accepts uploads and throws them away, so a test can never
    upload anything. (Django's InMemoryStorage would do, but it can't delete large uploads' temp
    files on Windows.)"""

    def _save(self, name, content):
        return name

    def exists(self, name):
        return False

    def url(self, name):
        return f"/media/{name}"


DISCARD_UPLOADS = {
    "default": {"BACKEND": f"{__name__}.DiscardingStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}


class RefusingStorage(DiscardingStorage):
    """Cloudinary turning an upload down (bad credentials, outage, rate limit)."""

    def _save(self, name, content):
        raise cloudinary.exceptions.AuthorizationRequired("Invalid api_key")


REFUSE_UPLOADS = {**DISCARD_UPLOADS, "default": {"BACKEND": f"{__name__}.RefusingStorage"}}


def png(size=None):
    """A valid PNG, padded with trailing zeros to exactly `size` bytes (image readers ignore them)."""
    buffer = io.BytesIO()
    Image.new("RGB", (1, 1), "white").save(buffer, "PNG")
    data = buffer.getvalue()
    if size is not None:
        data += b"\0" * (size - len(data))
    return SimpleUploadedFile("cover.png", data, content_type="image/png")


@override_settings(STORAGES=DISCARD_UPLOADS)
class BookWriteTests(APITestCase):
    def setUp(self):
        # A librarian like the demo account: in the Librarians group, but no staff or superuser rights
        self.user = get_user_model().objects.create_user("editor", password="a-long-test-password-1")
        self.user.groups.add(Group.objects.get_or_create(name=LIBRARIANS_GROUP)[0])
        self.reader = get_user_model().objects.create_user("reader", password="a-long-test-password-1")
        self.book = Book.objects.create(title="Original", author="Someone", genre="Fantasy", release_year=1999, description="Text")
        self.create_url = reverse("create_book")
        self.detail_url = reverse("book_detail", args=[self.book.pk])

    def sign_in(self, user=None):
        token = RefreshToken.for_user(user or self.user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    # ---- who may write ----

    def test_readers_cannot_create_edit_or_delete_books(self):
        self.sign_in(self.reader)

        self.assertEqual(self.client.post(self.create_url, {"title": "New", "author": "x", "release_year": 2000}, format="json").status_code, 403)
        self.assertEqual(self.client.put(self.detail_url, {"title": "Changed"}, format="json").status_code, 403)
        self.assertEqual(self.client.delete(self.detail_url).status_code, 403)
        self.book.refresh_from_db()
        self.assertEqual((Book.objects.count(), self.book.title), (1, "Original"))

    def test_plain_accounts_are_not_staff(self):
        self.assertFalse(self.user.is_staff or self.user.is_superuser)

    def test_creating_needs_a_token(self):
        response = self.client.post(self.create_url, {"title": "New", "author": "x", "release_year": 2000})

        self.assertEqual(response.status_code, 401)
        self.assertEqual(Book.objects.count(), 1)

    def test_editing_needs_a_token(self):
        response = self.client.put(self.detail_url, {"title": "Changed"})

        self.assertEqual(response.status_code, 401)
        self.book.refresh_from_db()
        self.assertEqual(self.book.title, "Original")

    def test_deleting_needs_a_token(self):
        response = self.client.delete(self.detail_url)

        self.assertEqual(response.status_code, 401)
        self.assertTrue(Book.objects.filter(pk=self.book.pk).exists())

    def test_a_garbage_token_is_rejected(self):
        self.client.credentials(HTTP_AUTHORIZATION="Bearer not-a-real-token")

        self.assertEqual(self.client.delete(self.detail_url).status_code, 401)
        self.assertTrue(Book.objects.filter(pk=self.book.pk).exists())

    # ---- create ----

    def test_signed_in_user_can_create_a_book(self):
        self.sign_in()

        response = self.client.post(
            self.create_url,
            {"title": "New", "author": "Writer", "genre": "Poetry", "release_year": 2020, "description": "About"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual((response.data["title"], response.data["author"], response.data["genre"]), ("New", "Writer", "Poetry"))
        self.assertIsNone(response.data["image"])
        self.assertTrue(Book.objects.filter(title="New", release_year=2020).exists())

    def test_create_reports_every_missing_field(self):
        self.sign_in()

        response = self.client.post(self.create_url, {"author": "Writer"}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(set(response.data), {"title", "release_year"})
        self.assertEqual(Book.objects.count(), 1)

    def test_create_with_a_cover_image(self):
        self.sign_in()

        response = self.client.post(self.create_url, {"title": "Covered", "author": "x", "release_year": 2001, "image": png()}, format="multipart")

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["image"].endswith(".png"))
        self.assertTrue(Book.objects.get(title="Covered").image)

    # ---- the 5 MB cover limit ----

    def test_a_cover_of_exactly_the_limit_is_accepted(self):
        self.sign_in()

        response = self.client.post(self.create_url, {"title": "Big", "author": "x", "release_year": 2001, "image": png(MAX_COVER_BYTES)}, format="multipart")

        self.assertEqual(response.status_code, 201, response.data)

    def test_a_cover_one_byte_over_the_limit_is_refused(self):
        self.sign_in()

        response = self.client.post(self.create_url, {"title": "Too big", "author": "x", "release_year": 2001, "image": png(MAX_COVER_BYTES + 1)}, format="multipart")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["image"], ["The file is too large (max 5 MB)."])
        self.assertFalse(Book.objects.filter(title="Too big").exists())

    def test_a_file_that_is_not_an_image_is_refused(self):
        self.sign_in()
        fake = SimpleUploadedFile("cover.png", b"this is plain text", content_type="image/png")

        response = self.client.post(self.create_url, {"title": "Fake", "author": "x", "release_year": 2001, "image": fake}, format="multipart")

        self.assertEqual(response.status_code, 400)
        self.assertIn("image", response.data)
        self.assertFalse(Book.objects.filter(title="Fake").exists())

    def test_replacing_a_cover_with_an_oversize_one_keeps_the_old_book_unchanged(self):
        self.sign_in()

        response = self.client.put(self.detail_url, {"title": "Renamed", "image": png(MAX_COVER_BYTES + 1)}, format="multipart")

        self.assertEqual(response.status_code, 400)
        self.book.refresh_from_db()
        self.assertEqual(self.book.title, "Original")
        self.assertFalse(self.book.image)

    # ---- when the cover can't be stored ----

    @override_settings(STORAGES=REFUSE_UPLOADS)
    def test_a_refused_cover_upload_saves_nothing_and_says_why(self):
        self.sign_in()

        with self.assertLogs("book_inventory.api.views", "ERROR"):
            response = self.client.post(self.create_url, {"title": "Unlucky", "author": "x", "release_year": 2001, "image": png()}, format="multipart")

        self.assertEqual(response.status_code, 502)
        self.assertIn("cover image couldn't be saved", response.data["detail"])
        self.assertFalse(Book.objects.filter(title="Unlucky").exists())

    @override_settings(STORAGES=REFUSE_UPLOADS)
    def test_a_refused_cover_on_edit_leaves_the_book_unchanged(self):
        self.sign_in()

        with self.assertLogs("book_inventory.api.views", "ERROR"):
            response = self.client.put(self.detail_url, {"title": "Renamed", "image": png()}, format="multipart")

        self.assertEqual(response.status_code, 502)
        self.book.refresh_from_db()
        self.assertEqual(self.book.title, "Original")
        self.assertFalse(self.book.image)

    # ---- update ----

    def test_update_changes_only_the_fields_sent(self):
        self.sign_in()

        response = self.client.put(self.detail_url, {"title": "Renamed"}, format="json")

        self.assertEqual(response.status_code, 200)
        self.book.refresh_from_db()
        self.assertEqual((self.book.title, self.book.author, self.book.genre, self.book.release_year), ("Renamed", "Someone", "Fantasy", 1999))

    def test_update_rejects_invalid_values(self):
        self.sign_in()

        response = self.client.put(self.detail_url, {"release_year": "not a year"}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("release_year", response.data)
        self.book.refresh_from_db()
        self.assertEqual(self.book.release_year, 1999)

    def test_updating_a_missing_book_is_404(self):
        self.sign_in()

        self.assertEqual(self.client.put(reverse("book_detail", args=[9999]), {"title": "x"}, format="json").status_code, 404)

    # ---- delete ----

    def test_signed_in_user_can_delete_a_book(self):
        self.sign_in()

        response = self.client.delete(self.detail_url)

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Book.objects.filter(pk=self.book.pk).exists())

    def test_deleting_a_missing_book_is_404(self):
        self.sign_in()

        self.assertEqual(self.client.delete(reverse("book_detail", args=[9999])).status_code, 404)
        self.assertEqual(Book.objects.count(), 1)


    # ---- copies and loans ----

    def lend(self, book, times=1):
        for n in range(times):
            borrower = get_user_model().objects.create_user(f"borrower{n}")
            Loan.objects.create(book=book, borrower=borrower, due_at="2099-01-01T00:00:00Z")

    def test_copies_can_be_set_and_must_be_at_least_one(self):
        self.sign_in()

        self.assertEqual(self.client.put(self.detail_url, {"copies": 3}, format="json").status_code, 200)
        self.assertEqual(self.client.put(self.detail_url, {"copies": 0}, format="json").status_code, 400)
        self.book.refresh_from_db()
        self.assertEqual(self.book.copies, 3)

    def test_copies_cannot_drop_below_those_on_loan(self):
        self.book.copies = 3
        self.book.save()
        self.lend(self.book, times=2)
        self.sign_in()

        refused = self.client.put(self.detail_url, {"copies": 1}, format="json")
        allowed = self.client.put(self.detail_url, {"copies": 2}, format="json")

        self.assertEqual(refused.status_code, 400)
        self.assertIn("2 copies are on loan", refused.data["copies"][0])
        self.assertEqual((allowed.status_code, allowed.data["available_copies"]), (200, 0))

    def test_a_book_with_copies_on_loan_cannot_be_deleted(self):
        self.lend(self.book)
        self.sign_in()

        response = self.client.delete(self.detail_url)

        self.assertEqual(response.status_code, 409)
        self.assertTrue(Book.objects.filter(pk=self.book.pk).exists())

    def test_a_book_whose_loans_are_all_returned_can_be_deleted_with_its_history(self):
        self.lend(self.book)
        Loan.objects.update(returned_at="2026-01-01T00:00:00Z")
        self.sign_in()

        self.assertEqual(self.client.delete(self.detail_url).status_code, 204)
        self.assertEqual(Loan.objects.count(), 0)
