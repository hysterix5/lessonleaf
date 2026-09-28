import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import Module from "node:module";
import ts from "typescript";

const loadModule = createRequire(import.meta.url);
loadModule.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  module._compile(output, filename);
};

function loadGeneration() {
  const path = loadModule.resolve("../lib/ai-generation.ts");
  delete loadModule.cache[path];
  const originalLoad = Module._load;
  Module._load = function (request, ...args) {
    return request === "server-only" ? {} : originalLoad.call(this, request, ...args);
  };
  try { return loadModule(path).generateAiContent; }
  finally { Module._load = originalLoad; }
}

function lesson(inputIndex, topic) {
  return {
    inputIndex,
    keyFocus: topic, activityHighlight: "Discuss examples", presentationGoal: "Share findings",
    coreGoal: "Understand the topic", objectives: ["Explain the topic"], vocabulary: [topic],
    languageFocus: "Use key terms", materials: ["Notebook"], warmUp: "Ask a question",
    lessonProcedure: "Explore and discuss", teacherActions: "Guide discussion",
    studentActions: "Record ideas", activity: "Sort cards", presentation: "Share work",
    assessment: "Exit ticket", homework: "Draw an example", multimediaLinks: [], notes: "Review next time",
  };
}

function successfulResponse(topics) {
  return Response.json({ choices: [{ message: { content: JSON.stringify({ lessons: topics.map((topic, index) => lesson(index, topic)) }) } }] });
}

async function withFakeGroq(handler) {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-key";
  try { await handler(); }
  finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalKey;
  }
}

test("large term drafts are split across model budgets and keep lesson order", async () => withFakeGroq(async () => {
  const generateAiContent = loadGeneration();
  const models = [];
  const topics = ["A", "B", "C", "D", "E", "F"];
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    models.push(body.model);
    assert.equal(body.reasoning_effort, "low");
    assert.equal(body.max_completion_tokens, 1100 * (models.length === 1 ? 4 : 2));
    const chunk = JSON.parse(body.messages[0].content.split("\n\n").at(-1));
    return successfulResponse(chunk.map((item) => item.details.topic));
  };
  const lessons = await generateAiContent(topics.map((topic) => ({ details: { topic }, guidance: {} })));
  assert.deepEqual(models, ["openai/gpt-oss-120b", "openai/gpt-oss-20b"]);
  assert.deepEqual(lessons.map((item) => item.keyFocus), topics);
}));

test("twelve lessons are generated in three ordered Groq calls", async () => withFakeGroq(async () => {
  const generateAiContent = loadGeneration();
  const topics = Array.from({ length: 12 }, (_, index) => `Topic ${index + 1}`);
  const models = [];
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    models.push(body.model);
    const chunk = JSON.parse(body.messages[0].content.split("\n\n").at(-1));
    assert.equal(chunk.length, 4);
    return successfulResponse(chunk.map((item) => item.details.topic));
  };
  const lessons = await generateAiContent(topics.map((topic) => ({ details: { topic }, guidance: {} })));
  assert.deepEqual(models, ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "openai/gpt-oss-120b"]);
  assert.deepEqual(lessons.map((item) => item.keyFocus), topics);
}));

test("long lesson details are separated before they crowd one model's token budget", async () => withFakeGroq(async () => {
  const generateAiContent = loadGeneration();
  const chunkSizes = [];
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    const chunk = JSON.parse(body.messages[0].content.split("\n\n").at(-1));
    chunkSizes.push(chunk.length);
    return successfulResponse(chunk.map(() => "A"));
  };
  const longText = "a".repeat(300);
  const request = {
    details: Object.fromEntries(["subject", "grade", "schoolYear", "topic", "date", "chapter", "unit", "resource", "pages"].map((key) => [key, longText])),
    guidance: { keyFocus: "b".repeat(500), activityHighlight: "c".repeat(500), presentationGoal: "d".repeat(500) },
  };
  await generateAiContent([request, request]);
  assert.deepEqual(chunkSizes, [1, 1]);
}));

test("a rate-limited model falls back and is skipped until its retry period ends", async () => withFakeGroq(async () => {
  const generateAiContent = loadGeneration();
  const models = [];
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    models.push(body.model);
    if (body.model === "openai/gpt-oss-120b") return new Response(null, { status: 429, headers: { "retry-after": "60" } });
    return successfulResponse(["A"]);
  };
  const request = [{ details: { topic: "A" }, guidance: {} }];
  await generateAiContent(request);
  await generateAiContent(request);
  await generateAiContent(request);
  assert.deepEqual(models, ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "openai/gpt-oss-20b", "openai/gpt-oss-20b"]);
}));

test("a rate limit mid-batch returns completed lessons for a later retry", async () => withFakeGroq(async () => {
  const generateAiContent = loadGeneration();
  const topics = Array.from({ length: 8 }, (_, index) => `Topic ${index + 1}`);
  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    calls += 1;
    if (calls > 1) return new Response(null, { status: 429, headers: { "retry-after": "2" } });
    const body = JSON.parse(options.body);
    const chunk = JSON.parse(body.messages[0].content.split("\n\n").at(-1));
    return successfulResponse(chunk.map((item) => item.details.topic));
  };
  await assert.rejects(
    generateAiContent(topics.map((topic) => ({ details: { topic }, guidance: {} }))),
    (error) => {
      assert.deepEqual(error.completedLessons.map((item) => item.keyFocus), topics.slice(0, 4));
      assert.ok(error.retryAfterMs > 0 && error.retryAfterMs <= 2_000);
      return true;
    },
  );
  assert.equal(calls, 3);
}));

test("when both models are rate-limited, generation returns a clear retry message", async () => withFakeGroq(async () => {
  const generateAiContent = loadGeneration();
  globalThis.fetch = async () => new Response(null, { status: 429 });
  await assert.rejects(generateAiContent([{ details: { topic: "A" }, guidance: {} }]), /at capacity/);
}));
