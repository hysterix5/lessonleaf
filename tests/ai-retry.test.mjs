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

const { collectAiLessonDrafts } = loadModule("../lib/ai-retry.ts");

test("a minute-limit pause resumes only unfinished lessons", async () => {
  const requests = Array.from({ length: 8 }, (_, index) => ({ details: { topic: `Topic ${index + 1}` }, guidance: {} }));
  const callTopics = [];
  const waits = [];
  const lessons = await collectAiLessonDrafts(requests, async (remaining) => {
    callTopics.push(remaining.map((item) => item.details.topic));
    if (callTopics.length === 1) {
      return { ok: false, error: "AI generation is at capacity.", retryAfterMs: 2_500,
        lessons: remaining.slice(0, 4).map((item) => ({ keyFocus: item.details.topic })) };
    }
    return { ok: true, lessons: remaining.map((item) => ({ keyFocus: item.details.topic })) };
  }, async (milliseconds) => { waits.push(milliseconds); });

  assert.deepEqual(callTopics.map((topics) => topics.length), [8, 4]);
  assert.deepEqual(waits, [3_000]);
  assert.deepEqual(lessons.map((item) => item.keyFocus), requests.map((item) => item.details.topic));
});

test("daily limits and repeated minute limits end with a clear error", async () => {
  const request = [{ details: { topic: "A" }, guidance: {} }];
  const waits = [];
  await assert.rejects(collectAiLessonDrafts(request,
    async () => ({ ok: false, error: "AI generation is at capacity.", retryAfterMs: 3_600_000, lessons: [] }),
    async (milliseconds) => { waits.push(milliseconds); }), /at capacity/);
  assert.deepEqual(waits, []);

  let calls = 0;
  await assert.rejects(collectAiLessonDrafts(request,
    async () => { calls += 1; return { ok: false, error: "AI generation is at capacity.", retryAfterMs: 60_000, lessons: [] }; },
    async (milliseconds) => { waits.push(milliseconds); }), /at capacity/);
  assert.equal(calls, 3);
  assert.deepEqual(waits, [60_000, 60_000]);
});
