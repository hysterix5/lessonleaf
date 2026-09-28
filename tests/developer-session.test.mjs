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

const originalLoad = Module._load;
Module._load = function (request, ...args) {
  return request === "server-only" ? {} : originalLoad.call(this, request, ...args);
};
let session;
try { session = loadModule("../lib/developer-session.ts"); }
finally { Module._load = originalLoad; }

const secret = "correct-secret-key-with-more-than-32-characters";
const now = Date.UTC(2026, 8, 28, 0, 0, 0);

test("developer key comparison accepts only an exact match", () => {
  assert.equal(session.matchesDeveloperSecret(secret, secret), true);
  assert.equal(session.matchesDeveloperSecret(`${secret}x`, secret), false);
  assert.equal(session.matchesDeveloperSecret("incorrect-secret-key-with-more-than-32-characters", secret), false);
});

test("developer session expires and is invalidated by key rotation", () => {
  const token = session.issueDeveloperSession(secret, now);
  assert.equal(session.verifyDeveloperSession(token, secret, now), true);
  assert.equal(session.verifyDeveloperSession(token, secret, now + session.developerSessionSeconds * 1000 - 1000), true);
  assert.equal(session.verifyDeveloperSession(token, secret, now + session.developerSessionSeconds * 1000), false);
  assert.equal(session.verifyDeveloperSession(token, `${secret}rotated`, now), false);
});

test("developer session rejects modified and malformed cookies", () => {
  const token = session.issueDeveloperSession(secret, now);
  const parts = token.split(".");
  parts[1] = String(Number(parts[1]) + 60);
  assert.equal(session.verifyDeveloperSession(parts.join("."), secret, now), false);
  assert.equal(session.verifyDeveloperSession("invalid", secret, now), false);
  assert.equal(session.verifyDeveloperSession(undefined, secret, now), false);
});
