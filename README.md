# Lessonleaf

A lesson planning app modeled on `public/Lesson Plan sample.pdf`. The sample is a Grade 1 Science plan with an eight-week course outline and detailed weekly sections. Lessonleaf creates editable drafts with either its built-in Smart Template or AI generation using Groq's `openai/gpt-oss-120b` model.

## Setup

1. In your Supabase project's SQL Editor, run [`supabase/migrations/20260924_create_lesson_plans.sql`](supabase/migrations/20260924_create_lesson_plans.sql), [`supabase/migrations/20260924_create_user_settings.sql`](supabase/migrations/20260924_create_user_settings.sql), [`supabase/migrations/20260924_create_classes_and_courses.sql`](supabase/migrations/20260924_create_classes_and_courses.sql), and [`supabase/migrations/20260925_create_school_logos.sql`](supabase/migrations/20260925_create_school_logos.sql). If the first three migrations are already applied, run only the new school-logo migration. It creates a private Storage bucket with user-scoped access and a 2 MB image limit.
2. Set these variables in this app directory's `.env` file:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   GROQ_API_KEY=your-groq-api-key
   ```

   `SUPABASE_SECRET_KEY` is not used by the app. The browser connects directly to Supabase using the publishable key and each signed-in user's session. `GROQ_API_KEY` stays on the Next.js server and is used only for AI drafting; do not prefix it with `NEXT_PUBLIC_`. Restart the development server after changing `.env`.
3. In Supabase Authentication, keep the Email provider enabled with password sign-in. Set the Site URL and allow the app URL as a redirect URL; for local development, add `http://localhost:3000`. Email confirmation and password reset use this URL. If you previously signed in only with email links, use **Forgot password?** once to set a password.
4. From `H:\devs\lesson_plan_generator`, install dependencies and start the development server:

   ```bash
   npm.cmd --prefix lesson-plan-generator install
   npm.cmd run dev
   ```

   These commands work in Windows PowerShell. In other shells, use `npm` instead of `npm.cmd`. You can also run both commands inside `lesson-plan-generator` without `--prefix`.

Open [http://localhost:3000](http://localhost:3000). You can create and edit a single draft before signing in. Create an account or sign in with email and password to save plans, classes, course overviews, and settings to Supabase. Browser sessions persist so users do not need an email link for routine sign-in.

## How to use Lessonleaf

1. **Sign in or create an account** with an email and password. You can try a single plan before signing in, but saving and term generation require an account.
2. **Set your defaults** in **Settings**: school and teacher details, school year, duration, a school logo, and common lesson fields. Select **Save settings**. Logo upload requires sign-in.
3. **Add a class** in **Classes** with its subject, grade, meeting days, and lesson duration. Skip this if you only need a manual single plan.
4. **Create a course overview** in **Course** for that class. Give every scheduled week a numbered topic, or load the eight-week Science sequence for a Science class.
5. **Create one lesson** under **Generate plans → Single Plan**: enter the lesson details, choose **Smart Template** or **AI draft**, create the draft, edit its sections, then select **Save draft** or **Mark ready**. AI mode requires sign-in.
6. **Create a full term** under **Generate plans → Term Schedule**: choose the class, start date, number of weeks, meeting days, content source, and generation mode. Review the plan count, then generate the drafts. AI mode supports up to eight meetings per batch; Smart Template supports the full schedule range.
7. **Revisit and print** plans from **My lesson plans**. Saved plans are grouped by course, with plans that have no course under **Other plans**. Open a plan to edit it, or choose a layout and select **Print all** on a course to print its complete set of lessons as one document. For one lesson, open it and use the printer icon in **Lesson preview**. Your browser can save either printout as a PDF.

For each screen and the available options, open **Guide** in the app's navigation or read the [step-by-step user guide](docs/USER_GUIDE.md).

The term generator checks that every requested week has content before saving all drafts to the lesson library. AI content is generated before the Supabase save, so a failed AI request does not create a partial batch. Review AI drafts for accuracy before teaching or printing.

## App structure

- `app/page.tsx`: lesson builder, preview, saved-plan library, and password sign-in UI using shadcn components.
- `components/settings-panel.tsx`: school, lesson, and account settings UI.
- `components/lesson-preview.tsx`: normal and styled printable lesson templates.
- `components/lesson-library.tsx` and `lib/lesson-library.ts`: course-grouped saved plans, search, and full-course printing.
- `components/classes-panel.tsx`, `components/course-panel.tsx`, and `components/term-schedule-panel.tsx`: class and course management and term generation UI.
- `components/ui/`: shadcn buttons, cards, form controls, tabs, badges, and dialog.
- `lib/lesson-plan.ts`: lesson-plan data model, sample topics, validation, and local template drafting.
- `lib/supabase.ts`: browser Supabase client and direct lesson-plan database operations.
- `lib/settings.ts`: settings model, validation, and direct Supabase persistence.
- `lib/school-logo.ts` and `lib/use-school-logo.ts`: logo validation and private Storage downloads for settings and print previews.
- `lib/catalog.ts`: class and course models and direct Supabase CRUD.
- `lib/term-schedule.ts`: meeting-date calculation and editable batch draft creation.
- `app/actions/generate-ai.ts`, `lib/ai-generation.ts`, and `lib/ai-content.ts`: authenticated server-side AI generation, Groq response validation, and safe merging into editable drafts.

The app has no Next.js API routes. Template drafting runs in the browser; saving and sign-in use Supabase directly. AI requests use a Next.js Server Action so the Groq key is never sent to the browser.

Run `npm.cmd run lint`, `npm.cmd run test`, and `npm.cmd run build` to verify the project from the workspace root.
