/** The public origin used by search engines and link previews. */
export function getSiteUrl(): string | null {
  const configured = process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!configured) return null;

  try {
    const url = new URL(configured.includes("://") ? configured : `https://${configured}`);
    if (!(["https:", "http:"].includes(url.protocol)) || url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}
