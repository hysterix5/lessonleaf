"use server";

import { createClient } from "@supabase/supabase-js";
import { AiRateLimitError, generateAiContent } from "@/lib/ai-generation";
import { isAiModelChoice, maxAiTermPlans, parseAiLessonRequest, type AiLessonRequest, type AiModelChoice } from "@/lib/ai-content";
import type { AiDraftResult } from "@/lib/ai-retry";
import { saveAiUsage } from "@/lib/ai-usage-store";

export async function generateAiLessonDrafts(accessToken: string, requests: AiLessonRequest[], model: AiModelChoice = "auto"): Promise<AiDraftResult> {
  if (typeof accessToken !== "string" || !accessToken || accessToken.length > 4096) {
    return { ok: false, error: "Sign in to use AI generation." };
  }
  if (!Array.isArray(requests) || !requests.length || requests.length > maxAiTermPlans) {
    return { ok: false, error: `AI generation supports up to ${maxAiTermPlans} lessons at a time. Reduce the schedule or use Smart Template.` };
  }
  if (!isAiModelChoice(model)) return { ok: false, error: "Choose a valid AI model." };
  if (JSON.stringify(requests).length > maxAiTermPlans * 2_500) return { ok: false, error: "Lesson details are too long for AI generation." };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { ok: false, error: "Sign-in is not configured for AI generation." };

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user) return { ok: false, error: "Your sign-in has expired. Sign in again to use AI generation." };

    const validated = requests.map(parseAiLessonRequest);
    return { ok: true, lessons: await generateAiContent(validated, model, async (usage) => {
      try { await saveAiUsage(data.user.id, usage); }
      catch (error) { console.error("Could not record AI token usage.", error); }
    }) };
  } catch (error) {
    if (error instanceof AiRateLimitError) {
      return { ok: false, error: error.message, retryAfterMs: error.retryAfterMs, lessons: error.completedLessons };
    }
    return { ok: false, error: error instanceof Error ? error.message : "AI generation failed. Please try again." };
  }
}
