"use server";

import { cookies } from "next/headers";
import { createUsageClient } from "@/lib/ai-usage-store";
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

type UsageResult = { ok: true; rows: DailyUsage[] } | { ok: false; reason: "unauthorized" | "unavailable"; error: string };

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
  if (!secret) return { ok: false, reason: "unavailable", error: "Developer access is unavailable." };
  const session = (await cookies()).get(developerSessionCookie)?.value;
  if (!verifyDeveloperSession(session, secret)) {
    return { ok: false, reason: "unauthorized", error: "Enter the developer key to view usage." };
  }

  try {
    const startAt = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const { data: rows, error: usageError } = await createUsageClient().rpc("ai_usage_daily", { start_at: startAt });
    if (usageError) throw usageError;
    return { ok: true, rows: (rows ?? []) as DailyUsage[] };
  } catch (error) {
    console.error("Could not load developer analytics.", error);
    return { ok: false, reason: "unavailable", error: "Usage data is unavailable. Please try again later." };
  }
}
