import type { ReactNode } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { CourseOverview } from "@/lib/catalog";
import type { LessonPlan } from "@/lib/lesson-plan";
import type { AppSettings } from "@/lib/settings";
import styles from "./lesson-preview.module.css";

export type PrintTemplate = "normal" | "styled";

function PreviewBlock({ title, text }: { title: string; text: string }) {
  return text ? <section className="preview-block"><h3>{title}</h3><p>{text}</p></section> : null;
}

function PreviewList({ title, items, inline = false }: { title: string; items: string[]; inline?: boolean }) {
  return items.length ? <section className="preview-block"><h3>{title}</h3>{inline ? <p>{items.join(" · ")}</p> : <ul>{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>}</section> : null;
}

function StyledTemplate({ plan, settings, logoUrl, eagerImages }: { plan: LessonPlan; settings: AppSettings; logoUrl: string | null; eagerImages: boolean }) {
  return <Card className="paper-preview">
    <div className="paper-brand">
      {logoUrl && <Image src={logoUrl} alt={`${settings.schoolName || "School"} logo`} width={64} height={64} className="paper-logo" loading={eagerImages ? "eager" : "lazy"} unoptimized />}
      <div className="paper-brand-text"><div className="paper-top">{settings.applicationTitle} <span>• {plan.schoolYear}</span></div>
        {settings.schoolName && <div className="paper-school">{settings.schoolName}</div>}
      </div>
    </div>
    <h2>{plan.topic}</h2>
    <div className="paper-meta"><span>{plan.subject} · {plan.grade}{plan.section ? ` – ${plan.section}` : ""}</span><span>Week {plan.week}{plan.date ? ` · ${plan.date}` : ""}</span><span>{plan.duration} minutes</span>{plan.category && plan.category !== "General" && <span>{plan.category}</span>}{plan.className && <span>{plan.className}</span>}</div>
    <Separator className="paper-rule" />
    <div className="paper-details"><div><small>CHAPTER / UNIT</small>{[plan.chapter, plan.unit].filter(Boolean).join(" · ") || "—"}</div><div><small>RESOURCE / PAGES</small>{[plan.resource, plan.pages].filter(Boolean).join(" · ") || "—"}</div></div>
    <PreviewBlock title="Core goal" text={plan.coreGoal} />
    <PreviewList title="Learning objectives" items={plan.objectives} />
    <PreviewList title="Target vocabulary" items={plan.vocabulary} inline />
    <PreviewBlock title="Language focus" text={plan.languageFocus} />
    <PreviewList title="Materials & resources" items={plan.materials} />
    <PreviewBlock title="Warm-up" text={plan.warmUp} />
    <PreviewBlock title="Lesson procedure" text={plan.lessonProcedure} />
    <PreviewBlock title="Teacher actions" text={plan.teacherActions} />
    <PreviewBlock title="Student actions" text={plan.studentActions} />
    <PreviewBlock title="Activity / project" text={plan.activity} />
    <PreviewBlock title="Presentation / discussion" text={plan.presentation} />
    <PreviewBlock title="Assessment / wrap-up" text={plan.assessment} />
    <PreviewBlock title="Homework" text={plan.homework} />
    <PreviewList title="Multimedia links" items={plan.multimediaLinks} />
    <PreviewBlock title="Notes" text={plan.notes} />
    {(plan.preparedBy || settings.teacherName) && <div className="prepared">Prepared by: {plan.preparedBy || settings.teacherName}</div>}
  </Card>;
}

function NormalSection({ title, children, visible = true }: { title: string; children: ReactNode; visible?: boolean }) {
  if (!visible) return null;
  return <section className={styles.section}><h3>{title}</h3><div className={styles.sectionBody}>{children}</div></section>;
}

function NormalLines({ items }: { items: string[] }) {
  return <div className={styles.lines}>{items.map((item, index) => <p key={`${index}-${item}`}>{item}</p>)}</div>;
}

function displayDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || "—";
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function NormalTemplate({ plan, settings, logoUrl, eagerImages }: { plan: LessonPlan; settings: AppSettings; logoUrl: string | null; eagerImages: boolean }) {
  return <article className={styles.normal}>
    <header className={styles.header}>
      {logoUrl && <Image src={logoUrl} alt={`${settings.schoolName || "School"} logo`} width={64} height={64} className={styles.logo} loading={eagerImages ? "eager" : "lazy"} unoptimized />}
      <h2>Lesson Plan - {plan.grade} - {plan.schoolYear}</h2>
      <p>{plan.subject}{plan.section ? ` - ${plan.section}` : ""} • Week {plan.week} • {plan.topic}</p>
    </header>

    <table className={styles.details} aria-label="Lesson details"><colgroup><col className={styles.labelColumn} /><col /><col className={styles.labelColumn} /><col /></colgroup><tbody>
      <tr><th scope="row">Subject</th><td>{plan.subject}</td><th scope="row">Level</th><td>{plan.grade}</td></tr>
      <tr><th scope="row">Date</th><td>{displayDate(plan.date)}</td><th scope="row">Duration</th><td>{plan.duration} minutes</td></tr>
      <tr><th scope="row">Chapter</th><td>{plan.chapter || "—"}</td><th scope="row">Unit</th><td>{plan.unit || "—"}</td></tr>
      <tr><th scope="row">Resource</th><td>{plan.resource || "—"}</td><th scope="row">Pages</th><td>{plan.pages || "—"}</td></tr>
      {(plan.className || (plan.category && plan.category !== "Regular" && plan.category !== "General")) && <tr><th scope="row">Class</th><td>{plan.className || "—"}</td><th scope="row">Category</th><td>{plan.category || "—"}</td></tr>}
    </tbody></table>

    <div className={styles.sections}>
      <NormalSection title="Core Goal" visible={!!plan.coreGoal}>{plan.coreGoal}</NormalSection>
      <NormalSection title="Learning Objectives" visible={plan.objectives.length > 0}><NormalLines items={plan.objectives} /></NormalSection>
      <NormalSection title="Target Vocabulary" visible={plan.vocabulary.length > 0}>{plan.vocabulary.join(", ")}</NormalSection>
      <NormalSection title="Language Focus" visible={!!plan.languageFocus}>{plan.languageFocus}</NormalSection>
      <NormalSection title="Materials & Resources" visible={plan.materials.length > 0}><NormalLines items={plan.materials} /></NormalSection>
      <NormalSection title="Warm-Up" visible={!!plan.warmUp}>{plan.warmUp}</NormalSection>
      <NormalSection title="Lesson Procedure" visible={!!plan.lessonProcedure}>{plan.lessonProcedure}</NormalSection>
      <NormalSection title="Teacher Actions" visible={!!plan.teacherActions}>{plan.teacherActions}</NormalSection>
      <NormalSection title="Student Actions" visible={!!plan.studentActions}>{plan.studentActions}</NormalSection>
      <NormalSection title="Activity / Project" visible={!!plan.activity}>{plan.activity}</NormalSection>
      <NormalSection title="Presentation / Discussion" visible={!!plan.presentation}>{plan.presentation}</NormalSection>
      <NormalSection title="Assessment / Wrap-Up" visible={!!plan.assessment}>{plan.assessment}</NormalSection>
      <NormalSection title="Homework" visible={!!plan.homework}>{plan.homework}</NormalSection>
      <NormalSection title="Multimedia Links" visible={plan.multimediaLinks.length > 0}><NormalLines items={plan.multimediaLinks} /></NormalSection>
      <NormalSection title="Notes" visible={!!plan.notes}>{plan.notes}</NormalSection>
    </div>

    <footer className={styles.footer}><span>{(plan.preparedBy || settings.teacherName) && <>Prepared By: {plan.preparedBy || settings.teacherName}</>}</span><span>{settings.schoolName}{settings.schoolName && plan.schoolYear ? " • " : ""}{plan.schoolYear}</span></footer>
  </article>;
}

export function LessonPreview({ plan, settings, logoUrl, template, eagerImages = false }: { plan: LessonPlan; settings: AppSettings; logoUrl: string | null; template: PrintTemplate; eagerImages?: boolean }) {
  return template === "normal" ? <NormalTemplate plan={plan} settings={settings} logoUrl={logoUrl} eagerImages={eagerImages} /> : <StyledTemplate plan={plan} settings={settings} logoUrl={logoUrl} eagerImages={eagerImages} />;
}

function OverviewTable({ course }: { course: CourseOverview }) {
  return <table className={styles.overviewTable} aria-label="Weekly outline">
    <thead><tr><th>Week</th><th>Unit / Topic</th><th>Key Focus</th><th>Activity Highlight</th><th>Presentation Goal</th></tr></thead>
    <tbody>{course.weeks.map((week) => <tr key={week.week}>
      <td>{week.week}</td>
      <td>{week.unit && <strong>{week.unit}</strong>}{week.unit && week.topic ? <br /> : null}{week.topic}</td>
      <td>{week.focus || "—"}</td>
      <td>{week.activity || "—"}</td>
      <td>{week.presentationGoal || "—"}</td>
    </tr>)}</tbody>
  </table>;
}

function NormalOverview({ course, sample, settings, logoUrl, eagerImages }: { course: CourseOverview; sample: LessonPlan | undefined; settings: AppSettings; logoUrl: string | null; eagerImages: boolean }) {
  const schoolYear = sample?.schoolYear || settings.schoolYear;
  return <article className={styles.normal}>
    <header className={styles.header}>
      {logoUrl && <Image src={logoUrl} alt={`${settings.schoolName || "School"} logo`} width={64} height={64} className={styles.logo} loading={eagerImages ? "eager" : "lazy"} unoptimized />}
      <h2>Lesson Plan - {sample?.grade}{sample?.grade && schoolYear ? " - " : ""}{schoolYear}</h2>
      <p>Overview of Course Content{sample?.subject ? ` • ${sample.subject}` : ""}{sample?.resource ? ` • ${sample.resource}` : ""}</p>
    </header>
    {course.description && <p className={styles.overviewGoal}><strong>Core Goal:</strong> {course.description}</p>}
    <OverviewTable course={course} />
    <footer className={styles.footer}><span>{(sample?.preparedBy || settings.teacherName) && <>Prepared By: {sample?.preparedBy || settings.teacherName}</>}</span><span>{settings.schoolName}{settings.schoolName && schoolYear ? " • " : ""}{schoolYear}</span></footer>
  </article>;
}

function StyledOverview({ course, sample, settings, logoUrl, eagerImages }: { course: CourseOverview; sample: LessonPlan | undefined; settings: AppSettings; logoUrl: string | null; eagerImages: boolean }) {
  const schoolYear = sample?.schoolYear || settings.schoolYear;
  return <Card className="paper-preview">
    <div className="paper-brand">
      {logoUrl && <Image src={logoUrl} alt={`${settings.schoolName || "School"} logo`} width={64} height={64} className="paper-logo" loading={eagerImages ? "eager" : "lazy"} unoptimized />}
      <div className="paper-brand-text"><div className="paper-top">{settings.applicationTitle} <span>• {schoolYear}</span></div>
        {settings.schoolName && <div className="paper-school">{settings.schoolName}</div>}
      </div>
    </div>
    <h2>Overview of Course Content</h2>
    <div className="paper-meta"><span>{course.title}</span>{sample && <span>{sample.subject} · {sample.grade}{sample.section ? ` – ${sample.section}` : ""}</span>}{sample?.className && <span>{sample.className}</span>}</div>
    <Separator className="paper-rule" />
    <PreviewBlock title="Core goal" text={course.description} />
    <section className="preview-block"><h3>Weekly outline</h3><OverviewTable course={course} /></section>
    {(sample?.preparedBy || settings.teacherName) && <div className="prepared">Prepared by: {sample?.preparedBy || settings.teacherName}</div>}
  </Card>;
}

export function CourseOverviewPage({ course, plans, settings, logoUrl, template, eagerImages = false }: { course: CourseOverview; plans: LessonPlan[]; settings: AppSettings; logoUrl: string | null; template: PrintTemplate; eagerImages?: boolean }) {
  const sample = plans[0];
  return template === "normal"
    ? <NormalOverview course={course} sample={sample} settings={settings} logoUrl={logoUrl} eagerImages={eagerImages} />
    : <StyledOverview course={course} sample={sample} settings={settings} logoUrl={logoUrl} eagerImages={eagerImages} />;
}
