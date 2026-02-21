import React, { useState, useContext, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "@/context/AuthContext.jsx";
import { User, ChevronDown, LogOut, BookOpen, Plus, Menu, X } from "lucide-react";

export default function Navbar() {
  const { logout } = useContext(AuthContext);
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
    <nav className="sticky top-0 z-50 bg-(--color-card)/85 backdrop-blur border-b border-(--color-border) shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-2">
        <div className="flex justify-between h-16 items-center">

          {/* Logo */}
          <div className="shrink-0 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-(--color-primary)" />
            <h1
              className="text-xl sm:text-2xl font-serif font-bold text-(--color-foreground) cursor-pointer"
              onClick={() => { navigate("/books"); setMobileMenuOpen(false); }}>
              Book Inventory
            </h1>
          </div>

          {/* Desktop Right Side */}
          <div className="hidden sm:flex items-center space-x-4">
            <Link
              to="/add-book"
              className="bg-(--color-primary) text-(--color-primary-foreground) px-4 py-2 rounded font-medium hover:bg-(--color-secondary) transition-colors">
              Add Book
            </Link>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-1 px-3 py-2 rounded hover:bg-(--color-surface) focus:outline-none transition-colors">
                <div className="w-9 h-9 bg-(--color-card) rounded-full flex items-center justify-center shadow-sm ring-1 ring-(--color-border)">
                  <User className="w-5 h-5 text-(--color-foreground)" />
                </div>
                <ChevronDown className="w-4 h-4 text-(--color-muted-foreground)" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-(--color-card) border border-(--color-border) rounded shadow-md z-50">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-(--color-surface) transition-colors">
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Hamburger */}
          <div className="flex sm:hidden items-center gap-2">
            <Link
              to="/add-book"
              className="bg-(--color-primary) text-(--color-primary-foreground) p-2 rounded hover:bg-(--color-secondary) transition-colors">
              <Plus className="w-5 h-5" />
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded hover:bg-(--color-surface) transition-colors">
              {mobileMenuOpen
                ? <X className="w-6 h-6 text-(--color-foreground)" />
                : <Menu className="w-6 h-6 text-(--color-foreground)" />
              }
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-(--color-border) bg-(--color-card)/95 backdrop-blur px-4 py-3 space-y-2">
          <button
            onClick={() => { navigate("/books"); setMobileMenuOpen(false); }}
            className="flex items-center gap-3 w-full px-3 py-2 rounded hover:bg-(--color-surface) transition-colors text-(--color-foreground) font-medium">
            <BookOpen className="w-5 h-5 text-(--color-primary)" />
            My Books
          </button>
          <Link
            to="/add-book"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 w-full px-3 py-2 rounded hover:bg-(--color-surface) transition-colors text-(--color-foreground) font-medium">
            <Plus className="w-5 h-5 text-(--color-primary)" />
            Add Book
          </Link>
          <div className="border-t border-(--color-border) pt-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2 rounded hover:bg-(--color-surface) transition-colors text-(--color-foreground) font-medium">
              <LogOut className="w-5 h-5 text-(--color-primary)" />
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}