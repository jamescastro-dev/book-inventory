import logging

import cloudinary.exceptions
from django.db import transaction
from django.db.models import Count, F, Min
from django.utils import timezone
from django.db.models.functions import Lower
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema, extend_schema_view
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.filters import SearchFilter
from rest_framework.generics import ListAPIView
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from .circulation import CirculationError, borrow, give_back, with_copies_on_loan
from .filters import BookOrderingFilter
from .lookup import LookupUnavailable, lookup_isbn, normalize_isbn
from .models import Book, Loan
from .pagination import BookPagination, LoanPagination
from .permissions import IsLibrarian, is_librarian
from .serializers import BookLookupSerializer, BookSerializer, GenreCountSerializer, LoanSerializer
from .throttles import IsbnLookupThrottle

UNAUTHORIZED = OpenApiResponse(description="Missing, invalid or expired access token.")
INVALID = OpenApiResponse(description='Validation errors by field, e.g. `{"image": ["The file is too large (max 5 MB)."]}`.')
NOT_FOUND = OpenApiResponse(description="No book with this id.")
NOT_LIBRARIAN = OpenApiResponse(description="Signed in, but only librarians can do this.")
RULE_BROKEN = OpenApiResponse(description="A lending rule says no; `detail` says which (e.g. all copies are on loan).")
COVER_NOT_STORED = OpenApiResponse(description="The cover image couldn't be stored, so nothing was saved.")

logger = logging.getLogger(__name__)


def save_book(serializer, success_status):
    """Save a valid BookSerializer. If the cover upload fails, nothing is saved (the file is stored
    before the row is written) and the reader gets a message instead of a server error."""
    try:
        with transaction.atomic():  # a savepoint, so the failure can't spoil an enclosing transaction
            serializer.save()
    except cloudinary.exceptions.Error:
        logger.exception("Couldn't store a cover image")
        return Response(
            {"detail": "The cover image couldn't be saved, so the book wasn't either. Try again, or save it without a cover."},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    return Response(serializer.data, status=success_status)


# ---------------- Book Views ----------------
@extend_schema_view(get=extend_schema(
    summary="List books",
    parameters=[
        OpenApiParameter("search", str, description="Words to find in the title or author, ignoring case. Every word must match."),
        OpenApiParameter("genre", str, description="Only books of this genre, ignoring case. Names come from `GET /api/books/genres/`."),
        OpenApiParameter("available", bool, description="`true`: only books with at least one copy on the shelf."),
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
        books = with_copies_on_loan(Book.objects.all())
        genre = self.request.query_params.get("genre", "").strip()
        if genre:
            books = books.filter(genre__iexact=genre)
        if self.request.query_params.get("available", "").lower() in ("true", "1"):
            books = books.filter(on_loan__lt=F("copies"))
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
    summary="Look up a book by ISBN",
    description=(
        "Fetches the title, author, year, a suggested genre, description and cover link from Open Library, "
        "to fill in the Add Book form. Librarians only. Each lookup asks Open Library twice, so it is limited to 20 a minute per IP."
    ),
    parameters=[OpenApiParameter("isbn", str, required=True, description="ISBN-10 or ISBN-13, with or without hyphens.")],
    responses={
        200: BookLookupSerializer,
        400: OpenApiResponse(description="Not a valid ISBN."),
        401: UNAUTHORIZED,
        403: NOT_LIBRARIAN,
        404: OpenApiResponse(description="Open Library has no book with this ISBN."),
        429: OpenApiResponse(description="Too many lookups; wait for the number of seconds in the `Retry-After` header."),
        502: OpenApiResponse(description="Open Library did not answer; try again or enter the details by hand."),
    },
)
@api_view(['GET'])
@permission_classes([IsLibrarian])
@throttle_classes([IsbnLookupThrottle])
def lookup_book(request):
    isbn = normalize_isbn(request.query_params.get("isbn", ""))
    if not isbn:
        return Response({"detail": "Enter a valid 10 or 13 digit ISBN."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        book = lookup_isbn(isbn)
    except LookupUnavailable:
        return Response(
            {"detail": "Book lookup is unavailable right now. Try again in a moment, or enter the details by hand."},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    if book is None:
        return Response({"detail": "No book found for that ISBN."}, status=status.HTTP_404_NOT_FOUND)
    return Response(BookLookupSerializer(book).data)

@extend_schema(
    summary="Create a book",
    description="Send JSON, or a multipart form to include a cover `image` (at most 5 MB).",
    request=BookSerializer,
    responses={201: BookSerializer, 400: INVALID, 401: UNAUTHORIZED, 403: NOT_LIBRARIAN, 502: COVER_NOT_STORED},
)
@api_view(['POST'])
@permission_classes([IsLibrarian])
def create_book(request):
    serializer = BookSerializer(data=request.data)
    if serializer.is_valid():
        return save_book(serializer, status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@extend_schema(
    methods=['PUT'],
    summary="Update a book",
    description="Partial updates are allowed: send only the fields to change.",
    request=BookSerializer,
    responses={200: BookSerializer, 400: INVALID, 401: UNAUTHORIZED, 403: NOT_LIBRARIAN, 404: NOT_FOUND, 502: COVER_NOT_STORED},
)
@extend_schema(
    methods=['DELETE'],
    summary="Delete a book",
    responses={
        204: OpenApiResponse(description="Deleted."), 401: UNAUTHORIZED, 403: NOT_LIBRARIAN, 404: NOT_FOUND,
        409: OpenApiResponse(description="Copies are still on loan; they must be returned first."),
    },
)
@api_view(['PUT', 'DELETE'])
@permission_classes([IsLibrarian])
def book_detail(request, pk):
    try:
        book = Book.objects.get(pk=pk)
    except Book.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        if book.loans.filter(returned_at__isnull=True).exists():
            return Response(
                {"detail": "Copies of this book are on loan. They must be returned before it can be deleted."},
                status=status.HTTP_409_CONFLICT,
            )
        book.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    elif request.method == 'PUT':
        serializer = BookSerializer(book, data=request.data, partial=True)
        if serializer.is_valid():
            return save_book(serializer, status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ---------------- Loans ----------------
@extend_schema(
    summary="Borrow a book",
    description="Lends one copy to the signed-in reader for 14 days.",
    request=None,
    responses={201: LoanSerializer, 401: UNAUTHORIZED, 404: NOT_FOUND, 409: RULE_BROKEN},
)
@api_view(['POST'])
def borrow_book(request, pk):
    try:
        loan = borrow(pk, request.user)
    except Book.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    except CirculationError as error:
        return Response({"detail": str(error)}, status=status.HTTP_409_CONFLICT)
    return Response(LoanSerializer(loan).data, status=status.HTTP_201_CREATED)


@extend_schema(
    summary="Return a book",
    description="The borrower can return their own loans; librarians can return anyone's (checking a book in at the desk).",
    request=None,
    responses={200: LoanSerializer, 401: UNAUTHORIZED, 404: OpenApiResponse(description="No such loan, or not yours."), 409: RULE_BROKEN},
)
@api_view(['POST'])
def return_loan(request, pk):
    visible = Loan.objects.all() if is_librarian(request.user) else Loan.objects.filter(borrower=request.user)
    if not visible.filter(pk=pk).exists():
        return Response(status=status.HTTP_404_NOT_FOUND)
    try:
        loan = give_back(pk)
    except CirculationError as error:
        return Response({"detail": str(error)}, status=status.HTTP_409_CONFLICT)
    return Response(LoanSerializer(loan).data)


LOAN_STATUSES = ["active", "overdue", "returned", "all"]


@extend_schema_view(get=extend_schema(
    summary="List loans",
    parameters=[
        OpenApiParameter("scope", str, enum=["mine", "all"], description="`mine` (default): your own loans. `all`: everyone's, librarians only."),
        OpenApiParameter("status", str, enum=LOAN_STATUSES, description="Default `active`. Active and overdue loans come soonest-due first; the rest newest first."),
    ],
    responses={200: LoanSerializer(many=True), 400: INVALID, 401: UNAUTHORIZED, 403: NOT_LIBRARIAN},
))
class LoanListView(ListAPIView):
    serializer_class = LoanSerializer
    pagination_class = LoanPagination

    def get_queryset(self):
        params = self.request.query_params
        scope, wanted = params.get("scope", "mine"), params.get("status", "active")
        if scope not in ("mine", "all"):
            raise ValidationError({"scope": "Use mine or all."})
        if wanted not in LOAN_STATUSES:
            raise ValidationError({"status": "Use active, overdue, returned or all."})

        loans = Loan.objects.select_related("book", "borrower")
        if scope == "all":
            if not is_librarian(self.request.user):
                raise PermissionDenied("Only librarians can see everyone's loans.")
        else:
            loans = loans.filter(borrower=self.request.user)

        if wanted == "active":
            return loans.filter(returned_at__isnull=True).order_by("due_at", "id")
        if wanted == "overdue":
            return loans.filter(returned_at__isnull=True, due_at__lt=timezone.now()).order_by("due_at", "id")
        if wanted == "returned":
            return loans.filter(returned_at__isnull=False).order_by("-returned_at", "-id")
        return loans
