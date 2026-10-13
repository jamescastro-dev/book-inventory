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
        self.user = get_user_model().objects.create_user("reader", password=PASSWORD, email="reader@example.com")

    def log_in(self, password=PASSWORD, **headers):
        return self.client.post(reverse("login"), {"username": "reader", "password": password}, **headers)


class LoginTests(AuthTestCase):
    def test_correct_credentials_give_both_tokens(self):
        response = self.log_in()

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["access"])
        self.assertTrue(response.data["refresh"])

    def test_wrong_password_is_401(self):
        self.assertEqual(self.log_in("wrong").status_code, 401)

    def test_unknown_user_is_401(self):
        response = self.client.post(reverse("login"), {"username": "nobody", "password": PASSWORD})
        self.assertEqual(response.status_code, 401)


class CurrentUserTests(AuthTestCase):
    def test_needs_a_token(self):
        self.assertEqual(self.client.get(reverse("me")).status_code, 401)

    def test_returns_the_signed_in_user(self):
        token = self.log_in().data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        response = self.client.get(reverse("me"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"id": self.user.id, "username": "reader", "email": "reader@example.com"})


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


class LoginThrottleTests(AuthTestCase):
    """5 attempts a minute per client IP (see REST_FRAMEWORK in settings.py). On Render the real
    client IP arrives in the CF-Connecting-IP header."""

    ME = {"HTTP_CF_CONNECTING_IP": "203.0.113.7"}
    SOMEONE_ELSE = {"HTTP_CF_CONNECTING_IP": "203.0.113.8"}

    def fail_five_times(self, **headers):
        for attempt in range(5):
            self.assertEqual(self.log_in("wrong", **headers).status_code, 401, f"attempt {attempt + 1}")

    def test_the_sixth_attempt_in_a_minute_is_blocked_even_with_the_right_password(self):
        self.fail_five_times(**self.ME)

        response = self.log_in(**self.ME)

        self.assertEqual(response.status_code, 429)
        self.assertGreater(int(response["Retry-After"]), 0)

    def test_another_ip_is_not_affected(self):
        self.fail_five_times(**self.ME)

        self.assertEqual(self.log_in(**self.SOMEONE_ELSE).status_code, 200)

    def test_a_forged_x_forwarded_for_does_not_get_around_the_limit(self):
        self.fail_five_times(**self.ME, HTTP_X_FORWARDED_FOR="198.51.100.1")

        response = self.log_in(**self.ME, HTTP_X_FORWARDED_FOR="198.51.100.2")

        self.assertEqual(response.status_code, 429)

    def test_without_a_proxy_header_the_connecting_address_is_used(self):
        self.fail_five_times()  # the test client connects from 127.0.0.1

        self.assertEqual(self.log_in().status_code, 429)
        self.assertEqual(self.log_in(**self.SOMEONE_ELSE).status_code, 200)
