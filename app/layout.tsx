import type { Metadata } from "next";
import "./globals.css";
import "./studio.css";
import "./motion.css";
import "./theme.css";
import { Figtree } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });

export const metadata: Metadata = {
  title: "Lessonleaf | Lesson Planning Studio",
  description: "Create, refine, and save structured lesson plans.",
  applicationName: "Lessonleaf",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn("font-sans", figtree.variable)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var saved=localStorage.getItem('lessonleaf-theme');if(saved==='dark'||(saved!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){if(matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.classList.add('dark')}}` }} />
      </head>
      <body>{children}<Toaster /><Analytics /></body>
    </html>
  );
}
