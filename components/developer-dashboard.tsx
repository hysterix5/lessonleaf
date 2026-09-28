"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BarChart3, KeyRound, LoaderCircle, LogOut, RefreshCw, Sparkles } from "lucide-react";
import { getDeveloperUsage, signInDeveloper, signOutDeveloper, type DailyUsage } from "@/app/actions/developer-usage";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { aiModels } from "@/lib/ai-content";
import type { DailyModelLimits } from "@/lib/ai-daily-limits";
import { usageWarning, type MinuteUsageByModel } from "@/lib/ai-usage-warning";
import styles from "./developer-dashboard.module.css";

const number = new Intl.NumberFormat("en-US");

export function DeveloperDashboard() {
  const [rows, setRows] = useState<DailyUsage[]>([]);
  const [access, setAccess] = useState<"checking" | "locked" | "ready" | "unavailable">("checking");
  const [loading, setLoading] = useState(true);
  const [authPending, setAuthPending] = useState(false);
  const [secretKey, setSecretKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [limits, setLimits] = useState<DailyModelLimits | null>(null);
  const [minute, setMinute] = useState<MinuteUsageByModel | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);

  const refresh = useCallback(async (background = false) => {
    if (!background) { setLoading(true); setError(null); }
    try {
      const result = await getDeveloperUsage();
      if (!result.ok) {
        if (background && result.reason === "unavailable") { setLiveError("Live updates are paused. Retrying automatically."); return; }
        setRows([]);
        setCheckedAt(null);
        setLimits(null);
        setMinute(null);
        setAccess(result.reason === "unauthorized" ? "locked" : result.reason === "configuration" ? "unavailable" : "ready");
        setError(result.error);
        return;
      }
      setRows(result.rows);
      setLimits(result.limits);
      setMinute(result.minute);
      setCheckedAt(result.checkedAt);
      setLiveError(null);
      setAccess("ready");
    } catch {
      if (background) setLiveError("Live updates are paused. Retrying automatically.");
      else { setAccess("ready"); setError("Usage data is unavailable. Please try again."); }
    } finally {
      if (!background) setLoading(false);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(() => refresh()); }, [refresh]);

  useEffect(() => {
    if (access !== "ready") return;
    const update = () => { if (document.visibilityState === "visible") void refresh(true); };
    const timer = window.setInterval(update, 15_000);
    document.addEventListener("visibilitychange", update);
    window.addEventListener("focus", update);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", update); window.removeEventListener("focus", update); };
  }, [access, refresh]);

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
      setMinute(null);
      setSecretKey("");
      setError(null);
      setLiveError(null);
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
  const utcDay = checkedAt?.slice(0, 10);
  const today = aiModels.map((model) => {
    const counts = rows.filter((row) => row.day === utcDay && row.model === model).reduce((sum, row) => ({
      requests: sum.requests + row.requests,
      input: sum.input + row.input_tokens,
      output: sum.output + row.output_tokens,
      tokens: sum.tokens + row.total_tokens,
    }), { requests: 0, input: 0, output: 0, tokens: 0 });
    const limit = limits?.[model] ?? { requests: null, tokens: null, minuteRequests: null, minuteInputTokens: null, source: "Configured" as const };
    const recent = minute?.[model] ?? { requests: 0, inputTokens: 0 };
    const dailyLevel = usageWarning(counts.requests, counts.tokens, limit);
    const minuteLevel = usageWarning(recent.requests, recent.inputTokens, { requests: limit.minuteRequests, tokens: limit.minuteInputTokens });
    const level = dailyLevel === "reached" || minuteLevel === "reached" ? "reached" : dailyLevel === "near" || minuteLevel === "near" ? "near" : dailyLevel === "normal" || minuteLevel === "normal" ? "normal" : "unknown";
    return { model, provider: model.startsWith("gemini-") ? "Gemini" : "Groq", ...counts, recent, limit, level };
  });
  const warnings = today.flatMap((item) => [
    { label: "daily requests", count: item.requests, limit: item.limit.requests },
    { label: "daily tokens", count: item.tokens, limit: item.limit.tokens },
    { label: "requests per minute", count: item.recent.requests, limit: item.limit.minuteRequests },
    { label: "input tokens per minute", count: item.recent.inputTokens, limit: item.limit.minuteInputTokens },
  ].filter((dimension) => dimension.limit && dimension.count >= dimension.limit * 0.8)
    .map((dimension) => `${item.model} ${dimension.count >= dimension.limit! ? "has reached" : "is near"} its ${dimension.label} limit`));

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
      <div className={styles.liveStatus} role="status"><span className={`${styles.liveDot} ${liveError || !checkedAt ? styles.paused : ""}`} aria-hidden="true" /> {liveError ?? (checkedAt ? `Updated ${new Date(checkedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · Updates automatically every 15 seconds` : "Usage data has not loaded · Retrying automatically every 15 seconds")}</div>
      <section className={styles.visitors} aria-labelledby="visitors-heading">
        <div className={styles.icon}><BarChart3 size={21} aria-hidden="true" /></div>
        <div><span className={styles.cardLabel}>VISITORS</span><h2 id="visitors-heading">Vercel Web Analytics</h2><p>See unique visitors, page views, and traffic sources in your Vercel project dashboard.</p></div>
        <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer">Open Vercel <ArrowUpRight size={16} aria-hidden="true" /></a>
      </section>

      <section className={styles.todaySection} aria-labelledby="today-heading">
        <div className={styles.sectionHeading}><div><span className={styles.cardLabel}>CURRENT UTC DAY</span><h2 id="today-heading">Usage by model</h2></div><span className={styles.threshold}>Warnings start at 80%</span></div>
        {error ? <div className={styles.message} role="alert">{error}</div> : <>
        {warnings.length > 0 && <div className={styles.warningBanner} role="alert"><strong>Usage limit warning</strong><span>{warnings.join(". ")}.</span></div>}
        <div className={styles.dailyGrid}>{today.map((item) => <article className={styles.dailyCard} key={item.model}>
          <div className={styles.dailyTop}><div><span>{item.provider}</span><h3>{item.model}</h3></div><span className={`${styles.limitBadge} ${item.level === "near" ? styles.near : item.level === "reached" ? styles.reached : ""}`}>{item.level === "near" ? "Near limit" : item.level === "reached" ? "Limit reached" : item.level === "unknown" ? "Limit not set" : "Within limit"}</span></div>
          <div className={styles.dailyTotal}><strong>{number.format(item.tokens)}</strong><span>total tokens today</span></div>
          <p className={styles.dailyBreakdown}>{number.format(item.input)} input · {number.format(item.output)} output · {number.format(item.requests)} {item.requests === 1 ? "request" : "requests"}</p>
          <div className={styles.meter}><div><span>Requests</span><strong>{number.format(item.requests)}{item.limit.requests ? ` / ${number.format(item.limit.requests)}` : ""}</strong></div>{item.limit.requests ? <div className={styles.track}><span style={{ width: `${Math.min(100, item.requests / item.limit.requests * 100)}%` }} /></div> : <small>Daily limit not set</small>}</div>
          <div className={styles.meter}><div><span>Tokens</span><strong>{number.format(item.tokens)}{item.limit.tokens ? ` / ${number.format(item.limit.tokens)}` : ""}</strong></div>{item.limit.tokens ? <div className={styles.track}><span style={{ width: `${Math.min(100, item.tokens / item.limit.tokens * 100)}%` }} /></div> : <small>Daily limit not set</small>}</div>
          {(item.limit.minuteRequests || item.limit.minuteInputTokens) && <div className={styles.minuteSection}>
            <span className={styles.minuteHeading}>LAST 60 SECONDS</span>
            {item.limit.minuteRequests && <div className={styles.meter}><div><span>Requests / minute</span><strong>{number.format(item.recent.requests)} / {number.format(item.limit.minuteRequests)}</strong></div><div className={styles.track}><span style={{ width: `${Math.min(100, item.recent.requests / item.limit.minuteRequests * 100)}%` }} /></div></div>}
            {item.limit.minuteInputTokens && <div className={styles.meter}><div><span>Input tokens / minute</span><strong>{number.format(item.recent.inputTokens)} / {number.format(item.limit.minuteInputTokens)}</strong></div><div className={styles.track}><span style={{ width: `${Math.min(100, item.recent.inputTokens / item.limit.minuteInputTokens * 100)}%` }} /></div></div>}
          </div>}
          <p className={styles.limitSource}>{item.limit.source}</p>
        </article>)}</div>
        <p className={styles.note}>Gemini thresholds start with the limits you supplied from <a href="https://aistudio.google.com/usage?tab=rate-limit" target="_blank" rel="noopener noreferrer">AI Studio</a> and can be changed in configuration. Counts include recorded Lessonleaf requests and may differ from AI Studio if the same API key is used elsewhere. Daily totals use UTC and may differ from provider reset windows. Groq token totals include cached tokens, so its token warning can appear early.</p>
        </>}
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
