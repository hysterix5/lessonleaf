import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
  type FileChild,
} from "docx";
import type { CourseOverview } from "./catalog";
import type { LessonPlan } from "./lesson-plan";
import type { CoursePlanGroup } from "./lesson-library";
import { displayLessonDate, normalOverviewContent } from "./print-content";
import type { AppSettings } from "./settings";
import type { PrintTemplate } from "../components/lesson-preview";

const border = { style: BorderStyle.SINGLE, size: 5, color: "5A6469" };
const borders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
const noBorder = { style: BorderStyle.NIL };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder };
const cellMargins = { top: 95, bottom: 95, left: 115, right: 115 };

function paragraph(text: string, bold = false, size = 18): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold, size, font: "Arial", color: "1F2933" })],
    spacing: { after: 0 },
  });
}

function textParagraphs(value: string | string[]): Paragraph[] {
  const lines = (Array.isArray(value) ? value.flatMap((item) => item.split(/\r?\n/)) : value.split(/\r?\n/))
    .map((line) => line.trim()).filter(Boolean);
  return lines.length ? lines.map((line) => paragraph(line)) : [paragraph("")];
}

function cell(value: string, label = false): TableCell {
  return new TableCell({
    children: [paragraph(value || "—", label)],
    margins: cellMargins,
  });
}

function detailsTable(plan: LessonPlan): Table {
  const rows: [string, string, string, string][] = [
    ["Subject", plan.subject, "Level", plan.grade],
    ["Date", displayLessonDate(plan.date), "Duration", `${plan.duration} minutes`],
    ["Chapter", plan.chapter, "Unit", plan.unit],
    ["Resource", plan.resource, "Pages", plan.pages],
  ];
  if (plan.className || (plan.category && !["Regular", "General"].includes(plan.category))) {
    rows.push(["Class", plan.className || "—", "Category", plan.category || "—"]);
  }
  return new Table({
    rows: rows.map((row) => new TableRow({ children: row.map((value, index) => cell(value, index % 2 === 0)) })),
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [1400, 3986, 1400, 3986],
    layout: TableLayoutType.FIXED,
    borders,
  });
}

function contentSection(title: string, value: string | string[]): Table | null {
  if (Array.isArray(value) ? value.length === 0 : !value.trim()) return null;
  return new Table({
    rows: [
      new TableRow({ children: [new TableCell({ children: [paragraph(title, true)], margins: cellMargins })] }),
      new TableRow({ children: [new TableCell({ children: textParagraphs(value), margins: cellMargins })] }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders,
  });
}

function heading(text: string, size = 28, after = 110): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size, font: "Arial", color: "141D22" })],
    alignment: AlignmentType.CENTER,
    spacing: { after },
  });
}

function logoHeader(logo: ImageRun | null): FileChild[] {
  const children: FileChild[] = [];
  if (logo) children.push(new Paragraph({ children: [logo], alignment: AlignmentType.CENTER, spacing: { after: 120 } }));
  return children;
}

function footer(preparedBy: string, schoolAndYear: string): FileChild[] {
  return [
    new Paragraph({ spacing: { before: 210, after: 0 } }),
    new Table({
      rows: [new TableRow({ children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: preparedBy, bold: true, size: 18, font: "Arial" })] })], margins: { top: 0, bottom: 0, left: 0, right: 0 } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: schoolAndYear, bold: true, size: 18, font: "Arial" })], alignment: AlignmentType.RIGHT })], margins: { top: 0, bottom: 0, left: 0, right: 0 } }),
      ] })],
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [5386, 5386],
      borders: noBorders,
    }),
  ];
}

function lessonChildren(plan: LessonPlan, settings: AppSettings, logo: ImageRun | null): FileChild[] {
  const sections: [string, string | string[]][] = [
    ["Core Goal", plan.coreGoal],
    ["Learning Objectives", plan.objectives],
    ["Target Vocabulary", plan.vocabulary.join(", ")],
    ["Language Focus", plan.languageFocus],
    ["Materials & Resources", plan.materials],
    ["Warm-Up", plan.warmUp],
    ["Lesson Procedure", plan.lessonProcedure],
    ["Teacher Actions", plan.teacherActions],
    ["Student Actions", plan.studentActions],
    ["Activity / Project", plan.activity],
    ["Presentation / Discussion", plan.presentation],
    ["Assessment / Wrap-Up", plan.assessment],
    ["Homework", plan.homework],
    ["Multimedia Links", plan.multimediaLinks],
    ["Notes", plan.notes],
  ];
  const children: FileChild[] = [
    ...logoHeader(logo),
    heading(`Lesson Plan - ${plan.grade} - ${plan.schoolYear}`),
    heading(`${plan.subject}${plan.section ? ` - ${plan.section}` : ""} • Week ${plan.week} • ${plan.topic}`, 22, 260),
    detailsTable(plan),
  ];
  for (const [title, value] of sections) {
    const section = contentSection(title, value);
    if (section) {
      children.push(new Paragraph({ spacing: { after: 70 } }));
      children.push(section);
    }
  }
  const preparedBy = plan.preparedBy || settings.teacherName;
  children.push(...footer(preparedBy ? `Prepared By: ${preparedBy}` : "", `${settings.schoolName}${settings.schoolName && plan.schoolYear ? " • " : ""}${plan.schoolYear}`));
  return children;
}

function overviewTable(course: CourseOverview): Table {
  const header = ["Week", "Unit / Topic", "Key Focus", "Activity Highlight", "Presentation Goal"];
  const tableCell = (children: Paragraph[]) => new TableCell({
    children,
    margins: cellMargins,
  });
  const rows = [new TableRow({
    children: header.map((label) => new TableCell({ children: [paragraph(label, true)], margins: cellMargins })),
    tableHeader: true,
    cantSplit: true,
  })];
  for (const week of course.weeks) {
    const unitAndTopic = [
      ...(week.unit ? [paragraph(week.unit, true)] : []),
      ...(week.topic ? [paragraph(week.topic)] : []),
    ];
    rows.push(new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(week.week), size: 18, font: "Arial" })], alignment: AlignmentType.CENTER })], margins: cellMargins }),
        tableCell(unitAndTopic.length ? unitAndTopic : [paragraph("—")]),
        tableCell([paragraph(week.focus || "—")]),
        tableCell([paragraph(week.activity || "—")]),
        tableCell([paragraph(week.presentationGoal || "—")]),
      ],
      cantSplit: true,
    }));
  }
  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [755, 2450, 2500, 2500, 2567],
    layout: TableLayoutType.FIXED,
    borders,
  });
}

function overviewChildren(course: CourseOverview, plans: LessonPlan[], settings: AppSettings, logo: ImageRun | null): FileChild[] {
  const sample = plans[0];
  const content = normalOverviewContent(course, sample, settings);
  const children: FileChild[] = [
    ...logoHeader(logo),
    heading(content.title),
    heading(content.subtitle, 22, 260),
  ];
  if (content.coreGoal) children.push(new Paragraph({
    children: [new TextRun({ text: "Core Goal: ", bold: true, size: 18, font: "Arial" }), new TextRun({ text: content.coreGoal, size: 18, font: "Arial" })],
    spacing: { after: 210 },
  }));
  children.push(overviewTable(course));
  children.push(...footer(content.preparedBy, content.schoolAndYear));
  return children;
}

function styledBrand(settings: AppSettings, schoolYear: string, logo: ImageRun | null): FileChild[] {
  const brand = new Paragraph({
    children: [
      new TextRun({ text: settings.applicationTitle, bold: true, size: 15, font: "Arial", color: "2A9176" }),
      new TextRun({ text: `  •  ${schoolYear}`, size: 15, font: "Arial", color: "70877C" }),
    ],
    spacing: { after: settings.schoolName ? 70 : 0 },
  });
  const school = settings.schoolName ? [new Paragraph({ children: [new TextRun({ text: settings.schoolName, bold: true, size: 15, font: "Arial", color: "6F837E" })] })] : [];
  if (!logo) return [brand, ...school];
  return [new Table({
    rows: [new TableRow({ children: [
      new TableCell({ children: [new Paragraph({ children: [logo] })], margins: { top: 0, bottom: 0, left: 0, right: 110 } }),
      new TableCell({ children: [brand, ...school], margins: { top: 0, bottom: 0, left: 0, right: 0 } }),
    ] })],
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [1120, 9652],
    borders: noBorders,
  })];
}

function styledTitle(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 38, font: "Georgia", color: "213D42" })],
    spacing: { before: 160, after: 110 },
  });
}

function styledMeta(items: string[]): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: items.filter(Boolean).join("   •   "), size: 15, font: "Arial", color: "6F837E" })],
    spacing: { after: 170 },
  });
}

function styledRule(): Paragraph {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: "CBE9D3" } },
    spacing: { after: 210 },
  });
}

function styledBlock(title: string, value: string | string[], inline = false): FileChild[] {
  if (Array.isArray(value) ? value.length === 0 : !value.trim()) return [];
  const text = Array.isArray(value) && inline ? value.join(" • ") : value;
  const children: FileChild[] = [new Paragraph({
    children: [new TextRun({ text: title.toUpperCase(), bold: true, size: 15, font: "Arial", color: "237D69" })],
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: "EEF2EF" } },
    spacing: { before: 150, after: 70 },
  })];
  if (Array.isArray(text)) {
    for (const item of text) children.push(new Paragraph({
      children: [new TextRun({ text: item, size: 16, font: "Arial", color: "526662" })],
      bullet: { level: 0 },
      spacing: { after: 65 },
    }));
  } else {
    for (const line of text.split(/\r?\n/)) children.push(new Paragraph({
      children: [new TextRun({ text: line, size: 16, font: "Arial", color: "526662" })],
      spacing: { after: 45 },
    }));
  }
  return children;
}

function styledDetails(plan: LessonPlan): Table {
  const detailCell = (title: string, value: string) => new TableCell({
    children: [
      new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 12, font: "Arial", color: "9AADA7" })], spacing: { after: 55 } }),
      new Paragraph({ children: [new TextRun({ text: value || "—", size: 15, font: "Arial", color: "536A67" })] }),
    ],
    margins: { top: 0, bottom: 0, left: 0, right: 110 },
  });
  return new Table({
    rows: [new TableRow({ children: [
      detailCell("CHAPTER / UNIT", [plan.chapter, plan.unit].filter(Boolean).join(" • ")),
      detailCell("RESOURCE / PAGES", [plan.resource, plan.pages].filter(Boolean).join(" • ")),
    ] })],
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [5386, 5386],
    borders: noBorders,
  });
}

function styledLessonChildren(plan: LessonPlan, settings: AppSettings, logo: ImageRun | null): FileChild[] {
  const children: FileChild[] = [
    ...styledBrand(settings, plan.schoolYear, logo),
    styledTitle(plan.topic),
    styledMeta([
      `${plan.subject} • ${plan.grade}${plan.section ? ` – ${plan.section}` : ""}`,
      `Week ${plan.week}${plan.date ? ` • ${plan.date}` : ""}`,
      `${plan.duration} minutes`,
      plan.category && plan.category !== "General" ? plan.category : "",
      plan.className || "",
    ]),
    styledRule(),
    styledDetails(plan),
  ];
  const blocks: [string, string | string[], boolean?][] = [
    ["Core goal", plan.coreGoal], ["Learning objectives", plan.objectives],
    ["Target vocabulary", plan.vocabulary, true], ["Language focus", plan.languageFocus],
    ["Materials & resources", plan.materials], ["Warm-up", plan.warmUp],
    ["Lesson procedure", plan.lessonProcedure], ["Teacher actions", plan.teacherActions],
    ["Student actions", plan.studentActions], ["Activity / project", plan.activity],
    ["Presentation / discussion", plan.presentation], ["Assessment / wrap-up", plan.assessment],
    ["Homework", plan.homework], ["Multimedia links", plan.multimediaLinks], ["Notes", plan.notes],
  ];
  for (const [title, value, inline] of blocks) children.push(...styledBlock(title, value, inline));
  const preparedBy = plan.preparedBy || settings.teacherName;
  if (preparedBy) children.push(new Paragraph({ children: [new TextRun({ text: `Prepared by: ${preparedBy}`, size: 15, font: "Arial", color: "6C807C" })], spacing: { before: 220 } }));
  return children;
}

function styledOverviewChildren(course: CourseOverview, plans: LessonPlan[], settings: AppSettings, logo: ImageRun | null): FileChild[] {
  const sample = plans[0];
  const schoolYear = sample?.schoolYear || settings.schoolYear;
  const children: FileChild[] = [
    ...styledBrand(settings, schoolYear, logo),
    styledTitle("Overview of Course Content"),
    styledMeta([course.title, sample ? `${sample.subject} • ${sample.grade}${sample.section ? ` – ${sample.section}` : ""}` : "", sample?.className || ""]),
    styledRule(),
    ...styledBlock("Core goal", course.description),
    new Paragraph({ children: [new TextRun({ text: "WEEKLY OUTLINE", bold: true, size: 15, font: "Arial", color: "237D69" })], spacing: { before: 170, after: 80 } }),
    overviewTable(course),
  ];
  const preparedBy = sample?.preparedBy || settings.teacherName;
  if (preparedBy) children.push(new Paragraph({ children: [new TextRun({ text: `Prepared by: ${preparedBy}`, size: 15, font: "Arial", color: "6C807C" })], spacing: { before: 220 } }));
  return children;
}

function courseCaption(group: CoursePlanGroup, index: number): Table {
  const line = { style: BorderStyle.SINGLE, size: 5, color: "BDCFC3" };
  return new Table({
    rows: [new TableRow({ children: [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: group.title, bold: true, size: 16, font: "Arial", color: "4A6658" })] })], margins: { top: 0, bottom: 80, left: 0, right: 0 } }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${index + 1} / ${group.plans.length}`, bold: true, size: 16, font: "Arial", color: "4A6658" })], alignment: AlignmentType.RIGHT })], margins: { top: 0, bottom: 80, left: 0, right: 0 } }),
    ] })],
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [8000, 2772],
    borders: { ...noBorders, bottom: line },
  });
}

function documentFor(children: FileChild[]): Document {
  return new Document({
    creator: "Lessonleaf",
    title: "Lesson plan",
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 567, right: 567, bottom: 567, left: 567 } } },
      children,
    }],
  });
}

export function buildLessonDocx(plan: LessonPlan, settings: AppSettings, logo: ImageRun | null = null, template: PrintTemplate = "normal"): Document {
  return documentFor(template === "normal" ? lessonChildren(plan, settings, logo) : styledLessonChildren(plan, settings, logo));
}

export function buildCourseDocx(group: CoursePlanGroup, settings: AppSettings, logo: ImageRun | null = null, template: PrintTemplate = "normal"): Document {
  const children: FileChild[] = group.course
    ? template === "normal" ? overviewChildren(group.course, group.plans, settings, logo) : styledOverviewChildren(group.course, group.plans, settings, logo)
    : [];
  group.plans.forEach((plan, index) => {
    if (group.course || index > 0) children.push(new Paragraph({ pageBreakBefore: true }));
    children.push(courseCaption(group, index));
    children.push(...(template === "normal" ? lessonChildren(plan, settings, logo) : styledLessonChildren(plan, settings, logo)));
  });
  return documentFor(children);
}

async function logoImage(logoUrl: string | null): Promise<ImageRun | null> {
  if (!logoUrl) return null;
  const image = new Image();
  image.src = logoUrl;
  await image.decode();
  const scale = Math.min(68 / image.naturalWidth, 68 / image.naturalHeight);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare the school logo.");
  context.drawImage(image, 0, 0, width, height);
  const png = canvas.toDataURL("image/png").split(",")[1];
  const bytes = Uint8Array.from(atob(png), (character) => character.charCodeAt(0));
  return new ImageRun({ type: "png", data: bytes, transformation: { width, height }, altText: { title: "School logo", description: "School logo", name: "School logo" } });
}

function fileName(value: string): string {
  return `Lessonleaf - ${value.replace(/[<>:"/\\|?*\x00-\x1f]/g, " ").replace(/\s+/g, " ").trim().replace(/[. ]+$/, "").slice(0, 75) || "lesson plan"}.docx`;
}

async function download(documentFile: Document, name: string): Promise<void> {
  const blob = await Packer.toBlob(documentFile);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName(name);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadLessonDocx(plan: LessonPlan, settings: AppSettings, logoUrl: string | null, template: PrintTemplate): Promise<void> {
  await download(buildLessonDocx(plan, settings, await logoImage(logoUrl), template), plan.topic);
}

export async function downloadCourseDocx(group: CoursePlanGroup, settings: AppSettings, logoUrl: string | null, template: PrintTemplate): Promise<void> {
  await download(buildCourseDocx(group, settings, await logoImage(logoUrl), template), group.title);
}
