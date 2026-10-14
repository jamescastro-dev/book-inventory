from datetime import timedelta
from io import StringIO

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from book_inventory.accounts.management.commands.seed_demo import (
    DEMO_USERNAME, READER_PASSWORD, READER_USERNAME,
)

from .circulation import CirculationError, borrow, give_back
from .models import Book, Loan
from .permissions import LIBRARIANS_GROUP, is_librarian
from .test_covers import FakeCloudinaryStorage

FAKE_STORAGE = {
    "default": {"BACKEND": f"{FakeCloudinaryStorage.__module__}.FakeCloudinaryStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}

User = get_user_model()


def make_book(title="Dune", copies=1):
    return Book.objects.create(title=title, author="Frank Herbert", release_year=1965, copies=copies)


class CirculationTests(TestCase):
    def setUp(self):
        self.ann = User.objects.create_user("ann")
        self.bob = User.objects.create_user("bob")

    def test_a_loan_lasts_fourteen_days(self):
        loan = borrow(make_book().pk, self.ann)

        self.assertEqual(loan.due_at - loan.borrowed_at, timedelta(days=14))
        self.assertIsNone(loan.returned_at)
        self.assertFalse(loan.is_overdue)

    def test_the_last_copy_can_only_go_once(self):
        book = make_book(copies=1)
        borrow(book.pk, self.ann)

        with self.assertRaisesMessage(CirculationError, "All copies of this book are on loan."):
            borrow(book.pk, self.bob)

    def test_each_copy_can_go_to_a_different_reader(self):
        book = make_book(copies=2)
        borrow(book.pk, self.ann)
        borrow(book.pk, self.bob)

        self.assertEqual(Loan.objects.filter(book=book, returned_at__isnull=True).count(), 2)

    def test_a_reader_cannot_hold_two_copies_of_the_same_book(self):
        book = make_book(copies=3)
        borrow(book.pk, self.ann)

        with self.assertRaisesMessage(CirculationError, "You already have this book."):
            borrow(book.pk, self.ann)

    def test_the_database_itself_refuses_a_second_active_loan(self):
        # The backstop for two simultaneous requests that both pass the checks in borrow()
        book = make_book(copies=3)
        due = timezone.now() + timedelta(days=14)
        Loan.objects.create(book=book, borrower=self.ann, due_at=due)

        with self.assertRaises(IntegrityError), transaction.atomic():
            Loan.objects.create(book=book, borrower=self.ann, due_at=due)

    def test_a_returned_book_can_be_borrowed_again(self):
        book = make_book(copies=1)
        give_back(borrow(book.pk, self.ann).pk)

        loan = borrow(book.pk, self.bob)

        self.assertEqual(loan.borrower, self.bob)

    def test_a_loan_cannot_be_returned_twice(self):
        loan = borrow(make_book().pk, self.ann)
        give_back(loan.pk)

        with self.assertRaisesMessage(CirculationError, "already been returned"):
            give_back(loan.pk)

    def test_overdue_means_past_due_and_not_returned(self):
        loan = Loan.objects.create(book=make_book(), borrower=self.ann, due_at=timezone.now() - timedelta(minutes=1))
        self.assertTrue(loan.is_overdue)

        loan.returned_at = timezone.now()
        self.assertFalse(loan.is_overdue)

    def test_librarians_are_the_group_and_superusers(self):
        librarian = User.objects.create_user("lib")
        librarian.groups.add(Group.objects.create(name=LIBRARIANS_GROUP))
        boss = User.objects.create_superuser("boss", password="x-long-password-1")

        self.assertEqual([is_librarian(u) for u in (self.ann, librarian, boss)], [False, True, True])


class LoanApiTests(APITestCase):
    def setUp(self):
        self.reader = User.objects.create_user("reader1")
        self.other = User.objects.create_user("reader2")
        self.librarian = User.objects.create_user("librarian")
        self.librarian.groups.add(Group.objects.create(name=LIBRARIANS_GROUP))
        self.book = make_book(copies=2)

    def sign_in(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user).access_token}")

    def borrow(self, book=None):
        return self.client.post(reverse("borrow_book", args=[(book or self.book).pk]))

    def loans(self, **params):
        return self.client.get(reverse("loans"), params)

    # ---- borrowing ----

    def test_borrowing_needs_a_token(self):
        self.assertEqual(self.borrow().status_code, 401)
        self.assertEqual(Loan.objects.count(), 0)

    def test_a_reader_borrows_a_book(self):
        self.sign_in(self.reader)

        response = self.borrow()

        self.assertEqual(response.status_code, 201)
        self.assertEqual((response.data["book"]["title"], response.data["borrower"]), ("Dune", "reader1"))
        self.assertFalse(response.data["is_overdue"])

    def test_rules_broken_are_409_with_the_reason(self):
        self.sign_in(self.reader)
        self.borrow()

        again = self.borrow()

        self.assertEqual(again.status_code, 409)
        self.assertEqual(again.data["detail"], "You already have this book.")

    def test_borrowing_a_missing_book_is_404(self):
        self.sign_in(self.reader)
        self.assertEqual(self.client.post(reverse("borrow_book", args=[9999])).status_code, 404)

    # ---- availability on the public book list ----

    def available(self, **params):
        return {b["title"]: (b["copies"], b["available_copies"]) for b in self.client.get(reverse("get_books"), params).data["results"]}

    def test_the_book_list_shows_copies_on_the_shelf(self):
        make_book("Emma", copies=1)
        self.sign_in(self.reader)
        self.borrow()
        self.client.credentials()

        self.assertEqual(self.available(), {"Dune": (2, 1), "Emma": (1, 1)})

    def test_the_list_can_show_only_books_on_the_shelf(self):
        emma = make_book("Emma", copies=1)
        self.sign_in(self.reader)
        self.borrow(emma)
        self.client.credentials()

        self.assertEqual(set(self.available(available="true")), {"Dune"})
        self.assertEqual(set(self.available()), {"Dune", "Emma"})

    # ---- returning ----

    def test_a_reader_returns_their_own_book(self):
        self.sign_in(self.reader)
        loan_id = self.borrow().data["id"]

        response = self.client.post(reverse("return_loan", args=[loan_id]))

        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(response.data["returned_at"])
        self.assertEqual(self.available()["Dune"], (2, 2))

    def test_a_reader_cannot_return_someone_elses_loan(self):
        self.sign_in(self.other)
        loan_id = self.borrow().data["id"]
        self.sign_in(self.reader)

        response = self.client.post(reverse("return_loan", args=[loan_id]))

        self.assertEqual(response.status_code, 404)  # not 403: other people's loans are not even confirmed to exist
        self.assertIsNone(Loan.objects.get(pk=loan_id).returned_at)

    def test_a_librarian_can_check_in_anyones_loan(self):
        self.sign_in(self.reader)
        loan_id = self.borrow().data["id"]
        self.sign_in(self.librarian)

        self.assertEqual(self.client.post(reverse("return_loan", args=[loan_id])).status_code, 200)

    def test_returning_twice_is_409(self):
        self.sign_in(self.reader)
        loan_id = self.borrow().data["id"]
        self.client.post(reverse("return_loan", args=[loan_id]))

        self.assertEqual(self.client.post(reverse("return_loan", args=[loan_id])).status_code, 409)

    # ---- listing ----

    def titles(self, response):
        return [loan["book"]["title"] for loan in response.data["results"]]

    def test_readers_see_only_their_own_loans(self):
        self.sign_in(self.other)
        self.borrow()
        self.sign_in(self.reader)
        self.borrow(make_book("Emma"))

        self.assertEqual(self.titles(self.loans()), ["Emma"])
        self.assertEqual(self.loans(scope="all").status_code, 403)

    def test_librarians_see_everyones_loans(self):
        self.sign_in(self.other)
        self.borrow()
        self.sign_in(self.reader)
        self.borrow(make_book("Emma"))
        self.sign_in(self.librarian)

        self.assertEqual(sorted(self.titles(self.loans(scope="all"))), ["Dune", "Emma"])
        self.assertEqual(self.titles(self.loans()), [])  # their own: none

    def test_status_filters(self):
        now = timezone.now()
        emma, persuasion = make_book("Emma"), make_book("Persuasion")
        Loan.objects.create(book=self.book, borrower=self.reader, due_at=now + timedelta(days=3))
        Loan.objects.create(book=emma, borrower=self.reader, due_at=now - timedelta(days=1))
        Loan.objects.create(book=persuasion, borrower=self.reader, due_at=now - timedelta(days=9), returned_at=now - timedelta(days=2))
        self.sign_in(self.reader)

        self.assertEqual(self.titles(self.loans()), ["Emma", "Dune"])  # active, soonest due first
        self.assertEqual(self.titles(self.loans(status="overdue")), ["Emma"])
        self.assertEqual(self.titles(self.loans(status="returned")), ["Persuasion"])
        self.assertEqual(len(self.titles(self.loans(status="all"))), 3)
        self.assertEqual([loan["is_overdue"] for loan in self.loans().data["results"]], [True, False])

    def test_bad_filter_values_are_400(self):
        self.sign_in(self.reader)
        self.assertEqual(self.loans(status="lost").status_code, 400)
        self.assertEqual(self.loans(scope="everyone").status_code, 400)

    def test_listing_needs_a_token(self):
        self.assertEqual(self.loans().status_code, 401)


@override_settings(STORAGES=FAKE_STORAGE)  # the sample books have covers; no Cloudinary account needed
class SeedDemoAccountsTests(APITestCase):
    def seed(self, *args):
        call_command("seed_demo", "--skip-covers", *args, stdout=StringIO())

    def test_demo_is_a_librarian_and_reader_is_not(self):
        self.seed()

        demo, reader = User.objects.get(username=DEMO_USERNAME), User.objects.get(username=READER_USERNAME)
        self.assertTrue(is_librarian(demo))
        self.assertFalse(is_librarian(reader))
        self.assertTrue(reader.check_password(READER_PASSWORD))
        self.assertFalse(reader.is_staff or reader.is_superuser)

    def test_a_reader_promoted_by_mistake_is_put_back(self):
        self.seed()
        reader = User.objects.get(username=READER_USERNAME)
        reader.groups.add(Group.objects.get(name=LIBRARIANS_GROUP))

        self.seed()

        self.assertFalse(is_librarian(reader))

    def test_the_reader_can_log_in_and_borrow(self):
        self.seed()
        login = self.client.post(reverse("login"), {"username": READER_USERNAME, "password": READER_PASSWORD})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        self.assertEqual(self.client.post(reverse("borrow_book", args=[Book.objects.get(title="The Hobbit").pk])).status_code, 201)
        self.assertEqual(self.client.post(reverse("create_book"), {"title": "x", "author": "y", "release_year": 1}).status_code, 403)

    def test_sample_books_come_with_copies(self):
        self.seed()
        self.assertEqual(Book.objects.get(title="The Hobbit").copies, 3)
        self.assertEqual(Book.objects.get(title="Sapiens").copies, 1)

    def test_reset_loans_checks_in_demo_loans_and_leaves_others_alone(self):
        self.seed()
        hobbit = Book.objects.get(title="The Hobbit")
        stranger = User.objects.create_user("stranger")
        borrow(hobbit.pk, User.objects.get(username=READER_USERNAME))
        borrow(hobbit.pk, stranger)

        self.seed()  # without the flag nothing changes
        self.assertEqual(Loan.objects.filter(returned_at__isnull=True).count(), 2)

        self.seed("--reset-loans")
        self.assertEqual(list(Loan.objects.filter(returned_at__isnull=True).values_list("borrower__username", flat=True)), ["stranger"])
        self.assertEqual(Loan.objects.count(), 2)  # nothing deleted
