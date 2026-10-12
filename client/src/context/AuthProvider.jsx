import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext.jsx";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // Only "loading" while a stored token is being validated against the API
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem("access_token")));
  const [error, setError] = useState(null);
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

  // Login
  const login = async (username, password) => {
    try {
      setError(null);
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
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
