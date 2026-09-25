import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const loadModule = createRequire(import.meta.url);
loadModule.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  module._compile(output, filename);
};

const { groupPlansByCourse, searchCourseGroups } = loadModule("../lib/lesson-library.ts");

const courses = [
  { id: "course-b", classId: "class-1", title: "Biology", weeks: [] },
  { id: "course-a", classId: "class-1", title: "Astronomy", weeks: [] },
];
const classes = [{ id: "class-1", name: "Grade 1 Science" }];
const plan = (id, courseOverviewId, date, week, topic) => ({
  id, courseOverviewId, date, week, topic, schoolYear: "2026-2027", className: "Grade 1 Science",
  subject: "Science", grade: "Grade 1", category: "Regular",
});

test("plans are grouped by course identity and ordered for printing", () => {
  const plans = [
    plan("b2", "course-b", "2026-10-06", 2, "Plants"),
    plan("a1", "course-a", "2026-09-30", 1, "Stars"),
    plan("b1", "course-b", "2026-09-29", 1, "Habitats"),
    plan("other", undefined, "", 1, "Free lesson"),
  ];
  const groups = groupPlansByCourse(plans, courses, classes);
  assert.deepEqual(groups.map((group) => group.title), ["Astronomy", "Biology", "Other plans"]);
  assert.deepEqual(groups[1].plans.map((item) => item.id), ["b1", "b2"]);
  assert.equal(groups[1].className, "Grade 1 Science");
  assert.equal(groups[2].courseId, null);
  assert.deepEqual(plans.map((item) => item.id), ["b2", "a1", "b1", "other"]);
});

test("plans retain their group when a course overview is unavailable", () => {
  const groups = groupPlansByCourse([plan("old", "removed-course", "", 1, "Old lesson")], courses, classes);
  assert.equal(groups[0].courseId, "removed-course");
  assert.equal(groups[0].title, "Course overview unavailable");
});

test("courses with the same title remain separate print sets", () => {
  const sameTitleCourses = [
    { id: "course-one", classId: "class-1", title: "Science", weeks: [] },
    { id: "course-two", classId: "class-1", title: "Science", weeks: [] },
  ];
  const groups = groupPlansByCourse([
    plan("one", "course-one", "2026-09-29", 1, "Habitats"),
    plan("two", "course-two", "2026-09-30", 1, "Plants"),
  ], sameTitleCourses, classes);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups.map((group) => group.plans.map((item) => item.id)), [["one"], ["two"]]);
});

test("search finds course names and does not narrow the course print set", () => {
  const groups = groupPlansByCourse([
    plan("b1", "course-b", "2026-09-29", 1, "Habitats"),
    plan("b2", "course-b", "2026-10-06", 2, "Plants"),
  ], courses, classes);
  const byCourse = searchCourseGroups(groups, "Biology");
  assert.deepEqual(byCourse[0].visiblePlans.map((item) => item.id), ["b1", "b2"]);
  const byTopic = searchCourseGroups(groups, "Plants");
  assert.deepEqual(byTopic[0].visiblePlans.map((item) => item.id), ["b2"]);
  assert.deepEqual(byTopic[0].plans.map((item) => item.id), ["b1", "b2"]);
});
