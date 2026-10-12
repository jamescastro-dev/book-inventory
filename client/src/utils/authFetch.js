// fetch() wrapper for requests that need the JWT.
// A 401 while a token is stored means that token expired (60 minute lifetime) or is no
// longer valid, so announce it and let AuthProvider sign the user out and show the login page.
export const SESSION_EXPIRED_EVENT = "auth:session-expired";

export async function authFetch(url, options = {}) {
  const token = localStorage.getItem("access_token");
  const res = await fetch(url, {
    ...options,
    headers: { ...options.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (res.status === 401 && token) window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  return res;
}
