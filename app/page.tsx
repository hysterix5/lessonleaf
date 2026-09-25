"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import { ArrowRight, BookOpen, BookOpenText, CalendarRange, Check, CircleHelp, Clock3, FileText, LayoutGrid, Plus, Printer, School, Settings2, Sparkles, Trash2, type LucideIcon } from "lucide-react";
import { ClassesPanel } from "@/components/classes-panel";
import { CoursePanel } from "@/components/course-panel";
import { ErrorAlert } from "@/components/error-alert";
import { GenerationModeSelect, type GenerationMode } from "@/components/generation-mode-select";
import { GuidePanel } from "@/components/guide-panel";
import { CoursePrintDocument, LessonLibrary } from "@/components/lesson-library";
import { LessonPreview, type PrintTemplate } from "@/components/lesson-preview";
import { ResourceSelect } from "@/components/resource-select";
import { SettingsPanel } from "@/components/settings-panel";
import { SinglePlanSource } from "@/components/single-plan-source";
import { TermSchedulePanel } from "@/components/term-schedule-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { generatePlan, parseGenerateInput, parseLessonCategory, weekPresets, type GenerateInput, type LessonPlan } from "@/lib/lesson-plan";
import { createPlan, createPlans, deletePlan, getSupabase, listPlans, updatePlan } from "@/lib/supabase";
import { deleteClass, deleteCourse, listClasses, listCourses, saveClass, saveCourse, type ClassInput, type ClassRecord, type CourseInput, type CourseOverview } from "@/lib/catalog";
import { buildTermPlans, type TermScheduleInput } from "@/lib/term-schedule";
import { defaultSettings, guestSettingsKey, loadUserSettings, readGuestSettings, saveUserSettings, settingsToDetails, validateSettings, type AppSettings } from "@/lib/settings";
import { errorMessage } from "@/lib/feedback";
import { useSchoolLogo } from "@/lib/use-school-logo";
import { generateAiLessonDrafts } from "@/app/actions/generate-ai";
import { aiLessonRequest, applyAiLessonContent, maxAiTermPlans } from "@/lib/ai-content";
import type { CoursePlanGroup } from "@/lib/lesson-library";

type View = "builder" | "term" | "classes" | "course" | "library" | "settings" | "guide";
type Tab = "goals" | "flow" | "finish";
type AuthMode = "sign-in" | "sign-up" | "reset";

const starter: GenerateInput = {
  subject: "Science", grade: "Grade 1", section: "A", schoolYear: "2026–2027", week: 1,
  topic: "Introduction of Habitats", date: "", duration: 60,
  chapter: "Exploring Ecosystems and Everyday Matter", unit: "Unit 3",
  resource: "Academic Team, Aksorn Charoen Tat Act – Textbook", pages: "", preparedBy: "",
};
const workingDraftKey = "lessonleaf-working-draft";

function Icon({ name, size = 19 }: { name: string; size?: number }) {
  const icons: Record<string, LucideIcon> = { book: BookOpen, grid: LayoutGrid, file: FileText, settings: Settings2, guide: CircleHelp, calendar: CalendarRange, school: School, course: BookOpenText, spark: Sparkles, arrow: ArrowRight, plus: Plus, check: Check, print: Printer, trash: Trash2, clock: Clock3 };
  const Component = icons[name];
  return Component ? <Component size={size} strokeWidth={1.8} aria-hidden="true" /> : null;
}

function Field({ label, value, onChange, type = "text", placeholder, required = false, min, max }: { label: string; value: string | number; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean; min?: number; max?: number }) {
  return <Label className="field"><span>{label}{required && <b className="required-mark"> *</b>}</span><Input type={type} value={value} placeholder={placeholder} required={required} min={min} max={max} onChange={(event) => onChange(event.target.value)} /></Label>;
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
  const [singleCategory, setSingleCategory] = useState("");
  const [singleGenerationMode, setSingleGenerationMode] = useState<GenerationMode>("template");
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [printTemplate, setPrintTemplate] = useState<PrintTemplate>("normal");
  const [printCourse, setPrintCourse] = useState<CoursePlanGroup | null>(null);
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
  const [authError, setAuthError] = useState<string | null>(null);
  const [recovery, setRecovery] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { logoUrl, logoError } = useSchoolLogo(session?.user.id, settings.schoolLogoPath);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    const loadCatalog = () => {
      void Promise.all([listClasses(), listCourses()]).then(([classList, courseList]) => {
        if (active) { setClasses(classList); setCourses(courseList); }
      }).catch((error) => { if (active) setErrorNotice(errorMessage(error, "Could not load classes and courses.")); });
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
          if (restored.plan?.id && restored.details?.topic) { setPlan(restored.plan); setDetails(restored.details); setSingleCategory(restored.plan.category || ""); hasWorkingDraft = true; }
        }
      } catch { localStorage.removeItem(workingDraftKey); }
      try {
        const client = getSupabase();
        const { data: authListener } = client.auth.onAuthStateChange((event, nextSession) => {
          if (!active) return;
          setSession(nextSession);
          if (event === "SIGNED_OUT") { setSaved([]); setClasses([]); setCourses([]); setSettings(readGuestSettings()); setRecovery(false); }
          if (event === "PASSWORD_RECOVERY") { setRecovery(true); setView("settings"); setAuthOpen(false); toast.info("Set a new password in Account & password."); }
          if (event === "SIGNED_IN" && nextSession) {
            setAuthOpen(false); setPassword(""); setConfirmPassword(""); setAuthError(null); setAuthMode("sign-in");
            setTimeout(() => {
              void listPlans().then((plans) => { if (active) setSaved(plans); })
                .catch((error) => { if (active) setErrorNotice(errorMessage(error, "Could not load plans.")); });
              void loadUserSettings(nextSession.user.id).then((loaded) => {
                if (!active) return;
                setSettings(loaded);
                if (!localStorage.getItem(workingDraftKey)) setDetails((current) => ({ ...current, ...settingsToDetails(loaded) }));
              }).catch((error) => { if (active) setErrorNotice(errorMessage(error, "Could not load settings.")); });
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
            .catch((error) => { if (active) setErrorNotice(errorMessage(error, "Could not load plans.")); });
          void loadUserSettings(data.session.user.id).then((loaded) => {
            if (!active) return;
            setSettings(loaded);
            if (!hasWorkingDraft) setDetails((current) => ({ ...current, ...settingsToDetails(loaded) }));
          }).catch((error) => { if (active) setErrorNotice(errorMessage(error, "Could not load settings.")); });
        }
      } catch (error) {
        if (active) setErrorNotice(errorMessage(error, "Could not connect to Supabase."));
      }
    })();
    return () => { active = false; unsubscribe(); };
  }, []);

  useEffect(() => {
    if (plan) localStorage.setItem(workingDraftKey, JSON.stringify({ plan, details }));
  }, [plan, details]);

  useEffect(() => { document.title = settings.applicationTitle || "Lessonleaf"; }, [settings.applicationTitle]);

  useEffect(() => {
    if (!printCourse) return;
    const finishPrinting = () => setPrintCourse(null);
    window.addEventListener("afterprint", finishPrinting);
    const frame = window.requestAnimationFrame(() => window.print());
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("afterprint", finishPrinting); };
  }, [printCourse]);

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

  async function enrichWithAi(plans: LessonPlan[]): Promise<LessonPlan[]> {
    const { data, error } = await getSupabase().auth.getSession();
    if (error || !data.session) throw new Error("Sign in again to use AI generation.");
    let result: Awaited<ReturnType<typeof generateAiLessonDrafts>>;
    try { result = await generateAiLessonDrafts(data.session.access_token, plans.map(aiLessonRequest)); }
    catch { throw new Error("AI generation was interrupted. Refresh the page and try again."); }
    if (!result.ok) throw new Error(result.error);
    return plans.map((item, index) => applyAiLessonContent(item, result.lessons[index]));
  }

  async function generate() {
    setBuilderError(null);
    try {
      const category = parseLessonCategory(singleCategory);
      const classRecord = classes.find((item) => item.id === singleClassId);
      const overview = courses.find((item) => item.id === singleCourseId && item.classId === classRecord?.id);
      const courseWeek = overview?.weeks.find((item) => item.week === details.week);
      if (overview && !courseWeek) throw new Error(`Choose a topic for week ${details.week} in the course overview.`);
      const draft: LessonPlan = {
        ...generatePlan(parseGenerateInput(details), courseWeek ? { focus: courseWeek.focus, activity: courseWeek.activity, presentationGoal: courseWeek.presentationGoal } : undefined),
        category, classId: classRecord?.id, className: classRecord?.name, courseOverviewId: overview?.id,
      };
      if (singleGenerationMode === "ai" && !session) { setAuthOpen(true); return; }
      if (singleGenerationMode === "ai") setLoading(true);
      const result = singleGenerationMode === "ai" ? (await enrichWithAi([draft]))[0] : draft;
      setSingleCategory(category);
      setPlan(result); setTab("goals");
      toast.success(singleGenerationMode === "ai" ? "AI draft created. Review the lesson before saving." : "Draft created. Review each section before saving.");
    } catch (error) { setBuilderError(errorMessage(error, "Could not create a draft.")); }
    finally { setLoading(false); }
  }

  async function save(status: "draft" | "ready") {
    if (!plan) return;
    if (!session) { setAuthOpen(true); return; }
    setLoading(true); setPreviewError(null);
    try {
      const nextPlan = { ...plan, category: parseLessonCategory(singleCategory), status };
      const exists = saved.some((item) => item.id === plan.id);
      const result = exists ? await updatePlan(nextPlan) : await createPlan(nextPlan);
      setPlan(result);
      setSaved((current) => [result, ...current.filter((item) => item.id !== result.id)]);
      toast.success(status === "ready" ? "Lesson plan saved and marked ready." : "Draft saved successfully.");
    } catch (error) { setPreviewError(errorMessage(error, "Could not save the plan.")); }
    finally { setLoading(false); }
  }

  async function remove(id: string) {
    if (confirmDelete !== id) { setConfirmDelete(id); return; }
    setLoading(true);
    try {
      await deletePlan(id);
      setSaved((current) => current.filter((item) => item.id !== id));
      if (plan?.id === id) { setPlan(null); localStorage.removeItem(workingDraftKey); }
      setConfirmDelete(null); toast.success("Lesson plan deleted.");
    } catch (error) { setErrorNotice(errorMessage(error, "Could not delete the plan.")); }
    finally { setLoading(false); }
  }

  function open(savedPlan: LessonPlan) {
    setPlan(savedPlan);
    setSingleClassId(savedPlan.classId || ""); setSingleCourseId(savedPlan.courseOverviewId || ""); setSingleCategory(savedPlan.category || "Regular");
    setDetails({ subject: savedPlan.subject, grade: savedPlan.grade, section: savedPlan.section, schoolYear: savedPlan.schoolYear, week: savedPlan.week, topic: savedPlan.topic, date: savedPlan.date, duration: savedPlan.duration, chapter: savedPlan.chapter, unit: savedPlan.unit, resource: savedPlan.resource, pages: savedPlan.pages, preparedBy: savedPlan.preparedBy });
    setTab("goals"); setView("builder"); setBuilderError(null); setPreviewError(null);
  }

  function reset() { setPlan(null); localStorage.removeItem(workingDraftKey); setDetails({ ...starter, ...settingsToDetails(settings) }); setSingleClassId(""); setSingleCourseId(""); setSingleCategory(""); setTab("goals"); setView("builder"); setBuilderError(null); setPreviewError(null); }

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
    const valid = validateSettings(next);
    if (session) {
      const savedSettings = await saveUserSettings(session.user.id, valid);
      setSettings(savedSettings);
      toast.success("Settings saved to your account.");
    } else {
      localStorage.setItem(guestSettingsKey, JSON.stringify(valid));
      setSettings(valid);
      toast.info("Settings saved in this browser. Sign in and save again to sync them to your account.", { duration: 6500 });
    }
  }

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setAuthError(null);
    try {
      const address = email.trim();
      if (authMode === "sign-up" && password.length < 8) throw new Error("Use a password with at least 8 characters.");
      if (authMode === "sign-up" && password !== confirmPassword) throw new Error("The passwords do not match.");
      if (authMode === "sign-in") {
        const { error } = await getSupabase().auth.signInWithPassword({ email: address, password });
        if (error) throw error;
        setAuthOpen(false); setPassword(""); toast.success("Signed in successfully.");
      } else if (authMode === "sign-up") {
        const { data, error } = await getSupabase().auth.signUp({ email: address, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        if (data.session) { setAuthOpen(false); setPassword(""); setConfirmPassword(""); toast.success("Account created. You are signed in."); }
        else { setAuthOpen(false); setPassword(""); setConfirmPassword(""); toast.info(`Check ${address} to confirm your account, then sign in with your password.`, { duration: 8000 }); }
      } else {
        const { error } = await getSupabase().auth.resetPasswordForEmail(address, { redirectTo: window.location.origin });
        if (error) throw error;
        setAuthOpen(false); toast.info(`If ${address} has an account, a password reset email is on its way.`, { duration: 8000 });
      }
    }
    catch (error) { setAuthError(errorMessage(error, "Could not access your account.")); }
    finally { setLoading(false); }
  }

  async function persistClass(input: ClassInput, id?: string) {
    if (!session) throw new Error("Sign in to save classes.");
    const result = await saveClass(session.user.id, input, id);
    setClasses((current) => [result, ...current.filter((item) => item.id !== result.id)].sort((a, b) => a.name.localeCompare(b.name)));
    toast.success(id ? "Class updated." : "Class created.");
    return result;
  }

  async function removeClass(id: string) {
    if (!session) throw new Error("Sign in to delete classes.");
    await deleteClass(session.user.id, id);
    setClasses((current) => current.filter((item) => item.id !== id));
    setCourses((current) => current.filter((item) => item.classId !== id));
    toast.success("Class and its course overviews deleted.");
  }

  async function persistCourse(input: CourseInput, id?: string) {
    if (!session) throw new Error("Sign in to save course overviews.");
    const result = await saveCourse(session.user.id, input, id);
    setCourses((current) => [result, ...current.filter((item) => item.id !== result.id)]);
    toast.success(id ? "Course overview updated." : "Course overview created.");
    return result;
  }

  async function removeCourse(id: string) {
    if (!session) throw new Error("Sign in to delete course overviews.");
    await deleteCourse(session.user.id, id);
    setCourses((current) => current.filter((item) => item.id !== id));
    toast.success("Course overview deleted.");
  }

  async function generateTerm(input: TermScheduleInput, mode: GenerationMode) {
    if (!session) { setAuthOpen(true); throw new Error("Sign in to save term lessons."); }
    const drafts = buildTermPlans(input, settings);
    if (mode === "ai" && drafts.length > maxAiTermPlans) {
      throw new Error(`AI generation supports up to ${maxAiTermPlans} lessons at a time. Reduce the schedule or use Smart Template.`);
    }
    const completeDrafts = mode === "ai" ? await enrichWithAi(drafts) : drafts;
    const created = await createPlans(completeDrafts);
    if (created.length !== drafts.length) throw new Error("Some lesson drafts could not be saved. Refresh your library before trying again.");
    setSaved((current) => [...created, ...current]);
    setView("library");
    toast.success(`${created.length} editable ${mode === "ai" ? "AI " : ""}lesson ${created.length === 1 ? "draft" : "drafts"} created for ${input.classRecord.name}.`);
  }

  async function logout() {
    setErrorNotice(null);
    try {
      const { error } = await getSupabase().auth.signOut({ scope: "local" });
      if (error) throw error;
      localStorage.removeItem(workingDraftKey); setSession(null); setSaved([]); setClasses([]); setCourses([]); setPlan(null); setDetails(starter); setView("builder"); toast.success("You are signed out.");
    } catch (error) { setErrorNotice(errorMessage(error, "Could not sign out. Please try again.")); }
  }

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><span className="brand-mark"><Icon name="book" size={23} /></span><span>lesson<em>leaf</em><small>PLANNING STUDIO</small></span></div><div className="side-label">WORKSPACE</div><nav className="side-nav" aria-label="Main navigation"><Button type="button" className={view === "builder" || view === "term" ? "active" : ""} onClick={() => setView("builder")}><Icon name="grid" /> Generate plans</Button><Button type="button" className={view === "classes" ? "active" : ""} onClick={() => setView("classes")}><Icon name="school" /> Classes</Button><Button type="button" className={view === "course" ? "active" : ""} onClick={() => setView("course")}><Icon name="course" /> Course</Button><Button type="button" className={view === "library" ? "active" : ""} onClick={() => setView("library")}><Icon name="file" /> My lesson plans <span className="nav-count">{saved.length}</span></Button><Button type="button" className={view === "settings" ? "active" : ""} onClick={() => setView("settings")}><Icon name="settings" /> Settings</Button><Button type="button" className={view === "guide" ? "active" : ""} onClick={() => { setView("guide"); window.scrollTo(0, 0); }}><Icon name="guide" /> Guide</Button></nav><div className="sidebar-bottom"><div className="reference-card"><span className="reference-symbol"><Icon name="book" /></span><strong>Reference material</strong><p>Built around the Grade 1 Science plan you shared.</p><a href="/Lesson%20Plan%20sample.pdf" target="_blank" rel="noopener noreferrer">View sample PDF <Icon name="arrow" size={15} /></a></div><span>A calmer way to plan your week.</span></div></aside>
    <main className="main-area" data-printing-course={!!printCourse}><header className="topbar"><div className="mobile-brand">lesson<em>leaf</em></div><span className="breadcrumb">Workspace <b>/</b> {view === "builder" || view === "term" ? "Generate lesson plan" : view === "classes" ? "Classes" : view === "course" ? "Course" : view === "settings" ? "Settings" : view === "guide" ? "Guide" : "My lesson plans"}</span><div className="top-actions"><Badge className="mode-pill"><i /> Template &amp; AI drafting</Badge>{session ? <Button type="button" className="account-button" onClick={logout} title="Sign out">{session.user?.email?.slice(0, 1).toUpperCase() || "✓"}<span>Sign out</span></Button> : <Button type="button" className="sign-in-button" onClick={() => setAuthOpen(true)}>Sign in</Button>}</div></header>
      <nav className="mobile-nav" aria-label="Mobile navigation"><Button type="button" className={view === "builder" || view === "term" ? "active" : ""} onClick={() => setView("builder")}><Icon name="grid" size={16} /> Generate</Button><Button type="button" className={view === "classes" ? "active" : ""} onClick={() => setView("classes")}><Icon name="school" size={16} /> Classes</Button><Button type="button" className={view === "course" ? "active" : ""} onClick={() => setView("course")}><Icon name="course" size={16} /> Course</Button><Button type="button" className={view === "library" ? "active" : ""} onClick={() => setView("library")}><Icon name="file" size={16} /> Plans</Button><Button type="button" className={view === "settings" ? "active" : ""} onClick={() => setView("settings")}><Icon name="settings" size={16} /> Settings</Button><Button type="button" className={view === "guide" ? "active" : ""} onClick={() => { setView("guide"); window.scrollTo(0, 0); }}><Icon name="guide" size={16} /> Guide</Button></nav>
      {errorNotice && <div className="page-error"><ErrorAlert title="Something went wrong" message={errorNotice} onDismiss={() => setErrorNotice(null)} /></div>}
      {(view === "builder" || view === "term") && <div className="generator-switch"><div><span className="kicker">PLAN YOUR TEACHING</span><h1>Generate Lesson Plan</h1><p>Create one detailed plan or build every scheduled lesson for a full term.</p></div><div className="generator-tabs" role="group" aria-label="Generation type"><Button type="button" className={view === "builder" ? "active" : ""} onClick={() => setView("builder")}>Single Plan</Button><Button type="button" className={view === "term" ? "active" : ""} onClick={() => setView("term")}>Term Schedule</Button></div></div>}
      {view === "builder" ? <div className="content"><section className="hero"><div className="hero-content"><span className="eyebrow"><i /> YOUR PLANNING SPACE</span><h1>Thoughtful lessons,<br /><em>beautifully planned.</em></h1><p>Start with the eight-week outline from your sample, shape every section to suit your class, and keep each plan ready to teach.</p><Button type="button" className="hero-cta" onClick={() => document.getElementById("builder")?.scrollIntoView({ behavior: "smooth" })}>Create a lesson plan <Icon name="arrow" size={18} /></Button></div><div className="hero-art" aria-hidden="true"><div className="orbit one" /><div className="orbit two" /><div className="art-paper"><span>LESSON PLAN</span><strong>Science & discovery</strong><i className="art-line wide" /><i className="art-line" /><i className="art-line short" /><b><Icon name="check" size={15} /> Ready to teach</b></div><span className="art-star">✳</span></div></section>
        <section className="curriculum"><div className="section-heading"><div><span className="kicker">A PLACE TO BEGIN</span><h2>Explore the sample sequence</h2><p>Choose a week to load its topic and activity ideas.</p></div><a className="text-link" href="/Lesson%20Plan%20sample.pdf" target="_blank" rel="noopener noreferrer">Open reference PDF <Icon name="arrow" size={16} /></a></div><div className="week-grid">{weekPresets.map((item) => <Button type="button" key={item.week} className={`week-card ${details.week === item.week && details.topic === item.topic ? "selected" : ""}`} onClick={() => pickWeek(item.week)}><span className="week-top"><span className="week-number">{String(item.week).padStart(2, "0")}</span><Badge className="unit">{item.unit}</Badge></span><strong>{item.topic}</strong><span className="week-bottom">Week {item.week} <Icon name="arrow" size={16} /></span></Button>)}</div></section>
        <section className="builder" id="builder"><div className="section-heading"><div><span className="kicker">MAKE IT YOURS</span><h2>Build your lesson</h2><p>Fill in the basics, create a structured draft, then refine it section by section.</p></div><Badge className="format-pill"><Icon name="spark" size={15} /> Based on the sample format</Badge></div><div className="builder-grid"><div className="editor-column"><Card className="card"><div className="card-heading"><span className="step">01</span><div><h3>Lesson details</h3><p>The starting point for your plan</p></div></div><p className="required-hint"><b className="required-mark">*</b> Required fields</p><SinglePlanSource classes={classes} courses={courses} classId={singleClassId} courseId={singleCourseId} category={singleCategory} week={details.week} onClassChange={selectSingleClass} onCourseChange={selectSingleCourse} onCategoryChange={(value) => { setSingleCategory(value); setPlan((current) => current ? { ...current, category: value } : null); }} onCourseWeekChange={selectSingleCourseWeek} /><div className="form-grid"><Field label="Subject" required placeholder="e.g. Science" value={details.subject} onChange={(v) => changeDetail("subject", v)} /><Field label="Grade level" required placeholder="e.g. Grade 1" value={details.grade} onChange={(v) => changeDetail("grade", v)} /><Field label="Section" value={details.section} onChange={(v) => changeDetail("section", v)} placeholder="e.g. A" /><Field label="School year" required placeholder="e.g. 2026–2027" value={details.schoolYear} onChange={(v) => changeDetail("schoolYear", v)} /><Field label="Week" type="number" min={1} max={52} required value={details.week} onChange={(v) => changeDetail("week", Number(v))} /><Field label="Date" type="date" value={details.date} onChange={(v) => changeDetail("date", v)} /><div className="span-2"><Field label="Lesson topic" required value={details.topic} onChange={(v) => changeDetail("topic", v)} placeholder="What will your class explore?" /></div><Field label="Duration (minutes)" type="number" min={10} max={240} required placeholder="e.g. 60" value={details.duration} onChange={(v) => changeDetail("duration", Number(v))} /><Field label="Unit" value={details.unit} onChange={(v) => changeDetail("unit", v)} /><div className="span-2"><Field label="Chapter" value={details.chapter} onChange={(v) => changeDetail("chapter", v)} /></div><div className="span-2"><ResourceSelect key={plan?.id || "new"} resources={settings.resources} value={details.resource} onChange={(value) => changeDetail("resource", value)} /></div><Field label="Pages" value={details.pages} onChange={(v) => changeDetail("pages", v)} placeholder="e.g. 71–85" /><Field label="Prepared by" value={details.preparedBy} onChange={(v) => changeDetail("preparedBy", v)} placeholder="Teacher name" /></div><GenerationModeSelect value={singleGenerationMode} disabled={loading} onChange={(value) => { setSingleGenerationMode(value); setBuilderError(null); }} /><Button type="button" className="primary-button generate-button" disabled={loading} onClick={generate}><Icon name="spark" size={17} /> {loading ? "Writing with AI…" : singleGenerationMode === "ai" ? plan ? "Create a fresh AI draft" : "Create AI lesson draft" : plan ? "Create a fresh draft" : "Create lesson draft"} <Icon name="arrow" size={17} /></Button>{builderError && <ErrorAlert title="Could not create draft" message={builderError} className="form-error" />}<p className="helper">{singleGenerationMode === "ai" ? "AI drafts are editable. Review the content before saving or teaching." : "The draft uses a structured template. You can edit every section."}</p></Card>
          {plan && <Card className="card edit-card"><div className="card-heading"><span className="step">02</span><div><h3>Shape the content</h3><p>Review the teaching details</p></div></div><Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}><TabsList className="editor-tabs" aria-label="Lesson sections"><TabsTrigger value="goals">Goals & resources</TabsTrigger><TabsTrigger value="flow">Teaching flow</TabsTrigger><TabsTrigger value="finish">Assessment & more</TabsTrigger></TabsList></Tabs><div className="editor-fields">{tab === "goals" && <><Area label="Core goal" value={plan.coreGoal} onChange={(v) => update("coreGoal", v)} /><Area label="Key focus" value={plan.keyFocus} onChange={(v) => update("keyFocus", v)} /><ListArea key={plan.id + "-objectives"} label="Learning objectives" items={plan.objectives} onChange={(v) => update("objectives", v)} rows={5} hint="One objective per line" /><ListArea key={plan.id + "-vocabulary"} label="Target vocabulary" items={plan.vocabulary} onChange={(v) => update("vocabulary", v)} hint="One word or phrase per line" /><Area label="Language focus" value={plan.languageFocus} onChange={(v) => update("languageFocus", v)} /><ListArea key={plan.id + "-materials"} label="Materials & resources" items={plan.materials} onChange={(v) => update("materials", v)} rows={4} hint="One material per line" /></>}{tab === "flow" && <><Area label="Warm-up" value={plan.warmUp} onChange={(v) => update("warmUp", v)} rows={4} /><Area label="Lesson procedure" value={plan.lessonProcedure} onChange={(v) => update("lessonProcedure", v)} rows={9} /><Area label="Teacher actions" value={plan.teacherActions} onChange={(v) => update("teacherActions", v)} /><Area label="Student actions" value={plan.studentActions} onChange={(v) => update("studentActions", v)} /><Area label="Activity / project" value={plan.activity} onChange={(v) => update("activity", v)} /><Area label="Presentation / discussion" value={plan.presentation} onChange={(v) => update("presentation", v)} /></>}{tab === "finish" && <><Area label="Assessment / wrap-up" value={plan.assessment} onChange={(v) => update("assessment", v)} /><Area label="Homework" value={plan.homework} onChange={(v) => update("homework", v)} /><ListArea key={plan.id + "-links"} label="Multimedia links" items={plan.multimediaLinks} onChange={(v) => update("multimediaLinks", v)} hint="One link per line" /><Area label="Notes" value={plan.notes} onChange={(v) => update("notes", v)} /></>}</div></Card>}</div>
          <div className="preview-column"><div className="preview-sticky"><div className="preview-heading"><div><span className="kicker">THE FINISHED VIEW</span><h3>Lesson preview</h3></div>{plan && <Button type="button" className="print-button" onClick={() => window.print()} aria-label="Print or save lesson plan as PDF" title="Print or save as PDF"><Icon name="print" /></Button>}</div>
            {plan && <div className="template-selector"><span>Print template</span><div role="group" aria-label="Print template"><Button type="button" className={`template-option ${printTemplate === "normal" ? "selected" : ""}`} aria-pressed={printTemplate === "normal"} onClick={() => setPrintTemplate("normal")}>Normal layout</Button><Button type="button" className={`template-option ${printTemplate === "styled" ? "selected" : ""}`} aria-pressed={printTemplate === "styled"} onClick={() => setPrintTemplate("styled")}>Styled layout</Button></div></div>}
            {plan ? <><LessonPreview plan={plan} settings={settings} logoUrl={logoUrl} template={printTemplate} /><div className="save-panel"><strong>{saved.some((item) => item.id === plan.id) ? "Keep your changes" : "A good plan deserves a home"}</strong><p>Save as a draft or mark it ready to teach.</p>{previewError && <ErrorAlert title="Could not save plan" message={previewError} className="form-error" />}<div className="save-actions"><Button type="button" className="secondary-button" disabled={loading} onClick={() => save("draft")}>Save draft</Button><Button type="button" className="primary-button" disabled={loading} onClick={() => save("ready")}><Icon name="check" size={16} /> Mark ready</Button></div></div></> : <div className="empty-preview"><span className="empty-icon"><Icon name="file" size={28} /></span><h4>Your plan will take shape here</h4><p>Choose a week, add your lesson details, and create a draft to see the complete format.</p><div><span><Icon name="check" size={15} /> Clear learning objectives</span><span><Icon name="check" size={15} /> Teaching activities</span><span><Icon name="check" size={15} /> Assessment & homework</span></div></div>}</div></div></div></section></div>
      : view === "term" ? <TermSchedulePanel classes={classes} courses={courses} settings={settings} signedIn={!!session} onGenerate={generateTerm} onSignIn={() => setAuthOpen(true)} onManageClasses={() => setView("classes")} onManageCourse={() => setView("course")} />
      : view === "classes" ? <ClassesPanel classes={classes} settings={settings} signedIn={!!session} onSave={persistClass} onDelete={removeClass} onSignIn={() => setAuthOpen(true)} />
      : view === "course" ? <CoursePanel classes={classes} courses={courses} signedIn={!!session} onSave={persistCourse} onDelete={removeCourse} onSignIn={() => setAuthOpen(true)} onManageClasses={() => setView("classes")} />
      : view === "settings" ? <SettingsPanel key={`${session?.user.id ?? "guest"}:${JSON.stringify(settings)}`} settings={settings} session={session} recovery={recovery} logoUrl={logoUrl} logoError={logoError} onSave={saveSettings} onPasswordChanged={() => setRecovery(false)} onSignIn={() => { setAuthMode("sign-in"); setAuthError(null); setAuthOpen(true); }} />
      : view === "guide" ? <GuidePanel signedIn={!!session} onNavigate={(destination) => { setView(destination); window.scrollTo(0, 0); }} onSignIn={() => setAuthOpen(true)} />
      : <LessonLibrary signedIn={!!session} plans={saved} courses={courses} classes={classes} query={libraryQuery} onQueryChange={setLibraryQuery} onNew={reset} onSignIn={() => setAuthOpen(true)} onOpen={open} onDelete={remove} confirmDelete={confirmDelete} deleting={loading} template={printTemplate} onTemplateChange={setPrintTemplate} onPrintCourse={setPrintCourse} />}
      {printCourse && <CoursePrintDocument group={printCourse} template={printTemplate} settings={settings} logoUrl={logoUrl} />}
    </main>
    <Dialog open={authOpen} onOpenChange={(open) => { setAuthOpen(open); if (!open) { setAuthError(null); setPassword(""); setConfirmPassword(""); setAuthMode("sign-in"); } }}>
      <DialogContent className="auth-modal">
        <span className="auth-symbol"><Icon name="book" size={26} /></span>
        <span className="kicker">YOUR LESSON LIBRARY</span>
        <DialogHeader>
          <DialogTitle>{authMode === "sign-up" ? "Create your account" : authMode === "reset" ? "Reset your password" : "Welcome back"}</DialogTitle>
          <DialogDescription>{authMode === "sign-up" ? "Create a password to keep your lesson plans and settings in your account." : authMode === "reset" ? "Enter your email and we’ll send a password reset link." : "Sign in with your email and password to continue planning."}</DialogDescription>
        </DialogHeader>
        {authError && <ErrorAlert title="Could not continue" message={authError} />}
        <form onSubmit={submitAuth} onChange={() => setAuthError(null)}><Field label="Email address" type="email" value={email} onChange={setEmail} placeholder="you@school.edu" />{authMode !== "reset" && <Field label="Password" type="password" value={password} onChange={setPassword} placeholder={authMode === "sign-up" ? "At least 8 characters" : "Your password"} />}{authMode === "sign-up" && <Field label="Confirm password" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Repeat password" />}<Button type="submit" className="primary-button" disabled={loading || !email.trim() || (authMode !== "reset" && !password)}>{loading ? "Please wait…" : authMode === "sign-up" ? "Create account" : authMode === "reset" ? "Send reset link" : "Sign in"} <Icon name="arrow" size={17} /></Button></form>
        <div className="auth-links">{authMode === "sign-in" ? <><Button type="button" variant="ghost" onClick={() => { setAuthMode("reset"); setAuthError(null); }}>Forgot password?</Button><Button type="button" variant="ghost" onClick={() => { setAuthMode("sign-up"); setAuthError(null); }}>Create account</Button></> : <Button type="button" variant="ghost" onClick={() => { setAuthMode("sign-in"); setAuthError(null); }}>Back to sign in</Button>}</div>
      </DialogContent>
    </Dialog>
  </div>;
}
