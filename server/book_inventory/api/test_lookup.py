from unittest import mock

import requests
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.cache import cache
from django.test import SimpleTestCase, TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from . import lookup
from .permissions import LIBRARIANS_GROUP
from .lookup import (
    LookupUnavailable, clean_description, extract_year, fetch_book, isbn_variants,
    lookup_isbn, normalize_isbn, parse_book, suggest_genre,
)

HOBBIT_13 = "9780547928227"
HOBBIT_10 = "054792822X"
COVER = "https://covers.openlibrary.org/b/id/12003329-L.jpg"

# Trimmed copies of what Open Library sends back for the Hobbit
DATA_ENTRY = {
    "title": "The Hobbit",
    "authors": [{"name": "J.R.R. Tolkien", "url": "https://openlibrary.org/authors/OL26320A"}],
    "publish_date": "September 15, 2012",
    "subjects": [{"name": "Fantasy"}, {"name": "nyt:trade-fiction-paperback=2017-09-17"}, {"name": "History"}],
    "cover": {"small": "x", "medium": "y", "large": COVER},
}
DETAILS_ENTRY = {"details": {"description": {"type": "/type/text", "value": "Bilbo Baggins is a hobbit.\r\n\r\n([source][1])\r\n\r\n[1]: https://example.org/x"}}}


class IsbnTests(SimpleTestCase):
    def test_valid_isbns_are_accepted_with_or_without_hyphens_and_spaces(self):
        self.assertEqual(normalize_isbn("978-0-547-92822-7"), HOBBIT_13)
        self.assertEqual(normalize_isbn(" 9780547928227 "), HOBBIT_13)
        self.assertEqual(normalize_isbn("0-8044-2957-x"), "080442957X")  # ISBN-10 whose check digit is X

    def test_a_wrong_check_digit_is_refused(self):
        self.assertIsNone(normalize_isbn("9780547928228"))
        self.assertIsNone(normalize_isbn("0441172718"))

    def test_other_values_are_refused(self):
        for value in (None, "", "123", "abcdefghij", "97805479282271", "1234567890123", "9770547928223"):
            self.assertIsNone(normalize_isbn(value), value)

    def test_variants_pair_the_isbn_13_with_its_isbn_10(self):
        self.assertEqual(isbn_variants(HOBBIT_13), [HOBBIT_13, HOBBIT_10])
        self.assertEqual(isbn_variants(HOBBIT_10), [HOBBIT_13, HOBBIT_10])
        self.assertEqual(isbn_variants("0441172717"), ["9780441172719", "0441172717"])

    def test_isbn_13s_starting_979_have_no_isbn_10(self):
        self.assertEqual(isbn_variants("9791032305690"), ["9791032305690"])


class ParsingTests(SimpleTestCase):
    def test_genre_is_a_suggestion_from_a_fixed_list(self):
        self.assertEqual(suggest_genre(["Dune (Imaginary place)", "Fiction", "Science fiction"]), "Science Fiction")
        self.assertEqual(suggest_genre(["tags", "FANTASY FICTION "]), "Fantasy")
        self.assertIsNone(suggest_genre(["Booksellers and bookselling", "nyt:something=1"]))
        self.assertIsNone(suggest_genre([]))

    def test_fiction_beats_a_stray_history_subject(self):
        self.assertEqual(suggest_genre(["History", "Fiction Classics", "Love stories"]), "Classic Fiction")
        self.assertEqual(suggest_genre(["History", "World history"]), "History")

    def test_year_comes_out_of_free_form_dates(self):
        for text, year in [("1977", 1977), ("March 3, 2001", 2001), ("c1999", 1999), ("2020-05", 2020), ("", None), (None, None), ("n.d.", None)]:
            self.assertEqual(extract_year(text), year, text)

    def test_description_loses_footnotes_and_extra_sections(self):
        raw = "A fine book.\r\n\r\nSecond paragraph.\r\n\r\n([source][1])\r\n\r\n[1]: https://example.org\r\n----------\r\nAlso contained in: x"
        self.assertEqual(clean_description(raw), "A fine book.\n\nSecond paragraph.")
        self.assertEqual(clean_description({"type": "/type/text", "value": "From a dict"}), "From a dict")
        self.assertEqual(clean_description(None), "")
        self.assertEqual(clean_description(42), "")

    def test_long_descriptions_are_cut_at_a_word(self):
        text = clean_description("word " * 1000)
        self.assertLessEqual(len(text), lookup.MAX_DESCRIPTION_CHARS + 1)
        self.assertTrue(text.endswith("…"))

    def test_parse_book_fills_the_form_fields(self):
        book = parse_book(HOBBIT_13, DATA_ENTRY, DETAILS_ENTRY)

        self.assertEqual(book, {
            "isbn": HOBBIT_13,
            "title": "The Hobbit",
            "author": "J.R.R. Tolkien",
            "release_year": 2012,
            "genre": "Fantasy",
            "description": "Bilbo Baggins is a hobbit.",
            "cover_url": COVER,
        })

    def test_parse_book_copes_with_missing_pieces(self):
        book = parse_book(HOBBIT_13, {"title": "Bare"})

        self.assertEqual(book, {"isbn": HOBBIT_13, "title": "Bare", "author": "", "release_year": None, "genre": None, "description": "", "cover_url": None})

    def test_only_open_librarys_own_cover_host_is_passed_on(self):
        entry = {**DATA_ENTRY, "cover": {"large": "https://evil.example/cover.jpg"}}
        self.assertIsNone(parse_book(HOBBIT_13, entry)["cover_url"])

    def test_at_most_three_authors_are_kept(self):
        entry = {**DATA_ENTRY, "authors": [{"name": f"Author {n}"} for n in range(5)]}
        self.assertEqual(parse_book(HOBBIT_13, entry)["author"], "Author 0, Author 1, Author 2")


class FetchTests(SimpleTestCase):
    """Open Library is replaced by canned replies: these tests never touch the network."""

    def canned(self, data, details=None):
        def reply(params):
            if params["jscmd"] == "data":
                if isinstance(data, Exception):
                    raise data
                return data
            if isinstance(details, Exception):
                raise details
            return details or {}
        return mock.patch.object(lookup, "_get", side_effect=reply)

    def test_both_isbn_forms_are_asked_for_in_one_request_each(self):
        with self.canned({f"ISBN:{HOBBIT_13}": DATA_ENTRY}, {f"ISBN:{HOBBIT_13}": DETAILS_ENTRY}) as get:
            book = fetch_book(HOBBIT_10)

        self.assertEqual(book["title"], "The Hobbit")
        self.assertEqual(book["description"], "Bilbo Baggins is a hobbit.")
        self.assertEqual(get.call_count, 2)
        self.assertEqual({call.args[0]["bibkeys"] for call in get.call_args_list}, {f"ISBN:{HOBBIT_13},ISBN:{HOBBIT_10}"})

    def test_an_edition_listed_only_under_its_isbn_10_is_found(self):
        with self.canned({f"ISBN:{HOBBIT_10}": DATA_ENTRY}):
            book = fetch_book(HOBBIT_13)

        self.assertEqual(book["title"], "The Hobbit")
        self.assertEqual(book["isbn"], HOBBIT_13)

    def test_an_unknown_isbn_is_none(self):
        with self.canned({}):
            self.assertIsNone(fetch_book(HOBBIT_13))

    def test_a_failed_description_request_is_not_an_error(self):
        with self.canned({f"ISBN:{HOBBIT_13}": DATA_ENTRY}, LookupUnavailable("slow")):
            book = fetch_book(HOBBIT_13)

        self.assertEqual(book["title"], "The Hobbit")
        self.assertEqual(book["description"], "")

    def test_a_failed_main_request_is_an_error(self):
        with self.canned(LookupUnavailable("down")):
            with self.assertRaises(LookupUnavailable):
                fetch_book(HOBBIT_13)

    def test_network_problems_become_lookup_unavailable(self):
        bad_json = mock.Mock(**{"raise_for_status.return_value": None, "json.side_effect": ValueError("not json")})
        server_error = mock.Mock(**{"raise_for_status.side_effect": requests.HTTPError("500")})
        not_a_dict = mock.Mock(**{"raise_for_status.return_value": None, "json.return_value": []})

        for outcome in (requests.ConnectionError("down"), requests.Timeout("slow"), bad_json, server_error, not_a_dict):
            kwargs = {"side_effect": outcome} if isinstance(outcome, Exception) else {"return_value": outcome}
            with mock.patch.object(lookup.requests, "get", **kwargs):
                with self.assertRaises(LookupUnavailable):
                    lookup._get({"bibkeys": "x"})

    def test_requests_say_who_is_asking_and_do_not_wait_forever(self):
        reply = mock.Mock(**{"raise_for_status.return_value": None, "json.return_value": {}})
        with mock.patch.object(lookup.requests, "get", return_value=reply) as get:
            lookup._get({"bibkeys": "x"})

        self.assertIn("book-inventory", get.call_args.kwargs["headers"]["User-Agent"])
        self.assertEqual(get.call_args.kwargs["timeout"], lookup.TIMEOUT)


class CacheTests(TestCase):
    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)

    def test_a_repeated_isbn_is_not_asked_for_again(self):
        with mock.patch.object(lookup, "fetch_book", return_value={"title": "The Hobbit"}) as fetch:
            self.assertEqual(lookup_isbn(HOBBIT_13), {"title": "The Hobbit"})
            self.assertEqual(lookup_isbn(HOBBIT_13), {"title": "The Hobbit"})

        self.assertEqual(fetch.call_count, 1)

    def test_an_unknown_isbn_is_remembered_too(self):
        with mock.patch.object(lookup, "fetch_book", return_value=None) as fetch:
            self.assertIsNone(lookup_isbn(HOBBIT_13))
            self.assertIsNone(lookup_isbn(HOBBIT_13))

        self.assertEqual(fetch.call_count, 1)

    def test_failures_are_not_remembered(self):
        with mock.patch.object(lookup, "fetch_book", side_effect=LookupUnavailable("down")):
            with self.assertRaises(LookupUnavailable):
                lookup_isbn(HOBBIT_13)
        with mock.patch.object(lookup, "fetch_book", return_value={"title": "The Hobbit"}):
            self.assertEqual(lookup_isbn(HOBBIT_13), {"title": "The Hobbit"})


class LookupEndpointTests(APITestCase):
    def setUp(self):
        cache.clear()  # the lookup limit is counted in the shared cache
        self.addCleanup(cache.clear)
        user = get_user_model().objects.create_user("editor", password="a-long-test-password-1")
        user.groups.add(Group.objects.get_or_create(name=LIBRARIANS_GROUP)[0])
        self.token = RefreshToken.for_user(user).access_token
        self.reader_token = RefreshToken.for_user(get_user_model().objects.create_user("reader")).access_token
        self.url = reverse("lookup_book")
        self.found = parse_book(HOBBIT_13, DATA_ENTRY, DETAILS_ENTRY)

    def sign_in(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def get(self, isbn=HOBBIT_13):
        return self.client.get(self.url, {"isbn": isbn})

    def test_needs_a_token(self):
        with mock.patch("book_inventory.api.views.lookup_isbn") as search:
            self.assertEqual(self.get().status_code, 401)

        search.assert_not_called()

    def test_is_for_librarians_only(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.reader_token}")
        with mock.patch("book_inventory.api.views.lookup_isbn") as search:
            self.assertEqual(self.get().status_code, 403)

        search.assert_not_called()

    def test_returns_the_form_fields(self):
        self.sign_in()
        with mock.patch("book_inventory.api.views.lookup_isbn", return_value=self.found) as search:
            response = self.get("978-0-547-92822-7")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, self.found)
        search.assert_called_once_with(HOBBIT_13)  # normalized before searching

    def test_an_invalid_isbn_is_400_and_never_searched(self):
        self.sign_in()
        with mock.patch("book_inventory.api.views.lookup_isbn") as search:
            for isbn in ("", "123", "9780547928228"):
                self.assertEqual(self.get(isbn).status_code, 400, isbn)
            self.assertEqual(self.client.get(self.url).status_code, 400)

        search.assert_not_called()

    def test_an_unknown_isbn_is_404(self):
        self.sign_in()
        with mock.patch("book_inventory.api.views.lookup_isbn", return_value=None):
            response = self.get()

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["detail"], "No book found for that ISBN.")

    def test_open_library_being_down_is_502(self):
        self.sign_in()
        with mock.patch("book_inventory.api.views.lookup_isbn", side_effect=LookupUnavailable("down")):
            response = self.get()

        self.assertEqual(response.status_code, 502)
        self.assertIn("unavailable", response.data["detail"])

    def test_lookups_are_limited_to_twenty_a_minute(self):
        self.sign_in()
        with mock.patch("book_inventory.api.views.lookup_isbn", return_value=self.found):
            statuses = [self.get().status_code for _ in range(21)]

        self.assertEqual(statuses, [200] * 20 + [429])
