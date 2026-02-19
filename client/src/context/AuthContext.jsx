import { createContext, useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL; //backend api base url from .env

  // Initialize auth state from localStorage
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      axios
        .get(`${API_URL}/me/`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem("access_token");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [API_URL]);

  // Login
  const login = async (username, password) => {
    try {
      setError(null);
      const res = await axios.post(
        `${API_URL}/login/`,
        { username, password },
        { headers: { "Content-Type": "application/json" } }
      );

      localStorage.setItem("access_token", res.data.access);
      setUser(res.data.user);
      navigate("/books"); // redirect after login
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed");
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
