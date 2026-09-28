import type { AiLessonContent, AiLessonRequest } from "./ai-content";

export type AiDraftResult =
  | { ok: true; lessons: AiLessonContent[] }
  | { ok: false; error: string; retryAfterMs?: number; lessons?: AiLessonContent[] };

const maxRetryWaitMs = 65_000;
const maxTotalWaitMs = 130_000;

export async function collectAiLessonDrafts(
  requests: AiLessonRequest[],
  generate: (remaining: AiLessonRequest[]) => Promise<AiDraftResult>,
  wait: (milliseconds: number) => Promise<void>,
): Promise<AiLessonContent[]> {
  const lessons: AiLessonContent[] = [];
  let totalWaitMs = 0;

  while (lessons.length < requests.length) {
    const result = await generate(requests.slice(lessons.length));
    if (result.ok) {
      lessons.push(...result.lessons);
      break;
    }
    if (!result.lessons || !Number.isFinite(result.retryAfterMs) || !result.retryAfterMs || result.retryAfterMs < 0) {
      throw new Error(result.error);
    }

    lessons.push(...result.lessons);
    if (lessons.length === requests.length) break;
    const waitMs = Math.max(1_000, Math.ceil(result.retryAfterMs / 1_000) * 1_000);
    if (waitMs > maxRetryWaitMs || totalWaitMs + waitMs > maxTotalWaitMs) throw new Error(result.error);
    totalWaitMs += waitMs;
    await wait(waitMs);
  }

  if (lessons.length !== requests.length) throw new Error("The AI returned an incomplete lesson draft. Please try again.");
  return lessons;
}
