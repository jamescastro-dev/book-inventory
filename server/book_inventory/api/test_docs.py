import os
import tempfile

from django.core.management import call_command
from django.test import TestCase, override_settings
from django.urls import reverse


class ApiDocsTests(TestCase):
    def test_schema_is_valid_and_has_no_warnings(self):
        # --fail-on-warn also catches a view the generator can't describe
        with tempfile.TemporaryDirectory() as folder:
            call_command("spectacular", "--validate", "--fail-on-warn", "--file", os.path.join(folder, "schema.yml"))

    def test_schema_describes_every_endpoint(self):
        response = self.client.get(reverse("schema"), {"format": "json"})

        self.assertEqual(response.status_code, 200)
        # Adding an endpoint means documenting it, then listing it here
        self.assertEqual(set(response.json()["paths"]), {
            "/api/auth/login/",
            "/api/auth/me/",
            "/api/auth/token/refresh/",
            "/api/books/",
            "/api/books/create/",
            "/api/books/genres/",
            "/api/books/{id}/",
        })

    def test_docs_page_is_public_and_serves_swagger_ui_from_this_server(self):
        response = self.client.get(reverse("docs"))

        self.assertEqual(response.status_code, 200)
        html = response.content.decode()
        self.assertIn("swagger-ui", html)
        self.assertIn(reverse("schema"), html)
        self.assertNotIn("cdn.jsdelivr.net", html)  # the files come from drf-spectacular-sidecar


class StaticFilesTests(TestCase):
    def test_collectstatic_gathers_the_swagger_ui_files(self):
        # On Render, WhiteNoise can only serve what the build's `collectstatic` copied into STATIC_ROOT.
        # django-cloudinary-storage replaces that command (and copies nothing) if its app is listed above staticfiles.
        with tempfile.TemporaryDirectory() as folder, override_settings(STATIC_ROOT=folder):
            call_command("collectstatic", interactive=False, verbosity=0)

            self.assertTrue(os.path.exists(os.path.join(folder, "drf_spectacular_sidecar", "swagger-ui-dist", "swagger-ui-bundle.js")))
            self.assertTrue(os.path.exists(os.path.join(folder, "admin", "css", "base.css")))
