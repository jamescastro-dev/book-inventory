import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "@/context/AuthContext.jsx";

// Only render `children` for a signed-in user; everyone else is sent to the login page.
// With `librarianOnly`, signed-in readers are sent back to the book list instead.
export default function ProtectedRoute({ children, librarianOnly = false }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-(--color-background)">
        <p className="text-sm text-(--color-muted-foreground)">Checking session…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (librarianOnly && !user.is_librarian) return <Navigate to="/books" replace />;
  return children;
}
