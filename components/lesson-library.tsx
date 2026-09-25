"use client";

import { ArrowRight, BookOpen, FileText, Plus, Printer, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ClassRecord, CourseOverview } from "@/lib/catalog";
import type { LessonPlan } from "@/lib/lesson-plan";
import { groupPlansByCourse, searchCourseGroups, type CoursePlanGroup } from "@/lib/lesson-library";
import { LessonPreview, type PrintTemplate } from "./lesson-preview";
import type { AppSettings } from "@/lib/settings";

type LibraryProps = {
  signedIn: boolean;
  plans: LessonPlan[];
  courses: CourseOverview[];
  classes: ClassRecord[];
  query: string;
  onQueryChange: (value: string) => void;
  onNew: () => void;
  onSignIn: () => void;
  onOpen: (plan: LessonPlan) => void;
  onDelete: (id: string) => void;
  confirmDelete: string | null;
  deleting: boolean;
  template: PrintTemplate;
  onTemplateChange: (template: PrintTemplate) => void;
  onPrintCourse: (group: CoursePlanGroup) => void;
};

export function LessonLibrary({ signedIn, plans, courses, classes, query, onQueryChange, onNew, onSignIn, onOpen, onDelete, confirmDelete, deleting, template, onTemplateChange, onPrintCourse }: LibraryProps) {
  const groups = groupPlansByCourse(plans, courses, classes);
  const visibleGroups = searchCourseGroups(groups, query);
  const visibleCount = visibleGroups.reduce((count, group) => count + group.visiblePlans.length, 0);

  return <div className="content library-content">
    <div className="library-header">
      <div><span className="kicker">YOUR WORK</span><h1>My lesson plans</h1><p>Browse your plans by course, then open or print the lessons you need.</p></div>
      <Button type="button" className="primary-button" onClick={onNew}><Plus size={17} aria-hidden="true" /> New lesson plan</Button>
    </div>
    {signedIn && plans.length > 0 && <div className="library-filters">
      <Label className="field"><span>Find a lesson plan</span><Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search course, topic, class, or date" /></Label>
      <span>{visibleCount} of {plans.length} plans</span>
    </div>}
    {!signedIn ? <div className="library-empty"><span className="empty-icon"><BookOpen size={28} aria-hidden="true" /></span><h2>Your plans, all in one place</h2><p>Sign in to save your lessons securely and see them here whenever you return.</p><Button type="button" className="primary-button" onClick={onSignIn}>Sign in to continue <ArrowRight size={17} aria-hidden="true" /></Button></div>
      : plans.length === 0 ? <div className="library-empty"><span className="empty-icon"><FileText size={28} aria-hidden="true" /></span><h2>No plans saved yet</h2><p>Create your first lesson plan and it will appear here.</p><Button type="button" className="primary-button" onClick={onNew}>Build a lesson <ArrowRight size={17} aria-hidden="true" /></Button></div>
      : visibleCount === 0 ? <div className="library-empty"><span className="empty-icon"><FileText size={28} aria-hidden="true" /></span><h2>No matching plans</h2><p>Try another course, topic, class, or date.</p><Button type="button" className="secondary-button" onClick={() => onQueryChange("")}>Clear search</Button></div>
      : <>
        <div className="library-print-options"><div><strong>Course printing</strong><span>Choose a layout, then print every saved plan in a course.</span></div><div className="template-selector"><span>Print template</span><div role="group" aria-label="Course print template"><Button type="button" className={`template-option ${template === "normal" ? "selected" : ""}`} aria-pressed={template === "normal"} onClick={() => onTemplateChange("normal")}>Normal layout</Button><Button type="button" className={`template-option ${template === "styled" ? "selected" : ""}`} aria-pressed={template === "styled"} onClick={() => onTemplateChange("styled")}>Styled layout</Button></div></div></div>
        <div className="library-groups">{visibleGroups.map((group) => <section className="library-course-section" key={group.key} aria-label={group.title}>
          <div className="library-group-heading"><div><span className="kicker">{group.courseId ? "COURSE" : "NO COURSE"}</span><h2>{group.title}</h2><p>{group.className ? `${group.className} · ` : ""}{group.plans.length} {group.plans.length === 1 ? "lesson plan" : "lesson plans"}{group.visiblePlans.length !== group.plans.length ? ` · ${group.visiblePlans.length} shown` : ""}</p></div>
            {group.courseId && <Button type="button" className="secondary-button library-print-button" onClick={() => onPrintCourse(group)} aria-label={`Print all ${group.plans.length} lesson plans in ${group.title}`}><Printer size={16} aria-hidden="true" /> Print all {group.plans.length}</Button>}
          </div>
          <div className="library-grid">{group.visiblePlans.map((item) => <Card className="saved-card" key={item.id}>
            <div className="saved-top"><Badge className={`status ${item.status}`}>{item.status === "ready" ? "Ready to teach" : "Draft"}</Badge><span>WEEK {String(item.week).padStart(2, "0")}</span></div>
            <span className="saved-icon"><BookOpen size={22} aria-hidden="true" /></span><h2>{item.topic}</h2><p>{item.className ? `${item.className} · ` : ""}{item.subject} · {item.grade}{item.section ? ` – ${item.section}` : ""}{item.date ? ` · ${item.date}` : ""}</p>
            <div className="saved-footer"><span>Updated {new Date(item.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span><Button type="button" onClick={() => onOpen(item)}>Open <ArrowRight size={15} aria-hidden="true" /></Button></div>
            <Button type="button" className={`delete-button ${confirmDelete === item.id ? "confirm" : ""}`} disabled={deleting} onClick={() => onDelete(item.id)} aria-label={confirmDelete === item.id ? "Confirm deletion" : "Delete lesson plan"}>{confirmDelete === item.id ? "Confirm delete" : <Trash2 size={16} aria-hidden="true" />}</Button>
          </Card>)}</div>
        </section>)}</div>
      </>}
  </div>;
}

export function CoursePrintDocument({ group, template, settings, logoUrl }: { group: CoursePlanGroup; template: PrintTemplate; settings: AppSettings; logoUrl: string | null }) {
  return <div className="course-print-document" aria-label={`${group.title} printable lesson plans`}>
    {group.plans.map((plan, index) => <div className="course-print-sheet" key={plan.id}>
      <div className="course-print-caption"><span>{group.title}</span><span>{index + 1} / {group.plans.length}</span></div>
      <LessonPreview plan={plan} settings={settings} logoUrl={logoUrl} template={template} eagerImages />
    </div>)}
  </div>;
}
