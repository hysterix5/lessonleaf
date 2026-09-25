"use client";

import { useRef, useState } from "react";
import { ArrowRight, BookOpen, CalendarDays, Clock3, GraduationCap, Plus, Search, Trash2 } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ErrorAlert } from "@/components/error-alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WeekdayPicker, weekdays } from "@/components/weekday-picker";
import type { ClassInput, ClassRecord } from "@/lib/catalog";
import type { AppSettings } from "@/lib/settings";
import { errorMessage } from "@/lib/feedback";

function emptyClass(settings: AppSettings): ClassInput {
  return {
    name: "", subject: settings.subject, grade: settings.grade, section: settings.section,
    schoolYear: settings.schoolYear, meetingDays: [2], duration: settings.defaultDuration,
  };
}

function ClassField({ label, value, onChange, type = "text", placeholder, required = false }: {
  label: string; value: string | number; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean;
}) {
  return <Label className="field"><span>{label}{required && <b className="required-mark"> *</b>}</span><Input type={type} value={value} required={required} min={type === "number" ? 10 : undefined} max={type === "number" ? 240 : undefined} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></Label>;
}

export function ClassesPanel({ classes, settings, signedIn, onSave, onDelete, onSignIn }: {
  classes: ClassRecord[];
  settings: AppSettings;
  signedIn: boolean;
  onSave: (input: ClassInput, id?: string) => Promise<ClassRecord>;
  onDelete: (id: string) => Promise<void>;
  onSignIn: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ClassInput>(() => emptyClass(settings));
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);
  const visibleClasses = classes.filter((item) => `${item.name} ${item.subject} ${item.grade} ${item.section}`.toLowerCase().includes(query.trim().toLowerCase()));
  const weeklyMeetings = classes.reduce((total, item) => total + item.meetingDays.length, 0);

  function focusEditor() { editorRef.current?.querySelector("input")?.focus(); }
  function newClass() { setEditingId(null); setDraft(emptyClass(settings)); setConfirmId(null); setFormError(null); focusEditor(); }
  function edit(item: ClassRecord) {
    setEditingId(item.id);
    setDraft({ name: item.name, subject: item.subject, grade: item.grade, section: item.section, schoolYear: item.schoolYear, meetingDays: item.meetingDays, duration: item.duration });
    setConfirmId(null); setFormError(null); focusEditor();
  }
  function change<K extends keyof ClassInput>(key: K, value: ClassInput[K]) { setDraft((current) => ({ ...current, [key]: value })); setFormError(null); }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setFormError(null);
    try { const result = await onSave(draft, editingId || undefined); setEditingId(result.id); }
    catch (error) { setFormError(errorMessage(error, "Could not save the class.")); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (confirmId !== id) { setConfirmId(id); return; }
    setBusy(true); setListError(null);
    try { await onDelete(id); if (editingId === id) newClass(); setConfirmId(null); }
    catch (error) { setListError(errorMessage(error, "Could not delete the class.")); }
    finally { setBusy(false); }
  }

  return (
    <div className="content workspace-content classes-content">
      <div className="workspace-heading">
        <div><span className="kicker">YOUR TEACHING SPACE</span><h1>A place for every class.</h1><p>Your subjects, schedules, and little details. All together, ready for the week.</p></div>
        {signedIn && <Button type="button" className="primary-button" onClick={newClass} disabled={busy}><Plus size={17} aria-hidden="true" /> New class</Button>}
      </div>
      {!signedIn ? (
        <div className="classes-welcome">
          <Card className="classes-welcome-card">
            <span className="welcome-mark"><BrandLogo variant="mark" decorative /></span>
            <span className="kicker">LESS SETUP. MORE TEACHING.</span>
            <h2>Great lessons start with your class.</h2>
            <p>Give every class a home. Save the details once and bring them into your lesson plans and term schedules whenever you need them.</p>
            <Button type="button" className="primary-button" onClick={onSignIn}>Sign in to set up your classes <ArrowRight size={16} aria-hidden="true" /></Button>
          </Card>
          <div className="class-benefits">
            <div><span><GraduationCap size={21} aria-hidden="true" /></span><h3>The details, remembered</h3><p>Keep subjects, grades, and sections together for each class.</p></div>
            <div><span><CalendarDays size={21} aria-hidden="true" /></span><h3>A rhythm for your week</h3><p>Set meeting days and lesson lengths to make scheduling simple.</p></div>
            <div><span><BookOpen size={21} aria-hidden="true" /></span><h3>Ready for the next lesson</h3><p>Use your saved classes to build course overviews and term plans.</p></div>
          </div>
        </div>
      ) : <>
        <div className="class-stats" aria-label="Class summary">
          <div><span className="stat-icon"><GraduationCap size={20} aria-hidden="true" /></span><span><strong>{classes.length}</strong><small>Saved classes</small></span></div>
          <div><span className="stat-icon"><BookOpen size={20} aria-hidden="true" /></span><span><strong>{new Set(classes.map((item) => item.subject.trim().toLowerCase())).size}</strong><small>Subjects</small></span></div>
          <div><span className="stat-icon"><CalendarDays size={20} aria-hidden="true" /></span><span><strong>{weeklyMeetings}</strong><small>Meetings per week</small></span></div>
        </div>
        <div className="workspace-grid">
          <div className="workspace-list">
            <div className="workspace-list-heading"><strong>Your classes</strong><span>{classes.length}</span></div>
            {classes.length > 0 && <Label className="class-search"><Search size={16} aria-hidden="true" /><span className="sr-only">Search classes</span><Input type="search" placeholder="Find a class…" value={query} onChange={(event) => setQuery(event.target.value)} /></Label>}
            {listError && <ErrorAlert title="Could not delete class" message={listError} />}
            {visibleClasses.length ? visibleClasses.map((item) => (
              <Card className={`workspace-item class-item ${editingId === item.id ? "selected" : ""}`} key={item.id}>
                <Button type="button" className="workspace-item-main" aria-pressed={editingId === item.id} disabled={busy} onClick={() => edit(item)}>
                  <span className="workspace-item-icon"><BookOpen size={19} aria-hidden="true" /></span>
                  <span><strong>{item.name}</strong><small>{item.subject} · {item.grade}{item.section ? ` · ${item.section}` : ""}</small></span>
                </Button>
                <div className="class-item-schedule"><span><CalendarDays size={13} aria-hidden="true" />{weekdays.filter((day) => item.meetingDays.includes(day.value)).map((day) => day.label).join(", ")}</span><span><Clock3 size={13} aria-hidden="true" />{item.duration} min</span></div>
                <div className="class-item-footer"><span>{item.schoolYear}</span><div>{confirmId === item.id && <Button type="button" variant="ghost" className="item-delete" disabled={busy} onClick={() => setConfirmId(null)}>Cancel</Button>}<Button type="button" variant="ghost" className={`item-delete ${confirmId === item.id ? "confirm" : ""}`} onClick={() => remove(item.id)} disabled={busy} aria-label={confirmId === item.id ? `Confirm delete ${item.name}` : `Delete ${item.name}`}><Trash2 size={14} aria-hidden="true" /> {confirmId === item.id ? "Confirm" : ""}</Button></div></div>
                {confirmId === item.id && <p className="class-delete-hint">This also deletes this class’s course overviews.</p>}
              </Card>
            )) : <div className="workspace-list-empty"><BookOpen size={24} aria-hidden="true" /><strong>{classes.length ? "No matching classes" : "Your first class starts here"}</strong><p>{classes.length ? "Try another name, subject, or grade." : "Add your class details to get ready for a new term."}</p></div>}
          </div>
          <Card className="workspace-editor" ref={editorRef}>
            <div className="workspace-editor-heading"><span className="editor-symbol"><GraduationCap size={21} aria-hidden="true" /></span><div><h2>{editingId ? "Edit class" : "Add a little structure"}</h2><p>{editingId ? "Keep your class details up to date." : "Set up a class once. Make planning easier every week."}</p></div></div>
            <form onSubmit={save} aria-busy={busy}>
              <fieldset className="class-fieldset" disabled={busy}>
                <legend className="sr-only">Class details</legend>
                <div className="settings-fields">
                  <p className="required-hint span-2"><b className="required-mark">*</b> Required fields</p>
                  <div className="span-2"><ClassField label="Class name" required value={draft.name} onChange={(value) => change("name", value)} placeholder="e.g. Science · Grade 1" /></div>
                  <ClassField label="Subject" required value={draft.subject} onChange={(value) => change("subject", value)} placeholder="e.g. Science" />
                  <ClassField label="Grade level" required value={draft.grade} onChange={(value) => change("grade", value)} placeholder="e.g. Grade 1" />
                  <ClassField label="Section" value={draft.section} onChange={(value) => change("section", value)} placeholder="Optional" />
                  <ClassField label="School year" required value={draft.schoolYear} onChange={(value) => change("schoolYear", value)} />
                  <ClassField label="Lesson duration (minutes)" type="number" required value={draft.duration} onChange={(value) => change("duration", Number(value))} />
                  <div className="span-2 field"><span id="meeting-days-label">Class meeting days <b className="required-mark">*</b></span><div role="group" aria-labelledby="meeting-days-label"><WeekdayPicker value={draft.meetingDays} onChange={(value) => change("meetingDays", value)} /></div><small>Choose the days this class meets each week.</small></div>
                </div>
              </fieldset>
              {formError && <ErrorAlert title="Could not save class" message={formError} className="form-error" />}
              <div className="workspace-form-footer"><Button type="submit" className="primary-button" disabled={busy}>{!editingId && <Plus size={16} aria-hidden="true" />}{busy ? "Saving…" : editingId ? "Save changes" : "Add class"}</Button></div>
            </form>
          </Card>
        </div>
      </>}
    </div>
  );
}
