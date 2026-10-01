import type { Metadata } from "next";
import "./globals.css";
import "./studio.css";
import "./motion.css";
import "./theme.css";
import { Figtree } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import { getSiteUrl } from "@/lib/site-url";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });
const siteUrl = getSiteUrl();
const description = "Create editable lesson plans with a guided template or AI drafting. Plan a full term, save your work, and export to Word or PDF.";

export const metadata: Metadata = {
  title: "Lesson Plan Generator for Teachers | Lessonleaf",
  description,
  applicationName: "Lessonleaf",
  ...(siteUrl ? { metadataBase: new URL(siteUrl), alternates: { canonical: "/" } } : {}),
  openGraph: {
    type: "website",
    siteName: "Lessonleaf",
    title: "Lesson Plan Generator for Teachers | Lessonleaf",
    description,
    ...(siteUrl ? { url: siteUrl, images: [{ url: `${siteUrl}/lessonleaf-social.png`, width: 1200, height: 630, alt: "Lessonleaf lesson planning app" }] } : {}),
  },
  twitter: { card: "summary_large_image", title: "Lesson Plan Generator for Teachers | Lessonleaf", description, ...(siteUrl ? { images: [`${siteUrl}/lessonleaf-social.png`] } : {}) },
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
