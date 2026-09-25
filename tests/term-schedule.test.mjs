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

const { createTermMeetings, buildTermPlans } = loadModule("../lib/term-schedule.ts");

const classRecord = {
  id: "a410e8b1-5ef1-4947-a5d8-0620c48257dd", name: "Grade 1 Science", subject: "Science",
  grade: "Grade 1", section: "A", schoolYear: "2026–2027", meetingDays: [2], duration: 60,
};
const settings = { resource: "Science textbook", teacherName: "Ms. Reyes" };

test("Tuesday meetings start after a Thursday term date and cover eight weeks", () => {
  const meetings = createTermMeetings({ termStart: "2026-09-24", numberOfWeeks: 8, startingWeek: 1, meetingDays: [2] });
  assert.equal(meetings.length, 8);
  assert.deepEqual(meetings[0], { date: "2026-09-29", week: 1, day: 2 });
  assert.deepEqual(meetings.at(-1), { date: "2026-11-17", week: 8, day: 2 });
});

test("two meeting days produce two editable lessons per week with course guidance", () => {
  const overview = {
    id: "96c8d58e-bf4d-411c-91ef-85cc23d6c665", classId: classRecord.id, title: "Science term",
    weeks: [
      { week: 1, topic: "Habitats", unit: "Unit 3", focus: "Living things need a home.", activity: "Sort habitat cards", presentationGoal: "Describe one habitat" },
      { week: 2, topic: "Plants", unit: "Unit 3", focus: "Plants need sunlight and water.", activity: "Observe a plant", presentationGoal: "Explain plant needs" },
    ],
  };
  const plans = buildTermPlans({
    classRecord, category: "Midterm", schoolYear: "2026–2027", termStart: "2026-09-24",
    numberOfWeeks: 2, startingWeek: 1, duration: 45, meetingDays: [2, 4],
    contentSource: "course", overview, chapter: "Living things", unit: "Unit 3",
  }, settings);
  assert.equal(plans.length, 4);
  assert.deepEqual(plans.map((plan) => plan.week), [1, 1, 2, 2]);
  assert.equal(plans[0].category, "Midterm");
  assert.equal(plans[0].classId, classRecord.id);
  assert.equal(plans[0].activity, "Sort habitat cards");
  assert.match(plans[0].lessonProcedure, /Sort habitat cards/);
  assert.equal(plans[0].duration, 45);
  assert.equal(new Set(plans.map((plan) => plan.termBatchId)).size, 1);
});

test("a course batch stops when a requested week has no content", () => {
  assert.throws(() => buildTermPlans({
    classRecord, category: "Midterm", schoolYear: "2026–2027", termStart: "2026-09-24",
    numberOfWeeks: 2, startingWeek: 1, duration: 60, meetingDays: [2],
    contentSource: "course", overview: { id: "96c8d58e-bf4d-411c-91ef-85cc23d6c665", classId: classRecord.id, weeks: [{ week: 1, topic: "Habitats", unit: "", focus: "", activity: "", presentationGoal: "" }] },
    chapter: "", unit: "",
  }, settings), /week 2/);
});

test("the sample Science sequence cannot be used for a different subject", () => {
  assert.throws(() => buildTermPlans({
    classRecord: { ...classRecord, subject: "English" }, category: "Weekly", schoolYear: "2026–2027",
    termStart: "2026-09-24", numberOfWeeks: 1, startingWeek: 1, duration: 60,
    meetingDays: [2], contentSource: "sample", chapter: "", unit: "",
  }, settings), /Science classes/);
});
