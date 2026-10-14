import { useState, useEffect } from "react";

// The theme you chose last time, or else your system's setting. index.html applies the same
// choice before the first paint, so a dark page doesn't flash white.
function initialTheme() {
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // storage blocked: fall through to the system setting
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggle = () => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("theme", next); // only an explicit choice is remembered
      } catch {
        // storage blocked: the choice lasts until the page closes
      }
      return next;
    });
  };

  return { theme, toggle };
}
