"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BarChart3, KeyRound, LoaderCircle, LogOut, RefreshCw, Sparkles } from "lucide-react";
import { getDeveloperUsage, signInDeveloper, signOutDeveloper, type DailyUsage } from "@/app/actions/developer-usage";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import styles from "./developer-dashboard.module.css";

const number = new Intl.NumberFormat("en-US");

export function DeveloperDashboard() {
  const [rows, setRows] = useState<DailyUsage[]>([]);
  const [access, setAccess] = useState<"checking" | "locked" | "ready" | "unavailable">("checking");
  const [loading, setLoading] = useState(true);
  const [authPending, setAuthPending] = useState(false);
  const [secretKey, setSecretKey] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getDeveloperUsage();
      if (!result.ok) {
        setRows([]);
        setAccess(result.reason === "unauthorized" ? "locked" : "unavailable");
        setError(result.error);
        return;
      }
      setRows(result.rows);
      setAccess("ready");
    } catch {
      setAccess("unavailable");
      setError("Usage data is unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(refresh); }, [refresh]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthPending(true);
    setError(null);
    try {
      const result = await signInDeveloper(secretKey);
      setSecretKey("");
      if (!result.ok) { setError(result.error); return; }
      await refresh();
    } catch {
      setError("Could not verify the developer key. Please try again.");
    } finally {
      setAuthPending(false);
    }
  }

  async function signOut() {
    try {
      await signOutDeveloper();
      setRows([]);
      setSecretKey("");
      setError(null);
      setAccess("locked");
    } catch {
      setError("Could not sign out. Please try again.");
    }
  }

  const totals = rows.reduce((acc, row) => ({
    requests: acc.requests + row.requests,
    input: acc.input + row.input_tokens,
    output: acc.output + row.output_tokens,
    total: acc.total + row.total_tokens,
  }), { requests: 0, input: 0, output: 0, total: 0 });
  const models = Object.values(rows.reduce<Record<string, { provider: string; model: string; requests: number; tokens: number }>>((acc, row) => {
    const key = `${row.provider}:${row.model}`;
    const current = acc[key] ?? { provider: row.provider, model: row.model, requests: 0, tokens: 0 };
    current.requests += row.requests;
    current.tokens += row.total_tokens;
    acc[key] = current;
    return acc;
  }, {})).sort((a, b) => b.tokens - a.tokens);

  return <div className={styles.shell}>
    <a className="skip-link" href="#developer-content">Skip to content</a>
    <header className={styles.header}>
      <Link href="/" aria-label="Lessonleaf home"><BrandLogo /></Link>
      <div className={styles.headerActions}><span>Developer</span><ThemeToggle /></div>
    </header>
    <main className={styles.main} id="developer-content">
      <Link className={styles.back} href="/"><ArrowLeft size={15} aria-hidden="true" /> Back to workspace</Link>
      <div className={styles.intro}>
        <div><span className={styles.eyebrow}>LESSONLEAF · DEVELOPER</span><h1>Usage overview</h1><p>API token usage from AI drafting and visitor insights from Vercel.</p></div>
        {access === "ready" && <div className={styles.introActions}>
          <button type="button" className={styles.refresh} onClick={() => void refresh()} disabled={loading}><RefreshCw size={16} aria-hidden="true" /> Refresh</button>
          <button type="button" className={styles.refresh} onClick={() => void signOut()}><LogOut size={16} aria-hidden="true" /> Sign out</button>
        </div>}
      </div>

      {access === "checking" ? <section className={styles.accessCard} role="status"><LoaderCircle size={19} className="animate-spin" aria-hidden="true" /> Checking developer access…</section>
        : access === "locked" ? <section className={styles.accessCard} aria-labelledby="developer-sign-in">
          <div className={styles.accessIcon}><KeyRound size={23} aria-hidden="true" /></div>
          <h2 id="developer-sign-in">Developer access</h2>
          <p>Enter the developer key to view private usage analytics.</p>
          <form className={styles.authForm} onSubmit={(event) => void signIn(event)}>
            <label htmlFor="developer-key">Developer key</label>
            <input id="developer-key" type="password" value={secretKey} onChange={(event) => setSecretKey(event.target.value)} autoComplete="off" spellCheck={false} required maxLength={4096} />
            {error && <p className={styles.authError} role="alert">{error}</p>}
            <button type="submit" disabled={authPending}>{authPending ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <KeyRound size={16} aria-hidden="true" />}{authPending ? "Checking key…" : "Unlock dashboard"}</button>
          </form>
        </section>
        : access === "unavailable" ? <section className={styles.accessCard} role="alert"><h2>Developer analytics unavailable</h2><p>{error}</p><button type="button" className={styles.refresh} onClick={() => void refresh()} disabled={loading}><RefreshCw size={16} aria-hidden="true" /> Try again</button></section>
        : <>
      <section className={styles.visitors} aria-labelledby="visitors-heading">
        <div className={styles.icon}><BarChart3 size={21} aria-hidden="true" /></div>
        <div><span className={styles.cardLabel}>VISITORS</span><h2 id="visitors-heading">Vercel Web Analytics</h2><p>See unique visitors, page views, and traffic sources in your Vercel project dashboard.</p></div>
        <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer">Open Vercel <ArrowUpRight size={16} aria-hidden="true" /></a>
      </section>

      <section className={styles.usage} aria-labelledby="usage-heading">
        <div className={styles.sectionHeading}><div><span className={styles.cardLabel}>LAST 30 DAYS</span><h2 id="usage-heading">AI token usage</h2></div><Sparkles size={21} aria-hidden="true" /></div>
        {loading ? <div className={styles.message} role="status"><LoaderCircle size={19} className="animate-spin" aria-hidden="true" /> Loading usage data…</div>
          : error ? <div className={styles.message} role="alert"><p>{error}</p><Link href="/">Go to the workspace</Link></div>
          : <>
            <div className={styles.metrics}>
              <div><span>API requests</span><strong>{number.format(totals.requests)}</strong></div>
              <div><span>Input tokens</span><strong>{number.format(totals.input)}</strong></div>
              <div><span>Output tokens</span><strong>{number.format(totals.output)}</strong></div>
              <div><span>Total tokens</span><strong>{number.format(totals.total)}</strong></div>
            </div>
            {models.length ? <div className={styles.tableWrap}><table><thead><tr><th>Provider / model</th><th>Requests</th><th>Total tokens</th></tr></thead><tbody>{models.map((item) => <tr key={`${item.provider}:${item.model}`}><td><span>{item.provider}</span><strong>{item.model}</strong></td><td>{number.format(item.requests)}</td><td>{number.format(item.tokens)}</td></tr>)}</tbody></table></div>
              : <p className={styles.empty}>No recorded AI requests in the last 30 days.</p>}
            <p className={styles.note}>Counts cover AI drafts generated in Lessonleaf from Groq and Gemini responses. Gemini totals can include thinking tokens, so total may exceed input plus output. Records begin after usage tracking is enabled.</p>
          </>}
      </section>
      </>}
    </main>
  </div>;
}
