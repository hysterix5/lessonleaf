import type { ClassRecord, CourseOverview } from "./catalog";
import type { LessonPlan } from "./lesson-plan";

export type CoursePlanGroup = {
  key: string;
  courseId: string | null;
  title: string;
  className: string;
  plans: LessonPlan[];
};

export type VisibleCoursePlanGroup = CoursePlanGroup & { visiblePlans: LessonPlan[] };

function comparePlans(a: LessonPlan, b: LessonPlan) {
  return (a.date || "9999-12-31").localeCompare(b.date || "9999-12-31")
    || a.schoolYear.localeCompare(b.schoolYear)
    || a.week - b.week
    || a.topic.localeCompare(b.topic)
    || a.id.localeCompare(b.id);
}

export function groupPlansByCourse(plans: LessonPlan[], courses: CourseOverview[], classes: ClassRecord[]): CoursePlanGroup[] {
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const classById = new Map(classes.map((item) => [item.id, item]));
  const groups = new Map<string, CoursePlanGroup>();

  for (const plan of plans) {
    const courseId = plan.courseOverviewId || null;
    const key = courseId || "unassigned";
    let group = groups.get(key);
    if (!group) {
      const course = courseId ? courseById.get(courseId) : undefined;
      group = {
        key,
        courseId,
        title: course?.title || (courseId ? "Course overview unavailable" : "Other plans"),
        className: (course && classById.get(course.classId)?.name) || plan.className || "",
        plans: [],
      };
      groups.set(key, group);
    }
    group.plans.push(plan);
  }

  return [...groups.values()]
    .map((group) => ({ ...group, plans: [...group.plans].sort(comparePlans) }))
    .sort((a, b) => (a.courseId === null ? 1 : 0) - (b.courseId === null ? 1 : 0)
      || a.title.localeCompare(b.title)
      || a.className.localeCompare(b.className)
      || a.key.localeCompare(b.key));
}

export function searchCourseGroups(groups: CoursePlanGroup[], query: string): VisibleCoursePlanGroup[] {
  const search = query.trim().toLocaleLowerCase();
  return groups.map((group) => {
    const groupMatches = [group.title, group.className].some((value) => value.toLocaleLowerCase().includes(search));
    const visiblePlans = !search || groupMatches ? group.plans : group.plans.filter((plan) =>
      [plan.topic, plan.className, plan.category, plan.date, plan.subject, plan.grade, plan.schoolYear]
        .filter(Boolean).join(" ").toLocaleLowerCase().includes(search));
    return { ...group, visiblePlans };
  }).filter((group) => group.visiblePlans.length > 0);
}
