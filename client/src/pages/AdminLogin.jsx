import { useState, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Library, LoaderCircle } from "lucide-react";
import { AuthContext } from "../context/AuthContext.jsx";
import Logo from "@/components/ui/Logo.jsx";
import Cover from "@/components/books/Cover.jsx";

// Public demo accounts (created by `python manage.py seed_demo`)
const DEMO_ACCOUNTS = [
  { role: "Librarian", username: "demo", password: "Library-Demo-2026", can: "Adds and edits books, sees everyone’s loans", icon: Library },
  { role: "Reader", username: "reader", password: "Reader-Demo-2026", can: "Borrows and returns books", icon: BookOpen },
];

const API_URL = import.meta.env.VITE_API_BOOKS_URL;

// Covers for the brand panel, straight from the catalogue (public). Nothing shows if it can't load.
function useShowcase() {
  const [books, setBooks] = useState([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/books/?page_size=9`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((page) => page && setBooks(page.results))
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return books;
}

const AdminLogin = () => {
  const { login, error, user, loading: authLoading, sessionExpired } = useContext(AuthContext);
  const navigate = useNavigate();
  const showcase = useShowcase();

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
      <div className="min-h-screen flex items-center justify-center">
        <LoaderCircle className="w-6 h-6 animate-spin text-(--color-muted-foreground)" aria-label="Checking session" />
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel (wide screens) */}
      <aside className="hidden lg:flex relative overflow-hidden bg-[#141211] text-white flex-col justify-between p-12">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(40rem_30rem_at_20%_110%,rgba(45,212,191,0.25),transparent_70%)]" />
        {/* A tilted wall of covers */}
        <div aria-hidden="true" className="absolute -right-40 top-1/2 -translate-y-1/2 -rotate-12 grid grid-cols-3 gap-4 w-136 opacity-80">
          {showcase.map((book, i) => (
            <div
              key={book.id}
              className="aspect-2/3 rounded-lg overflow-hidden shadow-2xl shadow-black/60 animate-fade-in"
              style={{ animationDelay: `${i * 70}ms`, transform: `translateY(${(i % 3) * 28}px)` }}
            >
              <Cover book={book} eager />
            </div>
          ))}
        </div>
        <div aria-hidden="true" className="absolute inset-0 bg-linear-to-r from-[#141211] from-45% via-[#141211]/85 via-65% to-[#141211]/10" />

        <Link to="/books" className="relative w-fit [&_span.font-serif]:text-white">
          <Logo />
        </Link>
        <div className="relative max-w-md">
          <h2 className="font-serif text-5xl font-semibold leading-[1.05] tracking-tight">
            Every book, one tap away.
          </h2>
          <p className="mt-5 text-lg text-white/70">
            Browse the catalogue, borrow for 14 days and keep track of what’s due. Librarians run the shelves from the same place.
          </p>
        </div>
        <p className="relative text-sm text-white/50">A full-stack demo: React and Django REST Framework.</p>
      </aside>

      {/* Form */}
      <main className="flex flex-col justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-sm mx-auto">
          <Link to="/books" className="lg:hidden inline-block mb-10">
            <Logo />
          </Link>

          <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-(--color-foreground)">
            Welcome back
          </h1>
          <p className="mt-2 text-(--color-muted-foreground)">
            Sign in to borrow books or look after the catalogue.
          </p>

          {sessionExpired && !error && (
            <div role="status" className="mt-6 rounded-(--radius-control) border border-(--color-warning)/30 bg-(--color-warning-soft) px-4 py-3 text-sm text-(--color-foreground)">
              Your session expired. Please sign in again.
            </div>
          )}

          {error && (
            <div role="alert" className="mt-6 rounded-(--radius-control) border border-(--color-danger)/30 bg-(--color-danger-soft) px-4 py-3 text-sm text-(--color-danger)">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
            <label>
              <span className="field-label">Username</span>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="input py-2.5"
              />
            </label>
            <label>
              <span className="field-label">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input py-2.5"
              />
            </label>
            <button type="submit" disabled={loading} className="btn btn-primary w-full py-3 mt-1">
              {loading ? <><LoaderCircle className="w-4 h-4 animate-spin" aria-hidden="true" /> Signing in…</> : "Sign in"}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-8">
            <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-(--color-muted-foreground)">
              <span className="h-px flex-1 bg-(--color-border)" />
              Try a demo account
              <span className="h-px flex-1 bg-(--color-border)" />
            </div>
            <ul className="mt-4 grid gap-2.5">
              {DEMO_ACCOUNTS.map((account) => (
                <li key={account.username}>
                  <button
                    type="button"
                    onClick={() => { setUsername(account.username); setPassword(account.password); }}
                    aria-label={`Use the ${account.role.toLowerCase()} demo login`}
                    className="group w-full panel p-3.5 flex items-center gap-3.5 text-left transition-colors hover:border-(--color-accent)"
                  >
                    <span className="w-10 h-10 shrink-0 rounded-full bg-(--color-accent-soft) text-(--color-accent) flex items-center justify-center">
                      <account.icon className="w-5 h-5" aria-hidden="true" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-(--color-foreground)">{account.role}</span>
                      <span className="block text-xs text-(--color-muted-foreground)">{account.can}</span>
                      <span className="block mt-1 font-mono text-xs text-(--color-foreground) break-all">
                        {account.username} / {account.password}
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-(--color-accent) shrink-0">Use</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-(--color-muted-foreground)">
              The free server sleeps when idle, so the first sign-in can take up to a minute.
            </p>
          </div>

          <Link to="/books" className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-(--color-foreground) hover:text-(--color-accent) transition-colors">
            Browse without signing in
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </main>
    </div>
  );
};

export default AdminLogin;
