# Lessonleaf

A lesson planning app modeled on `public/Lesson Plan sample.pdf`. The sample is a Grade 1 Science plan with an eight-week course outline and detailed weekly sections. Lessonleaf uses those topics as starting points and creates an editable, template-based draft. AI generation is not connected yet.

## Setup

1. In your Supabase project's SQL Editor, run [`supabase/migrations/20260924_create_lesson_plans.sql`](supabase/migrations/20260924_create_lesson_plans.sql), [`supabase/migrations/20260924_create_user_settings.sql`](supabase/migrations/20260924_create_user_settings.sql), and [`supabase/migrations/20260924_create_classes_and_courses.sql`](supabase/migrations/20260924_create_classes_and_courses.sql). These tables use Supabase Auth user IDs and row-level security so users can access only their own data.
2. Set these variables in this app directory's `.env` file:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

   The existing `.env` already contains these keys. `SUPABASE_SECRET_KEY` is not used by the app. The browser connects directly to Supabase using the publishable key and each signed-in user's session.
3. In Supabase Authentication, keep the Email provider enabled with password sign-in. Set the Site URL and allow the app URL as a redirect URL; for local development, add `http://localhost:3000`. Email confirmation and password reset use this URL. If you previously signed in only with email links, use **Forgot password?** once to set a password.
4. From `H:\devs\lesson_plan_generator`, install dependencies and start the development server:

   ```bash
   npm.cmd --prefix lesson-plan-generator install
   npm.cmd run dev
   ```

   These commands work in Windows PowerShell. In other shells, use `npm` instead of `npm.cmd`. You can also run both commands inside `lesson-plan-generator` without `--prefix`.

Open [http://localhost:3000](http://localhost:3000). You can create and edit a single draft before signing in. Create an account or sign in with email and password to save plans, classes, course overviews, and settings to Supabase. Browser sessions persist so users do not need an email link for routine sign-in.

Use **Classes** to save each class's subject, grade, school year, duration, and meeting days. Use **Course** to enter numbered weekly topics and teaching guidance, or load the eight-week Science outline from the supplied PDF. Under **Generate plans**, choose **Single Plan** to draft one lesson or **Term Schedule** to create a batch from a class, start date, selected meeting days, and course overview. The term generator checks that every requested week has content before saving all drafts to the lesson library. Its Smart Template mode is deterministic and editable; AI generation is not connected yet.

The preview has a Print action that can also save a PDF through the browser's print dialog. Settings can also be saved locally before signing in. The Drive folder field is stored for future integration and does not yet upload files.

## App structure

- `app/page.tsx`: lesson builder, preview, saved-plan library, and password sign-in UI using shadcn components.
- `components/settings-panel.tsx`: school, lesson, and account settings UI.
- `components/classes-panel.tsx`, `components/course-panel.tsx`, and `components/term-schedule-panel.tsx`: class and course management and term generation UI.
- `components/ui/`: shadcn buttons, cards, form controls, tabs, badges, and dialog.
- `lib/lesson-plan.ts`: lesson-plan data model, sample topics, validation, and local template drafting.
- `lib/supabase.ts`: browser Supabase client and direct lesson-plan database operations.
- `lib/settings.ts`: settings model, validation, and direct Supabase persistence.
- `lib/catalog.ts`: class and course models and direct Supabase CRUD.
- `lib/term-schedule.ts`: meeting-date calculation and editable batch draft creation.

The app has no Next.js API routes. Template drafting runs in the browser; saving and sign-in use Supabase directly.

Run `npm.cmd run lint`, `npm.cmd run test`, and `npm.cmd run build` to verify the project from the workspace root.
