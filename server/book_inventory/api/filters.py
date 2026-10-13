from django.db.models import F
from django.db.models.functions import Lower
from rest_framework.filters import OrderingFilter


class BookOrderingFilter(OrderingFilter):
    """?ordering=title (or -title) with two additions to DRF's OrderingFilter:

    - text columns sort case-insensitively, whatever collation the database uses;
    - the id is always the last sort key, so books with equal values keep a fixed order
      and a book can never show up on two pages (or on none) while paging.
    """

    case_insensitive_fields = {"title", "author"}

    def filter_queryset(self, request, queryset, view):
        ordering = self.get_ordering(request, queryset, view)
        if not ordering:
            return queryset

        terms = []
        for term in ordering:
            field = term.lstrip("-")
            expression = Lower(field) if field in self.case_insensitive_fields else F(field)
            terms.append(expression.desc() if term.startswith("-") else expression.asc())
        terms.append(F("id").asc())
        return queryset.order_by(*terms)
