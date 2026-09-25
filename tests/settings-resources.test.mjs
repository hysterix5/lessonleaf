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

const { defaultSettings, parseSettings, settingsToDetails, validateSettings } = loadModule("../lib/settings.ts");

test("older single-resource settings become one selectable resource", () => {
  const settings = parseSettings({ resource: "  Previous textbook  " });
  assert.deepEqual(settings.resources, ["Previous textbook"]);
  assert.equal(settingsToDetails(settings).resource, "Previous textbook");
});

test("saved resources keep their order and skip blank or duplicate entries", () => {
  const settings = parseSettings({ resources: ["Science book", " science book ", "", "Library guide"] });
  assert.deepEqual(settings.resources, ["Science book", "Library guide"]);
  assert.deepEqual(parseSettings({ resources: [], resource: "Old textbook" }).resources, []);
  assert.deepEqual(validateSettings({ ...defaultSettings, resources: ["  Custom reference  "] }).resources, ["Custom reference"]);
});
