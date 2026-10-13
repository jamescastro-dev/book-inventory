from django.db.models import Count, Min
from django.db.models.functions import Lower
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema, extend_schema_view
from rest_framework.decorators import api_view, permission_classes
from rest_framework.filters import SearchFilter
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from .filters import BookOrderingFilter
from .models import Book
from .pagination import BookPagination
from .serializers import BookSerializer, GenreCountSerializer

UNAUTHORIZED = OpenApiResponse(description="Missing, invalid or expired access token.")
INVALID = OpenApiResponse(description='Validation errors by field, e.g. `{"image": ["The file is too large (max 5 MB)."]}`.')
NOT_FOUND = OpenApiResponse(description="No book with this id.")

# ---------------- Book Views ----------------
@extend_schema_view(get=extend_schema(
    summary="List books",
    parameters=[
        OpenApiParameter("search", str, description="Words to find in the title or author, ignoring case. Every word must match."),
        OpenApiParameter("genre", str, description="Only books of this genre, ignoring case. Names come from `GET /api/books/genres/`."),
        OpenApiParameter(
            "ordering", str, enum=["title", "-title", "author", "-author", "release_year", "-release_year", "created_at", "-created_at"],
            description="Sort order; a leading `-` reverses it. Titles and authors sort ignoring case. Default: oldest first.",
        ),
    ],
))
class BookListView(ListAPIView):
    """Public, paginated list of books.

    ?search=  matches the title or author (every word must match one of them)
    ?genre=   exact genre, ignoring case
    ?ordering=  title, author, release_year or created_at; prefix with - to reverse
    ?page=  and  ?page_size=
    """

    permission_classes = [AllowAny]
    serializer_class = BookSerializer
    pagination_class = BookPagination
    filter_backends = [SearchFilter, BookOrderingFilter]
    search_fields = ["title", "author"]
    ordering_fields = ["title", "author", "release_year", "created_at"]
    ordering = ["id"]

    def get_queryset(self):
        books = Book.objects.all()
        genre = self.request.query_params.get("genre", "").strip()
        if genre:
            books = books.filter(genre__iexact=genre)
        return books


@extend_schema(summary="List genres", responses=GenreCountSerializer(many=True))
@api_view(['GET'])
@permission_classes([AllowAny])
def get_genres(request):
    """Genres in use, each with the number of books that have it (spellings differing only in case are merged)."""
    rows = (
        Book.objects.exclude(genre__isnull=True).exclude(genre="")
        .annotate(key=Lower("genre")).values("key")
        .annotate(name=Min("genre"), count=Count("id"))
        .order_by("key")
    )
    return Response(GenreCountSerializer(rows, many=True).data)

@extend_schema(
    summary="Create a book",
    description="Send JSON, or a multipart form to include a cover `image` (at most 5 MB).",
    request=BookSerializer,
    responses={201: BookSerializer, 400: INVALID, 401: UNAUTHORIZED},
)
@api_view(['POST'])
def create_book(request):
    serializer = BookSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@extend_schema(
    methods=['PUT'],
    summary="Update a book",
    description="Partial updates are allowed: send only the fields to change.",
    request=BookSerializer,
    responses={200: BookSerializer, 400: INVALID, 401: UNAUTHORIZED, 404: NOT_FOUND},
)
@extend_schema(
    methods=['DELETE'],
    summary="Delete a book",
    responses={204: OpenApiResponse(description="Deleted."), 401: UNAUTHORIZED, 404: NOT_FOUND},
)
@api_view(['PUT', 'DELETE'])
def book_detail(request, pk):
    try:
        book = Book.objects.get(pk=pk)
    except Book.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        book.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    elif request.method == 'PUT':
        serializer = BookSerializer(book, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

