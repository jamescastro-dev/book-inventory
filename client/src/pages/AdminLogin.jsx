import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";

const AdminLogin = () => {
  const { login, error, user, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/books");
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await login(username, password);
    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-lg">Checking session...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 sm:px-6"
      style={{ background: "var(--color-background)" }}>
      <div
        className="
          w-full
          max-w-md
          md:max-w-4xl
          lg:max-w-5xl
          overflow-hidden
          shadow-lg
          grid
          grid-cols-1
          md:grid-cols-2
        "
        style={{
          background: "var(--color-card)",
          borderRadius: "var(--radius)",
        }}>
        {/* LEFT — Login Form */}
        <div className="p-6 sm:p-8 md:p-10 lg:p-12">
          <h2
            className="text-2xl sm:text-3xl font-serif font-bold mb-2"
            style={{ color: "var(--color-foreground)" }}>
            Admin Login
          </h2>

          <p
            className="mb-6 sm:mb-8 text-sm sm:text-base"
            style={{ color: "var(--color-muted-foreground)" }}>
            A home for every book you love
          </p>

          {error && (
            <p className="mb-4 text-sm font-medium text-red-600">{error}</p>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                className="block mb-1 text-sm font-medium"
                style={{ color: "var(--color-foreground)" }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="
                  w-full
                  p-3
                  sm:p-3.5
                  rounded-md
                  outline-none
                  focus:ring-2
                "
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-foreground)",
                  borderRadius: "var(--radius)",
                }}
              />
            </div>

            <div>
              <label
                className="block mb-1 text-sm font-medium"
                style={{ color: "var(--color-foreground)" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="
                  w-full
                  p-3
                  sm:p-3.5
                  rounded-md
                  outline-none
                  focus:ring-2
                "
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-foreground)",
                  borderRadius: "var(--radius)",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 sm:py-3.5 btn-primary text-sm sm:text-base">
              {loading ? "Logging in..." : "Enter Library"}
            </button>
          </form>
        </div>

        {/* RIGHT — Image + Text */}
        <div className="hidden md:block relative">
          <img
            src="https://images.unsplash.com/photo-1507842217343-583bb7270b66"
            alt="Bookshelf"
            className="w-full h-full object-cover"
          />

          <div
            className="absolute inset-0 flex items-center justify-center px-8 lg:px-12"
            style={{ background: "rgba(13, 27, 42, 0.55)" }}>
            <div className="text-center">
              <h3
                className="text-2xl lg:text-3xl font-serif font-bold mb-4"
                style={{ color: "var(--color-highlight)" }}>
                Book Inventory
              </h3>

              <p className="italic text-base lg:text-lg leading-relaxed text-white max-w-sm">
                “A reader lives a thousand lives before he dies.”
              </p>

              <p className="mt-4 text-sm text-white/80">— George R.R. Martin</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
