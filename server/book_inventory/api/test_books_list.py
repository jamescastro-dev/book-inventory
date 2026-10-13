from django.urls import reverse
from rest_framework.test import APITestCase

from .models import Book


def titles(response):
    return [book["title"] for book in response.data["results"]]


class BookListTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        # Created in this order, so ids ascend: hobbit < dune < apple pie < banana.
        # Titles and a genre are deliberately lower case in places to test case handling.
        for title, author, genre, year in [
            ("The Hobbit", "J.R.R. Tolkien", "Fantasy", 1937),
            ("dune", "Frank Herbert", "Science Fiction", 1965),
            ("Apple Pie", "Zed Author", "fantasy", 2000),
            ("Banana", "Amy Author", None, 1990),
        ]:
            Book.objects.create(title=title, author=author, genre=genre, release_year=year)
        cls.url = reverse("get_books")

    def get(self, **params):
        return self.client.get(self.url, params)

    # ---- shape and access ----

    def test_list_is_public_and_paginated(self):
        response = self.get()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            {key: response.data[key] for key in ("count", "page", "page_size", "total_pages")},
            {"count": 4, "page": 1, "page_size": 8, "total_pages": 1},
        )
        self.assertEqual(len(response.data["results"]), 4)

    def test_default_order_is_oldest_first(self):
        self.assertEqual(titles(self.get()), ["The Hobbit", "dune", "Apple Pie", "Banana"])

    def test_page_size_and_page(self):
        first = self.get(page_size=3)
        self.assertEqual((first.data["total_pages"], len(first.data["results"])), (2, 3))
        second = self.get(page_size=3, page=2)
        self.assertEqual(titles(second), ["Banana"])

    def test_page_size_is_capped(self):
        self.assertEqual(self.get(page_size=1000).data["page_size"], 50)

    def test_page_past_the_end_is_404(self):
        self.assertEqual(self.get(page=2).status_code, 404)

    def test_no_results_is_an_empty_page_not_an_error(self):
        response = self.get(search="nothing like this")
        self.assertEqual(response.status_code, 200)
        self.assertEqual((response.data["count"], response.data["results"]), (0, []))

    # ---- search ----

    def test_search_title_ignores_case(self):
        self.assertEqual(titles(self.get(search="DUNE")), ["dune"])

    def test_search_matches_author(self):
        self.assertEqual(titles(self.get(search="tolkien")), ["The Hobbit"])

    def test_search_words_must_all_match(self):
        self.assertEqual(titles(self.get(search="author apple")), ["Apple Pie"])
        self.assertEqual(titles(self.get(search="author tolkien")), [])

    # ---- genre ----

    def test_genre_filter_ignores_case(self):
        self.assertEqual(titles(self.get(genre="FANTASY")), ["The Hobbit", "Apple Pie"])

    def test_unknown_genre_is_empty(self):
        self.assertEqual(self.get(genre="Poetry").data["count"], 0)

    def test_blank_genre_means_all(self):
        self.assertEqual(self.get(genre="  ").data["count"], 4)

    # ---- ordering ----

    def test_title_sort_ignores_case(self):
        self.assertEqual(titles(self.get(ordering="title")), ["Apple Pie", "Banana", "dune", "The Hobbit"])
        self.assertEqual(titles(self.get(ordering="-title")), ["The Hobbit", "dune", "Banana", "Apple Pie"])

    def test_sort_by_year(self):
        self.assertEqual(titles(self.get(ordering="-release_year")), ["Apple Pie", "Banana", "dune", "The Hobbit"])

    def test_unknown_ordering_falls_back_to_default(self):
        for field in ("password", "image", "nonsense"):
            self.assertEqual(titles(self.get(ordering=field)), ["The Hobbit", "dune", "Apple Pie", "Banana"], field)

    def test_equal_values_keep_a_fixed_order_across_pages(self):
        # Three books share a title, so the sort alone can't decide their order.
        for _ in range(3):
            Book.objects.create(title="Twin", author="X", release_year=2001)
        seen = []
        for page in (1, 2, 3):
            seen += [book["id"] for book in self.get(ordering="title", page_size=3, page=page).data["results"]]
        self.assertEqual(len(seen), 7)
        self.assertEqual(len(set(seen)), 7, "a book appeared on two pages")
        twins = [book["id"] for book in self.get(ordering="title", page_size=50).data["results"] if book["title"] == "Twin"]
        self.assertEqual(twins, sorted(twins))

    # ---- together ----

    def test_search_genre_ordering_and_paging_combine(self):
        # "r" matches both fantasy books (Tolkien / Author); newest title first puts Apple Pie second
        response = self.get(genre="fantasy", search="r", ordering="-title", page_size=1, page=2)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)
        self.assertEqual(titles(response), ["Apple Pie"])


class GenreListTests(APITestCase):
    def test_genres_are_public_counted_and_merged_by_case(self):
        for title, genre in [("A", "Fantasy"), ("B", "fantasy"), ("C", "Poetry"), ("D", ""), ("E", None)]:
            Book.objects.create(title=title, author="x", genre=genre, release_year=2000)

        response = self.client.get(reverse("get_genres"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [{"name": "Fantasy", "count": 2}, {"name": "Poetry", "count": 1}])

    def test_no_books_means_no_genres(self):
        self.assertEqual(self.client.get(reverse("get_genres")).data, [])
