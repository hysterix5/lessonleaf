import { parseGenerateInput, type LessonPlan } from "./lesson-plan";

export const maxAiTermPlans = 8;

export type AiLessonRequest = {
  details: Pick<LessonPlan, "subject" | "grade" | "schoolYear" | "week" | "topic" | "date" | "duration" | "chapter" | "unit" | "resource" | "pages">;
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
  const { subject, grade, schoolYear, week, topic, date, duration, chapter, unit, resource, pages,
    keyFocus, activityHighlight, presentationGoal } = plan;
  return {
    details: { subject, grade, schoolYear, week, topic, date, duration, chapter, unit, resource, pages },
    guidance: { keyFocus, activityHighlight, presentationGoal },
  };
}

export function parseAiLessonRequest(value: unknown): AiLessonRequest {
  const request = value && typeof value === "object" ? value as Partial<AiLessonRequest> : {};
  const details = parseGenerateInput({ ...request.details, section: "", preparedBy: "" });
  const read = (value: unknown) => typeof value === "string" ? value.trim().slice(0, 500) : "";
  return {
    details: {
      subject: details.subject, grade: details.grade, schoolYear: details.schoolYear,
      week: details.week, topic: details.topic, date: details.date, duration: details.duration,
      chapter: details.chapter, unit: details.unit, resource: details.resource, pages: details.pages,
    },
    guidance: {
      keyFocus: read(request.guidance?.keyFocus), activityHighlight: read(request.guidance?.activityHighlight),
      presentationGoal: read(request.guidance?.presentationGoal),
    },
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
