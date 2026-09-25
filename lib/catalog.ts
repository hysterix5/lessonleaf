import { getSupabase } from "./supabase";

export type ClassInput = {
  name: string;
  subject: string;
  grade: string;
  section: string;
  schoolYear: string;
  meetingDays: number[];
  duration: number;
};

export type ClassRecord = ClassInput & { id: string; createdAt: string; updatedAt: string };

export type CourseWeek = {
  week: number;
  topic: string;
  unit: string;
  focus: string;
  activity: string;
  presentationGoal: string;
};

export type CourseInput = {
  classId: string;
  title: string;
  description: string;
  weeks: CourseWeek[];
};

export type CourseOverview = CourseInput & { id: string; createdAt: string; updatedAt: string };

type ClassRow = {
  id: string; name: string; subject: string; grade: string; section: string;
  school_year: string; meeting_days: number[]; duration_minutes: number;
  created_at: string; updated_at: string;
};
type CourseRow = {
  id: string; class_id: string; title: string; description: string; weeks: CourseWeek[];
  created_at: string; updated_at: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function catalogError(error: { code?: string }) {
  if (error.code === "PGRST205" || error.code === "42P01") return new Error("Class and course storage is not ready. Apply the classes and courses migration in Supabase.");
  if (error.code === "23503") return new Error("Choose a class that belongs to your account.");
  if (error.code === "42501") return new Error("You do not have access to this class or course.");
  return new Error("Could not access classes and courses. Please try again.");
}

function normalizeClass(row: ClassRow): ClassRecord {
  return {
    id: row.id, name: row.name, subject: row.subject, grade: row.grade,
    section: row.section, schoolYear: row.school_year, meetingDays: row.meeting_days,
    duration: row.duration_minutes, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function normalizeCourse(row: CourseRow): CourseOverview {
  return {
    id: row.id, classId: row.class_id, title: row.title, description: row.description,
    weeks: Array.isArray(row.weeks) ? row.weeks : [], createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export function validateClass(input: ClassInput): ClassInput {
  const name = input.name.trim().slice(0, 120);
  const subject = input.subject.trim().slice(0, 100);
  const grade = input.grade.trim().slice(0, 100);
  const schoolYear = input.schoolYear.trim().slice(0, 30);
  const meetingDays = [...new Set(input.meetingDays)].sort((a, b) => a - b);
  if (!name || !subject || !grade || !schoolYear) throw new Error("Enter a class name, subject, grade, and school year.");
  if (!meetingDays.length || meetingDays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) throw new Error("Choose at least one valid class meeting day.");
  if (!Number.isInteger(input.duration) || input.duration < 10 || input.duration > 240) throw new Error("Class duration must be between 10 and 240 minutes.");
  return { name, subject, grade, schoolYear, meetingDays, duration: input.duration, section: input.section.trim().slice(0, 100) };
}

export function validateCourse(input: CourseInput): CourseInput {
  if (!uuidPattern.test(input.classId)) throw new Error("Choose a class for this course overview.");
  const title = input.title.trim().slice(0, 150);
  if (!title) throw new Error("Enter a course overview title.");
  if (!input.weeks.length) throw new Error("Add at least one weekly topic.");
  if (input.weeks.length > 52) throw new Error("A course overview can contain up to 52 weeks.");
  const weeks = input.weeks.map((entry) => ({
    week: Number(entry.week), topic: entry.topic.trim().slice(0, 200),
    unit: entry.unit.trim().slice(0, 100), focus: entry.focus.trim().slice(0, 1000),
    activity: entry.activity.trim().slice(0, 1000), presentationGoal: entry.presentationGoal.trim().slice(0, 1000),
  }));
  if (weeks.some((entry) => !Number.isInteger(entry.week) || entry.week < 1 || entry.week > 52 || !entry.topic)) throw new Error("Each course week needs a number from 1 to 52 and a topic.");
  if (new Set(weeks.map((entry) => entry.week)).size !== weeks.length) throw new Error("Each course week number must be unique.");
  return { classId: input.classId, title, description: input.description.trim().slice(0, 2000), weeks: weeks.sort((a, b) => a.week - b.week) };
}

export async function listClasses(): Promise<ClassRecord[]> {
  const { data, error } = await getSupabase().from("classes")
    .select("id,name,subject,grade,section,school_year,meeting_days,duration_minutes,created_at,updated_at")
    .order("name");
  if (error) throw catalogError(error);
  return (data as ClassRow[]).map(normalizeClass);
}

export async function saveClass(userId: string, input: ClassInput, id?: string): Promise<ClassRecord> {
  const valid = validateClass(input);
  const row = {
    name: valid.name, subject: valid.subject, grade: valid.grade, section: valid.section,
    school_year: valid.schoolYear, meeting_days: valid.meetingDays,
    duration_minutes: valid.duration, updated_at: new Date().toISOString(),
  };
  const query = id
    ? getSupabase().from("classes").update(row).eq("id", id).eq("user_id", userId)
    : getSupabase().from("classes").insert({ ...row, id: crypto.randomUUID(), user_id: userId });
  const { data, error } = await query.select("id,name,subject,grade,section,school_year,meeting_days,duration_minutes,created_at,updated_at").maybeSingle();
  if (error) throw catalogError(error);
  if (!data) throw new Error("Class not found.");
  return normalizeClass(data as ClassRow);
}

export async function deleteClass(userId: string, id: string) {
  const { data, error } = await getSupabase().from("classes").delete().eq("id", id).eq("user_id", userId).select("id").maybeSingle();
  if (error) throw catalogError(error);
  if (!data) throw new Error("Class not found.");
}

export async function listCourses(): Promise<CourseOverview[]> {
  const { data, error } = await getSupabase().from("course_overviews")
    .select("id,class_id,title,description,weeks,created_at,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw catalogError(error);
  return (data as CourseRow[]).map(normalizeCourse);
}

export async function saveCourse(userId: string, input: CourseInput, id?: string): Promise<CourseOverview> {
  const valid = validateCourse(input);
  const row = { class_id: valid.classId, title: valid.title, description: valid.description, weeks: valid.weeks, updated_at: new Date().toISOString() };
  const query = id
    ? getSupabase().from("course_overviews").update(row).eq("id", id).eq("user_id", userId)
    : getSupabase().from("course_overviews").insert({ ...row, id: crypto.randomUUID(), user_id: userId });
  const { data, error } = await query.select("id,class_id,title,description,weeks,created_at,updated_at").maybeSingle();
  if (error) throw catalogError(error);
  if (!data) throw new Error("Course overview not found.");
  return normalizeCourse(data as CourseRow);
}

export async function deleteCourse(userId: string, id: string) {
  const { data, error } = await getSupabase().from("course_overviews").delete().eq("id", id).eq("user_id", userId).select("id").maybeSingle();
  if (error) throw catalogError(error);
  if (!data) throw new Error("Course overview not found.");
}
