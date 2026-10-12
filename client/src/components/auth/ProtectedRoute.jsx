import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "@/context/AuthContext.jsx";

// Only render `children` for a signed-in user; everyone else is sent to the login page.
export default function ProtectedRoute({ children }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-(--color-background)">
        <p className="text-sm text-(--color-muted-foreground)">Checking session…</p>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}
