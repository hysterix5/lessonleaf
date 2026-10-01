import type { CourseOverview } from "./catalog";
import type { LessonPlan } from "./lesson-plan";
import type { AppSettings } from "./settings";

export function displayLessonDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || "—";
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function normalOverviewContent(course: CourseOverview, sample: LessonPlan | undefined, settings: AppSettings) {
  const schoolYear = sample?.schoolYear || settings.schoolYear;
  const preparedBy = sample?.preparedBy || settings.teacherName;
  return {
    title: `Lesson Plan - ${sample?.grade || ""}${sample?.grade && schoolYear ? " - " : ""}${schoolYear}`,
    subtitle: `Overview of Course Content${sample?.subject ? ` • ${sample.subject}` : ""}${sample?.resource ? ` • ${sample.resource}` : ""}`,
    coreGoal: course.description,
    preparedBy: preparedBy ? `Prepared By: ${preparedBy}` : "",
    schoolAndYear: `${settings.schoolName}${settings.schoolName && schoolYear ? " • " : ""}${schoolYear}`,
  };
}
