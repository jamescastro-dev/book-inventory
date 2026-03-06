import React, { useState, useContext, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "@/context/AuthContext.jsx";
import { User, ChevronDown, LogOut, Plus, Menu, X, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme.js";

export default function Navbar() {
  const { logout } = useContext(AuthContext);
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate("/login");
  };

  return (
    <nav className="sticky top-0 z-50 bg-(--color-card)/90 backdrop-blur-md border-b border-(--color-border)">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between h-15 items-center gap-4">

          {/* Logo */}
          <button
            onClick={() => { navigate("/books"); setMobileMenuOpen(false); }}
            className="flex items-center gap-2.5 shrink-0 group"
          >
            {/* Icon mark */}
            <div className="w-7 h-7 rounded flex items-center justify-center bg-(--color-primary) shadow-sm group-hover:bg-(--color-primary-hover) transition-colors">
              <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden="true">
                <rect x="2" y="2" width="5" height="12" rx="1" fill="white" opacity="0.9"/>
                <rect x="9" y="2" width="5" height="12" rx="1" fill="white" opacity="0.55"/>
                <rect x="3" y="5" width="3" height="0.75" rx="0.375" fill="var(--color-gold)"/>
                <rect x="3" y="7" width="3" height="0.75" rx="0.375" fill="var(--color-gold)" opacity="0.6"/>
              </svg>
            </div>
            {/* Wordmark */}
            <div className="flex flex-col leading-none">
              <span className="font-serif text-base font-semibold text-(--color-foreground) tracking-tight group-hover:text-(--color-primary-hover) transition-colors">
                Book Inventory
              </span>
              <span className="text-[0.6rem] uppercase tracking-[0.18em] text-(--color-gold) font-medium">
                Collection
              </span>
            </div>
          </button>

          {/* Desktop right */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Theme toggle */}
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="p-2 rounded-(--radius) hover:bg-(--color-muted) transition-colors text-(--color-muted-foreground) hover:text-(--color-foreground)"
            >
              {theme === "dark"
                ? <Sun className="w-4 h-4" />
                : <Moon className="w-4 h-4" />
              }
            </button>

            <Link
              to="/add-book"
              className="btn-primary flex items-center gap-1.5 text-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Book
            </Link>

            {/* User dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-(--radius) hover:bg-(--color-muted) transition-colors"
              >
                <div className="w-8 h-8 bg-(--color-muted) rounded-full flex items-center justify-center ring-1 ring-(--color-border)">
                  <User className="w-4 h-4 text-(--color-muted-foreground)" />
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-(--color-muted-foreground) transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-44 bg-(--color-card) border border-(--color-border) rounded-(--radius) shadow-md z-50 py-1 overflow-hidden">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm text-(--color-foreground) hover:bg-(--color-muted) transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 text-(--color-muted-foreground)" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile controls */}
          <div className="flex sm:hidden items-center gap-2">
            <Link
              to="/add-book"
              className="btn-primary p-2"
            >
              <Plus className="w-4 h-4" />
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-(--radius) hover:bg-(--color-muted) transition-colors"
            >
              {mobileMenuOpen
                ? <X className="w-5 h-5 text-(--color-foreground)" />
                : <Menu className="w-5 h-5 text-(--color-foreground)" />
              }
            </button>
          </div>

        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-(--color-border) bg-(--color-card)/95 backdrop-blur-md px-4 py-2">
          <button
            onClick={() => { navigate("/books"); setMobileMenuOpen(false); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-(--radius) hover:bg-(--color-muted) transition-colors text-sm font-medium text-(--color-foreground)"
          >
            My Books
          </button>
          <Link
            to="/add-book"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-(--radius) hover:bg-(--color-muted) transition-colors text-sm font-medium text-(--color-foreground)"
          >
            <Plus className="w-4 h-4 text-(--color-gold)" />
            Add Book
          </Link>
          <div className="border-t border-(--color-border) mt-1 pt-1">
            <button
              onClick={toggle}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-(--radius) hover:bg-(--color-muted) transition-colors text-sm font-medium text-(--color-foreground)"
            >
              {theme === "dark"
                ? <Sun className="w-4 h-4 text-(--color-muted-foreground)" />
                : <Moon className="w-4 h-4 text-(--color-muted-foreground)" />
              }
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-(--radius) hover:bg-(--color-muted) transition-colors text-sm font-medium text-(--color-foreground)"
            >
              <LogOut className="w-4 h-4 text-(--color-muted-foreground)" />
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}