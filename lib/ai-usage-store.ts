import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { AiUsage } from "./ai-usage";

export function createUsageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("AI usage storage is not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function saveAiUsage(userId: string, usage: AiUsage) {
  const { error } = await createUsageClient().from("ai_usage").insert({
    user_id: userId,
    provider: usage.provider,
    model: usage.model,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    total_tokens: usage.totalTokens,
  });
  if (error) throw error;
}
