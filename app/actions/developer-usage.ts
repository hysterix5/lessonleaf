"use server";

import { cookies } from "next/headers";
import { createUsageClient } from "@/lib/ai-usage-store";
import { dailyModelLimits, type DailyModelLimits } from "@/lib/ai-daily-limits";
import { minuteUsageByModel, type MinuteUsageByModel } from "@/lib/ai-usage-warning";
import { configuredDeveloperSecret, developerSessionCookie, developerSessionSeconds, issueDeveloperSession, matchesDeveloperSecret, verifyDeveloperSession } from "@/lib/developer-session";

export type DailyUsage = {
  day: string;
  provider: string;
  model: string;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
};

type UsageResult = { ok: true; rows: DailyUsage[]; minute: MinuteUsageByModel; limits: DailyModelLimits; checkedAt: string } | { ok: false; reason: "unauthorized" | "configuration" | "unavailable"; error: string };

export async function signInDeveloper(candidate: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const secret = configuredDeveloperSecret();
  if (!secret) return { ok: false, error: "Developer access is unavailable." };
  if (!matchesDeveloperSecret(candidate, secret)) return { ok: false, error: "The developer key is incorrect." };

  (await cookies()).set(developerSessionCookie, issueDeveloperSession(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: developerSessionSeconds,
  });
  return { ok: true };
}

export async function signOutDeveloper(): Promise<void> {
  (await cookies()).delete(developerSessionCookie);
}

export async function getDeveloperUsage(): Promise<UsageResult> {
  const secret = configuredDeveloperSecret();
  if (!secret) return { ok: false, reason: "configuration", error: "Developer access is unavailable." };
  const session = (await cookies()).get(developerSessionCookie)?.value;
  if (!verifyDeveloperSession(session, secret)) {
    return { ok: false, reason: "unauthorized", error: "Enter the developer key to view usage." };
  }

  try {
    const checkedAt = new Date();
    const startAt = new Date(checkedAt.getTime() - 30 * 86_400_000).toISOString();
    const minuteStart = new Date(checkedAt.getTime() - 60_000).toISOString();
    const client = createUsageClient();
    const [daily, recent] = await Promise.all([
      client.rpc("ai_usage_daily", { start_at: startAt }),
      client.from("ai_usage").select("model,input_tokens").gte("created_at", minuteStart).lte("created_at", checkedAt.toISOString()).limit(1000),
    ]);
    if (daily.error) throw daily.error;
    if (recent.error) throw recent.error;
    return {
      ok: true,
      rows: (daily.data ?? []) as DailyUsage[],
      minute: minuteUsageByModel(recent.data ?? []),
      limits: dailyModelLimits(),
      checkedAt: checkedAt.toISOString(),
    };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    const message = error instanceof Error ? error.message : error && typeof error === "object" && "message" in error ? String(error.message) : "";
    console.error("Could not load developer analytics.", { code, message });
    return { ok: false, reason: "unavailable", error: message.includes("fetch failed") ? "The server cannot connect to usage storage. Please check its network connection." : "Usage data is unavailable. Please try again later." };
  }
}
