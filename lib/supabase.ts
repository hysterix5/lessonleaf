import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parseLessonPlan, type LessonPlan } from "./lesson-plan";

type PlanRow = { id: string; plan: LessonPlan; created_at: string; updated_at: string };
let browserClient: SupabaseClient | null = null;

export function getSupabase() {
  if (browserClient) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured for this app.");
  browserClient = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return browserClient;
}

function planError(error: { code?: string; message?: string }) {
  if (error.code === "PGRST205" || error.code === "42P01") {
    return new Error("The lesson plan database is not ready. Apply the Supabase migration first.");
  }
  if (error.code === "42501") return new Error("You do not have access to this lesson plan.");
  return new Error("Could not access lesson plans. Please try again.");
}

function normalize(row: PlanRow): LessonPlan {
  return { ...row.plan, id: row.id, createdAt: row.created_at, updatedAt: row.updated_at };
}

export async function listPlans() {
  const pageSize = 1000;
  const rows: PlanRow[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await getSupabase()
      .from("lesson_plans")
      .select("id,plan,created_at,updated_at")
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw planError(error);
    const page = data as PlanRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows.map(normalize);
}

export async function createPlan(plan: LessonPlan) {
  const validPlan = parseLessonPlan(plan);
  const now = new Date().toISOString();
  const { data, error } = await getSupabase()
    .from("lesson_plans")
    .insert({ id: validPlan.id, plan: { ...validPlan, createdAt: now, updatedAt: now } })
    .select("id,plan,created_at,updated_at")
    .single();
  if (error) throw planError(error);
  return normalize(data as PlanRow);
}

export async function createPlans(plans: LessonPlan[]) {
  if (!plans.length) return [];
  const validPlans = plans.map(parseLessonPlan);
  const { data, error } = await getSupabase()
    .from("lesson_plans")
    .insert(validPlans.map((plan) => ({ id: plan.id, plan })))
    .select("id,plan,created_at,updated_at");
  if (error) throw planError(error);
  return (data as PlanRow[]).map(normalize);
}

export async function updatePlan(plan: LessonPlan) {
  const validPlan = parseLessonPlan(plan);
  const now = new Date().toISOString();
  const { data, error } = await getSupabase()
    .from("lesson_plans")
    .update({ plan: { ...validPlan, updatedAt: now }, updated_at: now })
    .eq("id", validPlan.id)
    .select("id,plan,created_at,updated_at")
    .maybeSingle();
  if (error) throw planError(error);
  if (!data) throw new Error("Lesson plan not found.");
  return normalize(data as PlanRow);
}

export async function deletePlan(id: string) {
  const { data, error } = await getSupabase()
    .from("lesson_plans")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw planError(error);
  if (!data) throw new Error("Lesson plan not found.");
}
