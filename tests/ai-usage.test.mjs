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

const { readAiUsage } = loadModule("../lib/ai-usage.ts");

test("reads Groq token counts from chat completion usage", () => {
  assert.deepEqual(readAiUsage({ usage: { prompt_tokens: 120, completion_tokens: 45, total_tokens: 165 } }, "openai/gpt-oss-120b"), {
    provider: "Groq", model: "openai/gpt-oss-120b", inputTokens: 120, outputTokens: 45, totalTokens: 165,
  });
});

test("reads Gemini totals including thinking tokens", () => {
  assert.deepEqual(readAiUsage({ usageMetadata: { promptTokenCount: 80, candidatesTokenCount: 30, thoughtsTokenCount: 10, totalTokenCount: 120 } }, "gemini-3.5-flash-lite"), {
    provider: "Gemini", model: "gemini-3.5-flash-lite", inputTokens: 80, outputTokens: 30, totalTokens: 120,
  });
});

test("ignores missing or malformed usage instead of recording guessed values", () => {
  assert.equal(readAiUsage({}, "openai/gpt-oss-20b"), null);
  assert.equal(readAiUsage({ usage: { prompt_tokens: -1, completion_tokens: 2, total_tokens: 1 } }, "openai/gpt-oss-20b"), null);
});
