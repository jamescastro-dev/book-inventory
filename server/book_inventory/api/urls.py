from django.urls import path
from .views import BookListView, get_genres, create_book, book_detail

urlpatterns = [
    path('books/', BookListView.as_view(), name='get_books'),
    path('books/genres/', get_genres, name='get_genres'),
    path('books/create/', create_book, name='create_book'),
    path('books/<int:pk>/', book_detail, name='book_detail'),
]
