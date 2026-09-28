import type { Metadata } from "next";
import { DeveloperDashboard } from "@/components/developer-dashboard";

export const metadata: Metadata = {
  title: "Developer | Lessonleaf",
  description: "Private API usage and visitor analytics for Lessonleaf.",
  robots: { index: false, follow: false },
};

export default function DeveloperPage() {
  return <DeveloperDashboard />;
}
