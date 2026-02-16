from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Book
from .serializers import BookSerializer

# ---------------- Book Views ----------------
@api_view(['GET'])
def get_books(request):
    books = Book.objects.all()
    return Response(BookSerializer(books, many=True).data)

@api_view(['POST'])
def create_book(request):
    serializer = BookSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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

# ---------------- Auth Views ----------------
@api_view(['POST'])
def register_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    if User.objects.filter(username=username).exists():
        return Response(
            {"username": ["A user with that username already exists."]},
            status=status.HTTP_400_BAD_REQUEST
        )
    user = User.objects.create_user(username=username, password=password)
    refresh = RefreshToken.for_user(user)
    return Response({
        "user": {"id": user.id, "username": user.username},
        "access": str(refresh.access_token),
        "refresh": str(refresh)
    })

@api_view(['POST'])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    if user is None:
        return Response({"detail": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
    refresh = RefreshToken.for_user(user)
    return Response({
        "user": {"id": user.id, "username": user.username},
        "access": str(refresh.access_token),
        "refresh": str(refresh)
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    return Response({"id": request.user.id, "username": request.user.username})
