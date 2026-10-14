import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import BookForm from "@/components/books/BookForm.jsx";
import { useToast } from "@/context/ToastContext.js";
import { authFetch } from "@/utils/authFetch.js";
import { readApiError } from "@/utils/uploads.js";

const AddBook = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API_URL = import.meta.env.VITE_API_BOOKS_URL;

  const handleAdd = async (formData) => {
    try {
      setLoading(true);
      setError("");

      const res = await authFetch(`${API_URL}/books/create/`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        setError(await readApiError(res, "Failed to add book. Please try again."));
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      toast.success(`Added “${formData.get("title")}” to the catalogue.`);
      navigate("/books");
    } catch (err) {
      console.error("Network or server error:", err);
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <Link to="/books" className="inline-flex items-center gap-1.5 text-sm font-medium text-(--color-muted-foreground) hover:text-(--color-foreground) transition-colors">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Catalogue
      </Link>
      <h1 className="mt-3 font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-(--color-foreground)">
        Add a book
      </h1>
      <p className="mt-2 text-(--color-muted-foreground)">
        Start with an ISBN to fill in the details, or enter them by hand.
      </p>

      {error && (
        <div role="alert" className="mt-6 rounded-(--radius-control) border border-(--color-danger)/30 bg-(--color-danger-soft) px-4 py-3 text-sm text-(--color-danger)">
          {error}
        </div>
      )}

      <div className="mt-8">
        <BookForm onAdd={handleAdd} onCancel={() => navigate("/books")} saving={loading} />
      </div>
    </div>
  );
};

export default AddBook;
