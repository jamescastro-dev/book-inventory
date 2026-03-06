import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";

const AdminLogin = () => {
  const { login, error, user, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/books");
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await login(username, password);
    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-(--color-background)">
        <p className="text-sm text-(--color-muted-foreground)">Checking session…</p>
      </div>
    );
  }

  const inputClass = `
    w-full bg-(--color-surface) border border-(--color-border)
    text-(--color-foreground) text-sm rounded-(--radius)
    px-3.5 py-2.5 placeholder:text-(--color-muted-foreground)
    hover:border-(--color-border-strong)
    focus:outline-none focus:border-(--color-gold) focus:ring-2 focus:ring-(--color-gold)/20
    transition-colors
  `;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-(--color-background)">
      <div className="w-full max-w-md md:max-w-4xl overflow-hidden shadow-lg grid grid-cols-1 md:grid-cols-2 rounded-(--radius) border border-(--color-border)">

        {/* Left — Form */}
        <div className="bg-(--color-card) p-8 sm:p-10 md:p-12 flex flex-col justify-center">

          {/* Logo mark */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-6 h-6 rounded bg-(--color-primary) flex items-center justify-center shrink-0">
              <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" aria-hidden="true">
                <rect x="2" y="2" width="5" height="12" rx="1" fill="white" opacity="0.9"/>
                <rect x="9" y="2" width="5" height="12" rx="1" fill="white" opacity="0.55"/>
                <rect x="3" y="5" width="3" height="0.75" rx="0.375" fill="var(--color-gold)"/>
                <rect x="3" y="7" width="3" height="0.75" rx="0.375" fill="var(--color-gold)" opacity="0.6"/>
              </svg>
            </div>
            <span className="font-serif text-base font-semibold text-(--color-foreground) tracking-tight">
              Book Inventory
            </span>
          </div>

          <h2 className="font-serif text-3xl font-semibold text-(--color-foreground) leading-tight">
            Welcome back
          </h2>
          <p className="mt-1.5 mb-7 text-sm text-(--color-muted-foreground)">
            Sign in to manage your collection.
          </p>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-(--radius) px-3.5 py-2.5 mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium tracking-widest uppercase text-(--color-muted-foreground)">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="your username"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium tracking-widest uppercase text-(--color-muted-foreground)">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 mt-1 text-sm disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Enter Library"}
            </button>
          </form>
        </div>

        {/* Right — Image */}
        <div className="hidden md:block relative">
          <img
            src="https://images.unsplash.com/photo-1507842217343-583bb7270b66"
            alt="Bookshelf"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-10 bg-(--color-primary)/60">
            <p className="font-serif text-xl lg:text-2xl italic text-white/90 leading-relaxed text-center max-w-xs">
              "A reader lives a thousand lives before he dies."
            </p>
            <div className="mt-4 flex items-center gap-2">
              <div className="h-px w-8 bg-(--color-gold)/60" />
              <p className="text-sm text-white/70">George R.R. Martin</p>
              <div className="h-px w-8 bg-(--color-gold)/60" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminLogin;