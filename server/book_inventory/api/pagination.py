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

    def get_paginated_response_schema(self, schema):
        # Describes the response above in the OpenAPI docs
        return {
            "type": "object",
            "required": ["count", "page", "page_size", "total_pages", "results"],
            "properties": {
                "count": {"type": "integer", "description": "Number of books matching the search and filters, over all pages", "example": 10},
                "page": {"type": "integer", "example": 1},
                "page_size": {"type": "integer", "example": 8},
                "total_pages": {"type": "integer", "example": 2},
                "results": schema,
            },
        }
