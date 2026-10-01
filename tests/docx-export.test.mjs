import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import JSZip from "jszip";

const loadModule = createRequire(import.meta.url);
const { ImageRun, Packer } = loadModule("docx");
loadModule.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  module._compile(output, filename);
};

const { buildLessonDocx, buildCourseDocx } = loadModule("../lib/docx-export.ts");
const settings = { applicationTitle: "Lessonleaf", schoolName: "Maple School", teacherName: "Ms. Cruz", schoolYear: "2026–2027" };
const lesson = (topic, date, week) => ({
  topic, date, week, id: `${week}`, subject: "Science", grade: "Grade 1", section: "A", schoolYear: "2026–2027",
  duration: 60, chapter: "Living Things", unit: "Plants", resource: "Science textbook", pages: "12–13",
  className: "Science A", category: "Regular", coreGoal: `Understand ${topic}`, keyFocus: "Observe nature",
  objectives: ["Identify parts", "Explain their function"], vocabulary: ["root", "stem"], languageFocus: "I observe…",
  materials: ["Leaves", "Notebook"], warmUp: "Show a leaf.", lessonProcedure: "1. Observe a leaf.\n2. Discuss findings.",
  teacherActions: "Guide groups.", studentActions: "Share findings.", activity: "Draw a plant.",
  presentation: "Describe the drawing.", assessment: "Exit ticket", homework: "Find a plant.",
  multimediaLinks: ["https://example.com/plant"], notes: "Check materials.", preparedBy: "Ms. Cruz",
});

async function documentXml(doc) {
  const bytes = await Packer.toBuffer(doc);
  assert.equal(bytes.subarray(0, 2).toString(), "PK");
  const zip = await JSZip.loadAsync(bytes);
  assert.ok(zip.file("[Content_Types].xml"));
  return zip.file("word/document.xml").async("string");
}

test("Word export creates an editable lesson document with all key content", async () => {
  const xml = await documentXml(buildLessonDocx(lesson("Plant parts", "2026-10-01", 1), settings));
  for (const text of ["Maple School", "Plant parts", "Learning Objectives", "Identify parts", "Lesson Procedure", "Observe a leaf.", "Assessment / Wrap-Up", "Exit ticket", "Ms. Cruz"]) {
    assert.ok(xml.includes(text), `Missing ${text}`);
  }
  assert.ok(xml.includes("<w:tbl>"), "Lesson details and sections should be editable Word tables");
  assert.ok(!xml.includes("Key Focus"), "Normal Word layout should have the same sections as normal PDF print");
  assert.match(xml, /<w:pgSz[^>]*w:w="11906"[^>]*w:h="16838"/);
  assert.match(xml, /<w:pgMar[^>]*w:top="567"[^>]*w:right="567"[^>]*w:bottom="567"[^>]*w:left="567"/);
});

test("normal course Word overview matches the printable table and includes all lessons in order", async () => {
  const first = lesson("Seeds", "2026-10-01", 1);
  const second = lesson("Flowers", "2026-10-08", 2);
  const group = {
    key: "course-1", courseId: "course-1", title: "English 1", className: "Science A",
    course: { title: "Plants", description: "Explore living things", weeks: [{ week: 1, unit: "Plants", topic: "Seeds", focus: "Growth", activity: "Plant seeds", presentationGoal: "Describe growth" }] },
    plans: [first, second],
  };
  const xml = await documentXml(buildCourseDocx(group, settings));
  const overview = xml.split("<w:pageBreakBefore")[0];
  assert.ok(overview.includes("Lesson Plan - Grade 1 - 2026–2027"));
  assert.ok(overview.includes("Overview of Course Content • Science • Science textbook"));
  assert.ok(xml.includes("Explore living things"));
  for (const heading of ["Week", "Unit / Topic", "Key Focus", "Activity Highlight", "Presentation Goal"]) assert.ok(overview.includes(heading));
  assert.ok(overview.includes("w:tblHeader"), "Weekly column labels should repeat if the overview spans pages");
  assert.ok(overview.includes('w:gridCol w:w="755"'), "The overview should use the five-column print layout");
  assert.ok(overview.includes("Growth") && overview.includes("Plant seeds") && overview.includes("Describe growth"));
  assert.ok(overview.includes("Maple School • 2026–2027"));
  assert.ok(!overview.includes("English 1"), "The normal PDF overview does not show the course title");
  assert.ok(xml.indexOf("Overview of Course Content") < xml.indexOf("Seeds"));
  assert.ok(xml.indexOf("Seeds") < xml.indexOf("Flowers"));
  assert.equal((xml.match(/w:pageBreakBefore/g) || []).length, 2);
});

test("styled Word export follows the styled preview's overview and lesson sections", async () => {
  const group = {
    key: "course-1", courseId: "course-1", title: "English 1", className: "Science A",
    course: { title: "English 1", description: "Language basics", weeks: [{ week: 1, unit: "", topic: "Pronouns", focus: "", activity: "", presentationGoal: "" }] },
    plans: [lesson("Pronouns", "2026-10-01", 1)],
  };
  const xml = await documentXml(buildCourseDocx(group, settings, null, "styled"));
  const overview = xml.split("<w:pageBreakBefore")[0];
  assert.ok(overview.includes("Overview of Course Content"));
  assert.ok(overview.includes("English 1"));
  assert.ok(overview.includes("WEEKLY OUTLINE"));
  assert.ok(xml.includes("CHAPTER / UNIT"));
  assert.ok(xml.includes("RESOURCE / PAGES"));
  assert.ok(!xml.includes("Lesson Plan - Grade 1"));
});

test("school logo is embedded in a course Word document", async () => {
  const logo = new ImageRun({
    type: "png",
    data: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/+n8AAAAASUVORK5CYII=", "base64"),
    transformation: { width: 40, height: 40 },
  });
  const group = { key: "course-1", courseId: "course-1", title: "Plants", className: "Science A", course: null, plans: [lesson("Seeds", "2026-10-01", 1), lesson("Flowers", "2026-10-08", 2)] };
  const zip = await JSZip.loadAsync(await Packer.toBuffer(buildCourseDocx(group, settings, logo)));
  assert.ok(zip.file(/word\/media\/.*\.png$/).length > 0, Object.keys(zip.files).filter((name) => name.includes("media")).join(", "));
  const xml = await zip.file("word/document.xml").async("string");
  assert.equal((xml.match(/<w:drawing>/g) || []).length, 2);
});
