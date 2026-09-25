export type PlanStatus = "draft" | "ready";

export type LessonPlan = {
  id: string;
  title: string;
  subject: string;
  grade: string;
  section: string;
  schoolYear: string;
  week: number;
  topic: string;
  date: string;
  duration: number;
  chapter: string;
  unit: string;
  resource: string;
  pages: string;
  keyFocus: string;
  activityHighlight: string;
  presentationGoal: string;
  coreGoal: string;
  objectives: string[];
  vocabulary: string[];
  languageFocus: string;
  materials: string[];
  warmUp: string;
  lessonProcedure: string;
  teacherActions: string;
  studentActions: string;
  activity: string;
  presentation: string;
  assessment: string;
  homework: string;
  multimediaLinks: string[];
  notes: string;
  preparedBy: string;
  status: PlanStatus;
  createdAt: string;
  updatedAt: string;
  category?: string;
  classId?: string;
  className?: string;
  courseOverviewId?: string;
  termBatchId?: string;
};

export type GenerateInput = Pick<LessonPlan, "subject" | "grade" | "section" | "schoolYear" | "week" | "topic" | "date" | "duration" | "chapter" | "unit" | "resource" | "pages" | "preparedBy">;

export type WeekPreset = {
  week: number;
  unit: string;
  topic: string;
  keyFocus: string;
  activityHighlight: string;
  presentationGoal: string;
};

// The course overview on page 1 of the supplied PDF provides these eight topics.
export const weekPresets: WeekPreset[] = [
  { week: 1, unit: "Unit 3", topic: "Introduction of Habitats", keyFocus: "What a habitat is, where living things live, and why their homes matter.", activityHighlight: "Habitat sorting card game", presentationGoal: "Introduce a favorite animal and its natural home." },
  { week: 2, unit: "Unit 3", topic: "Where Plants Live", keyFocus: "Sunlight, soil, water, forests, deserts, and aquatic plants.", activityHighlight: "Plant habitat drawing and labeling", presentationGoal: "Explain what a plant needs to survive in its home." },
  { week: 3, unit: "Unit 3", topic: "Where Animals Live", keyFocus: "Ocean, jungle, and farm habitats; shelter, food, and adaptation.", activityHighlight: "Build a habitat mini diorama", presentationGoal: "Present an animal model and describe its habitat." },
  { week: 4, unit: "Unit 3", topic: "Caring for the Environment", keyFocus: "Reduce, reuse, recycle, pollution, and protection.", activityHighlight: "Classroom trash sorting race", presentationGoal: "Share two ways to keep animal homes clean." },
  { week: 5, unit: "Unit 4", topic: "Materials Around Us", keyFocus: "Wood, plastic, metal, paper, glass, and fabric.", activityHighlight: "Classroom materials scavenger hunt", presentationGoal: "Name three objects and the materials they are made of." },
  { week: 6, unit: "Unit 4", topic: "Materials and Their Properties", keyFocus: "Hard, soft, flexible, waterproof, rough, and smooth.", activityHighlight: "Touch and feel mystery bag", presentationGoal: "Describe an object's texture and flexibility to classmates." },
  { week: 7, unit: "Unit 4", topic: "Sorting Materials", keyFocus: "Grouping, classifying, bendable versus rigid, and heavy versus light.", activityHighlight: "Venn diagram material classification", presentationGoal: "Explain why a particular material was chosen for an item." },
  { week: 8, unit: "Units 3 & 4", topic: "Review: Habitats, Living Things, Plants, Animals, and Materials", keyFocus: "Review vocabulary and ideas from Units 3 and 4.", activityHighlight: "Science quiz show and portfolio poster", presentationGoal: "Show and tell: present a final unit portfolio poster." },
];

const textFields = ["title", "subject", "grade", "section", "schoolYear", "topic", "date", "chapter", "unit", "resource", "pages", "keyFocus", "activityHighlight", "presentationGoal", "coreGoal", "languageFocus", "warmUp", "lessonProcedure", "teacherActions", "studentActions", "activity", "presentation", "assessment", "homework", "notes", "preparedBy"] as const;
const listFields = ["objectives", "vocabulary", "materials", "multimediaLinks"] as const;

export function parseGenerateInput(value: unknown): GenerateInput {
  if (!value || typeof value !== "object") throw new Error("Enter the lesson details first.");
  const data = value as Record<string, unknown>;
  const read = (key: string, max = 300) => {
    if (typeof data[key] !== "string") throw new Error(`Enter a valid ${key}.`);
    return data[key].trim().slice(0, max);
  };
  const topic = read("topic");
  if (!topic) throw new Error("Enter a lesson topic.");
  const week = Number(data.week);
  const duration = Number(data.duration);
  if (!Number.isInteger(week) || week < 1 || week > 52) throw new Error("Week must be between 1 and 52.");
  if (!Number.isInteger(duration) || duration < 10 || duration > 240) throw new Error("Duration must be between 10 and 240 minutes.");
  return {
    subject: read("subject") || "Science",
    grade: read("grade") || "Grade 1",
    section: read("section"),
    schoolYear: read("schoolYear") || "2026–2027",
    week,
    topic,
    date: read("date"),
    duration,
    chapter: read("chapter"),
    unit: read("unit"),
    resource: read("resource"),
    pages: read("pages"),
    preparedBy: read("preparedBy"),
  };
}

export function generatePlan(input: GenerateInput, guidance?: { focus?: string; activity?: string; presentationGoal?: string }): LessonPlan {
  const preset = weekPresets.find((item) => item.week === input.week && item.topic === input.topic);
  const topic = input.topic;
  const focus = guidance?.focus || preset?.keyFocus || `The essential ideas and vocabulary related to ${topic}.`;
  const activity = guidance?.activity || preset?.activityHighlight || `A partner sorting, drawing, or observation activity about ${topic}`;
  const presentation = guidance?.presentationGoal || preset?.presentationGoal || `Explain one observation about ${topic} using a complete sentence.`;
  const now = new Date().toISOString();
  const [engage, explore, explain, apply] = [7, 13, 13, 20].map((minutes) => Math.max(1, Math.round(minutes * input.duration / 60)));
  const evaluate = input.duration - engage - explore - explain - apply;

  return {
    ...input,
    id: crypto.randomUUID(),
    title: `${topic} · Week ${input.week}`,
    unit: input.unit || preset?.unit || "",
    keyFocus: focus,
    activityHighlight: activity,
    presentationGoal: presentation,
    coreGoal: `Learners explore ${topic.toLowerCase()} through observation, questions, discussion, and a hands-on activity. Focus: ${focus}`,
    objectives: [
      `Identify and describe the key ideas connected to ${topic.toLowerCase()}.`,
      `Use appropriate vocabulary to explain an observation about ${topic.toLowerCase()}.`,
      `Complete an activity and share a conclusion through speaking, drawing, or writing.`,
    ],
    vocabulary: [],
    languageFocus: "I observe… · I predict… · The result shows… · I conclude…",
    materials: ["Topic pictures or flashcards", "Textbook or teacher reference", "Student worksheet or science notebook", "Pencils, crayons, and activity materials"],
    warmUp: `Show a picture or object related to ${topic.toLowerCase()}. Ask learners what they notice and what they predict. Invite two or three responses.`,
    lessonProcedure: `1. Engage (${engage} min): Ask an opening question and connect to prior knowledge.\n2. Explore (${explore} min): Guide learners through a simple observation or investigation.\n3. Explain (${explain} min): Discuss findings and introduce key vocabulary.\n4. Apply (${apply} min): ${activity}.\n5. Evaluate (${evaluate} min): Ask learners to explain or draw one thing they learned.`,
    teacherActions: "Prepare materials and demonstrate the task. Model key vocabulary, ask open questions, support groups, and address misconceptions.",
    studentActions: "Observe, make a prediction, work with a partner or group, record findings, and share a conclusion.",
    activity: activity,
    presentation,
    assessment: `Use an observation checklist, activity output, vocabulary check, and an exit question: “What did you learn about ${topic.toLowerCase()}?”`,
    homework: `Find or draw one real-life example of ${topic.toLowerCase()}. Write two or three sentences using the lesson vocabulary.`,
    multimediaLinks: [],
    notes: "Review timing, materials, and learning objectives before teaching.",
    status: "draft",
    category: "General",
    createdAt: now,
    updatedAt: now,
  };
}

export function parseLessonPlan(value: unknown): LessonPlan {
  if (!value || typeof value !== "object") throw new Error("Enter a valid lesson plan.");
  const data = value as Record<string, unknown>;
  const input = parseGenerateInput(data);
  const plan: Record<string, unknown> = {};
  for (const key of textFields) {
    if (typeof data[key] !== "string") throw new Error(`Enter a valid ${key}.`);
    plan[key] = data[key].trim().slice(0, 5000);
  }
  for (const key of listFields) {
    if (!Array.isArray(data[key]) || !(data[key] as unknown[]).every((item) => typeof item === "string")) throw new Error(`Enter a valid ${key}.`);
    plan[key] = (data[key] as string[]).map((item) => item.trim().slice(0, 1000)).filter(Boolean).slice(0, 30);
  }
  if (typeof data.id !== "string" || !/^[0-9a-f-]{36}$/i.test(data.id)) throw new Error("Invalid plan ID.");
  if (data.status !== "draft" && data.status !== "ready") throw new Error("Invalid plan status.");
  const now = new Date().toISOString();
  const optionalText = (key: "category" | "className") => typeof data[key] === "string" ? (data[key] as string).trim().slice(0, 200) : undefined;
  const optionalId = (key: "classId" | "courseOverviewId" | "termBatchId") => typeof data[key] === "string" && /^[0-9a-f-]{36}$/i.test(data[key] as string) ? data[key] as string : undefined;
  return {
    ...plan, ...input, id: data.id, status: data.status, createdAt: now, updatedAt: now,
    category: optionalText("category") || "General", className: optionalText("className"),
    classId: optionalId("classId"), courseOverviewId: optionalId("courseOverviewId"), termBatchId: optionalId("termBatchId"),
  } as LessonPlan;
}
