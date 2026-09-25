import type { GenerateInput } from "./lesson-plan";
import { getSupabase } from "./supabase";

export type AppSettings = {
  applicationTitle: string;
  schoolName: string;
  schoolLogoPath: string;
  schoolYear: string;
  teacherName: string;
  defaultDuration: number;
  exportDriveFolder: string;
  subject: string;
  grade: string;
  section: string;
  chapter: string;
  unit: string;
  resources: string[];
};

export const maxSavedResources = 30;
export const maxResourceLength = 300;

export const defaultSettings: AppSettings = {
  applicationTitle: "Lessonleaf Lesson Plan Generator",
  schoolName: "",
  schoolLogoPath: "",
  schoolYear: "2026–2027",
  teacherName: "",
  defaultDuration: 60,
  exportDriveFolder: "",
  subject: "Science",
  grade: "Grade 1",
  section: "A",
  chapter: "Exploring Ecosystems and Everyday Matter",
  unit: "Unit 3",
  resources: ["Academic Team, Aksorn Charoen Tat Act – Textbook"],
};

export const guestSettingsKey = "lessonleaf-guest-settings";

export function readGuestSettings(): AppSettings {
  try { return parseSettings(JSON.parse(localStorage.getItem(guestSettingsKey) || "{}")); }
  catch { return defaultSettings; }
}

export function parseSettings(value: unknown): AppSettings {
  if (!value || typeof value !== "object") return defaultSettings;
  const data = value as Record<string, unknown>;
  const read = (key: keyof AppSettings, max = 300) =>
    typeof data[key] === "string" ? (data[key] as string).trim().slice(0, max) : defaultSettings[key] as string;
  const duration = Number(data.defaultDuration);
  const logoPath = typeof data.schoolLogoPath === "string" ? data.schoolLogoPath.trim() : "";
  const legacyResource = typeof data.resource === "string" ? data.resource : "";
  const resources = normalizeResources(Array.isArray(data.resources)
    ? data.resources
    : legacyResource.trim() ? [legacyResource] : defaultSettings.resources);
  return {
    applicationTitle: read("applicationTitle", 100),
    schoolName: read("schoolName", 150),
    schoolLogoPath: /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(png|jpg|webp)$/i.test(logoPath) ? logoPath : "",
    schoolYear: read("schoolYear", 30),
    teacherName: read("teacherName", 150),
    defaultDuration: Number.isInteger(duration) && duration >= 10 && duration <= 240 ? duration : defaultSettings.defaultDuration,
    exportDriveFolder: read("exportDriveFolder", 500),
    subject: read("subject", 100),
    grade: read("grade", 100),
    section: read("section", 100),
    chapter: read("chapter", 200),
    unit: read("unit", 100),
    resources,
  };
}

export function normalizeResources(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const resource = item.trim().slice(0, maxResourceLength);
    const key = resource.toLocaleLowerCase();
    if (!resource || seen.has(key)) continue;
    result.push(resource);
    seen.add(key);
    if (result.length === maxSavedResources) break;
  }
  return result;
}

export function validateSettings(settings: AppSettings) {
  if (!settings.applicationTitle.trim()) throw new Error("Enter an application title.");
  if (!settings.schoolYear.trim()) throw new Error("Enter a school year.");
  if (!Number.isInteger(settings.defaultDuration) || settings.defaultDuration < 10 || settings.defaultDuration > 240) {
    throw new Error("Default duration must be between 10 and 240 minutes.");
  }
  if (!settings.subject.trim() || !settings.grade.trim()) throw new Error("Enter a default subject and grade level.");
  if (!Array.isArray(settings.resources) || settings.resources.length > maxSavedResources) {
    throw new Error(`Add no more than ${maxSavedResources} resources or textbooks.`);
  }
  if (settings.resources.some((resource) => typeof resource !== "string" || resource.trim().length > maxResourceLength)) {
    throw new Error(`Each resource or textbook must be ${maxResourceLength} characters or fewer.`);
  }
  return parseSettings(settings);
}

export function settingsToDetails(settings: AppSettings): Partial<GenerateInput> {
  return {
    subject: settings.subject,
    grade: settings.grade,
    section: settings.section,
    schoolYear: settings.schoolYear,
    duration: settings.defaultDuration,
    chapter: settings.chapter,
    unit: settings.unit,
    resource: settings.resources[0] || "",
    preparedBy: settings.teacherName,
  };
}

export async function loadUserSettings(userId: string): Promise<AppSettings> {
  const { data, error } = await getSupabase()
    .from("user_settings")
    .select("settings")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw settingsError(error);
  return parseSettings(data?.settings);
}

export async function saveUserSettings(userId: string, settings: AppSettings): Promise<AppSettings> {
  const valid = validateSettings(settings);
  const { data, error } = await getSupabase()
    .from("user_settings")
    .upsert({ user_id: userId, settings: valid, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select("settings")
    .single();
  if (error) throw settingsError(error);
  return parseSettings(data.settings);
}

function settingsError(error: { code?: string }) {
  if (error.code === "PGRST205" || error.code === "42P01") {
    return new Error("Settings storage is not ready. Apply the settings migration in Supabase.");
  }
  return new Error("Could not access settings. Please try again.");
}
