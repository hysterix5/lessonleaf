"use client";

import { useEffect } from "react";
import { Moon, Sun } from "lucide-react";

const storageKey = "lessonleaf-theme";

function setTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
  window.dispatchEvent(new Event("lessonleaf-theme-change"));
}

export function ThemeToggle() {
  useEffect(() => {
    const preference = window.matchMedia("(prefers-color-scheme: dark)");
    const syncTheme = () => {
      let saved: string | null = null;
      try { saved = localStorage.getItem(storageKey); } catch { /* Storage can be unavailable. */ }
      setTheme(saved === "dark" || (saved !== "light" && preference.matches) ? "dark" : "light");
    };
    window.addEventListener("storage", syncTheme);
    preference.addEventListener("change", syncTheme);
    return () => {
      window.removeEventListener("storage", syncTheme);
      preference.removeEventListener("change", syncTheme);
    };
  }, []);

  function toggleTheme() {
    const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
    setTheme(next);
    try { localStorage.setItem(storageKey, next); } catch { /* Keep the theme for this tab. */ }
  }

  return <button type="button" className="theme-toggle" onClick={toggleTheme}>
    <Moon className="theme-light-only" size={16} aria-hidden="true" />
    <Sun className="theme-dark-only" size={16} aria-hidden="true" />
    <span className="theme-light-only">Dark mode</span>
    <span className="theme-dark-only">Light mode</span>
  </button>;
}
