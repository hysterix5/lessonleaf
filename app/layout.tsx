import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lessonleaf | Lesson Planning Studio",
  description: "Create, refine, and save structured lesson plans.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
