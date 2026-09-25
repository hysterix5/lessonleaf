"use client";

import { useState } from "react";
import { BookOpen, CalendarDays, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WeekdayPicker, weekdays } from "@/components/weekday-picker";
import type { ClassInput, ClassRecord } from "@/lib/catalog";
import type { AppSettings } from "@/lib/settings";

function emptyClass(settings: AppSettings): ClassInput {
  return {
    name: "", subject: settings.subject, grade: settings.grade, section: settings.section,
    schoolYear: settings.schoolYear, meetingDays: [2], duration: settings.defaultDuration,
  };
}

function ClassField({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string | number; onChange: (value: string) => void; type?: string; placeholder?: string;
}) {
  return <Label className="field"><span>{label}</span><Input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></Label>;
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

  function newClass() { setEditingId(null); setDraft(emptyClass(settings)); setConfirmId(null); }
  function edit(item: ClassRecord) {
    setEditingId(item.id);
    setDraft({ name: item.name, subject: item.subject, grade: item.grade, section: item.section, schoolYear: item.schoolYear, meetingDays: item.meetingDays, duration: item.duration });
    setConfirmId(null);
  }
  function change<K extends keyof ClassInput>(key: K, value: ClassInput[K]) { setDraft((current) => ({ ...current, [key]: value })); }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    try { const result = await onSave(draft, editingId || undefined); setEditingId(result.id); }
    catch { /* The parent shows the database or validation message. */ }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (confirmId !== id) { setConfirmId(id); return; }
    setBusy(true);
    try { await onDelete(id); if (editingId === id) newClass(); setConfirmId(null); }
    catch { /* The parent shows the database message. */ }
    finally { setBusy(false); }
  }

  return <div className="content workspace-content"><div className="workspace-heading"><div><span className="kicker">YOUR TEACHING SPACE</span><h1>Classes</h1><p>Keep each class’s subject, grade, meeting days, and lesson length in one place.</p></div>{signedIn && <Button type="button" className="secondary-button" onClick={newClass}><Plus size={16} /> New class</Button>}</div>
    {!signedIn ? <Card className="workspace-empty"><BookOpen size={27} /><h2>Set up your classes</h2><p>Sign in to save classes and use them in term schedules.</p><Button type="button" className="primary-button" onClick={onSignIn}>Sign in to continue</Button></Card> : <div className="workspace-grid">
      <div className="workspace-list"><div className="workspace-list-heading"><strong>Saved classes</strong><span>{classes.length}</span></div>{classes.length ? classes.map((item) => <Card className={`workspace-item ${editingId === item.id ? "selected" : ""}`} key={item.id}><Button type="button" className="workspace-item-main" onClick={() => edit(item)}><span className="workspace-item-icon"><BookOpen size={19} /></span><span><strong>{item.name}</strong><small>{item.subject} · {item.grade}{item.section ? ` · ${item.section}` : ""}</small><em>{weekdays.filter((day) => item.meetingDays.includes(day.value)).map((day) => day.label).join(", ")} · {item.duration} min</em></span></Button><Button type="button" variant="ghost" className={`item-delete ${confirmId === item.id ? "confirm" : ""}`} onClick={() => remove(item.id)} disabled={busy} aria-label={confirmId === item.id ? `Confirm delete ${item.name}` : `Delete ${item.name}`}><Trash2 size={15} /> {confirmId === item.id ? "Confirm" : ""}</Button></Card>) : <div className="workspace-list-empty">No classes yet. Add your first class to build a term schedule.</div>}</div>
      <Card className="workspace-editor"><div className="workspace-editor-heading"><span className="editor-symbol"><CalendarDays size={19} /></span><div><h2>{editingId ? "Edit class" : "New class"}</h2><p>These details fill the schedule generator automatically.</p></div></div><form onSubmit={save}><div className="settings-fields"><div className="span-2"><ClassField label="Class name" value={draft.name} onChange={(value) => change("name", value)} placeholder="e.g. Afterschool English · Grade 1–3" /></div><ClassField label="Subject" value={draft.subject} onChange={(value) => change("subject", value)} /><ClassField label="Grade level" value={draft.grade} onChange={(value) => change("grade", value)} /><ClassField label="Section" value={draft.section} onChange={(value) => change("section", value)} placeholder="Optional" /><ClassField label="School year" value={draft.schoolYear} onChange={(value) => change("schoolYear", value)} /><ClassField label="Lesson duration (minutes)" type="number" value={draft.duration} onChange={(value) => change("duration", Number(value))} /><div className="span-2 field"><span>Class meeting days</span><WeekdayPicker value={draft.meetingDays} onChange={(value) => change("meetingDays", value)} /></div></div><div className="workspace-form-footer"><Button type="submit" className="primary-button" disabled={busy}>{busy ? "Saving…" : editingId ? "Save changes" : "Add class"}</Button></div></form></Card>
    </div>}
  </div>;
}
