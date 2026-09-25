"use client";

import { useState } from "react";
import { CalendarRange, ChevronRight, Sparkles } from "lucide-react";
import { ErrorAlert } from "@/components/error-alert";
import { GenerationModeSelect, type GenerationMode } from "@/components/generation-mode-select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResourceSelect } from "@/components/resource-select";
import { WeekdayPicker, weekdays } from "@/components/weekday-picker";
import { createTermMeetings, type ContentSource, type TermScheduleInput } from "@/lib/term-schedule";
import { weekPresets } from "@/lib/lesson-plan";
import { errorMessage } from "@/lib/feedback";
import { maxAiTermPlans } from "@/lib/ai-content";
import type { ClassRecord, CourseOverview } from "@/lib/catalog";
import type { AppSettings } from "@/lib/settings";

function TermField({ label, value, onChange, type = "text", placeholder, required = false, min, max }: {
  label: string; value: string | number; onChange: (value: string) => void; type?: string;
  placeholder?: string; required?: boolean; min?: number; max?: number;
}) {
  return <Label className="field"><span>{label}{required && <b className="required-mark"> *</b>}</span><Input type={type} value={value} placeholder={placeholder} required={required} min={min} max={max} onChange={(event) => onChange(event.target.value)} /></Label>;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function TermSchedulePanel({ classes, courses, settings, signedIn, onGenerate, onSignIn, onManageClasses, onManageCourse }: {
  classes: ClassRecord[];
  courses: CourseOverview[];
  settings: AppSettings;
  signedIn: boolean;
  onGenerate: (input: TermScheduleInput, mode: GenerationMode) => Promise<void>;
  onSignIn: () => void;
  onManageClasses: () => void;
  onManageCourse: () => void;
}) {
  const [classId, setClassId] = useState("");
  const selectedClass = classes.find((item) => item.id === classId) || classes[0];
  const availableCourses = courses.filter((item) => item.classId === selectedClass?.id);
  const [overviewId, setOverviewId] = useState("");
  const overview = availableCourses.find((item) => item.id === overviewId) || availableCourses[0];
  const [category, setCategory] = useState("");
  const [schoolYear, setSchoolYear] = useState<string | null>(null);
  const [termStart, setTermStart] = useState("");
  const [numberOfWeeks, setNumberOfWeeks] = useState(8);
  const [startingWeek, setStartingWeek] = useState(1);
  const [duration, setDuration] = useState<number | null>(null);
  const [meetingDays, setMeetingDays] = useState<number[] | null>(null);
  const [contentSource, setContentSource] = useState<ContentSource | null>(null);
  const [chapter, setChapter] = useState("");
  const [unit, setUnit] = useState("");
  const [resource, setResource] = useState<string | null>(null);
  const [resourcePickerRevision, setResourcePickerRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [generationMode, setGenerationMode] = useState<GenerationMode>("template");
  const [formError, setFormError] = useState<string | null>(null);
  const effectiveDays = meetingDays ?? selectedClass?.meetingDays ?? [];
  const effectiveDuration = duration ?? selectedClass?.duration ?? settings.defaultDuration;
  const effectiveYear = schoolYear ?? selectedClass?.schoolYear ?? settings.schoolYear;
  const effectiveResource = resource ?? settings.resources[0] ?? "";
  const sampleAllowed = !!selectedClass && /\bscience\b/i.test(selectedClass.subject);
  const effectiveSource = contentSource ?? (availableCourses.length ? "course" : sampleAllowed ? "sample" : "course");

  const schedule = (() => {
    if (!selectedClass || !termStart) return { meetings: [], error: "" };
    try { return { meetings: createTermMeetings({ termStart, numberOfWeeks, startingWeek, meetingDays: effectiveDays }), error: "" }; }
    catch (error) { return { meetings: [], error: error instanceof Error ? error.message : "Check the term schedule." }; }
  })();

  const missingWeeks = (() => {
    if (!selectedClass || !Number.isInteger(numberOfWeeks) || numberOfWeeks < 1 || numberOfWeeks > 24) return [];
    const available = new Set(effectiveSource === "course" ? overview?.weeks.map((week) => week.week) || [] : weekPresets.map((week) => week.week));
    return Array.from({ length: numberOfWeeks }, (_, index) => startingWeek + index).filter((week) => !available.has(week));
  })();

  function selectClass(id: string) { setClassId(id); setOverviewId(""); setMeetingDays(null); setDuration(null); setSchoolYear(null); setResource(null); setResourcePickerRevision((current) => current + 1); setContentSource(null); setFormError(null); }
  function clear() { setCategory(""); setSchoolYear(null); setTermStart(""); setNumberOfWeeks(8); setStartingWeek(1); setMeetingDays(null); setDuration(null); setChapter(""); setUnit(""); setResource(null); setResourcePickerRevision((current) => current + 1); setContentSource(null); setOverviewId(""); setGenerationMode("template"); setFormError(null); }
  async function generate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signedIn) { onSignIn(); return; }
    if (!selectedClass) { onManageClasses(); return; }
    setBusy(true); setFormError(null);
    try {
      await onGenerate({
        classRecord: selectedClass, category, schoolYear: effectiveYear, termStart,
        numberOfWeeks, startingWeek, duration: effectiveDuration, meetingDays: effectiveDays,
        contentSource: effectiveSource, overview: effectiveSource === "course" ? overview : undefined,
        chapter: chapter.trim() || settings.chapter, unit: unit.trim() || settings.unit,
        resource: effectiveResource,
      }, generationMode);
    } catch (error) { setFormError(errorMessage(error, "Could not create term lesson drafts.")); }
    finally { setBusy(false); }
  }

  return <div className="content term-content"><Card className="term-card"><div className="term-card-heading"><span className="term-card-icon"><CalendarRange size={21} /></span><div><h2>Term schedule generator</h2><p>Create one editable lesson draft for each scheduled class meeting.</p></div><span className="template-status"><Sparkles size={14} /> {generationMode === "ai" ? "AI assisted" : "Smart template"}</span></div>
    <form onSubmit={generate} onChange={() => setFormError(null)} className="term-form"><p className="required-hint"><b className="required-mark">*</b> Required fields</p><div className="term-form-grid top-row"><Label className="field"><span>Class<b className="required-mark"> *</b></span><select className="native-select" value={selectedClass?.id || ""} onChange={(event) => selectClass(event.target.value)} disabled={!classes.length} required><option value="" disabled>Select a class</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.grade}</option>)}</select></Label><Label className="field"><span>Lesson category<b className="required-mark"> *</b></span><Input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="e.g. Midterm, Weekly Review, Project" maxLength={200} required /><small>Saved with every lesson in the batch and shown in print.</small></Label><TermField label="School year" value={effectiveYear} required placeholder="e.g. 2026–2027" onChange={setSchoolYear} /></div>
      <div className="term-form-grid schedule-row"><TermField label="Term start date" type="date" value={termStart} onChange={setTermStart} required /><TermField label="Number of weeks" type="number" min={1} max={24} required value={numberOfWeeks} onChange={(value) => setNumberOfWeeks(Number(value))} /><TermField label="Starting week no." type="number" min={1} max={52} required value={startingWeek} onChange={(value) => setStartingWeek(Number(value))} /><TermField label="Duration" type="number" min={10} max={240} required value={effectiveDuration} onChange={(value) => setDuration(Number(value))} /><GenerationModeSelect value={generationMode} disabled={busy} onChange={(value) => { setGenerationMode(value); setFormError(null); }} /></div>
      <div className="field"><span>Class meeting days<b className="required-mark"> *</b></span><div className="day-selection"><WeekdayPicker value={effectiveDays} onChange={(value) => { setMeetingDays(value); setFormError(null); }} /></div><small>Each selected day creates one lesson per week. The first meeting falls on or after the term start date.</small></div>
      <div className="term-form-grid source-row"><Label className="field"><span>Lesson content source<b className="required-mark"> *</b></span><select className="native-select" required value={effectiveSource} onChange={(event) => setContentSource(event.target.value as ContentSource)}><option value="course">Saved course overview</option><option value="sample" disabled={!sampleAllowed}>Sample Science sequence</option></select></Label><Label className="field"><span>Course overview{effectiveSource === "course" && <b className="required-mark"> *</b>}</span><select className="native-select" required={effectiveSource === "course"} value={overview?.id || ""} disabled={effectiveSource !== "course" || !availableCourses.length} onChange={(event) => setOverviewId(event.target.value)}>{availableCourses.length ? availableCourses.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.weeks.length} weeks</option>) : <option value="">No saved course overview for this class</option>}</select><small>The weekly topic, focus, activity, and presentation goal guide each meeting.</small></Label></div>
      <div className="term-form-grid defaults-row"><TermField label="Default chapter" value={chapter} onChange={setChapter} placeholder={settings.chapter || "Optional"} /><TermField label="Default unit" value={unit} onChange={setUnit} placeholder={settings.unit || "Optional"} /><ResourceSelect key={resourcePickerRevision} resources={settings.resources} value={effectiveResource} onChange={setResource} /></div>
      {!classes.length && <div className="term-guidance"><strong>Create a class to begin.</strong> Save its subject, grade, and meeting days first. <Button type="button" variant="link" onClick={onManageClasses}>Go to Classes <ChevronRight size={14} /></Button></div>}
      {effectiveSource === "course" && !availableCourses.length && classes.length > 0 && <div className="term-guidance"><strong>No course overview for this class.</strong> Create one or switch to the sample sequence. <Button type="button" variant="link" onClick={onManageCourse}>Go to Course <ChevronRight size={14} /></Button></div>}
      {missingWeeks.length > 0 && classes.length > 0 && (effectiveSource !== "course" || !!overview) && <div className="term-guidance warning"><strong>Missing content for {missingWeeks.length} {missingWeeks.length === 1 ? "week" : "weeks"}:</strong> {missingWeeks.join(", ")}. Add those weeks in Course or adjust the range.</div>}
      {generationMode === "ai" && schedule.meetings.length > maxAiTermPlans && <div className="term-guidance warning">AI generation supports up to {maxAiTermPlans} class meetings at a time. Reduce the weeks or meeting days, or choose Smart Template.</div>}{schedule.error && <ErrorAlert title="Check the schedule" message={schedule.error} />}
      {schedule.meetings.length > 0 && !missingWeeks.length && <div className="term-summary"><strong>{schedule.meetings.length} editable lesson {schedule.meetings.length === 1 ? "plan" : "plans"}</strong> will be created over {numberOfWeeks} {numberOfWeeks === 1 ? "week" : "weeks"}.<small>{effectiveDays.map((day) => weekdays.find((item) => item.value === day)?.full).filter(Boolean).join(" and ")} · First class: {formatDate(schedule.meetings[0].date)} · Last class: {formatDate(schedule.meetings.at(-1)!.date)}</small></div>}
      {formError && <ErrorAlert title="Could not create term drafts" message={formError} />}
      <div className="term-actions"><Button type="button" className="secondary-button" onClick={clear} disabled={busy}>Clear</Button><Button type="submit" className="primary-button" disabled={busy || !selectedClass || !schedule.meetings.length || !!schedule.error || missingWeeks.length > 0 || (generationMode === "ai" && schedule.meetings.length > maxAiTermPlans)}>{busy ? generationMode === "ai" ? "Writing lesson drafts with AI…" : "Creating lesson drafts…" : generationMode === "ai" ? "Generate AI term drafts" : "Generate term lesson drafts"}</Button></div>
    </form></Card></div>;
}
