from django.urls import path
from .views import BookListView, LoanListView, book_detail, borrow_book, create_book, get_genres, lookup_book, return_loan

urlpatterns = [
    path('books/', BookListView.as_view(), name='get_books'),
    path('books/genres/', get_genres, name='get_genres'),
    path('books/lookup/', lookup_book, name='lookup_book'),
    path('books/create/', create_book, name='create_book'),
    path('books/<int:pk>/', book_detail, name='book_detail'),
    path('books/<int:pk>/borrow/', borrow_book, name='borrow_book'),
    path('loans/', LoanListView.as_view(), name='loans'),
    path('loans/<int:pk>/return/', return_loan, name='return_loan'),
]
