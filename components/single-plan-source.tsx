"use client";

import { Label } from "@/components/ui/label";
import type { ClassRecord, CourseOverview } from "@/lib/catalog";

export function SinglePlanSource({ classes, courses, classId, courseId, category, week, onClassChange, onCourseChange, onCategoryChange, onCourseWeekChange }: {
  classes: ClassRecord[];
  courses: CourseOverview[];
  classId: string;
  courseId: string;
  category: string;
  week: number;
  onClassChange: (id: string) => void;
  onCourseChange: (id: string) => void;
  onCategoryChange: (category: string) => void;
  onCourseWeekChange: (week: number) => void;
}) {
  const available = courses.filter((course) => course.classId === classId);
  const selected = available.find((course) => course.id === courseId);
  return <div className="single-source-grid">
    <Label className="field"><span>Class</span><select className="native-select" value={classId} onChange={(event) => onClassChange(event.target.value)}><option value="">No saved class</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Label>
    <Label className="field"><span>Lesson category</span><select className="native-select" value={category} onChange={(event) => onCategoryChange(event.target.value)}><option>Regular</option><option>Midterm</option><option>Final</option><option>Weekly</option><option>Review</option></select></Label>
    {classId && <Label className="field"><span>Course overview</span><select className="native-select" value={courseId} onChange={(event) => onCourseChange(event.target.value)}><option value="">Use lesson details below</option>{available.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></Label>}
    {selected && <Label className="field"><span>Course week</span><select className="native-select" value={selected.weeks.some((item) => item.week === week) ? week : ""} onChange={(event) => onCourseWeekChange(Number(event.target.value))}><option value="" disabled>Choose a week</option>{selected.weeks.map((item) => <option key={item.week} value={item.week}>Week {item.week}: {item.topic}</option>)}</select></Label>}
  </div>;
}
