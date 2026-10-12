import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext.jsx";
import { SESSION_EXPIRED_EVENT } from "@/utils/authFetch.js";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // Only "loading" while a stored token is being validated against the API
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem("access_token")));
  const [error, setError] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_AUTH_URL;

  // Initialize auth state from localStorage
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    axios
      .get(`${API_URL}/me/`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      })
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem("access_token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [API_URL]);

  // A request with our token came back 401: the session expired. Sign out and ask for a new login.
  useEffect(() => {
    const onSessionExpired = () => {
      localStorage.removeItem("access_token");
      setUser(null);
      // Kept in context rather than route state: ProtectedRoute also redirects to /login and would drop it.
      setSessionExpired(true);
      navigate("/login", { replace: true });
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, [navigate]);

  // Login
  const login = async (username, password) => {
    try {
      setError(null);
      setSessionExpired(false);
      const res = await axios.post(
        `${API_URL}/login/`,
        { username, password },
        { headers: { "Content-Type": "application/json" }, timeout: 15000 }
      );

      const token = res.data.access;
      localStorage.setItem("access_token", token);

      // Fetch user info after login
      const meRes = await axios.get(`${API_URL}/me/`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      setUser(meRes.data);
      navigate("/books");
    } catch (err) {
      if (err.code === "ECONNABORTED") {
        setError("Server is warming up, please try again in a moment.");
      } else if (err.response?.status === 429) {
        setError("Too many sign-in attempts. Please wait a minute and try again.");
      } else {
        setError(err.response?.data?.detail || "Login failed");
      }
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem("access_token");
    setUser(null);
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, sessionExpired, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
