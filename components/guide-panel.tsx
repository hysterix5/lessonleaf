import type { ReactNode } from "react";
import { ArrowRight, BookOpenText, CircleHelp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import styles from "./guide-panel.module.css";

export type GuideDestination = "builder" | "term" | "classes" | "course" | "library" | "settings";

const sections = [
  { id: "account", title: "Sign in", summary: "Keep your work in your account." },
  { id: "settings", title: "Set your defaults", summary: "Add school and lesson details." },
  { id: "classes", title: "Add a class", summary: "Set its schedule and duration." },
  { id: "course", title: "Outline a course", summary: "Plan topics for each week." },
  { id: "single", title: "Create one lesson", summary: "Draft and refine one plan." },
  { id: "term", title: "Generate a term", summary: "Create a plan for every meeting." },
  { id: "library", title: "Revisit and print", summary: "Find, update, or export plans." },
] as const;

function GuideStep({ number, id, title, children, note, action, onAction }: {
  number: number;
  id: string;
  title: string;
  children: ReactNode;
  note?: ReactNode;
  action?: string;
  onAction?: () => void;
}) {
  return <Card id={`guide-${id}`} className={styles.stepCard}>
    <div className={styles.stepHeader}><span className={styles.stepNumber}>{String(number).padStart(2, "0")}</span><h2>{title}</h2></div>
    <ol className={styles.instructions}>{children}</ol>
    {note && <p className={styles.note}>{note}</p>}
    {action && onAction && <Button type="button" variant="outline" className={styles.stepAction} onClick={onAction}>{action}<ArrowRight size={15} aria-hidden="true" /></Button>}
  </Card>;
}

export function GuidePanel({ signedIn, onNavigate, onSignIn }: {
  signedIn: boolean;
  onNavigate: (destination: GuideDestination) => void;
  onSignIn: () => void;
}) {
  return <div className={styles.root}>
    <div className={styles.intro}>
      <span className="kicker">START HERE</span>
      <div className={styles.introTitle}><span className={styles.introIcon}><CircleHelp size={24} aria-hidden="true" /></span><h1>How to use Lessonleaf</h1></div>
      <p>Follow these steps to build one lesson or a full term of editable plans. You can explore a Smart Template plan before signing in; AI drafting, saving plans, and generating a term require an account.</p>
    </div>

    <nav className={styles.contents} aria-label="Guide steps">
      {sections.map((section, index) => <a key={section.id} href={`#guide-${section.id}`}><span>{String(index + 1).padStart(2, "0")}</span><strong>{section.title}</strong><small>{section.summary}</small></a>)}
    </nav>

    <div className={styles.steps}>
      <GuideStep number={1} id="account" title="Create an account or sign in" action={signedIn ? "Open settings" : "Open sign-in"} onAction={signedIn ? () => onNavigate("settings") : onSignIn} note={<>You can create a single draft without signing in. To save it, use <strong>Save draft</strong> or <strong>Mark ready</strong> and sign in when prompted.</>}>
        <li>Select <strong>Sign in</strong> at the top of the app.</li>
        <li>For a new account, choose <strong>Create account</strong>, enter your email and a password of at least eight characters, and submit. Follow the confirmation email if your school requires it.</li>
        <li>For an existing account, enter your email and password. If you previously used email links or forgot your password, choose <strong>Forgot password?</strong>, follow the reset email, then set a new password in <strong>Settings → Account &amp; password</strong>.</li>
      </GuideStep>

      <GuideStep number={2} id="settings" title="Set your defaults" action="Open settings" onAction={() => onNavigate("settings")} note={<>Settings saved while signed out stay in this browser. After signing in, check and save the values you want in your account. The Drive folder field is reserved for future export support.</>}>
        <li>Open <strong>Settings</strong> and fill in <strong>School &amp; teacher</strong>: application title, school name, school year, teacher name, and default duration.</li>
        <li>Under <strong>Lesson defaults</strong>, enter your usual subject, grade, section, unit, chapter, and resource or textbook.</li>
        <li>Select <strong>Save settings</strong>. New plans and printable previews use these details.</li>
      </GuideStep>

      <GuideStep number={3} id="classes" title="Add a class" action="Open classes" onAction={() => onNavigate("classes")} note={<>A class is optional for a manually entered single plan. Deleting a class also deletes its course overviews.</>}>
        <li>Open <strong>Classes</strong> and enter the class name, subject, grade, school year, and lesson duration. Section is optional.</li>
        <li>Select each <strong>Class meeting day</strong>. For example, Monday and Thursday will make two lessons per week in a term schedule.</li>
        <li>Select <strong>Add class</strong>. To edit it later, select the saved class, update its fields, and choose <strong>Save changes</strong>.</li>
      </GuideStep>

      <GuideStep number={4} id="course" title="Outline a course" action="Open course" onAction={() => onNavigate("course")} note={<>A term schedule needs a topic for every requested week. Science classes can also use the built-in eight-week sample sequence directly in the term generator.</>}>
        <li>Open <strong>Course</strong>, select your class, and enter an overview title. Add a course summary if useful.</li>
        <li>For each week, enter a unique <strong>Week no.</strong> and a <strong>Topic</strong>. Add the unit, key focus, activity, and presentation goal to guide the draft.</li>
        <li>Use <strong>Add week</strong> until the outline covers the term. For a Science curriculum, <strong>Load sample Science sequence</strong> fills weeks 1–8 from the sample PDF.</li>
        <li>Select <strong>Create overview</strong> or <strong>Save overview</strong>.</li>
      </GuideStep>

      <GuideStep number={5} id="single" title="Create one lesson plan" action="Open single plan" onAction={() => onNavigate("builder")} note={<>An unsaved working draft stays in this browser but will not appear in <strong>My lesson plans</strong>. Save changes before choosing <strong>Create a fresh draft</strong>.</>}>
        <li>Open <strong>Generate plans → Single Plan</strong>. Choose a week from the sample sequence, select a saved class and course week, or enter lesson details yourself.</li>
        <li>Check the topic, grade, week, date, duration, and other details. Choose a lesson category and <strong>Generation mode</strong>, then create the draft. AI mode requires sign-in.</li>
        <li>Edit <strong>Goals &amp; resources</strong>, <strong>Teaching flow</strong>, and <strong>Assessment &amp; more</strong>. The preview updates as you work.</li>
        <li>Select <strong>Save draft</strong> to return later, or <strong>Mark ready</strong> when the plan is ready to teach.</li>
      </GuideStep>

      <GuideStep number={6} id="term" title="Generate a term schedule" action="Open term schedule" onAction={() => onNavigate("term")} note={<>Each selected meeting day creates one plan per week, starting on or after the term start date. The plans are saved immediately as editable drafts. AI mode supports up to eight class meetings per batch.</>}>
        <li>Sign in and prepare a class and course overview, or use the sample sequence for a Science class.</li>
        <li>Open <strong>Generate plans → Term Schedule</strong>. Choose the class, lesson category, term start date, number of weeks, and starting week number. You can generate 1–24 weeks at a time, within weeks 1–52.</li>
        <li>Review the meeting days, duration, and school year. Choose <strong>Saved course overview</strong> or, for Science, <strong>Sample Science sequence</strong> as the content source.</li>
        <li>Choose <strong>Smart Template</strong> or <strong>AI draft</strong>. Fix any missing-week message, review the lesson count and dates, then generate the drafts.</li>
      </GuideStep>

      <GuideStep number={7} id="library" title="Find, edit, and print your plans" action="Open my lesson plans" onAction={() => onNavigate("library")} note={<>The sample PDF provides the built-in format and Science topics. Uploading new PDFs and automatic Drive export are not available yet. Review AI drafts before teaching.</>}>
        <li>Open <strong>My lesson plans</strong> to see saved drafts and plans marked <strong>Ready to teach</strong>. Search by topic, class, category, date, or subject.</li>
        <li>Select <strong>Open</strong> to edit a plan, then use <strong>Save draft</strong> or <strong>Mark ready</strong> again to store the changes.</li>
        <li>In <strong>Lesson preview</strong>, choose <strong>Normal layout</strong> (the default, based on the sample PDF) or <strong>Styled layout</strong>. Use the printer icon to print the selected design, or choose <strong>Save as PDF</strong> in your browser&apos;s print dialog.</li>
        <li>Use <strong>New lesson plan</strong> to start again. To remove a saved plan, select its delete icon and then <strong>Confirm delete</strong>.</li>
      </GuideStep>
    </div>

    <div className={styles.reference}><BookOpenText size={20} aria-hidden="true" /><div><strong>Working from the sample lesson plan?</strong><p>Open the reference PDF to compare its eight-week Science outline with your draft.</p></div><a href="/Lesson%20Plan%20sample.pdf" target="_blank" rel="noopener noreferrer">View sample PDF <ExternalLink size={14} aria-hidden="true" /></a></div>
  </div>;
}
