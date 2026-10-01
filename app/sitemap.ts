import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  if (!siteUrl) return [];

  return ["/", "/privacy", "/terms"].map((path) => ({ url: new URL(path, siteUrl).toString() }));
}
