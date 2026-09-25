import type { LessonPlan } from "./lesson-plan";

export const maxAiTermPlans = 8;

export type AiLessonRequest = {
  details: Pick<LessonPlan, "subject" | "grade" | "week" | "topic" | "date" | "duration" | "chapter" | "unit" | "resource" | "pages">;
  guidance: Pick<LessonPlan, "keyFocus" | "activityHighlight" | "presentationGoal">;
};

const textFields = [
  "keyFocus", "activityHighlight", "presentationGoal", "coreGoal", "languageFocus",
  "warmUp", "lessonProcedure", "teacherActions", "studentActions", "activity",
  "presentation", "assessment", "homework", "notes",
] as const;
const listFields = ["objectives", "vocabulary", "materials", "multimediaLinks"] as const;

export type AiLessonContent = Record<(typeof textFields)[number], string> &
  Record<(typeof listFields)[number], string[]>;

export function aiLessonRequest(plan: LessonPlan): AiLessonRequest {
  const { subject, grade, week, topic, date, duration, chapter, unit, resource, pages,
    keyFocus, activityHighlight, presentationGoal } = plan;
  return {
    details: { subject, grade, week, topic, date, duration, chapter, unit, resource, pages },
    guidance: { keyFocus, activityHighlight, presentationGoal },
  };
}

export function parseAiLessonBatch(value: unknown, expectedCount: number): AiLessonContent[] {
  if (!value || typeof value !== "object" || !Array.isArray((value as { lessons?: unknown }).lessons)) {
    throw new Error("The AI returned an incomplete lesson draft. Please try again.");
  }
  const lessons = (value as { lessons: unknown[] }).lessons;
  if (lessons.length !== expectedCount) throw new Error("The AI returned the wrong number of lessons. Please try again.");
  const result: (AiLessonContent | undefined)[] = Array(expectedCount).fill(undefined);

  for (const lesson of lessons) {
    if (!lesson || typeof lesson !== "object") throw new Error("The AI returned an incomplete lesson draft. Please try again.");
    const data = lesson as Record<string, unknown>;
    const index = data.inputIndex;
    if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || index >= expectedCount || result[index]) {
      throw new Error("The AI could not match each lesson to its schedule. Please try again.");
    }
    const content: Record<string, string | string[]> = {};
    for (const key of textFields) {
      if (typeof data[key] !== "string" || !data[key].trim()) throw new Error("The AI returned an incomplete lesson draft. Please try again.");
      content[key] = data[key].trim().slice(0, 5000);
    }
    for (const key of listFields) {
      if (!Array.isArray(data[key]) || !(data[key] as unknown[]).every((item) => typeof item === "string")) {
        throw new Error("The AI returned an incomplete lesson draft. Please try again.");
      }
      content[key] = (data[key] as string[]).map((item) => item.trim().slice(0, 1000)).filter(Boolean).slice(0, 30);
    }
    if (!(content.objectives as string[]).length || !(content.materials as string[]).length) {
      throw new Error("The AI returned an incomplete lesson draft. Please try again.");
    }
    result[index] = content as AiLessonContent;
  }
  return result as AiLessonContent[];
}

export function applyAiLessonContent(plan: LessonPlan, content: AiLessonContent): LessonPlan {
  return { ...plan, ...content };
}
