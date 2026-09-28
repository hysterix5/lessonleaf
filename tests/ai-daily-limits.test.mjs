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

const { dailyModelLimits } = loadModule("../lib/ai-daily-limits.ts");
const { usageWarning, minuteUsageByModel } = loadModule("../lib/ai-usage-warning.ts");

test("Groq reference and supplied Gemini project limits are defaults", () => {
  const limits = dailyModelLimits("");
  assert.deepEqual(limits["openai/gpt-oss-120b"], { requests: 1000, tokens: 200000, minuteRequests: null, minuteInputTokens: null, source: "Groq free plan reference" });
  assert.deepEqual(limits["openai/gpt-oss-20b"], { requests: 1000, tokens: 200000, minuteRequests: null, minuteInputTokens: null, source: "Groq free plan reference" });
  assert.deepEqual(limits["gemini-3.5-flash-lite"], { requests: 500, tokens: null, minuteRequests: 15, minuteInputTokens: 250000, source: "Gemini project limits" });
});

test("project limits override defaults and can disable a dimension", () => {
  const limits = dailyModelLimits(JSON.stringify({
    "openai/gpt-oss-20b": { requests: 250, tokens: null },
    "gemini-3.5-flash-lite": { requests: 40, minuteRequests: 10, minuteInputTokens: null },
  }));
  assert.deepEqual(limits["openai/gpt-oss-20b"], { requests: 250, tokens: null, minuteRequests: null, minuteInputTokens: null, source: "Configured" });
  assert.deepEqual(limits["gemini-3.5-flash-lite"], { requests: 40, tokens: null, minuteRequests: 10, minuteInputTokens: null, source: "Configured" });
});

test("warnings start at 80 percent and only compare configured dimensions", () => {
  const limit = { requests: 100, tokens: 2000, source: "Configured" };
  assert.equal(usageWarning(79, 1500, limit), "normal");
  assert.equal(usageWarning(80, 1500, limit), "near");
  assert.equal(usageWarning(10, 2000, limit), "reached");
  assert.equal(usageWarning(100, 0, { requests: null, tokens: null }), "unknown");
});

test("minute usage counts requests and input tokens separately per model", () => {
  const usage = minuteUsageByModel([
    { model: "gemini-3.5-flash-lite", input_tokens: 150 },
    { model: "gemini-3.5-flash-lite", input_tokens: 222 },
    { model: "openai/gpt-oss-20b", input_tokens: 40 },
  ]);
  assert.deepEqual(usage["gemini-3.5-flash-lite"], { requests: 2, inputTokens: 372 });
  assert.deepEqual(usage["openai/gpt-oss-20b"], { requests: 1, inputTokens: 40 });
  assert.deepEqual(usage["openai/gpt-oss-120b"], { requests: 0, inputTokens: 0 });
  const limit = dailyModelLimits("")["gemini-3.5-flash-lite"];
  assert.equal(usageWarning(12, 0, { requests: limit.minuteRequests, tokens: limit.minuteInputTokens }), "near");
  assert.equal(usageWarning(1, 250000, { requests: limit.minuteRequests, tokens: limit.minuteInputTokens }), "reached");
});
