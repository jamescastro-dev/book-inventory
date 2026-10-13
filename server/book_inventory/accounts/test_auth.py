from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APITestCase

PASSWORD = "a-long-test-password-1"


class AuthTestCase(APITestCase):
    def setUp(self):
        # Login is throttled per IP and the counters are shared by every test in the run,
        # so start clean and leave clean.
        cache.clear()
        self.addCleanup(cache.clear)
        self.user = get_user_model().objects.create_user("reader", password=PASSWORD)

    def log_in(self, password=PASSWORD):
        return self.client.post(reverse("login"), {"username": "reader", "password": password})


class TokenRefreshTests(AuthTestCase):
    def test_refresh_token_gives_a_new_access_token(self):
        tokens = self.log_in().data

        response = self.client.post(reverse("token_refresh"), {"refresh": tokens["refresh"]})

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["access"])

    def test_an_access_token_is_not_accepted_as_a_refresh_token(self):
        tokens = self.log_in().data

        response = self.client.post(reverse("token_refresh"), {"refresh": tokens["access"]})

        self.assertEqual(response.status_code, 401)
