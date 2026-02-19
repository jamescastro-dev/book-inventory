import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BookForm from "@/components/books/BookForm.jsx";

const AddBook = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API_URL = import.meta.env.VITE_API_BOOKS_URL;
  const accessToken = localStorage.getItem("access_token"); // if using JWT

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
        console.error("Django validation error:", data);
        // Display Django field errors nicely
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

      navigate("/books"); // redirect to book list after success
    } catch (err) {
      console.error("Network or server error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl text-center md:text-3xl font-serif font-bold mb-3 text-(--color-foreground)">
        Add New Book
      </h1>

      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}

      {/* Book Form */}
      <BookForm onAdd={handleAdd} onCancel={() => navigate("/books")} />

      {/* Loading indicator */}
      {loading && (
        <p className="text-(--color-muted-foreground) mt-2 text-center">
          Saving book...
        </p>
      )}
    </div>
  );
};

export default AddBook;
