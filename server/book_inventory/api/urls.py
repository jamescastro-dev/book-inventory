from django.urls import path
from .views import get_books, create_book, book_detail
from .views import register_view, login_view, me_view 

urlpatterns = [
    # Book endpoints
    path('books/', get_books, name='get_books'),
    path('books/create/', create_book, name='create_book'),
    path('books/<int:pk>/', book_detail, name='book_detail'),

    # Auth endpoints
    path('register/', register_view, name='register'),
    path('login/', login_view, name='login'),
    path('me/', me_view, name='me'),
]
