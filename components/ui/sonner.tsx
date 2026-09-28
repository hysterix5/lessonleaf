"use client";

import { useEffect, useState } from "react";
import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const syncTheme = () => setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    syncTheme();
    window.addEventListener("lessonleaf-theme-change", syncTheme);
    return () => window.removeEventListener("lessonleaf-theme-change", syncTheme);
  }, []);

  return <SonnerToaster
    theme={theme}
    position="top-right"
    richColors
    closeButton
    visibleToasts={3}
    toastOptions={{ duration: 4000, className: "lessonleaf-toast" }}
  />;
}
