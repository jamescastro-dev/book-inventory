from rest_framework import permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .throttles import LoginBurstThrottle, LoginSustainedThrottle


class LoginView(TokenObtainPairView):
    """JWT login, rate limited per client IP to slow down password guessing."""
    throttle_classes = [LoginBurstThrottle, LoginSustainedThrottle]


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
        })
