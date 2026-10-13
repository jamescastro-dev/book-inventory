from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class BookPagination(PageNumberPagination):
    """Page-number pagination: ?page=2&page_size=8 (page_size is capped at 50).

    The response carries the page numbers instead of next/previous links. Behind Render's
    proxy Django would build those links with http://, and the client has no use for them.
    """

    page_size = 8
    page_size_query_param = "page_size"
    max_page_size = 50

    def get_paginated_response(self, data):
        paginator = self.page.paginator
        return Response({
            "count": paginator.count,
            "page": self.page.number,
            "page_size": paginator.per_page,
            "total_pages": paginator.num_pages,
            "results": data,
        })
