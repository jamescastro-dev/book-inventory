from django.core.files.storage import Storage
from django.test import SimpleTestCase, override_settings
from django.urls import reverse
from rest_framework.test import APITestCase

from .images import resized_url
from .models import Book

COVER = "https://res.cloudinary.com/demo/image/upload/v1/media/book_images/hobbit_abc123"


class FakeCloudinaryStorage(Storage):
    """Stands in for the real storage, which needs Cloudinary credentials to even load.
    It builds URLs in the same shape, so the tests need no credentials and never touch the network."""

    def url(self, name):
        return f"https://res.cloudinary.com/test-cloud/image/upload/v1/{name}"


class ResizedUrlTests(SimpleTestCase):
    def test_adds_the_transformation_right_after_upload(self):
        self.assertEqual(
            resized_url(COVER, 400),
            "https://res.cloudinary.com/demo/image/upload/c_limit,w_400,f_auto,q_auto/v1/media/book_images/hobbit_abc123",
        )

    def test_width_is_a_parameter(self):
        self.assertIn("/c_limit,w_800,f_auto,q_auto/", resized_url(COVER, 800))

    def test_other_values_pass_through_unchanged(self):
        for value in (None, "", "/media/book_images/hobbit.png", "https://example.com/cover.png"):
            self.assertEqual(resized_url(value, 400), value)


@override_settings(STORAGES={
    "default": {"BACKEND": f"{__name__}.FakeCloudinaryStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
})
class BookCoverFieldsTests(APITestCase):
    def get_results(self):
        return {book["title"]: book for book in self.client.get(reverse("get_books")).data["results"]}

    def test_resized_covers_sit_next_to_the_original(self):
        Book.objects.create(title="With cover", author="x", release_year=2000, image="media/book_images/hobbit_abc123")

        result = self.get_results()["With cover"]

        original = "https://res.cloudinary.com/test-cloud/image/upload/v1/media/book_images/hobbit_abc123"
        self.assertEqual(result["image"], original)
        self.assertEqual(result["image_thumb"], resized_url(original, 400))
        self.assertEqual(result["image_medium"], resized_url(original, 800))
        self.assertIn("/c_limit,w_400,f_auto,q_auto/", result["image_thumb"])
        self.assertIn("/c_limit,w_800,f_auto,q_auto/", result["image_medium"])

    def test_book_without_a_cover_has_no_resized_covers(self):
        Book.objects.create(title="Bare", author="x", release_year=2000)

        result = self.get_results()["Bare"]

        self.assertIsNone(result["image"])
        self.assertIsNone(result["image_thumb"])
        self.assertIsNone(result["image_medium"])
