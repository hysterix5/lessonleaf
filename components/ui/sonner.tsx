"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return <SonnerToaster
    position="top-right"
    richColors
    closeButton
    visibleToasts={3}
    toastOptions={{ duration: 4000, className: "lessonleaf-toast" }}
  />;
}
