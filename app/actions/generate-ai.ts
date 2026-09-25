"use server";

import { createClient } from "@supabase/supabase-js";
import { generateAiContent } from "@/lib/ai-generation";
import { maxAiTermPlans, type AiLessonContent, type AiLessonRequest } from "@/lib/ai-content";
import { parseGenerateInput } from "@/lib/lesson-plan";

type AiResult = { ok: true; lessons: AiLessonContent[] } | { ok: false; error: string };

export async function generateAiLessonDrafts(accessToken: string, requests: AiLessonRequest[]): Promise<AiResult> {
  if (typeof accessToken !== "string" || !accessToken || accessToken.length > 4096) {
    return { ok: false, error: "Sign in to use AI generation." };
  }
  if (!Array.isArray(requests) || !requests.length || requests.length > maxAiTermPlans) {
    return { ok: false, error: `AI generation supports up to ${maxAiTermPlans} lessons at a time. Reduce the schedule or use Smart Template.` };
  }
  if (JSON.stringify(requests).length > 20_000) return { ok: false, error: "Lesson details are too long for AI generation." };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { ok: false, error: "Sign-in is not configured for AI generation." };

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user) return { ok: false, error: "Your sign-in has expired. Sign in again to use AI generation." };

    const validated = requests.map((request) => {
      const details = parseGenerateInput({ ...request?.details, section: "", schoolYear: "", preparedBy: "" });
      const guidance = request?.guidance;
      const read = (value: unknown) => typeof value === "string" ? value.trim().slice(0, 500) : "";
      return {
        details: {
          subject: details.subject, grade: details.grade, week: details.week, topic: details.topic,
          date: details.date, duration: details.duration, chapter: details.chapter, unit: details.unit,
          resource: details.resource, pages: details.pages,
        },
        guidance: {
          keyFocus: read(guidance?.keyFocus), activityHighlight: read(guidance?.activityHighlight),
          presentationGoal: read(guidance?.presentationGoal),
        },
      };
    });
    return { ok: true, lessons: await generateAiContent(validated) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "AI generation failed. Please try again." };
  }
}
