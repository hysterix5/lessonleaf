import type { ReactNode } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import styles from "./legal-page.module.css";

export const legalUpdatedAt = "September 28, 2026";
export const legalOperatorName = "Joseph Mel Resty E. Denopol";
export const legalContactEmail = "sephdenopol@gmail.com";

type Section = { id: string; title: string; content: ReactNode };

export function LegalContact() {
  return <a href={`mailto:${legalContactEmail}`}>{legalContactEmail}</a>;
}

export function LegalPage({ title, summary, sections, current }: {
  title: string;
  summary: string;
  sections: Section[];
  current: "privacy" | "terms";
}) {
  return (
    <div className={styles.shell}>
      <a className="skip-link" href="#legal-content">Skip to content</a>
      <header className={styles.header}>
        <Link href="/" aria-label="Lessonleaf home"><BrandLogo /></Link>
        <nav aria-label="Legal pages" className={styles.topNav}>
          <Link href="/privacy" aria-current={current === "privacy" ? "page" : undefined}>Privacy Policy</Link>
          <Link href="/terms" aria-current={current === "terms" ? "page" : undefined}>Terms and Conditions</Link>
        </nav>
        <ThemeToggle />
      </header>
      <main id="legal-content" className={styles.main}>
        <div className={styles.intro}>
          <Link href="/" className={styles.back}>← Back to Lessonleaf</Link>
          <span className={styles.eyebrow}>LESSONLEAF · LEGAL</span>
          <h1>{title}</h1>
          <p>{summary}</p>
          <span className={styles.date}>Last updated {legalUpdatedAt}</span>
        </div>
        <div className={styles.layout}>
          <nav aria-label="On this page" className={styles.contents}>
            <strong>On this page</strong>
            {sections.map((section) => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}
          </nav>
          <article className={styles.article}>
            {sections.map((section) => <section key={section.id} id={section.id} className={styles.section}>
              <h2>{section.title}</h2>
              {section.content}
            </section>)}
          </article>
        </div>
      </main>
      <footer className={styles.footer}>
        <span>© 2026 Lessonleaf</span>
        <nav aria-label="Footer"><Link href="/">Home</Link><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms and Conditions</Link></nav>
      </footer>
    </div>
  );
}
