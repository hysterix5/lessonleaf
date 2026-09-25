"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { ArrowRight, BookOpen, BookOpenText, CalendarRange, Check, Clock3, FileText, LayoutGrid, Plus, Printer, School, Settings2, Sparkles, Trash2, type LucideIcon } from "lucide-react";
import { ClassesPanel } from "@/components/classes-panel";
import { CoursePanel } from "@/components/course-panel";
import { SettingsPanel } from "@/components/settings-panel";
import { SinglePlanSource } from "@/components/single-plan-source";
import { TermSchedulePanel } from "@/components/term-schedule-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { generatePlan, parseGenerateInput, weekPresets, type GenerateInput, type LessonPlan } from "@/lib/lesson-plan";
import { createPlan, createPlans, deletePlan, getSupabase, listPlans, updatePlan } from "@/lib/supabase";
import { deleteClass, deleteCourse, listClasses, listCourses, saveClass, saveCourse, type ClassInput, type ClassRecord, type CourseInput, type CourseOverview } from "@/lib/catalog";
import { buildTermPlans, type TermScheduleInput } from "@/lib/term-schedule";
import { defaultSettings, guestSettingsKey, loadUserSettings, readGuestSettings, saveUserSettings, settingsToDetails, validateSettings, type AppSettings } from "@/lib/settings";

type View = "builder" | "term" | "classes" | "course" | "library" | "settings";
type Tab = "goals" | "flow" | "finish";
type AuthMode = "sign-in" | "sign-up" | "reset";
type Notice = { text: string; error?: boolean } | null;

const starter: GenerateInput = {
  subject: "Science", grade: "Grade 1", section: "A", schoolYear: "2026–2027", week: 1,
  topic: "Introduction of Habitats", date: "", duration: 60,
  chapter: "Exploring Ecosystems and Everyday Matter", unit: "Unit 3",
  resource: "Academic Team, Aksorn Charoen Tat Act – Textbook", pages: "", preparedBy: "",
};
const workingDraftKey = "lessonleaf-working-draft";

function Icon({ name, size = 19 }: { name: string; size?: number }) {
  const icons: Record<string, LucideIcon> = { book: BookOpen, grid: LayoutGrid, file: FileText, settings: Settings2, calendar: CalendarRange, school: School, course: BookOpenText, spark: Sparkles, arrow: ArrowRight, plus: Plus, check: Check, print: Printer, trash: Trash2, clock: Clock3 };
  const Component = icons[name];
  return Component ? <Component size={size} strokeWidth={1.8} aria-hidden="true" /> : null;
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string | number; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <Label className="field"><span>{label}</span><Input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></Label>;
}

function Area({ label, value, onChange, rows = 3, hint }: { label: string; value: string; onChange: (value: string) => void; rows?: number; hint?: string }) {
  return <Label className="field"><span>{label}</span><Textarea value={value} rows={rows} onChange={(event) => onChange(event.target.value)} />{hint && <small>{hint}</small>}</Label>;
}

function ListArea({ label, items, onChange, rows = 3, hint }: { label: string; items: string[]; onChange: (value: string[]) => void; rows?: number; hint?: string }) {
  return <Label className="field"><span>{label}</span><Textarea defaultValue={items.join("\n")} rows={rows} onChange={(event) => onChange(fromLines(event.target.value))} />{hint && <small>{hint}</small>}</Label>;
}

const fromLines = (text: string) => text.split("\n").map((item) => item.trim()).filter(Boolean);

export default function Home() {
  const [view, setView] = useState<View>("builder");
  const [tab, setTab] = useState<Tab>("goals");
  const [details, setDetails] = useState<GenerateInput>(starter);
  const [singleClassId, setSingleClassId] = useState("");
  const [singleCourseId, setSingleCourseId] = useState("");
  const [singleCategory, setSingleCategory] = useState("Regular");
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [saved, setSaved] = useState<LessonPlan[]>([]);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [courses, setCourses] = useState<CourseOverview[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [authOpen, setAuthOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [authMessage, setAuthMessage] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    const loadCatalog = () => {
      void Promise.all([listClasses(), listCourses()]).then(([classList, courseList]) => {
        if (active) { setClasses(classList); setCourses(courseList); }
      }).catch((error) => { if (active) setNotice({ text: error instanceof Error ? error.message : "Could not load classes and courses.", error: true }); });
    };
    void (async () => {
      await Promise.resolve();
      let hasWorkingDraft = false;
      try {
        if (active) {
          const guestSettings = readGuestSettings();
          setSettings(guestSettings);
          setDetails((current) => ({ ...current, ...settingsToDetails(guestSettings) }));
        }
        const working = localStorage.getItem(workingDraftKey);
        if (working && active) {
          const restored = JSON.parse(working) as { plan: LessonPlan; details: GenerateInput };
          if (restored.plan?.id && restored.details?.topic) { setPlan(restored.plan); setDetails(restored.details); hasWorkingDraft = true; }
        }
      } catch { localStorage.removeItem(workingDraftKey); }
      try {
        const client = getSupabase();
        const { data: authListener } = client.auth.onAuthStateChange((event, nextSession) => {
          if (!active) return;
          setSession(nextSession);
          if (event === "SIGNED_OUT") { setSaved([]); setClasses([]); setCourses([]); setSettings(readGuestSettings()); setRecovery(false); }
          if (event === "PASSWORD_RECOVERY") { setRecovery(true); setView("settings"); setAuthOpen(false); setNotice({ text: "Set a new password in Account & password." }); }
          if (event === "SIGNED_IN" && nextSession) {
            setAuthOpen(false); setPassword(""); setConfirmPassword(""); setAuthMessage(""); setAuthMode("sign-in");
            setTimeout(() => {
              void listPlans().then((plans) => { if (active) setSaved(plans); })
                .catch((error) => { if (active) setNotice({ text: error instanceof Error ? error.message : "Could not load plans.", error: true }); });
              void loadUserSettings(nextSession.user.id).then((loaded) => {
                if (!active) return;
                setSettings(loaded);
                if (!localStorage.getItem(workingDraftKey)) setDetails((current) => ({ ...current, ...settingsToDetails(loaded) }));
              }).catch((error) => { if (active) setNotice({ text: error instanceof Error ? error.message : "Could not load settings.", error: true }); });
              loadCatalog();
            }, 0);
          }
        });
        unsubscribe = () => authListener.subscription.unsubscribe();
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        if (active) setSession(data.session);
        if (data.session) {
          loadCatalog();
          void listPlans().then((plans) => { if (active) setSaved(plans); })
            .catch((error) => { if (active) setNotice({ text: error instanceof Error ? error.message : "Could not load plans.", error: true }); });
          void loadUserSettings(data.session.user.id).then((loaded) => {
            if (!active) return;
            setSettings(loaded);
            if (!hasWorkingDraft) setDetails((current) => ({ ...current, ...settingsToDetails(loaded) }));
          }).catch((error) => { if (active) setNotice({ text: error instanceof Error ? error.message : "Could not load settings.", error: true }); });
        }
      } catch (error) {
        if (active) setNotice({ text: error instanceof Error ? error.message : "Could not connect to Supabase.", error: true });
      }
    })();
    return () => { active = false; unsubscribe(); };
  }, []);

  useEffect(() => {
    if (plan) localStorage.setItem(workingDraftKey, JSON.stringify({ plan, details }));
  }, [plan, details]);

  useEffect(() => { document.title = settings.applicationTitle || "Lessonleaf"; }, [settings.applicationTitle]);

  function changeDetail<K extends keyof GenerateInput>(key: K, value: GenerateInput[K]) {
    setDetails((current) => ({ ...current, [key]: value }));
    setPlan((current) => current ? { ...current, [key]: value, ...(key === "topic" || key === "week" ? { title: `${key === "topic" ? value : current.topic} · Week ${key === "week" ? value : current.week}` } : {}) } : null);
  }

  function update<K extends keyof LessonPlan>(key: K, value: LessonPlan[K]) {
    setPlan((current) => current ? { ...current, [key]: value } : null);
  }

  function pickWeek(week: number) {
    const chosen = weekPresets.find((item) => item.week === week);
    if (!chosen) return;
    setDetails((current) => ({ ...current, week, topic: chosen.topic, unit: chosen.unit }));
    setSingleCourseId("");
    setPlan(null);
    localStorage.removeItem(workingDraftKey);
    setTab("goals");
    setView("builder");
    document.getElementById("builder")?.scrollIntoView({ behavior: "smooth" });
  }

  function generate() {
    setNotice(null);
    try {
      const classRecord = classes.find((item) => item.id === singleClassId);
      const overview = courses.find((item) => item.id === singleCourseId && item.classId === classRecord?.id);
      const courseWeek = overview?.weeks.find((item) => item.week === details.week);
      if (overview && !courseWeek) throw new Error(`Choose a topic for week ${details.week} in the course overview.`);
      setPlan({
        ...generatePlan(parseGenerateInput(details), courseWeek ? { focus: courseWeek.focus, activity: courseWeek.activity, presentationGoal: courseWeek.presentationGoal } : undefined),
        category: singleCategory, classId: classRecord?.id, className: classRecord?.name, courseOverviewId: overview?.id,
      }); setTab("goals");
      setNotice({ text: "Draft created. Review each section before saving." });
    } catch (error) { setNotice({ text: error instanceof Error ? error.message : "Could not create a draft.", error: true }); }
  }

  async function save(status: "draft" | "ready") {
    if (!plan) return;
    if (!session) { setAuthOpen(true); return; }
    setLoading(true); setNotice(null);
    try {
      const exists = saved.some((item) => item.id === plan.id);
      const result = exists ? await updatePlan({ ...plan, status }) : await createPlan({ ...plan, status });
      setPlan(result);
      setSaved((current) => [result, ...current.filter((item) => item.id !== result.id)]);
      setNotice({ text: status === "ready" ? "Lesson plan saved and marked ready." : "Draft saved successfully." });
    } catch (error) { setNotice({ text: error instanceof Error ? error.message : "Could not save the plan.", error: true }); }
    finally { setLoading(false); }
  }

  async function remove(id: string) {
    if (confirmDelete !== id) { setConfirmDelete(id); return; }
    setLoading(true);
    try {
      await deletePlan(id);
      setSaved((current) => current.filter((item) => item.id !== id));
      if (plan?.id === id) { setPlan(null); localStorage.removeItem(workingDraftKey); }
      setConfirmDelete(null); setNotice({ text: "Lesson plan deleted." });
    } catch (error) { setNotice({ text: error instanceof Error ? error.message : "Could not delete the plan.", error: true }); }
    finally { setLoading(false); }
  }

  function open(savedPlan: LessonPlan) {
    setPlan(savedPlan);
    setSingleClassId(savedPlan.classId || ""); setSingleCourseId(savedPlan.courseOverviewId || ""); setSingleCategory(savedPlan.category || "Regular");
    setDetails({ subject: savedPlan.subject, grade: savedPlan.grade, section: savedPlan.section, schoolYear: savedPlan.schoolYear, week: savedPlan.week, topic: savedPlan.topic, date: savedPlan.date, duration: savedPlan.duration, chapter: savedPlan.chapter, unit: savedPlan.unit, resource: savedPlan.resource, pages: savedPlan.pages, preparedBy: savedPlan.preparedBy });
    setTab("goals"); setView("builder"); setNotice(null);
  }

  function reset() { setPlan(null); localStorage.removeItem(workingDraftKey); setDetails({ ...starter, ...settingsToDetails(settings) }); setSingleClassId(""); setSingleCourseId(""); setSingleCategory("Regular"); setTab("goals"); setView("builder"); setNotice(null); }

  function selectSingleClass(id: string) {
    const selected = classes.find((item) => item.id === id);
    setSingleClassId(id); setSingleCourseId("");
    if (selected) setDetails((current) => ({ ...current, subject: selected.subject, grade: selected.grade, section: selected.section, schoolYear: selected.schoolYear, duration: selected.duration }));
    setPlan(null); localStorage.removeItem(workingDraftKey);
  }

  function selectSingleCourseWeek(week: number) {
    const chosen = courses.find((item) => item.id === singleCourseId)?.weeks.find((item) => item.week === week);
    if (!chosen) return;
    setDetails((current) => ({ ...current, week, topic: chosen.topic, unit: chosen.unit }));
    setPlan(null); localStorage.removeItem(workingDraftKey);
  }

  function selectSingleCourse(id: string) {
    setSingleCourseId(id);
    const firstWeek = courses.find((item) => item.id === id)?.weeks[0];
    if (firstWeek) setDetails((current) => ({ ...current, week: firstWeek.week, topic: firstWeek.topic, unit: firstWeek.unit }));
    setPlan(null); localStorage.removeItem(workingDraftKey);
  }

  async function saveSettings(next: AppSettings) {
    try {
      const valid = validateSettings(next);
      if (session) {
        const savedSettings = await saveUserSettings(session.user.id, valid);
        setSettings(savedSettings);
        setNotice({ text: "Settings saved to your account." });
      } else {
        localStorage.setItem(guestSettingsKey, JSON.stringify(valid));
        setSettings(valid);
        setNotice({ text: "Settings saved in this browser. Sign in and save again to sync them to your account." });
      }
    } catch (error) { setNotice({ text: error instanceof Error ? error.message : "Could not save settings.", error: true }); }
  }

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setNotice(null);
    try {
      const address = email.trim();
      if (authMode === "sign-up" && password.length < 8) throw new Error("Use a password with at least 8 characters.");
      if (authMode === "sign-up" && password !== confirmPassword) throw new Error("The passwords do not match.");
      if (authMode === "sign-in") {
        const { error } = await getSupabase().auth.signInWithPassword({ email: address, password });
        if (error) throw error;
        setAuthOpen(false); setPassword(""); setNotice({ text: "Signed in successfully." });
      } else if (authMode === "sign-up") {
        const { data, error } = await getSupabase().auth.signUp({ email: address, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        if (data.session) { setAuthOpen(false); setPassword(""); setConfirmPassword(""); setNotice({ text: "Account created. You are signed in." }); }
        else { setPassword(""); setConfirmPassword(""); setAuthMessage(`Check ${address} to confirm your account, then sign in with your password.`); }
      } else {
        const { error } = await getSupabase().auth.resetPasswordForEmail(address, { redirectTo: window.location.origin });
        if (error) throw error;
        setAuthMessage(`If ${address} has an account, a password reset email is on its way.`);
      }
    }
    catch (error) { setNotice({ text: error instanceof Error ? error.message : "Could not access your account.", error: true }); }
    finally { setLoading(false); }
  }

  async function persistClass(input: ClassInput, id?: string) {
    if (!session) throw new Error("Sign in to save classes.");
    try {
      const result = await saveClass(session.user.id, input, id);
      setClasses((current) => [result, ...current.filter((item) => item.id !== result.id)].sort((a, b) => a.name.localeCompare(b.name)));
      setNotice({ text: id ? "Class updated." : "Class created." });
      return result;
    } catch (error) { setNotice({ text: error instanceof Error ? error.message : "Could not save the class.", error: true }); throw error; }
  }

  async function removeClass(id: string) {
    if (!session) throw new Error("Sign in to delete classes.");
    try {
      await deleteClass(session.user.id, id);
      setClasses((current) => current.filter((item) => item.id !== id));
      setCourses((current) => current.filter((item) => item.classId !== id));
      setNotice({ text: "Class and its course overviews deleted." });
    } catch (error) { setNotice({ text: error instanceof Error ? error.message : "Could not delete the class.", error: true }); throw error; }
  }

  async function persistCourse(input: CourseInput, id?: string) {
    if (!session) throw new Error("Sign in to save course overviews.");
    try {
      const result = await saveCourse(session.user.id, input, id);
      setCourses((current) => [result, ...current.filter((item) => item.id !== result.id)]);
      setNotice({ text: id ? "Course overview updated." : "Course overview created." });
      return result;
    } catch (error) { setNotice({ text: error instanceof Error ? error.message : "Could not save the course overview.", error: true }); throw error; }
  }

  async function removeCourse(id: string) {
    if (!session) throw new Error("Sign in to delete course overviews.");
    try {
      await deleteCourse(session.user.id, id);
      setCourses((current) => current.filter((item) => item.id !== id));
      setNotice({ text: "Course overview deleted." });
    } catch (error) { setNotice({ text: error instanceof Error ? error.message : "Could not delete the course overview.", error: true }); throw error; }
  }

  async function generateTerm(input: TermScheduleInput) {
    if (!session) { setAuthOpen(true); throw new Error("Sign in to save term lessons."); }
    try {
      const drafts = buildTermPlans(input, settings);
      const created = await createPlans(drafts);
      if (created.length !== drafts.length) throw new Error("Some lesson drafts could not be saved. Refresh your library before trying again.");
      setSaved((current) => [...created, ...current]);
      setView("library");
      setNotice({ text: `${created.length} editable lesson ${created.length === 1 ? "draft" : "drafts"} created for ${input.classRecord.name}.` });
    } catch (error) { setNotice({ text: error instanceof Error ? error.message : "Could not create term lesson drafts.", error: true }); throw error; }
  }

  async function logout() {
    const { error } = await getSupabase().auth.signOut({ scope: "local" });
    if (error) { setNotice({ text: "Could not sign out. Please try again.", error: true }); return; }
    localStorage.removeItem(workingDraftKey); setSession(null); setSaved([]); setClasses([]); setCourses([]); setPlan(null); setDetails(starter); setView("builder"); setNotice({ text: "You are signed out." });
  }

  const visiblePlans = saved.filter((item) => [item.topic, item.className, item.category, item.date, item.subject]
    .filter(Boolean).join(" ").toLowerCase().includes(libraryQuery.trim().toLowerCase()));

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><span className="brand-mark"><Icon name="book" size={23} /></span><span>lesson<em>leaf</em><small>PLANNING STUDIO</small></span></div><div className="side-label">WORKSPACE</div><nav className="side-nav" aria-label="Main navigation"><Button type="button" className={view === "builder" || view === "term" ? "active" : ""} onClick={() => setView("builder")}><Icon name="grid" /> Generate plans</Button><Button type="button" className={view === "classes" ? "active" : ""} onClick={() => setView("classes")}><Icon name="school" /> Classes</Button><Button type="button" className={view === "course" ? "active" : ""} onClick={() => setView("course")}><Icon name="course" /> Course</Button><Button type="button" className={view === "library" ? "active" : ""} onClick={() => setView("library")}><Icon name="file" /> My lesson plans <span className="nav-count">{saved.length}</span></Button><Button type="button" className={view === "settings" ? "active" : ""} onClick={() => setView("settings")}><Icon name="settings" /> Settings</Button></nav><div className="sidebar-bottom"><div className="reference-card"><span className="reference-symbol"><Icon name="book" /></span><strong>Reference material</strong><p>Built around the Grade 1 Science plan you shared.</p><a href="/Lesson%20Plan%20sample.pdf" target="_blank" rel="noopener noreferrer">View sample PDF <Icon name="arrow" size={15} /></a></div><span>A calmer way to plan your week.</span></div></aside>
    <main className="main-area"><header className="topbar"><div className="mobile-brand">lesson<em>leaf</em></div><span className="breadcrumb">Workspace <b>/</b> {view === "builder" || view === "term" ? "Generate lesson plan" : view === "classes" ? "Classes" : view === "course" ? "Course" : view === "settings" ? "Settings" : "My lesson plans"}</span><div className="top-actions"><Badge className="mode-pill"><i /> Template-based drafting</Badge>{session ? <Button type="button" className="account-button" onClick={logout} title="Sign out">{session.user?.email?.slice(0, 1).toUpperCase() || "✓"}<span>Sign out</span></Button> : <Button type="button" className="sign-in-button" onClick={() => setAuthOpen(true)}>Sign in</Button>}</div></header>
      <nav className="mobile-nav" aria-label="Mobile navigation"><Button type="button" className={view === "builder" || view === "term" ? "active" : ""} onClick={() => setView("builder")}><Icon name="grid" size={16} /> Generate</Button><Button type="button" className={view === "classes" ? "active" : ""} onClick={() => setView("classes")}><Icon name="school" size={16} /> Classes</Button><Button type="button" className={view === "course" ? "active" : ""} onClick={() => setView("course")}><Icon name="course" size={16} /> Course</Button><Button type="button" className={view === "library" ? "active" : ""} onClick={() => setView("library")}><Icon name="file" size={16} /> Plans</Button><Button type="button" className={view === "settings" ? "active" : ""} onClick={() => setView("settings")}><Icon name="settings" size={16} /> Settings</Button></nav>
      {notice && <div className={`notice ${notice.error ? "error" : ""}`} role="status"><span>{notice.error ? "!" : <Icon name="check" size={16} />}</span>{notice.text}<Button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message">×</Button></div>}
      {(view === "builder" || view === "term") && <div className="generator-switch"><div><span className="kicker">PLAN YOUR TEACHING</span><h1>Generate Lesson Plan</h1><p>Create one detailed plan or build every scheduled lesson for a full term.</p></div><div className="generator-tabs" role="group" aria-label="Generation type"><Button type="button" className={view === "builder" ? "active" : ""} onClick={() => setView("builder")}>Single Plan</Button><Button type="button" className={view === "term" ? "active" : ""} onClick={() => setView("term")}>Term Schedule</Button></div></div>}
      {view === "builder" ? <div className="content"><section className="hero"><div className="hero-content"><span className="eyebrow"><i /> YOUR PLANNING SPACE</span><h1>Thoughtful lessons,<br /><em>beautifully planned.</em></h1><p>Start with the eight-week outline from your sample, shape every section to suit your class, and keep each plan ready to teach.</p><Button type="button" className="hero-cta" onClick={() => document.getElementById("builder")?.scrollIntoView({ behavior: "smooth" })}>Create a lesson plan <Icon name="arrow" size={18} /></Button></div><div className="hero-art" aria-hidden="true"><div className="orbit one" /><div className="orbit two" /><div className="art-paper"><span>LESSON PLAN</span><strong>Science & discovery</strong><i className="art-line wide" /><i className="art-line" /><i className="art-line short" /><b><Icon name="check" size={15} /> Ready to teach</b></div><span className="art-star">✳</span></div></section>
        <section className="curriculum"><div className="section-heading"><div><span className="kicker">A PLACE TO BEGIN</span><h2>Explore the sample sequence</h2><p>Choose a week to load its topic and activity ideas.</p></div><a className="text-link" href="/Lesson%20Plan%20sample.pdf" target="_blank" rel="noopener noreferrer">Open reference PDF <Icon name="arrow" size={16} /></a></div><div className="week-grid">{weekPresets.map((item) => <Button type="button" key={item.week} className={`week-card ${details.week === item.week && details.topic === item.topic ? "selected" : ""}`} onClick={() => pickWeek(item.week)}><span className="week-top"><span className="week-number">{String(item.week).padStart(2, "0")}</span><Badge className="unit">{item.unit}</Badge></span><strong>{item.topic}</strong><span className="week-bottom">Week {item.week} <Icon name="arrow" size={16} /></span></Button>)}</div></section>
        <section className="builder" id="builder"><div className="section-heading"><div><span className="kicker">MAKE IT YOURS</span><h2>Build your lesson</h2><p>Fill in the basics, create a structured draft, then refine it section by section.</p></div><Badge className="format-pill"><Icon name="spark" size={15} /> Based on the sample format</Badge></div><div className="builder-grid"><div className="editor-column"><Card className="card"><div className="card-heading"><span className="step">01</span><div><h3>Lesson details</h3><p>The starting point for your plan</p></div></div><SinglePlanSource classes={classes} courses={courses} classId={singleClassId} courseId={singleCourseId} category={singleCategory} week={details.week} onClassChange={selectSingleClass} onCourseChange={selectSingleCourse} onCategoryChange={(value) => { setSingleCategory(value); setPlan((current) => current ? { ...current, category: value } : null); }} onCourseWeekChange={selectSingleCourseWeek} /><div className="form-grid"><Field label="Subject" value={details.subject} onChange={(v) => changeDetail("subject", v)} /><Field label="Grade level" value={details.grade} onChange={(v) => changeDetail("grade", v)} /><Field label="Section" value={details.section} onChange={(v) => changeDetail("section", v)} placeholder="e.g. A" /><Field label="School year" value={details.schoolYear} onChange={(v) => changeDetail("schoolYear", v)} /><Field label="Week" type="number" value={details.week} onChange={(v) => changeDetail("week", Number(v))} /><Field label="Date" type="date" value={details.date} onChange={(v) => changeDetail("date", v)} /><div className="span-2"><Field label="Lesson topic" value={details.topic} onChange={(v) => changeDetail("topic", v)} placeholder="What will your class explore?" /></div><Field label="Duration (minutes)" type="number" value={details.duration} onChange={(v) => changeDetail("duration", Number(v))} /><Field label="Unit" value={details.unit} onChange={(v) => changeDetail("unit", v)} /><div className="span-2"><Field label="Chapter" value={details.chapter} onChange={(v) => changeDetail("chapter", v)} /></div><div className="span-2"><Field label="Resource / textbook" value={details.resource} onChange={(v) => changeDetail("resource", v)} /></div><Field label="Pages" value={details.pages} onChange={(v) => changeDetail("pages", v)} placeholder="e.g. 71–85" /><Field label="Prepared by" value={details.preparedBy} onChange={(v) => changeDetail("preparedBy", v)} placeholder="Teacher name" /></div><Button type="button" className="primary-button generate-button" disabled={loading || !details.topic.trim()} onClick={generate}><Icon name="spark" size={17} /> {loading ? "Working…" : plan ? "Create a fresh draft" : "Create lesson draft"} <Icon name="arrow" size={17} /></Button><p className="helper">The draft uses a structured template. You can edit every section.</p></Card>
          {plan && <Card className="card edit-card"><div className="card-heading"><span className="step">02</span><div><h3>Shape the content</h3><p>Review the teaching details</p></div></div><Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}><TabsList className="editor-tabs" aria-label="Lesson sections"><TabsTrigger value="goals">Goals & resources</TabsTrigger><TabsTrigger value="flow">Teaching flow</TabsTrigger><TabsTrigger value="finish">Assessment & more</TabsTrigger></TabsList></Tabs><div className="editor-fields">{tab === "goals" && <><Area label="Core goal" value={plan.coreGoal} onChange={(v) => update("coreGoal", v)} /><Area label="Key focus" value={plan.keyFocus} onChange={(v) => update("keyFocus", v)} /><ListArea key={plan.id + "-objectives"} label="Learning objectives" items={plan.objectives} onChange={(v) => update("objectives", v)} rows={5} hint="One objective per line" /><ListArea key={plan.id + "-vocabulary"} label="Target vocabulary" items={plan.vocabulary} onChange={(v) => update("vocabulary", v)} hint="One word or phrase per line" /><Area label="Language focus" value={plan.languageFocus} onChange={(v) => update("languageFocus", v)} /><ListArea key={plan.id + "-materials"} label="Materials & resources" items={plan.materials} onChange={(v) => update("materials", v)} rows={4} hint="One material per line" /></>}{tab === "flow" && <><Area label="Warm-up" value={plan.warmUp} onChange={(v) => update("warmUp", v)} rows={4} /><Area label="Lesson procedure" value={plan.lessonProcedure} onChange={(v) => update("lessonProcedure", v)} rows={9} /><Area label="Teacher actions" value={plan.teacherActions} onChange={(v) => update("teacherActions", v)} /><Area label="Student actions" value={plan.studentActions} onChange={(v) => update("studentActions", v)} /><Area label="Activity / project" value={plan.activity} onChange={(v) => update("activity", v)} /><Area label="Presentation / discussion" value={plan.presentation} onChange={(v) => update("presentation", v)} /></>}{tab === "finish" && <><Area label="Assessment / wrap-up" value={plan.assessment} onChange={(v) => update("assessment", v)} /><Area label="Homework" value={plan.homework} onChange={(v) => update("homework", v)} /><ListArea key={plan.id + "-links"} label="Multimedia links" items={plan.multimediaLinks} onChange={(v) => update("multimediaLinks", v)} hint="One link per line" /><Area label="Notes" value={plan.notes} onChange={(v) => update("notes", v)} /></>}</div></Card>}</div>
          <div className="preview-column"><div className="preview-sticky"><div className="preview-heading"><div><span className="kicker">THE FINISHED VIEW</span><h3>Lesson preview</h3></div>{plan && <Button type="button" className="print-button" onClick={() => window.print()} aria-label="Print lesson plan"><Icon name="print" /></Button>}</div>{plan ? <><Card className="paper-preview"><div className="paper-top">{settings.applicationTitle} <span>• {plan.schoolYear}</span></div>{settings.schoolName && <div className="paper-school">{settings.schoolName}</div>}<h2>{plan.topic}</h2><div className="paper-meta"><span>{plan.subject} · {plan.grade}{plan.section ? ` – ${plan.section}` : ""}</span><span>Week {plan.week}{plan.date ? ` · ${plan.date}` : ""}</span><span>{plan.duration} minutes</span>{plan.category && plan.category !== "General" && <span>{plan.category}</span>}{plan.className && <span>{plan.className}</span>}</div><Separator className="paper-rule" /><div className="paper-details"><div><small>CHAPTER / UNIT</small>{[plan.chapter, plan.unit].filter(Boolean).join(" · ") || "—"}</div><div><small>RESOURCE / PAGES</small>{[plan.resource, plan.pages].filter(Boolean).join(" · ") || "—"}</div></div><PreviewBlock title="Core goal" text={plan.coreGoal} /><PreviewList title="Learning objectives" items={plan.objectives} /><PreviewList title="Target vocabulary" items={plan.vocabulary} inline /><PreviewBlock title="Language focus" text={plan.languageFocus} /><PreviewList title="Materials & resources" items={plan.materials} /><PreviewBlock title="Warm-up" text={plan.warmUp} /><PreviewBlock title="Lesson procedure" text={plan.lessonProcedure} /><PreviewBlock title="Teacher actions" text={plan.teacherActions} /><PreviewBlock title="Student actions" text={plan.studentActions} /><PreviewBlock title="Activity / project" text={plan.activity} /><PreviewBlock title="Presentation / discussion" text={plan.presentation} /><PreviewBlock title="Assessment / wrap-up" text={plan.assessment} /><PreviewBlock title="Homework" text={plan.homework} /><PreviewList title="Multimedia links" items={plan.multimediaLinks} /><PreviewBlock title="Notes" text={plan.notes} />{(plan.preparedBy || settings.teacherName) && <div className="prepared">Prepared by: {plan.preparedBy || settings.teacherName}</div>}</Card><div className="save-panel"><strong>{saved.some((item) => item.id === plan.id) ? "Keep your changes" : "A good plan deserves a home"}</strong><p>Save as a draft or mark it ready to teach.</p><div className="save-actions"><Button type="button" className="secondary-button" disabled={loading} onClick={() => save("draft")}>Save draft</Button><Button type="button" className="primary-button" disabled={loading} onClick={() => save("ready")}><Icon name="check" size={16} /> Mark ready</Button></div></div></> : <div className="empty-preview"><span className="empty-icon"><Icon name="file" size={28} /></span><h4>Your plan will take shape here</h4><p>Choose a week, add your lesson details, and create a draft to see the complete format.</p><div><span><Icon name="check" size={15} /> Clear learning objectives</span><span><Icon name="check" size={15} /> Teaching activities</span><span><Icon name="check" size={15} /> Assessment & homework</span></div></div>}</div></div></div></section></div>
      : view === "term" ? <TermSchedulePanel classes={classes} courses={courses} settings={settings} signedIn={!!session} onGenerate={generateTerm} onSignIn={() => setAuthOpen(true)} onManageClasses={() => setView("classes")} onManageCourse={() => setView("course")} />
      : view === "classes" ? <ClassesPanel classes={classes} settings={settings} signedIn={!!session} onSave={persistClass} onDelete={removeClass} onSignIn={() => setAuthOpen(true)} />
      : view === "course" ? <CoursePanel classes={classes} courses={courses} signedIn={!!session} onSave={persistCourse} onDelete={removeCourse} onSignIn={() => setAuthOpen(true)} onManageClasses={() => setView("classes")} />
      : view === "settings" ? <SettingsPanel key={`${session?.user.id ?? "guest"}:${JSON.stringify(settings)}`} settings={settings} session={session} recovery={recovery} onSave={saveSettings} onNotice={setNotice} onPasswordChanged={() => setRecovery(false)} onSignIn={() => { setAuthMode("sign-in"); setAuthMessage(""); setAuthOpen(true); }} />
      : <div className="content library-content"><div className="library-header"><div><span className="kicker">YOUR WORK</span><h1>My lesson plans</h1><p>Pick up where you left off or start something new.</p></div><Button type="button" className="primary-button" onClick={reset}><Icon name="plus" size={17} /> New lesson plan</Button></div>{session && saved.length > 0 && <div className="library-filters"><Label className="field"><span>Find a lesson plan</span><Input value={libraryQuery} onChange={(event) => setLibraryQuery(event.target.value)} placeholder="Search topic, class, category, or date" /></Label><span>{visiblePlans.length} of {saved.length} plans</span></div>}{!session ? <div className="library-empty"><span className="empty-icon"><Icon name="book" size={28} /></span><h2>Your plans, all in one place</h2><p>Sign in to save your lessons securely and see them here whenever you return.</p><Button type="button" className="primary-button" onClick={() => setAuthOpen(true)}>Sign in to continue <Icon name="arrow" size={17} /></Button></div> : saved.length === 0 ? <div className="library-empty"><span className="empty-icon"><Icon name="file" size={28} /></span><h2>No plans saved yet</h2><p>Create your first lesson plan and it will appear here.</p><Button type="button" className="primary-button" onClick={reset}>Build a lesson <Icon name="arrow" size={17} /></Button></div> : visiblePlans.length === 0 ? <div className="library-empty"><span className="empty-icon"><Icon name="file" size={28} /></span><h2>No matching plans</h2><p>Try another topic, class, category, or date.</p><Button type="button" className="secondary-button" onClick={() => setLibraryQuery("")}>Clear search</Button></div> : <div className="library-grid">{visiblePlans.map((item) => <Card className="saved-card" key={item.id}><div className="saved-top"><Badge className={`status ${item.status}`}>{item.status === "ready" ? "Ready to teach" : "Draft"}</Badge><span>WEEK {String(item.week).padStart(2, "0")}</span></div><span className="saved-icon"><Icon name="book" size={22} /></span><h2>{item.topic}</h2><p>{item.className ? `${item.className} · ` : ""}{item.subject} · {item.grade}{item.section ? ` – ${item.section}` : ""}{item.date ? ` · ${item.date}` : ""}</p><div className="saved-footer"><span>Updated {new Date(item.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span><Button type="button" onClick={() => open(item)}>Open <Icon name="arrow" size={15} /></Button></div><Button type="button" className={`delete-button ${confirmDelete === item.id ? "confirm" : ""}`} disabled={loading} onClick={() => remove(item.id)} aria-label={confirmDelete === item.id ? "Confirm deletion" : "Delete lesson plan"}>{confirmDelete === item.id ? "Confirm delete" : <Icon name="trash" size={16} />}</Button></Card>)}</div>}</div>}
    </main>
    <Dialog open={authOpen} onOpenChange={(open) => { setAuthOpen(open); if (!open) { setAuthMessage(""); setPassword(""); setConfirmPassword(""); setAuthMode("sign-in"); } }}>
      <DialogContent className="auth-modal">
        <span className="auth-symbol"><Icon name="book" size={26} /></span>
        <span className="kicker">YOUR LESSON LIBRARY</span>
        <DialogHeader>
          <DialogTitle>{authMode === "sign-up" ? "Create your account" : authMode === "reset" ? "Reset your password" : "Welcome back"}</DialogTitle>
          <DialogDescription>{authMessage || (authMode === "sign-up" ? "Create a password to keep your lesson plans and settings in your account." : authMode === "reset" ? "Enter your email and we’ll send a password reset link." : "Sign in with your email and password to continue planning.")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submitAuth}><Field label="Email address" type="email" value={email} onChange={setEmail} placeholder="you@school.edu" />{authMode !== "reset" && <Field label="Password" type="password" value={password} onChange={setPassword} placeholder={authMode === "sign-up" ? "At least 8 characters" : "Your password"} />}{authMode === "sign-up" && <Field label="Confirm password" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Repeat password" />}<Button type="submit" className="primary-button" disabled={loading || !email.trim() || (authMode !== "reset" && !password)}>{loading ? "Please wait…" : authMode === "sign-up" ? "Create account" : authMode === "reset" ? "Send reset link" : "Sign in"} <Icon name="arrow" size={17} /></Button></form>
        <div className="auth-links">{authMode === "sign-in" ? <><Button type="button" variant="ghost" onClick={() => { setAuthMode("reset"); setAuthMessage(""); }}>Forgot password?</Button><Button type="button" variant="ghost" onClick={() => { setAuthMode("sign-up"); setAuthMessage(""); }}>Create account</Button></> : <Button type="button" variant="ghost" onClick={() => { setAuthMode("sign-in"); setAuthMessage(""); }}>Back to sign in</Button>}</div>
      </DialogContent>
    </Dialog>
  </div>;
}

function PreviewBlock({ title, text }: { title: string; text: string }) { return text ? <section className="preview-block"><h3>{title}</h3><p>{text}</p></section> : null; }
function PreviewList({ title, items, inline = false }: { title: string; items: string[]; inline?: boolean }) { return items.length ? <section className="preview-block"><h3>{title}</h3>{inline ? <p>{items.join(" · ")}</p> : <ul>{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>}</section> : null; }
