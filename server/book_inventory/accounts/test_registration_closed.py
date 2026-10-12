from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase


class RegistrationClosedTests(APITestCase):
    def test_register_endpoint_is_gone(self):
        response = self.client.post(
            "/api/auth/register/",
            {"username": "intruder", "email": "x@example.com", "password": "Sup3r-secret-pw"},
            format="json",
        )
        self.assertEqual(response.status_code, 404)
        self.assertFalse(get_user_model().objects.filter(username="intruder").exists())

    def test_login_still_works(self):
        get_user_model().objects.create_user(username="alice", password="Sup3r-secret-pw")
        response = self.client.post(
            "/api/auth/login/",
            {"username": "alice", "password": "Sup3r-secret-pw"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
