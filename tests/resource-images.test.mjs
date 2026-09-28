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

const { validateResourceImage, maxResourceImageBytes, maxResourceImages } = loadModule("../lib/resource-image-data.ts");
const { generatePlan, parseLessonPlan } = loadModule("../lib/lesson-plan.ts");
const details = { subject: "Science", grade: "Grade 1", section: "", schoolYear: "2026-2027", week: 1,
  topic: "Habitats", date: "", duration: 60, chapter: "", unit: "", resource: "Book", pages: "", preparedBy: "" };

test("resource pictures accept only supported image signatures and sizes", async () => {
  const png = new File([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])], "page.png", { type: "image/png" });
  const jpg = new File([Uint8Array.from([255, 216, 255, 224])], "page.jpg", { type: "image/jpeg" });
  const webp = new File(["RIFF", Uint8Array.from([0, 0, 0, 0]), "WEBP"], "page.webp", { type: "image/webp" });
  assert.equal(await validateResourceImage(png), "png");
  assert.equal(await validateResourceImage(jpg), "jpg");
  assert.equal(await validateResourceImage(webp), "webp");
  await assert.rejects(validateResourceImage(new File(["not an image"], "fake.jpg", { type: "image/jpeg" })), /valid PNG/);
  await assert.rejects(validateResourceImage(new File([new Uint8Array(maxResourceImageBytes + 1)], "large.png", { type: "image/png" })), /5 MB/);
});

test("plans retain valid private picture paths and reject excess or foreign-plan paths", () => {
  const plan = generatePlan(details);
  const userId = crypto.randomUUID();
  const picture = { path: `${userId}/${plan.id}/${crypto.randomUUID()}.png`, name: "Textbook page 8.png" };
  assert.deepEqual(parseLessonPlan(plan).resourceImages, []);
  assert.deepEqual(parseLessonPlan({ ...plan, resourceImages: [picture] }).resourceImages, [picture]);
  assert.throws(() => parseLessonPlan({ ...plan, resourceImages: Array(maxResourceImages + 1).fill(picture) }), /up to 5/);
  assert.throws(() => parseLessonPlan({ ...plan, resourceImages: [{ ...picture, path: `${userId}/${crypto.randomUUID()}/${crypto.randomUUID()}.png` }] }), /valid resource pictures/);
});
