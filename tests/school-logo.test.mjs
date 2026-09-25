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

const { validateSchoolLogoFile, maxSchoolLogoBytes } = loadModule("../lib/school-logo.ts");

test("school logos accept the supported image signatures", async () => {
  const png = new File([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])], "school.png", { type: "image/png" });
  const jpg = new File([Uint8Array.from([255, 216, 255, 224])], "school.jpg", { type: "image/jpeg" });
  const webp = new File(["RIFF", Uint8Array.from([0, 0, 0, 0]), "WEBP"], "school.webp", { type: "image/webp" });
  assert.equal(await validateSchoolLogoFile(png), "png");
  assert.equal(await validateSchoolLogoFile(jpg), "jpg");
  assert.equal(await validateSchoolLogoFile(webp), "webp");
});

test("school logos reject unsupported, mislabeled, and oversized files", async () => {
  const svg = new File(["<svg></svg>"], "school.svg", { type: "image/svg+xml" });
  const disguised = new File(["not an image"], "school.png", { type: "image/png" });
  const large = new File([new Uint8Array(maxSchoolLogoBytes + 1)], "school.png", { type: "image/png" });
  await assert.rejects(validateSchoolLogoFile(svg), /PNG, JPG, or WebP/);
  await assert.rejects(validateSchoolLogoFile(disguised), /valid PNG, JPG, or WebP/);
  await assert.rejects(validateSchoolLogoFile(large), /smaller than 2 MB/);
});
