from rest_framework.permissions import BasePermission

# Members of this group manage the catalogue and see everyone's loans; everyone else who signs
# in is a reader. Superusers always count as librarians. seed_demo puts the demo account in it.
LIBRARIANS_GROUP = "Librarians"


def is_librarian(user):
    if not (user and user.is_authenticated):
        return False
    return user.is_superuser or user.groups.filter(name=LIBRARIANS_GROUP).exists()


class IsLibrarian(BasePermission):
    message = "Only librarians can do this."

    def has_permission(self, request, view):
        return is_librarian(request.user)
