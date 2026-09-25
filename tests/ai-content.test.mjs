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

const { parseAiLessonBatch, applyAiLessonContent } = loadModule("../lib/ai-content.ts");

function lesson(inputIndex, topic) {
  return {
    inputIndex,
    keyFocus: `${topic} focus`, activityHighlight: `${topic} activity`, presentationGoal: `${topic} presentation`,
    coreGoal: `${topic} goal`, objectives: [`Describe ${topic}`], vocabulary: [topic],
    languageFocus: "I observe…", materials: ["Notebook"], warmUp: "Ask a question",
    lessonProcedure: "Engage, explore, explain, apply, assess", teacherActions: "Model the task",
    studentActions: "Discuss and record", activity: "Sort cards", presentation: "Share findings",
    assessment: "Exit ticket", homework: "Draw an example", multimediaLinks: [], notes: "Review timing",
  };
}

test("AI batch results map to the right meeting even when the model changes their order", () => {
  const parsed = parseAiLessonBatch({ lessons: [lesson(1, "Plants"), lesson(0, "Habitats")] }, 2);
  assert.equal(parsed[0].keyFocus, "Habitats focus");
  assert.equal(parsed[1].keyFocus, "Plants focus");
});

test("AI batch rejects incomplete and duplicated responses before any plan can be saved", () => {
  assert.throws(() => parseAiLessonBatch({ lessons: [lesson(0, "Habitats")] }, 2), /wrong number/);
  assert.throws(() => parseAiLessonBatch({ lessons: [lesson(0, "Habitats"), lesson(0, "Plants")] }, 2), /match each lesson/);
  assert.throws(() => parseAiLessonBatch({ lessons: [{ ...lesson(0, "Habitats"), objectives: [] }] }, 1), /incomplete/);
});

test("AI content replaces teaching sections but keeps plan identity and schedule details", () => {
  const plan = { id: "plan-1", topic: "Habitats", week: 3, date: "2026-10-01", category: "Midterm", termBatchId: "batch-1", coreGoal: "Template goal" };
  const content = parseAiLessonBatch({ lessons: [lesson(0, "Habitats")] }, 1)[0];
  const result = applyAiLessonContent(plan, content);
  assert.equal(result.coreGoal, "Habitats goal");
  assert.equal(result.id, plan.id);
  assert.equal(result.week, plan.week);
  assert.equal(result.date, plan.date);
  assert.equal(result.termBatchId, plan.termBatchId);
});
