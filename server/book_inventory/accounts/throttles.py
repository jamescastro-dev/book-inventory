from rest_framework.throttling import SimpleRateThrottle


class ClientIPRateThrottle(SimpleRateThrottle):
    """Rate limit per real client IP. Rates live in REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"].

    On Render, Cloudflare and Render's load balancer sit in front of the app: REMOTE_ADDR is a
    proxy, and the left-most X-Forwarded-For entry is whatever the caller sent, so keying on
    either would be shared by everyone or trivially spoofed. Render documents that Cloudflare
    overwrites CF-Connecting-IP on every request, so trust that and fall back to REMOTE_ADDR
    where there is no proxy (local development).

    Counters live in Django's default per-process cache, which is enough for the single
    gunicorn worker Render runs.
    """

    def get_ident(self, request):
        return request.META.get("HTTP_CF_CONNECTING_IP") or request.META.get("REMOTE_ADDR")

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class LoginBurstThrottle(ClientIPRateThrottle):
    scope = "login_burst"  # stops fast guessing


class LoginSustainedThrottle(ClientIPRateThrottle):
    scope = "login_sustained"  # caps slow guessing over an hour
