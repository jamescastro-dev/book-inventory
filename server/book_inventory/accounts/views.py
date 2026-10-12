from rest_framework import permissions
from rest_framework.views import APIView
from rest_framework.response import Response


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
        })
