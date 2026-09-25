import { generatePlan, parseGenerateInput, parseLessonCategory, weekPresets, type LessonPlan } from "./lesson-plan";
import type { ClassRecord, CourseOverview, CourseWeek } from "./catalog";
import type { AppSettings } from "./settings";

export type ContentSource = "course" | "sample";

export type TermScheduleInput = {
  classRecord: ClassRecord;
  category: string;
  schoolYear: string;
  termStart: string;
  numberOfWeeks: number;
  startingWeek: number;
  duration: number;
  meetingDays: number[];
  contentSource: ContentSource;
  overview?: CourseOverview;
  chapter: string;
  unit: string;
  resource: string;
};

export type TermMeeting = { date: string; week: number; day: number };

function startDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Choose a valid term start date.");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) throw new Error("Choose a valid term start date.");
  return date;
}

export function createTermMeetings(input: Pick<TermScheduleInput, "termStart" | "numberOfWeeks" | "startingWeek" | "meetingDays">): TermMeeting[] {
  const start = startDate(input.termStart);
  if (!Number.isInteger(input.numberOfWeeks) || input.numberOfWeeks < 1 || input.numberOfWeeks > 24) throw new Error("Number of weeks must be between 1 and 24.");
  if (!Number.isInteger(input.startingWeek) || input.startingWeek < 1 || input.startingWeek + input.numberOfWeeks - 1 > 52) throw new Error("Starting week and term length must stay within weeks 1 to 52.");
  const days = [...new Set(input.meetingDays)].sort((a, b) => a - b);
  if (!days.length || days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) throw new Error("Choose at least one class meeting day.");
  const meetings: TermMeeting[] = [];
  for (let index = 0; index < input.numberOfWeeks; index++) {
    for (const day of days) {
      const offset = (day - start.getUTCDay() + 7) % 7 + index * 7;
      const meeting = new Date(start);
      meeting.setUTCDate(meeting.getUTCDate() + offset);
      meetings.push({ date: meeting.toISOString().slice(0, 10), week: input.startingWeek + index, day });
    }
  }
  return meetings.sort((a, b) => a.date.localeCompare(b.date) || a.day - b.day);
}

export function buildTermPlans(input: TermScheduleInput, settings: AppSettings): LessonPlan[] {
  const meetings = createTermMeetings(input);
  const category = parseLessonCategory(input.category);
  if (!input.schoolYear.trim()) throw new Error("Enter a school year.");
  if (!Number.isInteger(input.duration) || input.duration < 10 || input.duration > 240) throw new Error("Duration must be between 10 and 240 minutes.");
  if (input.contentSource === "sample" && !/\bscience\b/i.test(input.classRecord.subject)) throw new Error("The sample Science sequence is available only for Science classes.");
  if (input.contentSource === "course" && (!input.overview || input.overview.classId !== input.classRecord.id)) throw new Error("Choose a saved course overview for this class.");
  const courseWeeks = new Map<number, CourseWeek>(input.overview?.weeks.map((week) => [week.week, week]) || []);
  const batchId = crypto.randomUUID();
  return meetings.map((meeting) => {
    const content = input.contentSource === "course" ? courseWeeks.get(meeting.week) : weekPresets.find((week) => week.week === meeting.week);
    if (!content) throw new Error(`No ${input.contentSource === "course" ? "course" : "sample"} content is available for week ${meeting.week}.`);
    const plan = generatePlan(parseGenerateInput({
      subject: input.classRecord.subject, grade: input.classRecord.grade, section: input.classRecord.section,
      schoolYear: input.schoolYear, week: meeting.week, topic: content.topic, date: meeting.date,
      duration: input.duration, chapter: input.chapter, unit: content.unit || input.unit,
      resource: input.resource, pages: "", preparedBy: settings.teacherName,
    }), {
      focus: "focus" in content ? content.focus : content.keyFocus,
      activity: "activity" in content ? content.activity : content.activityHighlight,
      presentationGoal: content.presentationGoal,
    });
    return {
      ...plan, title: `${content.topic} · ${meeting.date} · Week ${meeting.week}`,
      category, classId: input.classRecord.id,
      className: input.classRecord.name,
      courseOverviewId: input.contentSource === "course" ? input.overview?.id : undefined,
      termBatchId: batchId,
    };
  });
}
