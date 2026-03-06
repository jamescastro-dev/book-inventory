import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import BookForm from "@/components/books/BookForm.jsx";

const AddBook = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API_URL = import.meta.env.VITE_API_BOOKS_URL;
  const accessToken = localStorage.getItem("access_token");

  const handleAdd = async (formData) => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API_URL}/books/create/`, {
        method: "POST",
        body: formData,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });

      const data = await res.json();

      if (!res.ok) {
        if (typeof data === "object") {
          const messages = Object.entries(data)
            .map(([field, errs]) => `${field}: ${errs.join(", ")}`)
            .join(" | ");
          setError(messages);
        } else {
          setError("Failed to add book. Check console for details.");
        }
        return;
      }

      navigate("/books");
    } catch (err) {
      console.error("Network or server error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">




      {/* Header */}
      <div className="bg-(--color-surface) border-b border-(--color-border)">
        <div className="max-w-4xl mx-auto px-5 py-4">
          <div className="flex items-center justify-between gap-6">

            {/* Left: title + subtitle stacked */}
            <div className="flex flex-col gap-1">
              <h1 className="font-serif text-xl font-semibold text-(--color-foreground) tracking-tight leading-none">
                Add a Book
              </h1>
              <p className="text-[0.62rem] uppercase tracking-[0.15em] text-(--color-muted-foreground)">
                New addition to your library
              </p>
            </div>

            {/* Right: back link */}
            <button
              onClick={() => navigate("/books")}
              className="flex items-center gap-1.5 text-xs text-(--color-muted-foreground) hover:text-(--color-foreground) transition-colors shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              My Library
            </button>

          </div>
        </div>
      </div>


      {/* Form */}
      <div className="max-w-4xl mx-auto px-5 py-8">
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-(--radius) px-4 py-2.5 mb-6">
            {error}
          </div>
        )}

        <BookForm onAdd={handleAdd} onCancel={() => navigate("/books")} />

        {loading && (
          <p className="text-sm text-(--color-muted-foreground) mt-3 text-center">
            Saving book…
          </p>
        )}
      </div>
    </div>
  );
};

export default AddBook;