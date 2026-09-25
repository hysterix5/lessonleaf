"use client";

import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Check, LockKeyhole, Settings2, Sparkles } from "lucide-react";
import { ErrorAlert } from "@/components/error-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabase } from "@/lib/supabase";
import { errorMessage } from "@/lib/feedback";
import type { AppSettings } from "@/lib/settings";

function SettingsField({ label, value, onChange, type = "text", placeholder, min, max }: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  return <Label className="field"><span>{label}</span><Input value={value} type={type} min={min} max={max} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></Label>;
}

export function SettingsPanel({ settings, session, recovery, onSave, onSignIn, onPasswordChanged }: {
  settings: AppSettings;
  session: Session | null;
  recovery: boolean;
  onSave: (settings: AppSettings) => Promise<void>;
  onSignIn: () => void;
  onPasswordChanged: () => void;
}) {
  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  function change<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setSettingsError(null);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setSettingsError(null);
    try { await onSave(draft); }
    catch (error) { setSettingsError(errorMessage(error, "Could not save settings.")); }
    finally { setSaving(false); }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    if (password.length < 8) { setPasswordError("Use a password with at least 8 characters."); return; }
    if (password !== confirmPassword) { setPasswordError("The passwords do not match."); return; }
    setChangingPassword(true);
    try {
      const { error } = await getSupabase().auth.updateUser({ password });
      if (error) throw error;
      setPassword(""); setConfirmPassword("");
      onPasswordChanged();
      toast.success("Password updated. Use it the next time you sign in.");
    } catch (error) {
      setPasswordError(errorMessage(error, "Could not update your password."));
    } finally { setChangingPassword(false); }
  }

  return <div className="content settings-content">
    <div className="settings-intro"><span className="kicker">MAKE IT YOURS</span><h1>Settings</h1><p>School identity, lesson defaults, exports, and account access.</p></div>

    <form onSubmit={save} className="settings-form">
      <Card className="settings-card"><div className="settings-card-heading"><div className="settings-card-icon"><Settings2 size={20} /></div><div><h2>School &amp; teacher</h2><p>Used in new lessons and printable previews</p></div></div><div className="settings-fields">
        <div className="span-2"><SettingsField label="Application title" value={draft.applicationTitle} onChange={(value) => change("applicationTitle", value)} placeholder="Your lesson plan generator" /></div>
        <SettingsField label="School name" value={draft.schoolName} onChange={(value) => change("schoolName", value)} placeholder="Your school" />
        <SettingsField label="School year" value={draft.schoolYear} onChange={(value) => change("schoolYear", value)} placeholder="2026–2027" />
        <div className="span-2"><SettingsField label="Prepared by / teacher name" value={draft.teacherName} onChange={(value) => change("teacherName", value)} placeholder="Teacher name" /></div>
        <SettingsField label="Default duration (minutes)" type="number" min={10} max={240} value={draft.defaultDuration} onChange={(value) => change("defaultDuration", Number(value))} />
        <SettingsField label="Export Drive folder link or ID" value={draft.exportDriveFolder} onChange={(value) => change("exportDriveFolder", value)} placeholder="Optional" />
      </div><p className="settings-note">The Drive folder is saved for future export support. Current exports use your browser’s print dialog.</p></Card>

      <Card className="settings-card"><div className="settings-card-heading"><div className="settings-card-icon"><Sparkles size={20} /></div><div><h2>Lesson defaults</h2><p>Filled automatically when you start a new lesson</p></div></div><div className="settings-fields">
        <SettingsField label="Subject" value={draft.subject} onChange={(value) => change("subject", value)} />
        <SettingsField label="Grade level" value={draft.grade} onChange={(value) => change("grade", value)} />
        <SettingsField label="Section" value={draft.section} onChange={(value) => change("section", value)} />
        <SettingsField label="Unit" value={draft.unit} onChange={(value) => change("unit", value)} />
        <div className="span-2"><SettingsField label="Chapter" value={draft.chapter} onChange={(value) => change("chapter", value)} /></div>
        <div className="span-2"><SettingsField label="Resource / textbook" value={draft.resource} onChange={(value) => change("resource", value)} /></div>
      </div></Card>
      {settingsError && <ErrorAlert title="Could not save settings" message={settingsError} />}
      <div className="settings-save"><Button type="submit" className="primary-button" disabled={saving}><Check size={16} /> {saving ? "Saving…" : "Save settings"}</Button><span>{session ? "Saved to your account" : "Saved in this browser only"}</span></div>
    </form>

    <Card className="settings-card account-card"><div className="settings-card-heading"><div className="settings-card-icon"><LockKeyhole size={20} /></div><div><h2>Account &amp; password</h2><p>{session ? session.user.email : "Sign in to keep plans and settings in your account"}</p></div></div>
      {session ? <form onSubmit={changePassword} className="password-form"><div className="settings-fields"><SettingsField label="New password" type="password" value={password} onChange={(value) => { setPassword(value); setPasswordError(null); }} placeholder="At least 8 characters" /><SettingsField label="Confirm new password" type="password" value={confirmPassword} onChange={(value) => { setConfirmPassword(value); setPasswordError(null); }} placeholder="Repeat password" /></div>{passwordError && <ErrorAlert title="Could not update password" message={passwordError} className="form-error" />}<Button type="submit" className="secondary-button" disabled={changingPassword || !password}>{changingPassword ? "Updating…" : recovery ? "Set password" : "Change password"}</Button></form> : <Button type="button" className="secondary-button" onClick={onSignIn}>Sign in or create account</Button>}
    </Card>
    <div className="settings-ai"><Badge>AI DRAFTING</Badge><div><h2>AI generation</h2><p>Choose AI draft in Single Plan or Term Schedule to create editable lessons with GPT-OSS 120B. Sign in first; the server uses its private Groq key.</p></div></div>
  </div>;
}
