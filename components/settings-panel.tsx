"use client";

import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import Image from "next/image";
import { toast } from "sonner";
import { Check, LockKeyhole, Plus, School, Settings2, Sparkles, Trash2, Upload } from "lucide-react";
import { ErrorAlert } from "@/components/error-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabase } from "@/lib/supabase";
import { errorMessage } from "@/lib/feedback";
import { maxResourceLength, maxSavedResources, type AppSettings } from "@/lib/settings";
import { schoolLogoBucket, schoolLogoUploadError, validateSchoolLogoFile } from "@/lib/school-logo";

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

export function SettingsPanel({ settings, session, recovery, logoUrl, logoError, onSave, onSignIn, onPasswordChanged }: {
  settings: AppSettings;
  session: Session | null;
  recovery: boolean;
  logoUrl: string | null;
  logoError: string | null;
  onSave: (settings: AppSettings) => Promise<void>;
  onSignIn: () => void;
  onPasswordChanged: () => void;
}) {
  const [draft, setDraft] = useState(settings);
  const [resourceRows, setResourceRows] = useState(() => settings.resources.map((value, id) => ({ id, value })));
  const nextResourceId = useRef(settings.resources.length);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [pendingLogoUrl, setPendingLogoUrl] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [checkingLogo, setCheckingLogo] = useState(false);
  const [logoSelectionError, setLogoSelectionError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const pendingLogoUrlRef = useRef<string | null>(null);

  useEffect(() => () => { if (pendingLogoUrlRef.current) URL.revokeObjectURL(pendingLogoUrlRef.current); }, []);

  async function selectLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setCheckingLogo(true); setLogoSelectionError(null);
    try {
      await validateSchoolLogoFile(file);
      if (pendingLogoUrlRef.current) URL.revokeObjectURL(pendingLogoUrlRef.current);
      const preview = URL.createObjectURL(file);
      pendingLogoUrlRef.current = preview;
      setPendingLogoUrl(preview); setLogoFile(file); setRemoveLogo(false); setSettingsError(null);
    } catch (error) {
      if (pendingLogoUrlRef.current) URL.revokeObjectURL(pendingLogoUrlRef.current);
      pendingLogoUrlRef.current = null;
      setPendingLogoUrl(null); setLogoFile(null); setRemoveLogo(false);
      setLogoSelectionError(errorMessage(error, "Choose a valid school logo."));
    }
    finally { setCheckingLogo(false); }
  }

  function clearLogo() {
    if (pendingLogoUrlRef.current) URL.revokeObjectURL(pendingLogoUrlRef.current);
    pendingLogoUrlRef.current = null;
    setPendingLogoUrl(null); setLogoFile(null); setRemoveLogo(true); setLogoSelectionError(null);
  }

  function change<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setSettingsError(null);
  }

  function addResource() {
    if (resourceRows.length >= maxSavedResources) return;
    setResourceRows((current) => [...current, { id: nextResourceId.current++, value: "" }]);
    setSettingsError(null);
  }

  function changeResource(id: number, value: string) {
    setResourceRows((current) => current.map((row) => row.id === id ? { ...row, value } : row));
    setSettingsError(null);
  }

  function removeResource(id: number) {
    setResourceRows((current) => current.filter((row) => row.id !== id));
    setSettingsError(null);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (checkingLogo) { setSettingsError("Wait for the logo check to finish, then save settings."); return; }
    setSaving(true); setSettingsError(null);
    let uploadedPath: string | null = null;
    let saved = false;
    try {
      const next = { ...draft, resources: resourceRows.map((row) => row.value) };
      if (logoFile) {
        if (!session) throw new Error("Sign in to upload a school logo.");
        const extension = await validateSchoolLogoFile(logoFile);
        const newPath = `${session.user.id}/${crypto.randomUUID()}.${extension}`;
        const { error } = await getSupabase().storage.from(schoolLogoBucket).upload(newPath, logoFile, {
          contentType: logoFile.type, upsert: false,
        });
        if (error) throw schoolLogoUploadError(error);
        uploadedPath = newPath;
        next.schoolLogoPath = newPath;
      } else if (removeLogo) next.schoolLogoPath = "";

      await onSave(next);
      saved = true;
      if (session && draft.schoolLogoPath && draft.schoolLogoPath !== next.schoolLogoPath) {
        try {
          const { error } = await getSupabase().storage.from(schoolLogoBucket).remove([draft.schoolLogoPath]);
          if (error) toast.warning("Settings saved, but the previous logo could not be removed.");
        } catch { toast.warning("Settings saved, but the previous logo could not be removed."); }
      }
    }
    catch (error) { setSettingsError(errorMessage(error, "Could not save settings.")); }
    finally {
      if (uploadedPath && !saved) {
        try { await getSupabase().storage.from(schoolLogoBucket).remove([uploadedPath]); }
        catch { /* The settings save failed; cleanup can be retried from Storage. */ }
      }
      setSaving(false);
    }
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
      </div>
      <div className="school-logo-setting">
        <div className="school-logo-copy"><strong>School logo</strong><span>Shown in lesson previews and printed plans</span></div>
        <div className="school-logo-row">
          <div className="school-logo-preview">
            {(removeLogo ? null : pendingLogoUrl || logoUrl)
              ? <Image src={(pendingLogoUrl || logoUrl)!} alt="School logo preview" width={112} height={88} unoptimized />
              : <School size={31} aria-hidden="true" />}
          </div>
          <div className="school-logo-controls">
            <p>PNG, JPG, or WebP · up to 2 MB. Select Save settings to apply changes.</p>
            {session ? <div className="school-logo-actions">
              <input ref={logoInputRef} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={selectLogo} aria-label="Choose school logo image" />
              <Button type="button" variant="outline" disabled={saving || checkingLogo} onClick={() => logoInputRef.current?.click()}><Upload size={15} /> {checkingLogo ? "Checking image…" : (pendingLogoUrl || logoUrl) && !removeLogo ? "Replace logo" : "Choose logo"}</Button>
              {((pendingLogoUrl || logoUrl) && !removeLogo) && <Button type="button" variant="ghost" disabled={saving || checkingLogo} onClick={clearLogo}><Trash2 size={15} /> Remove logo</Button>}
            </div> : <Button type="button" variant="outline" onClick={onSignIn}>Sign in to upload</Button>}
          </div>
        </div>
        {(logoSelectionError || (!logoFile && !removeLogo && logoError)) && <ErrorAlert title="School logo unavailable" message={logoSelectionError || logoError!} />}
      </div>
      <p className="settings-note">The Drive folder is saved for future export support. Current exports use your browser’s print dialog.</p></Card>

      <Card className="settings-card"><div className="settings-card-heading"><div className="settings-card-icon"><Sparkles size={20} /></div><div><h2>Lesson defaults</h2><p>Filled automatically when you start a new lesson</p></div></div><div className="settings-fields">
        <SettingsField label="Subject" value={draft.subject} onChange={(value) => change("subject", value)} />
        <SettingsField label="Grade level" value={draft.grade} onChange={(value) => change("grade", value)} />
        <SettingsField label="Section" value={draft.section} onChange={(value) => change("section", value)} />
        <SettingsField label="Unit" value={draft.unit} onChange={(value) => change("unit", value)} />
        <div className="span-2"><SettingsField label="Chapter" value={draft.chapter} onChange={(value) => change("chapter", value)} /></div>
        <div className="span-2 resource-settings">
          <div className="resource-settings-heading"><div><strong>Resources / textbooks</strong><span>Save the choices you use across lessons.</span></div><Button type="button" variant="outline" disabled={saving || resourceRows.length >= maxSavedResources} onClick={addResource}><Plus size={15} aria-hidden="true" /> Add resource</Button></div>
          {resourceRows.length ? <div className="resource-settings-list">{resourceRows.map((row, index) => <div className="resource-settings-row" key={row.id}><Label className="field"><span>Resource {index + 1}</span><Input value={row.value} onChange={(event) => changeResource(row.id, event.target.value)} placeholder="e.g. Science textbook, 2nd edition" maxLength={maxResourceLength} /></Label><Button type="button" variant="ghost" disabled={saving} onClick={() => removeResource(row.id)} aria-label={`Remove resource ${index + 1}`} title="Remove resource"><Trash2 size={16} aria-hidden="true" /></Button></div>)}</div> : <p className="resource-settings-empty">No resources saved yet. Add one to show it in lesson forms.</p>}
          <small>You can save up to {maxSavedResources} resources. Blank or duplicate entries are skipped when you save.</small>
        </div>
      </div></Card>
      {settingsError && <ErrorAlert title="Could not save settings" message={settingsError} />}
      <div className="settings-save"><Button type="submit" className="primary-button" disabled={saving || checkingLogo}><Check size={16} /> {saving ? "Saving…" : "Save settings"}</Button><span>{session ? "Saved to your account" : "Saved in this browser only"}</span></div>
    </form>

    <Card className="settings-card account-card"><div className="settings-card-heading"><div className="settings-card-icon"><LockKeyhole size={20} /></div><div><h2>Account &amp; password</h2><p>{session ? session.user.email : "Sign in to keep plans and settings in your account"}</p></div></div>
      {session ? <form onSubmit={changePassword} className="password-form"><div className="settings-fields"><SettingsField label="New password" type="password" value={password} onChange={(value) => { setPassword(value); setPasswordError(null); }} placeholder="At least 8 characters" /><SettingsField label="Confirm new password" type="password" value={confirmPassword} onChange={(value) => { setConfirmPassword(value); setPasswordError(null); }} placeholder="Repeat password" /></div>{passwordError && <ErrorAlert title="Could not update password" message={passwordError} className="form-error" />}<Button type="submit" className="secondary-button" disabled={changingPassword || !password}>{changingPassword ? "Updating…" : recovery ? "Set password" : "Change password"}</Button></form> : <Button type="button" className="secondary-button" onClick={onSignIn}>Sign in or create account</Button>}
    </Card>
    <div className="settings-ai"><Badge>AI DRAFTING</Badge><div><h2>AI generation</h2><p>Choose AI draft in Single Plan or Term Schedule to create editable lessons with GPT-OSS 120B. Sign in first; the server uses its private Groq key.</p></div></div>
  </div>;
}
