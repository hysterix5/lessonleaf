"use client";

import { useState } from "react";
import { BookOpenText, Plus, Trash2 } from "lucide-react";
import { ErrorAlert } from "@/components/error-alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { weekPresets } from "@/lib/lesson-plan";
import { errorMessage } from "@/lib/feedback";
import type { ClassRecord, CourseInput, CourseOverview, CourseWeek } from "@/lib/catalog";

function blankCourse(classId: string): CourseInput { return { classId, title: "", description: "", weeks: [{ week: 1, topic: "", unit: "", focus: "", activity: "", presentationGoal: "" }] }; }
function blankWeek(week: number): CourseWeek { return { week, topic: "", unit: "", focus: "", activity: "", presentationGoal: "" }; }

function CourseField({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string | number; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return <Label className="field"><span>{label}</span><Input value={value} type={type} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></Label>;
}

export function CoursePanel({ classes, courses, signedIn, onSave, onDelete, onSignIn, onManageClasses }: {
  classes: ClassRecord[];
  courses: CourseOverview[];
  signedIn: boolean;
  onSave: (input: CourseInput, id?: string) => Promise<CourseOverview>;
  onDelete: (id: string) => Promise<void>;
  onSignIn: () => void;
  onManageClasses: () => void;
}) {
  const [selectedClassId, setSelectedClassId] = useState("");
  const activeClassId = selectedClassId || classes[0]?.id || "";
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CourseInput>(() => blankCourse(""));
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const visibleCourses = courses.filter((course) => course.classId === activeClassId);

  function newCourse(classId = activeClassId) { setEditingId(null); setDraft(blankCourse(classId)); setConfirmId(null); setFormError(null); }
  function selectClass(classId: string) { setSelectedClassId(classId); newCourse(classId); setListError(null); }
  function edit(course: CourseOverview) {
    setEditingId(course.id);
    setDraft({ classId: course.classId, title: course.title, description: course.description, weeks: course.weeks.map((week) => ({ ...week })) });
    setSelectedClassId(course.classId); setConfirmId(null); setFormError(null);
  }
  function changeWeek(index: number, key: keyof CourseWeek, value: string) {
    setDraft((current) => ({ ...current, weeks: current.weeks.map((week, weekIndex) => weekIndex === index ? { ...week, [key]: key === "week" ? Number(value) : value } : week) })); setFormError(null);
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setFormError(null);
    try { const result = await onSave({ ...draft, classId: activeClassId }, editingId || undefined); setEditingId(result.id); setDraft({ classId: result.classId, title: result.title, description: result.description, weeks: result.weeks }); }
    catch (error) { setFormError(errorMessage(error, "Could not save the course overview.")); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (confirmId !== id) { setConfirmId(id); return; }
    setBusy(true); setListError(null);
    try { await onDelete(id); if (editingId === id) newCourse(); setConfirmId(null); }
    catch (error) { setListError(errorMessage(error, "Could not delete the course overview.")); }
    finally { setBusy(false); }
  }

  return <div className="content workspace-content"><div className="workspace-heading"><div><span className="kicker">TEACHING ROADMAP</span><h1>Course overviews</h1><p>Plan the weekly topics and activities that guide term lesson drafts.</p></div>{signedIn && classes.length > 0 && <Button type="button" className="secondary-button" onClick={() => newCourse()}><Plus size={16} /> New overview</Button>}</div>
    {!signedIn ? <Card className="workspace-empty"><BookOpenText size={28} /><h2>Shape your course</h2><p>Sign in to save weekly overviews for your classes.</p><Button type="button" className="primary-button" onClick={onSignIn}>Sign in to continue</Button></Card> : classes.length === 0 ? <Card className="workspace-empty"><BookOpenText size={28} /><h2>Create a class first</h2><p>Every course overview belongs to a class and can then be used in term schedules.</p><Button type="button" className="primary-button" onClick={onManageClasses}>Set up a class</Button></Card> : <>
      <Label className="field course-class-select"><span>Class</span><select className="native-select" value={activeClassId} onChange={(event) => selectClass(event.target.value)}>{classes.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.grade}</option>)}</select></Label>
      <div className="workspace-grid"><div className="workspace-list"><div className="workspace-list-heading"><strong>Saved overviews</strong><span>{visibleCourses.length}</span></div>{listError && <ErrorAlert title="Could not delete overview" message={listError} />}{visibleCourses.length ? visibleCourses.map((course) => <Card className={`workspace-item ${editingId === course.id ? "selected" : ""}`} key={course.id}><Button type="button" className="workspace-item-main" onClick={() => edit(course)}><span className="workspace-item-icon"><BookOpenText size={19} /></span><span><strong>{course.title}</strong><small>{course.weeks.length} weekly {course.weeks.length === 1 ? "topic" : "topics"}</small><em>{course.description || "Course overview"}</em></span></Button><Button type="button" variant="ghost" className={`item-delete ${confirmId === course.id ? "confirm" : ""}`} onClick={() => remove(course.id)} disabled={busy} aria-label={confirmId === course.id ? `Confirm delete ${course.title}` : `Delete ${course.title}`}><Trash2 size={15} /> {confirmId === course.id ? "Confirm" : ""}</Button></Card>) : <div className="workspace-list-empty">No overview for this class yet. Add weekly topics to guide a term batch.</div>}</div>
      <Card className="workspace-editor"><div className="workspace-editor-heading"><span className="editor-symbol"><BookOpenText size={19} /></span><div><h2>{editingId ? "Edit course overview" : "New course overview"}</h2><p>Give each week a topic, then add guidance for richer drafts.</p></div></div><form onSubmit={save} onChange={() => setFormError(null)}><div className="course-basic-fields"><CourseField label="Overview title" value={draft.title} onChange={(value) => setDraft((current) => ({ ...current, title: value }))} placeholder="e.g. Science · Term 1" /><Label className="field"><span>Course summary</span><Textarea rows={3} value={draft.description} placeholder="What will learners explore this term?" onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} /></Label></div><div className="course-weeks-heading"><div><strong>Weekly outline</strong><p>Each scheduled lesson uses its week’s topic and teaching guidance.</p></div><Button type="button" variant="outline" onClick={() => setDraft((current) => ({ ...current, weeks: [...current.weeks, blankWeek(Math.max(0, ...current.weeks.map((week) => week.week)) + 1)] }))} disabled={draft.weeks.length >= 52}><Plus size={15} /> Add week</Button></div><div className="course-week-list">{draft.weeks.map((week, index) => <div className="course-week" key={`${index}-${editingId || "new"}`}><div className="course-week-top"><span>WEEK {String(week.week || index + 1).padStart(2, "0")}</span><Button type="button" variant="ghost" onClick={() => setDraft((current) => ({ ...current, weeks: current.weeks.filter((_, itemIndex) => itemIndex !== index) }))} aria-label={`Remove week ${week.week}`}><Trash2 size={15} /></Button></div><div className="course-week-fields"><CourseField label="Week no." type="number" value={week.week} onChange={(value) => changeWeek(index, "week", value)} /><CourseField label="Unit" value={week.unit} onChange={(value) => changeWeek(index, "unit", value)} placeholder="Optional" /><div className="span-2"><CourseField label="Topic" value={week.topic} onChange={(value) => changeWeek(index, "topic", value)} placeholder="What will the class study?" /></div><div className="span-2"><CourseField label="Key focus" value={week.focus} onChange={(value) => changeWeek(index, "focus", value)} placeholder="Main ideas and vocabulary" /></div><CourseField label="Activity" value={week.activity} onChange={(value) => changeWeek(index, "activity", value)} placeholder="Hands-on task" /><CourseField label="Presentation goal" value={week.presentationGoal} onChange={(value) => changeWeek(index, "presentationGoal", value)} placeholder="What learners will share" /></div></div>)}</div>{formError && <ErrorAlert title="Could not save overview" message={formError} className="form-error" />}<div className="workspace-form-footer course-actions"><Button type="button" className="secondary-button" onClick={() => setDraft((current) => ({ ...current, weeks: weekPresets.map((week) => ({ week: week.week, topic: week.topic, unit: week.unit, focus: week.keyFocus, activity: week.activityHighlight, presentationGoal: week.presentationGoal })) }))}>Load sample Science sequence</Button><Button type="submit" className="primary-button" disabled={busy}>{busy ? "Saving…" : editingId ? "Save overview" : "Create overview"}</Button></div></form></Card></div>
    </>}
  </div>;
}
