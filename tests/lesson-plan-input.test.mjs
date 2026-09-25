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

const { parseGenerateInput, parseLessonCategory } = loadModule("../lib/lesson-plan.ts");
const details = {
  subject: "Science", grade: "Grade 1", section: "", schoolYear: "2026-2027",
  week: 1, topic: "Habitats", date: "", duration: 60, chapter: "", unit: "",
  resource: "", pages: "", preparedBy: "",
};

test("single lesson details require a subject, grade, school year, and topic", () => {
  for (const [field, message] of [
    ["subject", /Enter a subject/], ["grade", /Enter a grade level/],
    ["schoolYear", /Enter a school year/], ["topic", /Enter a lesson topic/],
  ]) {
    assert.throws(() => parseGenerateInput({ ...details, [field]: "   " }), message);
  }
  assert.equal(parseGenerateInput(details).topic, "Habitats");
});

test("lesson categories accept custom text and reject empty or oversized values", () => {
  assert.equal(parseLessonCategory("  Project presentation  "), "Project presentation");
  assert.throws(() => parseLessonCategory("  "), /Enter a lesson category/);
  assert.throws(() => parseLessonCategory("x".repeat(201)), /200 characters or fewer/);
});
