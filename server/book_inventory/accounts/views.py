from drf_spectacular.utils import OpenApiResponse, extend_schema, inline_serializer
from rest_framework import permissions, serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .throttles import LoginBurstThrottle, LoginSustainedThrottle


TOKEN_PAIR = inline_serializer("TokenPair", {
    "access": serializers.CharField(help_text="Short-lived token (60 minutes) to send as `Authorization: Bearer <access>`"),
    "refresh": serializers.CharField(help_text="Token that can be exchanged for a new access token (valid for 1 day)"),
})


@extend_schema(
    summary="Sign in",
    responses={
        200: TOKEN_PAIR,
        401: OpenApiResponse(description="Wrong username or password."),
        429: OpenApiResponse(description="Too many attempts from this IP address. Wait for the number of seconds in the `Retry-After` header."),
    },
)
class LoginView(TokenObtainPairView):
    """JWT login, rate limited per client IP to slow down password guessing."""
    throttle_classes = [LoginBurstThrottle, LoginSustainedThrottle]


@extend_schema(
    summary="Refresh the access token",
    responses={
        200: TokenRefreshSerializer,
        401: OpenApiResponse(description="Invalid or expired refresh token."),
    },
)
class RefreshView(TokenRefreshView):
    """Exchange a refresh token for a new access token."""


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        summary="Current user",
        responses={
            200: inline_serializer("CurrentUser", {
                "id": serializers.IntegerField(),
                "username": serializers.CharField(),
                "email": serializers.CharField(),
            }),
            401: OpenApiResponse(description="Missing, invalid or expired access token."),
        },
    )
    def get(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
        })
