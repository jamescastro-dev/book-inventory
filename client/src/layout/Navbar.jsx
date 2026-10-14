import { useState, useContext, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "@/context/AuthContext.jsx";
import { BookMarked, ChevronDown, Library, LogOut, Moon, Plus, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme.js";
import Logo from "@/components/ui/Logo.jsx";

// Where each kind of visitor can go. Phones show these in a tab bar at the bottom instead.
function navItems(user) {
  if (!user) return [];
  const items = [
    { to: "/books", label: "Catalogue", icon: Library },
    { to: "/loans", label: user.is_librarian ? "Loans" : "My loans", icon: BookMarked },
  ];
  if (user.is_librarian) items.push({ to: "/add-book", label: "Add book", icon: Plus });
  return items;
}

function Avatar({ name }) {
  return (
    <span className="w-8 h-8 rounded-full bg-(--color-accent-soft) text-(--color-accent) flex items-center justify-center text-sm font-semibold uppercase">
      {name.slice(0, 1)}
    </span>
  );
}

function AccountMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const role = user.is_librarian ? "Librarian" : "Reader";

  useEffect(() => {
    if (!open) return;
    const close = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account"
        className="flex items-center gap-2 rounded-full p-0.5 sm:pr-2.5 hover:bg-(--color-muted) transition-colors"
      >
        <Avatar name={user.username} />
        <span className="hidden sm:flex flex-col items-start leading-tight">
          <span className="text-sm font-semibold text-(--color-foreground) max-w-[9rem] truncate">{user.username}</span>
          <span className="text-[0.7rem] text-(--color-muted-foreground)">{role}</span>
        </span>
        <ChevronDown className={`hidden sm:block w-3.5 h-3.5 text-(--color-muted-foreground) transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div role="menu" className="animate-fade-in absolute right-0 mt-2 w-60 panel shadow-(--shadow-lg) p-1.5 z-50">
          <div className="flex items-center gap-3 px-2.5 py-2">
            <Avatar name={user.username} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-(--color-foreground) truncate">{user.username}</p>
              <span className={`badge ${user.is_librarian ? "badge-accent" : "badge-muted"}`}>{role}</span>
            </div>
          </div>
          <div className="my-1 border-t border-(--color-border)" />
          <button
            type="button"
            role="menuitem"
            onClick={onLogout}
            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-(--radius-control) text-sm text-(--color-foreground) hover:bg-(--color-muted) transition-colors"
          >
            <LogOut className="w-4 h-4 text-(--color-muted-foreground)" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const items = navItems(user);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-(--color-background)/80 backdrop-blur-lg border-b border-(--color-border)">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-6">
          <Link to="/books" aria-label="Book Inventory, home" className="shrink-0 rounded-(--radius-control)">
            <Logo />
          </Link>

          {items.length > 0 && (
            <nav aria-label="Main" className="hidden md:flex items-center gap-1">
              {items.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-(--color-muted) text-(--color-foreground)"
                        : "text-(--color-muted-foreground) hover:text-(--color-foreground)"
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            <button type="button" onClick={toggle} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} className="icon-btn">
              {theme === "dark" ? <Sun className="w-[1.1rem] h-[1.1rem]" /> : <Moon className="w-[1.1rem] h-[1.1rem]" />}
            </button>
            {user ? (
              <AccountMenu user={user} onLogout={handleLogout} />
            ) : (
              <Link to="/login" className="btn btn-primary">Sign in</Link>
            )}
          </div>
        </div>
      </header>

      {/* Phones: the main places, always within thumb reach */}
      {items.length > 0 && (
        <nav
          aria-label="Main"
          className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-(--color-surface)/90 backdrop-blur-lg border-t border-(--color-border) pb-[env(safe-area-inset-bottom)]"
        >
          <div className="flex">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center gap-0.5 pt-2.5 pb-2 text-[0.7rem] font-medium transition-colors ${
                    isActive ? "text-(--color-accent)" : "text-(--color-muted-foreground)"
                  }`
                }
              >
                <item.icon className="w-5 h-5" aria-hidden="true" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
