import React, { useState, useContext, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "@/context/AuthContext.jsx";
import { User, ChevronDown, LogOut } from "lucide-react";

export default function Navbar() {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown if clicked outside
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
    navigate("/login");
  };

  return (
    <nav
      className="
        sticky top-0 z-50
        bg-(--color-card)/85 backdrop-blur
        border-b border-(--color-border)
        shadow-md
      ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-2">
        <div className="flex justify-between h-16 items-center">
          {/* Logo / App Name */}
          <div className="shrink-0">
            <h1
              className="text-2xl font-serif font-bold text-(--color-foreground) cursor-pointer"
              onClick={() => navigate("/books")}>
              Book Inventory
            </h1>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Add Book Button */}
            <Link
              to="/add-book"
              className="
                bg-(--color-primary) text-(--color-primary-foreground)
                px-4 py-2 rounded font-medium
                hover:bg-(--color-secondary)
                transition-colors
              ">
              Add Book
            </Link>

            {/* Profile dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="
                  flex items-center space-x-1 px-3 py-2 rounded
                  hover:bg-(--color-surface)
                  focus:outline-none transition-colors
                ">
                <div
                  className="
                    w-9 h-9
                    bg-(--color-card)
                    rounded-full
                    flex items-center justify-center
                    shadow-sm
                    ring-1 ring-(--color-border)
                  ">
                  <User className="w-5 h-5 text-(--color-foreground)" />
                </div>
                <ChevronDown className="w-4 h-4 text-(--color-muted-foreground)" />
              </button>

              {dropdownOpen && (
                <div
                  className="
                    absolute right-0 mt-2 w-40
                    bg-(--color-card)
                    border border-(--color-border)
                    rounded shadow-md
                    z-50
                  ">
                  <button
                    onClick={handleLogout}
                    className="
                      flex items-center gap-2 w-full px-4 py-2 text-left
                      hover:bg-(--color-surface)
                      transition-colors
                    ">
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
